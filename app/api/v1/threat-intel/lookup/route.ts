import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { lookupIndicator } from '@/lib/threat-intel-db';
import { categorizeUrl } from '@/lib/url-categories';

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');
    const type = searchParams.get('type');

    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }

    const normalizedIndicator = indicator.toLowerCase().trim();
    const detectedType = type || detectIndicatorType(normalizedIndicator);

    // Extract hostname from URL if needed
    let lookupValue = normalizedIndicator;
    if (detectedType === 'url') {
      try {
        lookupValue = new URL(normalizedIndicator.startsWith('http') ? normalizedIndicator : `https://${normalizedIndicator}`).hostname.replace(/^www\./, '');
      } catch {}
    } else if (detectedType === 'domain') {
      lookupValue = normalizedIndicator.replace(/^www\./, '');
    }

    // Query v2 DB via lookupIndicator
    const { hits, totalChecked } = await lookupIndicator(lookupValue);
    const lookupMs = Date.now() - startTime;

    // Build verdict
    let verdict = 'clean';
    let maxConfidence = 0;
    let riskLevel = 'clean';
    const sourcesHit: string[] = [];
    const categories: string[] = [];

    if (hits.length > 0) {
      verdict = 'malicious';
      riskLevel = hits[0].risk_level;
      for (const hit of hits) {
        maxConfidence = Math.max(maxConfidence, hit.confidence || 0);
        sourcesHit.push(hit.feed);
        hit.categories.forEach((c: string) => {
          if (!categories.includes(c)) categories.push(c);
        });
      }
    }

    // Always add URL categorization for domain/url types
    if (detectedType === 'url' || detectedType === 'domain') {
      const urlForCat = detectedType === 'url' ? normalizedIndicator : `https://${normalizedIndicator}`;
      const urlCats = categorizeUrl(urlForCat);
      urlCats.forEach((c: string) => {
        if (!categories.includes(c)) categories.push(c);
      });
    }

    // Heuristic checks for URLs/domains not in DB
    const heuristics = runHeuristics(normalizedIndicator, detectedType);
    if (heuristics.suspicious && verdict === 'clean') {
      verdict = 'suspicious';
      riskLevel = 'medium_risk';
      maxConfidence = Math.max(maxConfidence, heuristics.confidence);
    }

    return NextResponse.json({
      indicator: normalizedIndicator,
      type: detectedType,
      verdict,
      risk_level: riskLevel,
      confidence: maxConfidence,
      severity: riskLevel === 'known_malicious' ? 'critical' : riskLevel === 'high_risk' ? 'high' : riskLevel === 'medium_risk' ? 'medium' : 'low',
      sources_hit: sourcesHit,
      total_matches: hits.length,
      total_feeds_checked: totalChecked,
      categories,
      matches: hits.map(h => ({
        source: h.feed,
        confidence: h.confidence,
        risk_level: h.risk_level,
        categories: h.categories,
        first_seen: h.first_seen,
        last_seen: h.last_seen,
      })),
      heuristics: heuristics.flags,
      lookup_ms: lookupMs,
      checked_at: new Date().toISOString(),
      engine_version: '5.2-db',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const indicators: string[] = body.indicators || [];
    if (!indicators.length) {
      return NextResponse.json({ error: 'indicators array required' }, { status: 400 });
    }
    const results = await Promise.all(
      indicators.slice(0, 100).map(async (ind) => {
        const startTime = Date.now();
        const normalized = ind.toLowerCase().trim();
        const detectedType = detectIndicatorType(normalized);
        let lookupValue = normalized;
        if (detectedType === 'url') {
          try { lookupValue = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`).hostname.replace(/^www\./, ''); } catch {}
        } else if (detectedType === 'domain') {
          lookupValue = normalized.replace(/^www\./, '');
        }
        const { hits } = await lookupIndicator(lookupValue);
        const verdict = hits.length > 0 ? 'malicious' : 'clean';
        const maxConf = hits.reduce((max: number, h) => Math.max(max, h.confidence || 0), 0);
        const categories = hits.flatMap(h => h.categories).filter((v, i, a) => a.indexOf(v) === i);
        // Add URL categorization
        if (detectedType === 'url' || detectedType === 'domain') {
          const urlForCat = detectedType === 'url' ? normalized : `https://${normalized}`;
          const urlCats = categorizeUrl(urlForCat);
          urlCats.forEach((c: string) => { if (!categories.includes(c)) categories.push(c); });
        }
        return {
          indicator: normalized,
          type: detectedType,
          verdict,
          risk_level: hits[0]?.risk_level || 'clean',
          confidence: maxConf,
          sources: hits.map(h => h.feed),
          categories,
          lookup_ms: Date.now() - startTime,
        };
      })
    );
    return NextResponse.json({
      results,
      total: results.length,
      threats_found: results.filter(r => r.verdict !== 'clean').length,
      checked_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function detectIndicatorType(value: string): string {
  if (/^https?:\/\//i.test(value)) return 'url';
  if (/^[\w.-]+@[\w.-]+\.\w+$/.test(value)) return 'email';
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(value)) return 'ipv4';
  if (/^[0-9a-f:]+$/i.test(value) && value.includes(':')) return 'ipv6';
  if (/^[a-f0-9]{32}$/i.test(value)) return 'md5';
  if (/^[a-f0-9]{40}$/i.test(value)) return 'sha1';
  if (/^[a-f0-9]{64}$/i.test(value)) return 'sha256';
  if (/^[\w.-]+\.[a-z]{2,}$/i.test(value)) return 'domain';
  return 'unknown';
}

function runHeuristics(value: string, type: string): { suspicious: boolean; confidence: number; flags: string[] } {
  const flags: string[] = [];
  if (type === 'domain' || type === 'url') {
    const domain = type === 'url' ? (() => { try { return new URL(value.startsWith('http') ? value : `https://${value}`).hostname; } catch { return value; } })() : value;
    if (domain.length > 50) flags.push('unusually_long_domain');
    if (/\d{4,}/.test(domain)) flags.push('excessive_numbers');
    if ((domain.match(/\./g) || []).length > 4) flags.push('excessive_subdomains');
    if (/^[a-z0-9]{15,}\.[a-z]+$/i.test(domain)) flags.push('dga_pattern');
  }
  if (type === 'url') {
    if (value.includes('@')) flags.push('at_sign_in_url');
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value)) flags.push('ip_in_url');
    if (value.length > 200) flags.push('unusually_long_url');
    if (/(%[0-9a-f]{2}){3,}/i.test(value)) flags.push('heavy_encoding');
  }
  return { suspicious: flags.length > 0, confidence: Math.min(flags.length * 20, 60), flags };
}
