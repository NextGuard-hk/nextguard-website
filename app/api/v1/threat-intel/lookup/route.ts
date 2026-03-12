import { NextResponse } from 'next/server';
import { lookupIndicator, ingestIndicators } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB, getDB } from '@/lib/db';

// ─── In-Memory Lookup Cache ──────────────────────────────────────────────────
interface CacheEntry {
  response: any;
  timestamp: number;
}
const LOOKUP_CACHE = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_MAX_SIZE = 2000;

function getCached(key: string): any | null {
  const entry = LOOKUP_CACHE.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    LOOKUP_CACHE.delete(key);
    return null;
  }
  return entry.response;
}

function setCache(key: string, response: any): void {
  if (LOOKUP_CACHE.size >= CACHE_MAX_SIZE) {
    const oldest = LOOKUP_CACHE.keys().next().value;
    if (oldest) LOOKUP_CACHE.delete(oldest);
  }
  LOOKUP_CACHE.set(key, { response, timestamp: Date.now() });
}

// ─── DB State ────────────────────────────────────────────────────────────────
let dbInitialized = false;
let initialIngestDone = false;
let dbHealthy = true;
let dbLastFailAt = 0;
const DB_RETRY_INTERVAL = 60_000;

async function ensureInit() {
  if (!dbInitialized) {
    try { await initDB(); dbInitialized = true; dbHealthy = true; } catch { dbHealthy = false; }
  }
}

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

function riskToVerdict(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': case 'high': case 'known_malicious': return 'malicious';
    case 'medium': case 'high_risk': case 'medium_risk': return 'suspicious';
    default: return 'clean';
  }
}

function isDbAvailable(): boolean {
  if (dbHealthy) return true;
  if (Date.now() - dbLastFailAt >= DB_RETRY_INTERVAL) {
    dbHealthy = true;
    return true;
  }
  return false;
}

function markDbFailed() {
  dbHealthy = false;
  dbLastFailAt = Date.now();
}

async function lookupUrlCategory(domain: string): Promise<string[]> {
  try {
    const db = getDB();
    let d = domain.toLowerCase();
    if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
    d = d.replace(/^www\./, '');
    const result = await db.execute({
      sql: `SELECT category FROM url_categories WHERE domain = ? LIMIT 5`,
      args: [d],
    });
    if (result.rows.length > 0) {
      return [...new Set(result.rows.map(r => r.category as string))];
    }
    const parts = d.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(-2).join('.');
      const parentResult = await db.execute({
        sql: `SELECT category FROM url_categories WHERE domain = ? LIMIT 5`,
        args: [parent],
      });
      if (parentResult.rows.length > 0) {
        return [...new Set(parentResult.rows.map(r => r.category as string))];
      }
    }
    return [];
  } catch {
    return [];
  }
}

async function liveOsintLookup(trimmed: string, startTime: number, engineSuffix = '') {
  const result = await checkUrl(trimmed);
  const lookupMs = Date.now() - startTime;
  const verdict = riskToVerdict(result.risk_level);
  const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
  const dbCats = isDbAvailable() ? await lookupUrlCategory(result.domain || trimmed) : [];
  const liveCats = result.categories.length > 0 ? result.categories : [];
  const heuristicCats = categorizeUrl(result.domain || trimmed);
  // DB override takes priority — if manual category exists, use it exclusively
  const categories = dbCats.length > 0
    ? dbCats
    : (liveCats.length > 0 ? liveCats : heuristicCats);
  const response = {
    indicator: trimmed, type: 'url', verdict,
    risk_level: result.risk_level, confidence: result.overall_score,
    categories, sources_hit: sourcesHit, sources_checked: result.sources.length,
    flags: result.flags, lookup_ms: lookupMs,
    checked_at: result.checked_at,
    engine: `osint-live-v4.9${engineSuffix}`,
    source_details: result.sources,
    category_source: dbCats.length > 0 ? 'turso-url-categories' : (liveCats.length > 0 ? 'live-osint' : 'heuristic'),
  };
  setCache(`${trimmed}:live`, response);
  return NextResponse.json(response);
}

async function dbLookupResponse(trimmed: string, startTime: number) {
  const dbResult = await lookupIndicator(trimmed);
  const lookupMs = Date.now() - startTime;
  const topHit = dbResult.hits[0];
  const riskLevel = topHit?.risk_level ?? 'clean';
  const verdict = riskToVerdict(riskLevel);
  const allCategories = [...new Set(dbResult.hits.flatMap(h => h.categories))];
  const sourcesHit = dbResult.hits.map(h => h.feed);
  const urlCats = await lookupUrlCategory(trimmed);
  // DB override takes priority
  const finalCats = urlCats.length > 0 ? urlCats : (allCategories.length > 0 ? allCategories : categorizeUrl(trimmed));
  const response = {
    indicator: trimmed, type: 'url', verdict, risk_level: riskLevel,
    confidence: topHit?.confidence ?? 0,
    categories: finalCats,
    sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
    flags: [], lookup_ms: lookupMs,
    checked_at: new Date().toISOString(), engine: 'turso-db-v5.4',
    source_details: dbResult.hits.map(h => ({
      name: h.feed, hit: true, risk_level: h.risk_level,
      categories: h.categories, detail: `First seen: ${h.first_seen}`
    })),
    db_hits: dbResult.hits.length,
    category_source: urlCats.length > 0 ? 'turso-url-categories' : (allCategories.length > 0 ? 'turso-indicators' : 'heuristic'),
  };
  setCache(`${trimmed}:db`, response);
  return NextResponse.json(response);
}

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
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
    const cacheKey = `${trimmed}:${mode}`;
    // ── Cache check ────────────────────────────────────────────────────────────
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        lookup_ms: Date.now() - startTime,
        cache_hit: true,
      });
    }
    // ── Mode: db-only ──────────────────────────────────────────────────────────
    if (mode === 'db') {
      if (!isDbAvailable()) {
        return liveOsintLookup(trimmed, startTime, '-db-failover');
      }
      try {
        return await dbLookupResponse(trimmed, startTime);
      } catch (dbErr: any) {
        markDbFailed();
        return liveOsintLookup(trimmed, startTime, '-db-failover');
      }
    }
    // ── Mode: live ─────────────────────────────────────────────────────────────
    if (mode === 'live') {
      return liveOsintLookup(trimmed, startTime);
    }
    // ── Mode: hybrid (default) ─────────────────────────────────────────────────
    if (dbInitialized && isDbAvailable()) {
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
          const urlCats = await lookupUrlCategory(trimmed);
          // DB override takes priority
          const finalCats = urlCats.length > 0 ? urlCats : (allCategories.length > 0 ? allCategories : categorizeUrl(trimmed));
          const response = {
            indicator: trimmed, type: type || 'url', verdict, risk_level: riskLevel,
            confidence: topHit.confidence,
            categories: finalCats,
            sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
            flags: [], lookup_ms: lookupMs,
            checked_at: new Date().toISOString(), engine: 'turso-db-v5.4',
            source_details: dbResult.hits.map(h => ({
              name: h.feed, hit: true, risk_level: h.risk_level,
              categories: h.categories, detail: `First seen: ${h.first_seen}`
            })),
            category_source: urlCats.length > 0 ? 'turso-url-categories' : (allCategories.length > 0 ? 'turso-indicators' : 'heuristic'),
          };
          setCache(cacheKey, response);
          return NextResponse.json(response);
        }
      } catch (dbErr: any) {
        markDbFailed();
      }
    }
    const engineSuffix = !isDbAvailable() ? '-db-failover' : '-fallback';
    return liveOsintLookup(trimmed, startTime, engineSuffix);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
