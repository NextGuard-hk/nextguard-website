import { NextResponse } from 'next/server';
import { lookupIndicator, ingestIndicators } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB, getDB } from '@/lib/db';

// ─── DB State ────────────────────────────────────────────────────────────────
let dbInitialized = false;
let initialIngestDone = false;
let dbHealthy = true;          // optimistic: assume DB healthy on start
let dbLastFailAt = 0;          // epoch ms of last DB failure
const DB_RETRY_INTERVAL = 60_000; // 60 s cooldown before re-trying DB after failure

// ─── Init ─────────────────────────────────────────────────────────────────────
async function ensureInit() {
  if (!dbInitialized) {
    try { await initDB(); dbInitialized = true; dbHealthy = true; } catch { dbHealthy = false; }
  }
}

// Quick seed on first cold-start when DB is empty
async function quickSeedIfEmpty() {
  if (initialIngestDone) return;
  initialIngestDone = true;
  try {
    const db = getDB();
    const count = await db.execute(`SELECT COUNT(*) as cnt FROM indicators WHERE is_active = 1`);
    if ((count.rows[0]?.cnt as number) > 0) return;
    const feeds = [
      { id: 'phishtank', url: 'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt', type: 'domain' },
      { id: 'phishing_army', url: 'https://phishing.army/download/phishing_army_blocklist.txt', type: 'domain' },
      { id: 'openphish', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt', type: 'domain' },
    ];
    for (const feed of feeds) {
      try {
        const res = await fetch(feed.url, { headers: { 'User-Agent': 'NextGuard/1.0' }, signal: AbortSignal.timeout(15000) });
        if (!res.ok) continue;
        const text = await res.text();
        const lines = text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#') && l.includes('.') && l.length > 3);
        const indicators = lines.slice(0, 200).map(v => {
          let value = v.replace(/^www\./, '');
          try { value = new URL(v.startsWith('http') ? v : `https://${v}`).hostname.replace(/^www\./, ''); } catch {}
          return { value, type: feed.type };
        }).filter(i => i.value && i.value.length > 3);
        if (indicators.length > 0) await ingestIndicators(feed.id, indicators);
      } catch {}
    }
  } catch {}
}

// ─── Risk helpers ─────────────────────────────────────────────────────────────
function riskToVerdict(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': case 'high': case 'known_malicious': return 'malicious';
    case 'medium': case 'high_risk': case 'medium_risk': return 'suspicious';
    default: return 'clean';
  }
}

// ─── DB failover helper ───────────────────────────────────────────────────────
// Returns true if DB is considered healthy enough to attempt a query.
// After a failure we wait DB_RETRY_INTERVAL before trying again (circuit-breaker).
function isDbAvailable(): boolean {
  if (dbHealthy) return true;
  if (Date.now() - dbLastFailAt >= DB_RETRY_INTERVAL) {
    dbHealthy = true; // reset: give DB another chance
    return true;
  }
  return false;
}

function markDbFailed() {
  dbHealthy = false;
  dbLastFailAt = Date.now();
}

// ─── Live OSINT fallback (shared) ─────────────────────────────────────────────
async function liveOsintLookup(trimmed: string, startTime: number, engineSuffix = '') {
  const result = await checkUrl(trimmed);
  const lookupMs = Date.now() - startTime;
  const verdict = riskToVerdict(result.risk_level);
  const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
  const categories = result.categories.length > 0 ? result.categories : categorizeUrl(result.domain);
  return NextResponse.json({
    indicator: trimmed, type: 'url', verdict,
    risk_level: result.risk_level, confidence: result.overall_score,
    categories, sources_hit: sourcesHit, sources_checked: result.sources.length,
    flags: result.flags, lookup_ms: lookupMs,
    checked_at: result.checked_at,
    engine: `osint-live-v4.7${engineSuffix}`,
    source_details: result.sources,
  });
}

// ─── DB lookup (shared) ───────────────────────────────────────────────────────
async function dbLookupResponse(trimmed: string, startTime: number) {
  const dbResult = await lookupIndicator(trimmed);
  const lookupMs = Date.now() - startTime;
  const topHit = dbResult.hits[0];
  const riskLevel = topHit?.risk_level ?? 'clean';
  const verdict = riskToVerdict(riskLevel);
  const allCategories = [...new Set(dbResult.hits.flatMap(h => h.categories))];
  const sourcesHit = dbResult.hits.map(h => h.feed);
  return NextResponse.json({
    indicator: trimmed, type: 'url', verdict, risk_level: riskLevel,
    confidence: topHit?.confidence ?? 0,
    categories: allCategories.length > 0 ? allCategories : categorizeUrl(trimmed),
    sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
    flags: [], lookup_ms: lookupMs,
    checked_at: new Date().toISOString(), engine: 'turso-db-v5.2',
    source_details: dbResult.hits.map(h => ({
      name: h.feed, hit: true, risk_level: h.risk_level,
      categories: h.categories, detail: `First seen: ${h.first_seen}`
    })),
    db_hits: dbResult.hits.length,
  });
}

// ─── Main route ───────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const startTime = Date.now();

    // Try to init DB but never block the request if it fails
    if (!dbInitialized) {
      try { await ensureInit(); } catch { markDbFailed(); }
    }

    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');
    const type = searchParams.get('type');
    const mode = searchParams.get('mode') || 'hybrid';

    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }
    const trimmed = indicator.trim();

    // ── Mode: db-only ──────────────────────────────────────────────────────────
    if (mode === 'db') {
      if (!isDbAvailable()) {
        // DB is down — automatic failover to live OSINT
        return liveOsintLookup(trimmed, startTime, '-db-failover');
      }
      try {
        return await dbLookupResponse(trimmed, startTime);
      } catch (dbErr: any) {
        markDbFailed();
        // Failover: fall through to live OSINT
        return liveOsintLookup(trimmed, startTime, '-db-failover');
      }
    }

    // ── Mode: live ─────────────────────────────────────────────────────────────
    if (mode === 'live') {
      return liveOsintLookup(trimmed, startTime);
    }

    // ── Mode: hybrid (default) — DB first, auto-failover to live ───────────────
    if (dbInitialized && isDbAvailable()) {
      // Seed DB on first cold-start if empty (non-blocking best-effort)
      quickSeedIfEmpty().catch(() => {});
    }

    if (isDbAvailable()) {
      try {
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
        // DB is healthy but no hits — fall through to live OSINT
      } catch (dbErr: any) {
        // DB error — mark as failed and auto-failover to live
        markDbFailed();
        // fall through to live OSINT
      }
    }

    // DB miss OR DB down — fall back to live OSINT feeds
    const engineSuffix = !isDbAvailable() ? '-db-failover' : '-fallback';
    return liveOsintLookup(trimmed, startTime, engineSuffix);

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
