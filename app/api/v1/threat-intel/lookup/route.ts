import { NextResponse } from 'next/server';
import { lookupIndicator, ingestIndicators } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB } from '@/lib/db';

// Auto-initialize DB schema on first load (idempotent)
let dbInitialized = false;
let ingestTriggered = false;

async function ensureInit() {
  if (!dbInitialized) {
    try { await initDB(); dbInitialized = true; } catch {}
  }
  // Background ingest on first cold start (non-blocking)
  if (dbInitialized && !ingestTriggered) {
    ingestTriggered = true;
    triggerBackgroundIngest();
  }
}

// Lightweight background ingest of top phishing feeds (non-blocking)
function triggerBackgroundIngest() {
  (async () => {
    try {
      const feeds = [
        { id: 'phishtank', url: 'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt', type: 'domain' },
        { id: 'phishing_army', url: 'https://phishing.army/download/phishing_army_blocklist.txt', type: 'domain' },
        { id: 'openphish', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt', type: 'domain' },
      ];
      for (const feed of feeds) {
        try {
          const res = await fetch(feed.url, { headers: { 'User-Agent': 'NextGuard/1.0' }, signal: AbortSignal.timeout(25000) });
          if (!res.ok) continue;
          const text = await res.text();
          const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#') && l.includes('.'));
          const indicators = lines.slice(0, 500).map(v => {
            let value = v.replace(/^www\./, '');
            try { value = new URL(v.startsWith('http') ? v : `https://${v}`).hostname.replace(/^www\./, ''); } catch {}
            return { value, type: feed.type };
          });
          await ingestIndicators(feed.id, indicators);
        } catch {}
      }
    } catch {}
  })();
}

// Normalize risk level from DB to verdict
function riskToVerdict(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical':
    case 'high':
    case 'known_malicious':
      return 'malicious';
    case 'medium':
    case 'high_risk':
    case 'medium_risk':
      return 'suspicious';
    default:
      return 'clean';
  }
}

// Hybrid lookup: Try Turso DB first (persistent, fast), fall back to live OSINT feeds
export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    await ensureInit();
    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');
    const type = searchParams.get('type');
    const mode = searchParams.get('mode') || 'hybrid';
    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }
    const trimmed = indicator.trim();
    // Mode: db-only
    if (mode === 'db') {
      const dbResult = await lookupIndicator(trimmed);
      const lookupMs = Date.now() - startTime;
      const topHit = dbResult.hits[0];
      const riskLevel = topHit?.risk_level ?? 'clean';
      const verdict = riskToVerdict(riskLevel);
      const allCategories = [...new Set(dbResult.hits.flatMap(h => h.categories))];
      const sourcesHit = dbResult.hits.map(h => h.feed);
      return NextResponse.json({
        indicator: trimmed, type: type || 'url', verdict, risk_level: riskLevel,
        confidence: topHit?.confidence ?? 0,
        categories: allCategories.length > 0 ? allCategories : categorizeUrl(trimmed),
        sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
        flags: [], lookup_ms: lookupMs,
        checked_at: new Date().toISOString(), engine: 'turso-db-v5.2',
        source_details: dbResult.hits.map(h => ({
          name: h.feed, hit: true, risk_level: h.risk_level,
          categories: h.categories, detail: `First seen: ${h.first_seen}`
        })),
      });
    }
    // Mode: live
    if (mode === 'live') {
      const result = await checkUrl(trimmed);
      const lookupMs = Date.now() - startTime;
      const verdict = riskToVerdict(result.risk_level);
      const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
      const categories = result.categories.length > 0 ? result.categories : categorizeUrl(result.domain);
      return NextResponse.json({
        indicator: trimmed, type: type || 'url', verdict,
        risk_level: result.risk_level, confidence: result.overall_score,
        categories, sources_hit: sourcesHit, sources_checked: result.sources.length,
        flags: result.flags, lookup_ms: lookupMs,
        checked_at: result.checked_at, engine: 'osint-live-v4.7',
        source_details: result.sources,
      });
    }
    // Mode: hybrid (default) - DB first, fall back to live if DB has no data
    const dbResult = await lookupIndicator(trimmed);
    if (dbResult.hits.length > 0) {
      const lookupMs = Date.now() - startTime;
      const topHit = dbResult.hits[0];
      const riskLevel = topHit.risk_level;
      const verdict = riskToVerdict(riskLevel);
      const allCategories = [...new Set(dbResult.hits.flatMap(h => h.categories))];
      const sourcesHit = dbResult.hits.map(h => h.feed);
      return NextResponse.json({
        indicator: trimmed, type: type || 'url', verdict, risk_level: riskLevel,
        confidence: topHit.confidence,
        categories: allCategories.length > 0 ? allCategories : categorizeUrl(trimmed),
        sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
        flags: [], lookup_ms: lookupMs,
        checked_at: new Date().toISOString(), engine: 'turso-db-v5.2',
        source_details: dbResult.hits.map(h => ({
          name: h.feed, hit: true, risk_level: h.risk_level,
          categories: h.categories, detail: `First seen: ${h.first_seen}`
        })),
      });
    }
    // DB miss - fall back to live OSINT feeds
    const result = await checkUrl(trimmed);
    const lookupMs = Date.now() - startTime;
    const verdict = riskToVerdict(result.risk_level);
    const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
    const categories = result.categories.length > 0 ? result.categories : categorizeUrl(result.domain);
    return NextResponse.json({
      indicator: trimmed, type: type || 'url', verdict,
      risk_level: result.risk_level, confidence: result.overall_score,
      categories, sources_hit: sourcesHit, sources_checked: result.sources.length,
      flags: result.flags, lookup_ms: lookupMs,
      checked_at: result.checked_at, engine: 'osint-live-v4.7-fallback',
      source_details: result.sources,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
