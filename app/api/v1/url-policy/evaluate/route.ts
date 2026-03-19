import { NextRequest, NextResponse } from 'next/server'
import { categorizeUrl, URL_TAXONOMY } from '@/lib/url-categories'
import { queryCloudflareIntel, isCloudflareIntelConfigured } from '@/lib/url-categories'
import { getDB } from '@/lib/db'
import { classifyUrlWithAI, isAIClassificationAvailable } from '@/lib/ai-url-classifier'
import { detectDGA } from '@/lib/dga-detector'

// Upstash Redis L2 persistent cache
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisGet(key: string): Promise<any | null> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(`${UPSTASH_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      next: { revalidate: 0 }
    })
    const data = await res.json()
    if (data.result) return JSON.parse(data.result)
  } catch (e) { console.error('Redis GET error:', e) }
  return null
}

async function redisSet(key: string, value: any, ttlSeconds: number = 1800): Promise<void> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return
  try {
    await fetch(`${UPSTASH_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}/EX/${ttlSeconds}`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
      next: { revalidate: 0 }
    })
  } catch (e) { console.error('Redis SET error:', e) }
}

const ACTION_PRIORITY: Record<string, number> = {
  'Block': 5, 'Override': 4, 'Continue': 3, 'Warn': 2, 'Isolate': 2, 'Allow': 1
}

const RISK_HIGH_CATEGORIES = ['malware', 'phishing', 'botnet/c2', 'exploit/attack tools', 'scam/fraud', 'ransomware', 'cryptojacking', 'spyware']
const RISK_MEDIUM_CATEGORIES = ['suspicious', 'proxy/anonymizer', 'vpn services', 'dynamic dns', 'newly registered domain', 'parked/for sale', 'adult', 'gambling', 'cryptocurrency', 'dns over HTTPS']
const SUSPICIOUS_TLDS = ['xyz','top','club','buzz','tk','ml','ga','cf','gq','icu','cam','rest','click','link']

// L1: In-memory cache
const domainCache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000
const MAX_CACHE = 5000

// L2 memory: CF Intel result cache
const cfIntelCache = new Map<string, { data: any; ts: number }>()
const CF_CACHE_TTL = 30 * 60 * 1000

function getCached(domain: string) {
  const entry = domainCache.get(domain)
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data
  domainCache.delete(domain)
  return null
}

function setCache(domain: string, data: any) {
  if (domainCache.size > MAX_CACHE) {
    const oldest = domainCache.keys().next().value
    if (oldest) domainCache.delete(oldest)
  }
  domainCache.set(domain, { data, ts: Date.now() })
}

function getCFCached(domain: string) {
  const entry = cfIntelCache.get(domain)
  if (entry && Date.now() - entry.ts < CF_CACHE_TTL) return entry.data
  cfIntelCache.delete(domain)
  return null
}

function setCFCache(domain: string, data: any) {
  if (cfIntelCache.size > MAX_CACHE) {
    const oldest = cfIntelCache.keys().next().value
    if (oldest) cfIntelCache.delete(oldest)
  }
  cfIntelCache.set(domain, { data, ts: Date.now() })
}

function computeRiskLevel(categories: string[], domain: string, isMalicious: boolean, confidence: number): { riskLevel: 'high' | 'medium' | 'low' | 'none'; riskScore: number; riskFactors: string[] } {
  const factors: string[] = []; let score = 0
  if (isMalicious) { score += 100; factors.push('confirmed-malicious') }
  for (const cat of categories) {
    const c = cat.toLowerCase();
    if (RISK_HIGH_CATEGORIES.includes(c)) { score += 80; factors.push(`high-risk-category:${cat}`) }
    else if (RISK_MEDIUM_CATEGORIES.includes(c)) { score += 40; factors.push(`medium-risk-category:${cat}`) }
  }
  const tld = domain.split('.').pop() || ''
  if (SUSPICIOUS_TLDS.includes(tld)) { score += 25; factors.push(`suspicious-tld:.${tld}`) }
  if (categories.includes('Uncategorized') && confidence < 40) { score += 15; factors.push('uncategorized-low-confidence') }
  if (/\d{4,}/.test(domain.split('.')[0])) { score += 10; factors.push('numeric-subdomain-pattern') }
  return {
    riskLevel: score >= 70 ? 'high' : score >= 30 ? 'medium' : score > 0 ? 'low' : 'none',
    riskScore: Math.min(score, 100), riskFactors: factors
  }
}

const DEFAULT_POLICY: Record<string, string> = {
  'adult': 'Block', 'gambling': 'Block', 'malware': 'Block', 'phishing': 'Block',
  'botnet/c2': 'Block', 'suspicious': 'Warn', 'spyware': 'Block',
  'exploit/attack tools': 'Block', 'scam/fraud': 'Block', 'proxy/anonymizer': 'Warn',
  'vpn services': 'Warn', 'cryptocurrency': 'Warn', 'social networking': 'Warn',
  'streaming video': 'Warn', 'games': 'Warn', 'messaging': 'Warn',
  'dynamic dns': 'Warn', 'ransomware': 'Block', 'cryptojacking': 'Block'
};

function getDefaultAction(cat: string): string { return DEFAULT_POLICY[cat.toLowerCase()] || 'Allow'; }

function getHighestAction(categories: string[]): string {
  if (!categories.length) return 'Allow';
  return categories.reduce((best, cat) => {
    const a = getDefaultAction(cat);
    return (ACTION_PRIORITY[a] || 0) > (ACTION_PRIORITY[best] || 0) ? a : best;
  }, 'Allow');
}

function normalizeDomain(input: string): string {
  let d = input.toLowerCase().trim();
  try { if (!d.startsWith('http')) d = 'https://' + d; d = new URL(d).hostname; } catch {}
  return d.replace(/^www\./, '');
}

async function queryGroupPolicy(userId: string | null, category: string): Promise<{ action: string; groupName: string } | null> {
  if (!userId) return null;
  try {
    const db = getDB();
    const r = await db.execute({
      sql: `SELECT g.name as group_name, gr.action FROM url_policy_groups g JOIN url_policy_user_assignments a ON a.group_id = g.id JOIN url_policy_group_rules gr ON gr.group_id = g.id WHERE a.user_id = ? AND g.is_active = 1 AND LOWER(gr.category) = LOWER(?) ORDER BY g.priority ASC LIMIT 1`,
      args: [userId, category]
    });
    if (r.rows.length > 0) return { action: r.rows[0].action as string, groupName: r.rows[0].group_name as string };
  } catch {}
  return null;
}

// P0: Cloudflare Intel lookup with in-memory L2 cache
async function queryCFIntelCached(domain: string): Promise<{ categories: string[]; isMalicious: boolean; riskLevel: string } | null> {
  const cached = getCFCached(domain)
  if (cached) return cached
  if (!isCloudflareIntelConfigured()) return null
  try {
    const result = await queryCloudflareIntel(domain)
    if (result) { setCFCache(domain, result); return result }
  } catch (e) { console.error('CF Intel error:', e) }
  return null
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || '';
  const userId = request.nextUrl.searchParams.get('userId') || null;
  if (!url) return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  try { return NextResponse.json(await evaluateUrl(url, userId)); }
  catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = body.userId || null;
    if (Array.isArray(body.urls)) {
      const results = await Promise.all(body.urls.slice(0, 50).map((u: string) => evaluateUrl(u, userId)));
      return NextResponse.json({ results, count: results.length });
    }
    if (body.url) return NextResponse.json(await evaluateUrl(body.url, userId));
    return NextResponse.json({ error: 'url or urls required' }, { status: 400 });
  } catch (e: unknown) { return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 }); }
}

// P0 Optimized: 5-layer evaluation with L1 memory + L2 Redis + CF Intel
async function evaluateUrl(inputUrl: string, userId: string | null = null) {
  const domain = normalizeDomain(inputUrl);
  const startTime = Date.now();

  // L1: In-memory cache
  const cached = getCached(domain);
  if (cached) return { ...cached, evalMs: Date.now() - startTime, cached: true, cacheLayer: 'L1-memory', timestamp: new Date().toISOString() };

  // L2: Upstash Redis persistent cache (survives cold starts)
  const redisKey = `urleval:${domain}`;
  const redisCached = await redisGet(redisKey);
  if (redisCached) {
    setCache(domain, redisCached); // warm L1
    return { ...redisCached, evalMs: Date.now() - startTime, cached: true, cacheLayer: 'L2-redis', timestamp: new Date().toISOString() };
  }

  const staticCategories = categorizeUrl(inputUrl);
  const dgaResult = detectDGA(domain);
  const apex = domain.split('.').length > 2 ? domain.split('.').slice(-2).join('.') : null;

  let override: { action: string } | null = null;
  let customMatch: { category: string; action: string } | null = null;
  let dbCategory: string | null = null;
  let threatIntel = { isMalicious: false, riskLevel: 'unknown', threatType: null as string | null };
  let cfIntelResult: { categories: string[]; isMalicious: boolean; riskLevel: string } | null = null;

  try {
    const db = getDB();
    const r0 = await db.execute({ sql: `SELECT action FROM url_policy_overrides WHERE domain = ? AND (expires_at IS NULL OR expires_at > datetime('now')) LIMIT 1`, args: [domain] });
    if (r0.rows.length > 0) override = { action: r0.rows[0].action as string };

    const r1 = await db.execute({ sql: `SELECT cc.name as category, cc.action FROM custom_url_entries cue JOIN custom_url_categories cc ON cc.id = cue.category_id WHERE cue.domain = ? AND cc.is_active = 1 LIMIT 1`, args: [domain] });
    if (r1.rows.length > 0) customMatch = { category: r1.rows[0].category as string, action: r1.rows[0].action as string };

    const r2 = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1', args: [domain] });
    if (r2.rows.length > 0) { dbCategory = r2.rows[0].category as string; }
    else if (apex) {
      const ra = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1', args: [apex] });
      if (ra.rows.length > 0) dbCategory = ra.rows[0].category as string;
    }

    const r3 = await db.execute({ sql: 'SELECT risk_level, categories FROM indicators WHERE value_normalized = ? AND is_active = 1 ORDER BY confidence DESC LIMIT 1', args: [domain] });
    if (r3.rows.length > 0) {
      const risk = r3.rows[0].risk_level as string;
      let cats: string[] = [];
      try { cats = JSON.parse((r3.rows[0].categories as string) || '[]'); } catch {}
      threatIntel = { isMalicious: ['known_malicious','high_risk'].includes(risk), riskLevel: risk, threatType: cats[0] || null };
    }
  } catch (e) { console.error('DB query error:', e); }

  const allCategories = [...staticCategories];
  let categorySource = 'static-taxonomy';
  let confidence = staticCategories.length > 0 && staticCategories[0] !== 'Uncategorized' ? 80 : 40;

  if (dbCategory && !allCategories.includes(dbCategory)) { allCategories.push(dbCategory); categorySource = 'database'; confidence = Math.min(confidence + 15, 95); }
  if (threatIntel.isMalicious) { const tc = threatIntel.threatType || 'Malware'; if (!allCategories.includes(tc)) allCategories.push(tc); categorySource = 'threat-intel'; confidence = 99; }
  if (dgaResult.isDGA) { if (!allCategories.includes('DGA/Suspicious')) allCategories.push('DGA/Suspicious'); if (categorySource === 'static-taxonomy') categorySource = 'dga-detection'; }

  // P0: CF Intel - only query when static+DB don't give high confidence
  if (confidence < 70 && !threatIntel.isMalicious) {
    cfIntelResult = await queryCFIntelCached(domain)
    if (cfIntelResult) {
      if (cfIntelResult.isMalicious) { threatIntel.isMalicious = true; threatIntel.riskLevel = 'high_risk'; confidence = 95; categorySource = 'cloudflare-intel'; }
      for (const c of cfIntelResult.categories) {
        if (!allCategories.includes(c)) { allCategories.push(c); if (confidence < 75) { confidence = 75; categorySource = 'cloudflare-intel'; } }
      }
    }
  }

  let aiClassified = false;
  if (isAIClassificationAvailable() && (allCategories.length === 0 || (allCategories.length === 1 && allCategories[0] === 'Uncategorized'))) {
    try {
      const aiResult = await classifyUrlWithAI(domain);
      if (aiResult.primaryCategory && aiResult.primaryCategory !== 'Uncategorized' && aiResult.confidence >= 50) {
        allCategories.push(aiResult.primaryCategory); categorySource = 'ai-' + aiResult.source; confidence = aiResult.confidence; aiClassified = true;
      }
    } catch {}
  }

  const riskAssessment = computeRiskLevel(allCategories, domain, threatIntel.isMalicious, confidence);
  let action = getHighestAction(allCategories);
  if (threatIntel.isMalicious) action = 'Block';
  if (dgaResult.isDGA && ACTION_PRIORITY[action] < ACTION_PRIORITY['Warn']) action = 'Warn';

  let groupPolicyApplied: string | null = null;
  if (userId) {
    for (const cat of allCategories) {
      const gp = await queryGroupPolicy(userId, cat);
      if (gp) { action = gp.action; groupPolicyApplied = gp.groupName; categorySource = 'group-policy'; break; }
    }
  }

  let customCategory: string | null = null;
  if (customMatch) {
    customCategory = customMatch.category;
    if (!allCategories.includes(customCategory)) allCategories.unshift(customCategory);
    action = customMatch.action; categorySource = 'custom'; confidence = 100;
  }

  let overrideApplied = false;
  if (override) { action = override.action; overrideApplied = true; if (categorySource !== 'custom') categorySource = 'override'; }

  const taxonomyEntries = Object.values(URL_TAXONOMY) as Array<{slug:string;name:string;group:string;defaultAction:string}>;
  const te = taxonomyEntries.find(t => staticCategories.some(c => c.toLowerCase() === t.name.toLowerCase() || c.toLowerCase() === t.slug.toLowerCase()));

  // P0: Full URL logging
  try {
    const db = getDB();
    db.execute({ sql: `INSERT OR IGNORE INTO url_policy_log (domain, action, category, risk_level, risk_score, category_source, user_id, cf_intel_used, evaluated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`, args: [domain, action, allCategories[0] || 'Uncategorized', riskAssessment.riskLevel, riskAssessment.riskScore, categorySource, userId || null, cfIntelResult ? 1 : 0] });
  } catch {}

  const result = {
    url: inputUrl, domain, action, confidence, categorySource,
    categories: allCategories, primaryCategory: allCategories[0] || 'Uncategorized',
    group: te?.group || null, defaultAction: te?.defaultAction || null,
    riskLevel: riskAssessment.riskLevel, riskScore: riskAssessment.riskScore, riskFactors: riskAssessment.riskFactors,
    threatIntel,
    cfIntel: cfIntelResult ? { used: true, categories: cfIntelResult.categories, isMalicious: cfIntelResult.isMalicious } : { used: false },
    dbCategoryMatch: dbCategory, customCategoryMatch: customCategory,
    overrideApplied, groupPolicyApplied, userId,
    dga: { isDGA: dgaResult.isDGA, score: dgaResult.score, factors: dgaResult.factors },
    evalMs: Date.now() - startTime, aiClassified, cached: false, cacheLayer: 'none',
    timestamp: new Date().toISOString()
  };

  // Write to L1 memory + L2 Redis
  setCache(domain, result);
  // L2: Persist to Upstash Redis (30min TTL for normal, 60min for high-risk blocked)
  const redisTTL = riskAssessment.riskLevel === 'high' ? 3600 : 1800;
  redisSet(redisKey, result, redisTTL); // fire-and-forget

  return result;
}
