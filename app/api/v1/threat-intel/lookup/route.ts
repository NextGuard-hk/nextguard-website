import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');
    const type = searchParams.get('type');

    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }

    const db = getDb();
    const normalizedIndicator = indicator.toLowerCase().trim();

    // Detect type if not provided
    const detectedType = type || detectIndicatorType(normalizedIndicator);

    // Query DB for exact match
    const results = await db.execute({
      sql: `SELECT id, type, value, source_feed, confidence, severity,
              threat_category, first_seen, last_seen, is_active, tags
            FROM threat_indicators
            WHERE LOWER(value) = ? AND is_active = 1
            ORDER BY confidence DESC`,
      args: [normalizedIndicator],
    });

    const lookupMs = Date.now() - startTime;
    const hits = results.rows as any[];

    // Build verdict
    let verdict = 'clean';
    let maxConfidence = 0;
    let maxSeverity = 'low';
    const sourcesHit: string[] = [];

    if (hits.length > 0) {
      verdict = 'malicious';
      for (const hit of hits) {
        maxConfidence = Math.max(maxConfidence, hit.confidence || 0);
        sourcesHit.push(hit.source_feed);
        if (severityRank(hit.severity) > severityRank(maxSeverity)) {
          maxSeverity = hit.severity;
        }
      }
    }

    // Also do heuristic checks
    const heuristics = runHeuristics(normalizedIndicator, detectedType);
    if (heuristics.suspicious && verdict === 'clean') {
      verdict = 'suspicious';
      maxConfidence = Math.max(maxConfidence, heuristics.confidence);
    }

    // Audit log
    try {
      await db.execute({
        sql: `INSERT INTO lookup_audit (query_type, query_value, verdict, sources_hit, confidence, lookup_ms)
              VALUES (?, ?, ?, ?, ?, ?)`,
        args: [detectedType, normalizedIndicator, verdict, JSON.stringify(sourcesHit), maxConfidence, lookupMs],
      });
    } catch (auditErr) {
      // Non-critical, don't fail lookup
    }

    return NextResponse.json({
      indicator: normalizedIndicator,
      type: detectedType,
      verdict,
      confidence: maxConfidence,
      severity: maxSeverity,
      sources_hit: sourcesHit,
      total_matches: hits.length,
      matches: hits.map((h: any) => ({
        source: h.source_feed,
        confidence: h.confidence,
        severity: h.severity,
        category: h.threat_category,
        first_seen: h.first_seen,
        last_seen: h.last_seen,
        tags: h.tags ? JSON.parse(h.tags) : [],
      })),
      heuristics: heuristics.flags,
      lookup_ms: lookupMs,
      checked_at: new Date().toISOString(),
      engine_version: '5.0',
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

    const db = getDb();
    const results = await Promise.all(
      indicators.map(async (ind) => {
        const startTime = Date.now();
        const normalized = ind.toLowerCase().trim();
        const detectedType = detectIndicatorType(normalized);

        const dbResults = await db.execute({
          sql: `SELECT source_feed, confidence, severity, threat_category
                FROM threat_indicators
                WHERE LOWER(value) = ? AND is_active = 1
                ORDER BY confidence DESC LIMIT 5`,
          args: [normalized],
        });

        const hits = dbResults.rows as any[];
        const verdict = hits.length > 0 ? 'malicious' : 'clean';
        const maxConf = hits.reduce((max: number, h: any) => Math.max(max, h.confidence || 0), 0);

        return {
          indicator: normalized,
          type: detectedType,
          verdict,
          confidence: maxConf,
          sources: hits.map((h: any) => h.source_feed),
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

function severityRank(severity: string): number {
  const ranks: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return ranks[severity] || 0;
}

function runHeuristics(value: string, type: string): { suspicious: boolean; confidence: number; flags: string[] } {
  const flags: string[] = [];

  if (type === 'domain') {
    if (value.length > 50) flags.push('unusually_long_domain');
    if (/\d{4,}/.test(value)) flags.push('excessive_numbers_in_domain');
    if ((value.match(/\./g) || []).length > 4) flags.push('excessive_subdomains');
    if (/^[a-z0-9]{15,}\.[a-z]+$/i.test(value)) flags.push('dga_pattern_detected');
  }

  if (type === 'url') {
    if (value.includes('@')) flags.push('at_sign_in_url');
    if (/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(value)) flags.push('ip_in_url');
    if (value.length > 200) flags.push('unusually_long_url');
    if (/(%[0-9a-f]{2}){3,}/i.test(value)) flags.push('heavy_encoding');
  }

  return {
    suspicious: flags.length > 0,
    confidence: Math.min(flags.length * 20, 60),
    flags,
  };
}
