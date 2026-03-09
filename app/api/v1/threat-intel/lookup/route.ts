import { NextResponse } from 'next/server';
import { lookupIndicator } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB } from '@/lib/db';

// Auto-initialize DB schema on first load (idempotent - uses CREATE IF NOT EXISTS)
let dbInitialized = false;
async function ensureInit() {
  if (!dbInitialized) {
    try { await initDB(); dbInitialized = true; } catch {}
  }
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
    const mode = searchParams.get('mode') || 'hybrid'; // 'db', 'live', 'hybrid'
    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }
    const trimmed = indicator.trim();
    // Mode: db-only (fast, uses Turso persistent store)
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
    // Mode: live (original in-memory OSINT feeds)
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
      // DB has data - fast path (should be <50ms)
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
