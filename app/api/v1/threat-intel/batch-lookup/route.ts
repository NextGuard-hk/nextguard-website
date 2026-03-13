// app/api/v1/threat-intel/batch-lookup/route.ts
// Batch IOC Lookup API - Process up to 100 indicators in parallel
import { NextRequest, NextResponse } from 'next/server';
import { lookupIndicator } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB, getDB } from '@/lib/db';
import { getCategoriesFromRadar } from '@/lib/cloudflare-radar';

const MAX_BATCH = 100;
let dbReady = false;

function riskToVerdict(r: string): string {
  switch (r) {
    case 'critical': case 'high': case 'known_malicious': return 'malicious';
    case 'medium': case 'high_risk': case 'medium_risk': return 'suspicious';
    default: return 'clean';
  }
}

function riskToScore(r: string): number {
  switch (r) {
    case 'known_malicious': return 95;
    case 'high_risk': return 80;
    case 'medium_risk': return 60;
    case 'low_risk': return 30;
    case 'clean': return 5;
    default: return 0;
  }
}
// ─── Composite Threat Score (0-100) ──────────────────────────────────────────
interface ScoreBreakdown {
  ioc_match: number;      // 0-40: IOC database hit score
  category_risk: number;  // 0-25: Category-based risk
  domain_signals: number; // 0-20: Domain reputation signals
  confidence_boost: number; // 0-15: Confidence from sources
}

function getCategoryRiskScore(categories: string[]): number {
  const catLower = categories.map(c => c.toLowerCase());
  if (catLower.some(c => ['malware','phishing','c2','command and control','ransomware'].includes(c))) return 25;
  if (catLower.some(c => ['botnet','exploit','trojan','spyware'].includes(c))) return 22;
  if (catLower.some(c => ['spam','scam','fraud'].includes(c))) return 18;
  if (catLower.some(c => c.includes('paste') || c.includes('file sharing'))) return 15;
  if (catLower.some(c => c.includes('dynamic dns') || c.includes('suspicious'))) return 10;
  if (catLower.some(c => c.includes('uncategorized') || c.includes('newly'))) return 5;
  if (catLower.some(c => ['technology','business','education','news','shopping','entertainment','social media'].includes(c))) return 0;
  return 3;
}

function getDomainSignalScore(domain: string): number {
  let score = 0;
  const d = domain.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '');
  const suspiciousTLDs = ['.xyz','.top','.buzz','.tk','.ml','.ga','.cf','.gq','.work','.click','.loan','.racing','.win','.bid','.stream','.date','.faith','.review','.science','.party','.trade','.accountant','.cricket'];
  if (suspiciousTLDs.some(t => d.endsWith(t))) score += 8;
  const dynamicDNS = ['duckdns.org','no-ip.com','ddns.net','hopto.org','zapto.org','sytes.net','linkpc.net','r-e.kr','n-e.kr','dynamic-dns','freedns','dynu.com'];
  if (dynamicDNS.some(dd => d.includes(dd))) score += 10;
  const freeHosting = ['000webhostapp.com','herokuapp.com','netlify.app','web.app','firebaseapp.com','pages.dev','workers.dev','blogspot.com','weebly.com'];
  if (freeHosting.some(fh => d.includes(fh))) score += 5;
  const parts = d.replace(/\.[^.]+$/, '').split(/[.-]/);
  const entropy = parts.join('').length > 20 ? 7 : 0;
  score += entropy;
  return Math.min(score, 20);
}

function computeThreatScore(
  riskLevel: string,
  confidence: number,
  sourcesHit: string[],
  categories: string[],
  domain: string
): { threat_score: number; score_breakdown: ScoreBreakdown; risk_label: string } {
  // 1. IOC Match (0-40)
  let iocMatch = 0;
  if (sourcesHit.length > 0) {
    iocMatch = Math.min(20 + sourcesHit.length * 8, 40);
  }
  // 2. Category Risk (0-25)
  const categoryRisk = getCategoryRiskScore(categories);
  // 3. Domain Signals (0-20)
  const domainSignals = getDomainSignalScore(domain);
  // 4. Confidence Boost (0-15)
  const confidenceBoost = Math.min(Math.round(confidence * 0.15), 15);
  // Total
  const raw = iocMatch + categoryRisk + domainSignals + confidenceBoost;
  const threatScore = Math.min(raw, 100);
  // Risk label
  let riskLabel = 'clean';
  if (threatScore >= 86) riskLabel = 'critical';
  else if (threatScore >= 61) riskLabel = 'high';
  else if (threatScore >= 36) riskLabel = 'medium';
  else if (threatScore >= 16) riskLabel = 'low';
  return {
    threat_score: threatScore,
    score_breakdown: { ioc_match: iocMatch, category_risk: categoryRisk, domain_signals: domainSignals, confidence_boost: confidenceBoost },
    risk_label: riskLabel,
  };
}

async function lookupUrlCat(domain: string): Promise<string[]> {
  try {
    const db = getDB();
    let d = domain.replace(/^www\./, '');
    const r = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 5', args: [d] });
    if (r.rows.length > 0) return [...new Set(r.rows.map(row => row.category as string))];
    const parts = d.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(-2).join('.');
      const pr = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 5', args: [parent] });
      if (pr.rows.length > 0) return [...new Set(pr.rows.map(row => row.category as string))];
    }
    return [];
  } catch { return []; }
}

// Resolve categories: manual override > Cloudflare Radar > live > heuristic
async function resolveCategories(domain: string, liveCats: string[]): Promise<{ categories: string[]; category_source: string }> {
  const dbCats = await lookupUrlCat(domain);
  if (dbCats.length > 0) return { categories: dbCats, category_source: 'manual-override' };
  try {
    const radarCats = await getCategoriesFromRadar(domain);
    if (radarCats.length > 0 && radarCats[0] !== 'Uncategorized') {
      return { categories: radarCats, category_source: 'cloudflare-radar' };
    }
  } catch {}
  if (liveCats.length > 0) return { categories: liveCats, category_source: 'live-osint' };
  return { categories: categorizeUrl(domain), category_source: 'heuristic' };
}

