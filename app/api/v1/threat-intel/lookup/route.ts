import { NextResponse } from 'next/server';
import { lookupIndicator, ingestIndicators } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB, getDB } from '@/lib/db';
import { getCategoriesFromRadar } from '@/lib/cloudflare-radar';

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

// ─── Composite Threat Score (0-100) ──────────────────────────────────────────
interface ScoreBreakdown {
  ioc_match: number;       // 0-40: IOC database hits
  category_risk: number;   // 0-25: Category-based risk
  domain_signals: number;  // 0-20: Domain reputation signals
  source_confidence: number; // 0-15: Source confidence & count
}

function computeThreatScore(
  riskLevel: string,
  categories: string[],
  sourcesHit: string[],
  confidence: number,
  domain: string
): { threat_score: number; score_breakdown: ScoreBreakdown; risk_label: string } {
  const breakdown: ScoreBreakdown = { ioc_match: 0, category_risk: 0, domain_signals: 0, source_confidence: 0 };

  // 1. IOC Match Score (0-40)
  if (riskLevel === 'known_malicious' || riskLevel === 'critical') breakdown.ioc_match = 40;
  else if (riskLevel === 'high' || riskLevel === 'high_risk') breakdown.ioc_match = 30;
  else if (riskLevel === 'medium' || riskLevel === 'medium_risk') breakdown.ioc_match = 20;
  else if (riskLevel === 'low' || riskLevel === 'low_risk') breakdown.ioc_match = 10;
  else breakdown.ioc_match = 0;

  // 2. Category Risk Score (0-25)
  const catStr = categories.map(c => c.toLowerCase()).join(' ');
  if (/malware|c2|command.and.control|ransomware|trojan/.test(catStr)) breakdown.category_risk = 25;
  else if (/phishing|credential.harvesting|social.engineering/.test(catStr)) breakdown.category_risk = 22;
  else if (/spam|scam|fraud/.test(catStr)) breakdown.category_risk = 18;
  else if (/paste.site|url.shortener/.test(catStr)) breakdown.category_risk = 15;
  else if (/dynamic.dns|suspicious/.test(catStr)) breakdown.category_risk = 12;
  else if (/adult|gambling|proxy|anonymizer|vpn/.test(catStr)) breakdown.category_risk = 8;
  else if (/uncategorized/.test(catStr)) breakdown.category_risk = 5;
  else breakdown.category_risk = 0;

  // 3. Domain Signals Score (0-20)
  const d = domain.toLowerCase();
  const suspiciousTLDs = ['.xyz', '.top', '.buzz', '.tk', '.ml', '.ga', '.cf', '.gq', '.cc', '.pw', '.lat', '.surf', '.rest', '.icu'];
  const dynamicDNS = ['duckdns.org', 'no-ip.com', 'linkpc.net', 'ddns.net', 'freedns.org', 'hopto.org', 'zapto.org', 'serveftp.com', 'sytes.net', 'r-e.kr', 'n-e.kr'];
  const freeHosting = ['000webhostapp.com', 'weebly.com', 'wixsite.com', 'blogspot.com', 'herokuapp.com', 'netlify.app', 'pages.dev', 'workers.dev'];
  let domainScore = 0;
  if (suspiciousTLDs.some(tld => d.endsWith(tld))) domainScore += 8;
  if (dynamicDNS.some(dns => d.includes(dns))) domainScore += 10;
  if (freeHosting.some(host => d.includes(host))) domainScore += 5;
  // High entropy (DGA-like) detection
  const parts = d.split('.')[0];
  if (parts && parts.length > 8) {
    const consonants = (parts.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length;
    const ratio = consonants / parts.length;
    if (ratio > 0.75) domainScore += 10;
  }
  // Very short or numeric subdomains
  if (/^\d+\./.test(d) || /^[a-z]{1,2}\d+\./.test(d)) domainScore += 5;
  breakdown.domain_signals = Math.min(domainScore, 20);

  // 4. Source Confidence Score (0-15)
  const srcCount = sourcesHit.length;
  if (srcCount >= 4) breakdown.source_confidence = 15;
  else if (srcCount >= 3) breakdown.source_confidence = 12;
  else if (srcCount >= 2) breakdown.source_confidence = 10;
  else if (srcCount >= 1) breakdown.source_confidence = 7;
  else if (confidence > 70) breakdown.source_confidence = 5;
  else breakdown.source_confidence = 0;

  const totalScore = Math.min(
    breakdown.ioc_match + breakdown.category_risk + breakdown.domain_signals + breakdown.source_confidence,
    100
  );

  // Map score to risk label
  let risk_label = 'clean';
  if (totalScore >= 86) risk_label = 'critical';
  else if (totalScore >= 61) risk_label = 'high';
  else if (totalScore >= 36) risk_label = 'medium';
  else if (totalScore >= 16) risk_label = 'low';

  return { threat_score: totalScore, score_breakdown: breakdown, risk_label };
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

async function resolveCategories(domain: string, liveCats: string[]): Promise<{ categories: string[]; source: string }> {
  const dbCats = isDbAvailable() ? await lookupUrlCategory(domain) : [];
  if (dbCats.length > 0) {
    return { categories: dbCats, source: 'manual-override' };
  }
  try {
    const radarCats = await getCategoriesFromRadar(domain);
    if (radarCats.length > 0 && radarCats[0] !== 'Uncategorized') {
      return { categories: radarCats, source: 'cloudflare-radar' };
    }
  } catch {}
  if (liveCats.length > 0) {
    return { categories: liveCats, source: 'live-osint' };
  }
  const heuristicCats = categorizeUrl(domain);
  return { categories: heuristicCats, source: 'heuristic' };
}

async function liveOsintLookup(trimmed: string, startTime: number, engineSuffix = '') {
  const result = await checkUrl(trimmed);
  const lookupMs = Date.now() - startTime;
  const verdict = riskToVerdict(result.risk_level);
  const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
  const liveCats = result.categories.length > 0 ? result.categories : [];
  const { categories, source: categorySource } = await resolveCategories(result.domain || trimmed, liveCats);
  const { threat_score, score_breakdown, risk_label } = computeThreatScore(
    result.risk_level, categories, sourcesHit, result.overall_score, trimmed
  );
  const response = {
    indicator: trimmed, type: 'url', verdict,
    risk_level: result.risk_level, confidence: result.overall_score,
    threat_score, score_breakdown, risk_label,
    categories, sources_hit: sourcesHit, sources_checked: result.sources.length,
    flags: result.flags, lookup_ms: lookupMs,
    checked_at: result.checked_at,
    engine: `osint-live-v4.9${engineSuffix}`,
    source_details: result.sources,
    category_source: categorySource,
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
  const { categories: finalCats, source: categorySource } = await resolveCategories(trimmed, allCategories);
  const { threat_score, score_breakdown, risk_label } = computeThreatScore(
    riskLevel, finalCats, sourcesHit, topHit?.confidence ?? 0, trimmed
  );
  const response = {
    indicator: trimmed, type: 'url', verdict, risk_level: riskLevel,
    confidence: topHit?.confidence ?? 0,
    threat_score, score_breakdown, risk_label,
    categories: finalCats,
    sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
    flags: [], lookup_ms: lookupMs,
    checked_at: new Date().toISOString(), engine: 'turso-db-v5.4',
    source_details: dbResult.hits.map(h => ({
      name: h.feed, hit: true, risk_level: h.risk_level,
      categories: h.categories, detail: `First seen: ${h.first_seen}`
    })),
    db_hits: dbResult.hits.length,
    category_source: categorySource,
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
    const cached = getCached(cacheKey);
    if (cached) {
      return NextResponse.json({
        ...cached,
        lookup_ms: Date.now() - startTime,
        cache_hit: true,
      });
    }
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
    if (mode === 'live') {
      return liveOsintLookup(trimmed, startTime);
    }
    // Mode: hybrid (default)
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
          const { categories: finalCats, source: categorySource } = await resolveCategories(trimmed, allCategories);
          const { threat_score, score_breakdown, risk_label } = computeThreatScore(
            riskLevel, finalCats, sourcesHit, topHit.confidence, trimmed
          );
          const response = {
            indicator: trimmed, type: type || 'url', verdict, risk_level: riskLevel,
            confidence: topHit.confidence,
            threat_score, score_breakdown, risk_label,
            categories: finalCats,
            sources_hit: sourcesHit, sources_checked: dbResult.totalChecked,
            flags: [], lookup_ms: lookupMs,
            checked_at: new Date().toISOString(), engine: 'turso-db-v5.4',
            source_details: dbResult.hits.map(h => ({
              name: h.feed, hit: true, risk_level: h.risk_level,
              categories: h.categories, detail: `First seen: ${h.first_seen}`
            })),
            category_source: categorySource,
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