async function lookupSingle(indicator: string, mode: string) {
  const start = Date.now();
  const trimmed = indicator.trim().toLowerCase();
  if (mode === 'db' || mode === 'hybrid') {
    try {
      const dbResult = await lookupIndicator(trimmed);
      if (dbResult.hits.length > 0) {
        const top = dbResult.hits[0];
        const allCats = [...new Set(dbResult.hits.flatMap(h => h.categories))];
        const { categories: cats, category_source } = await resolveCategories(trimmed, allCats);
        const sourcesHit = dbResult.hits.map(h => h.feed);
        const { threat_score, score_breakdown, risk_label } = computeThreatScore(top.risk_level, top.confidence, sourcesHit, cats, trimmed);
        return {
          indicator: trimmed, verdict: riskToVerdict(top.risk_level),
          risk_level: top.risk_level, risk_score: riskToScore(top.risk_level),
          threat_score, score_breakdown, risk_label,
          confidence: top.confidence, categories: cats,
          sources_hit: sourcesHit,
          engine: 'turso-db-v5.4', lookup_ms: Date.now() - start,
          category_source,
        };
      }
    } catch {}
  }
  if (mode === 'db') {
    const { categories: cats, category_source } = await resolveCategories(trimmed, []);
    const { threat_score, score_breakdown, risk_label } = computeThreatScore('clean', 0, [], cats, trimmed);
    return {
      indicator: trimmed, verdict: 'clean', risk_level: 'clean',
      risk_score: 0, threat_score, score_breakdown, risk_label,
      confidence: 0, categories: cats,
      sources_hit: [], engine: 'turso-db-v5.4-miss',
      lookup_ms: Date.now() - start, category_source,
    };
  }
  try {
    const result = await checkUrl(trimmed);
    const liveCats = result.categories.length > 0 ? result.categories : [];
    const { categories: cats, category_source } = await resolveCategories(trimmed, liveCats);
    const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
    const { threat_score, score_breakdown, risk_label } = computeThreatScore(result.risk_level, result.overall_score, sourcesHit, cats, trimmed);
    return {
      indicator: trimmed, verdict: riskToVerdict(result.risk_level),
      risk_level: result.risk_level, risk_score: riskToScore(result.risk_level),
      threat_score, score_breakdown, risk_label,
      confidence: result.overall_score, categories: cats,
      sources_hit: sourcesHit,
      engine: 'osint-live-v4.9', lookup_ms: Date.now() - start,
      category_source,
    };
  } catch {
    const { threat_score, score_breakdown, risk_label } = computeThreatScore('unknown', 0, [], categorizeUrl(trimmed), trimmed);
    return {
      indicator: trimmed, verdict: 'error', risk_level: 'unknown',
      risk_score: 0, threat_score, score_breakdown, risk_label,
      confidence: 0, categories: categorizeUrl(trimmed),
      sources_hit: [], engine: 'error', lookup_ms: Date.now() - start,
      category_source: 'heuristic',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    if (!dbReady) { try { await initDB(); dbReady = true; } catch {} }
    const body = await request.json();
    const indicators: string[] = body.indicators || [];
    const mode = body.mode || 'hybrid';
    if (!Array.isArray(indicators) || indicators.length === 0) {
      return NextResponse.json({ error: 'indicators array required' }, { status: 400 });
    }
    if (indicators.length > MAX_BATCH) {
      return NextResponse.json({ error: `Maximum ${MAX_BATCH} indicators per batch` }, { status: 400 });
    }
    const unique = [...new Set(indicators.map(i => i.trim().toLowerCase()).filter(Boolean))];
    const results: any[] = [];
    const PARALLEL = 10;
    for (let i = 0; i < unique.length; i += PARALLEL) {
      const batch = unique.slice(i, i + PARALLEL);
      const batchResults = await Promise.allSettled(
        batch.map(ind => lookupSingle(ind, mode))
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ indicator: batch[results.length - i] || 'unknown', verdict: 'error', error: 'lookup_failed' });
      }
    }
    const malicious = results.filter(r => r.verdict === 'malicious').length;
    const suspicious = results.filter(r => r.verdict === 'suspicious').length;
    const clean = results.filter(r => r.verdict === 'clean').length;
    const avgScore = results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.threat_score || 0), 0) / results.length) : 0;
    return NextResponse.json({
      success: true,
      total: results.length,
      summary: { malicious, suspicious, clean, error: results.filter(r => r.verdict === 'error').length, avg_threat_score: avgScore },
      results,
      mode,
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/v1/threat-intel/batch-lookup',
    method: 'POST',
    description: 'Batch IOC lookup with composite threat scoring (0-100)',
    body: {
      indicators: ['example.com', '8.8.8.8', 'malware-domain.xyz'],
      mode: 'hybrid | db | live'
    },
    scoring: {
      range: '0-100',
      dimensions: ['ioc_match (0-40)', 'category_risk (0-25)', 'domain_signals (0-20)', 'confidence_boost (0-15)'],
      labels: { '0-15': 'clean', '16-35': 'low', '36-60': 'medium', '61-85': 'high', '86-100': 'critical' },
    },
    example_curl: "curl -X POST -H 'Content-Type: application/json' -d '{\"indicators\":[\"example.com\",\"urlyte.com\"],\"mode\":\"db\"}' https://www.next-guard.com/api/v1/threat-intel/batch-lookup",
  });
}
