import { NextRequest, NextResponse } from 'next/server'
import { categorizeUrl, URL_TAXONOMY } from '@/lib/url-categories'
import { queryCloudflareIntel, isCloudflareIntelConfigured } from '@/lib/url-categories'
import { getDB } from '@/lib/db'
import { classifyUrlWithAI, isAIClassificationAvailable } from '@/lib/ai-url-classifier'
import { detectDGA } from '@/lib/dga-detector'
import { analyzeSafeSearch, DEFAULT_SAFE_SEARCH_CONFIG, type SafeSearchConfig } from '@/lib/safe-search'

// ===== Upstash Redis L2 =====
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN
async function redisCmd(...args: string[]): Promise<any> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) return null
  try {
    const res = await fetch(`${UPSTASH_URL}`, { method: 'POST', headers: { Authorization: `Bearer ${UPSTASH_TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
    const data = await res.json(); return data.result ?? null
  } catch (e) { console.error('Redis error:', e); return null }
}
async function redisGet(key: string): Promise<any> { const r = await redisCmd('GET', key); if (r) try { return JSON.parse(r) } catch {}; return null }
async function redisSet(key: string, value: any, ttl = 1800): Promise<void> { await redisCmd('SET', key, JSON.stringify(value), 'EX', String(ttl)) }
async function redisMget(...keys: string[]): Promise<(any|null)[]> {
  if (!keys.length) return []; const results = await redisCmd('MGET', ...keys)
  if (!Array.isArray(results)) return keys.map(() => null)
  return results.map((r: string|null) => { if (r) try { return JSON.parse(r) } catch {}; return null })
}

// ===== Constants =====
const ACTION_PRIORITY: Record<string, number> = { 'Block': 5, 'Override': 4, 'Continue': 3, 'Warn': 2, 'Isolate': 2, 'Allow': 1 }
const RISK_HIGH_CATEGORIES = ['malware','phishing','botnet/c2','exploit/attack tools','scam/fraud','ransomware','cryptojacking','spyware']
const RISK_MEDIUM_CATEGORIES = ['suspicious','proxy/anonymizer','vpn services','dynamic dns','newly registered domain','parked/for sale','adult','gambling','cryptocurrency','dns over HTTPS']
const SUSPICIOUS_TLDS = ['xyz','top','club','buzz','tk','ml','ga','cf','gq','icu','cam','rest','click','link']

// ===== L1 Cache =====
const domainCache = new Map<string, { data: any; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000; const MAX_CACHE = 5000
const cfIntelCache = new Map<string, { data: any; ts: number }>()
const CF_CACHE_TTL = 30 * 60 * 1000
function getCached(d: string) { const e = domainCache.get(d); if (e && Date.now()-e.ts < CACHE_TTL) return e.data; domainCache.delete(d); return null }
function setCache(d: string, data: any) { if (domainCache.size > MAX_CACHE) { const o = domainCache.keys().next().value; if (o) domainCache.delete(o) }; domainCache.set(d, { data, ts: Date.now() }) }
function getCFCached(d: string) { const e = cfIntelCache.get(d); if (e && Date.now()-e.ts < CF_CACHE_TTL) return e.data; cfIntelCache.delete(d); return null }
function setCFCache(d: string, data: any) { if (cfIntelCache.size > MAX_CACHE) { const o = cfIntelCache.keys().next().value; if (o) cfIntelCache.delete(o) }; cfIntelCache.set(d, { data, ts: Date.now() }) }

// ===== Risk & Policy =====
function computeRiskLevel(cats: string[], domain: string, mal: boolean, conf: number) {
  const f: string[] = []; let s = 0
  if (mal) { s += 100; f.push('confirmed-malicious') }
  for (const cat of cats) { const c = cat.toLowerCase(); if (RISK_HIGH_CATEGORIES.includes(c)) { s += 80; f.push(`high-risk:${cat}`) } else if (RISK_MEDIUM_CATEGORIES.includes(c)) { s += 40; f.push(`med-risk:${cat}`) } }
  const tld = domain.split('.').pop() || ''; if (SUSPICIOUS_TLDS.includes(tld)) { s += 25; f.push(`sus-tld:.${tld}`) }
  if (cats.includes('Uncategorized') && conf < 40) { s += 15; f.push('uncat-low-conf') }
  if (/\d{4,}/.test(domain.split('.')[0])) { s += 10; f.push('numeric-subdomain') }
  return { riskLevel: (s >= 70 ? 'high' : s >= 30 ? 'medium' : s > 0 ? 'low' : 'none') as 'high'|'medium'|'low'|'none', riskScore: Math.min(s, 100), riskFactors: f }
}
const DEFAULT_POLICY: Record<string,string> = { 'adult':'Block','gambling':'Block','malware':'Block','phishing':'Block','botnet/c2':'Block','suspicious':'Warn','spyware':'Block','exploit/attack tools':'Block','scam/fraud':'Block','proxy/anonymizer':'Warn','vpn services':'Warn','cryptocurrency':'Warn','social networking':'Warn','streaming video':'Warn','games':'Warn','messaging':'Warn','dynamic dns':'Warn','ransomware':'Block','cryptojacking':'Block' }
function getDefaultAction(c: string) { return DEFAULT_POLICY[c.toLowerCase()] || 'Allow' }
function getHighestAction(cats: string[]) { if (!cats.length) return 'Allow'; return cats.reduce((b,c) => { const a = getDefaultAction(c); return (ACTION_PRIORITY[a]||0) > (ACTION_PRIORITY[b]||0) ? a : b }, 'Allow') }
function normalizeDomain(i: string) { let d = i.toLowerCase().trim(); try { if (!d.startsWith('http')) d = 'https://'+d; d = new URL(d).hostname } catch {}; return d.replace(/^www\./, '') }

async function queryGroupPolicy(uid: string|null, cat: string): Promise<{action:string;groupName:string}|null> {
  if (!uid) return null
  try { const db = getDB(); const r = await db.execute({ sql: `SELECT g.name as gn, gr.action FROM url_policy_groups g JOIN url_policy_user_assignments a ON a.group_id=g.id JOIN url_policy_group_rules gr ON gr.group_id=g.id WHERE a.user_id=? AND g.is_active=1 AND LOWER(gr.category)=LOWER(?) ORDER BY g.priority LIMIT 1`, args: [uid, cat] }); if (r.rows.length > 0) return { action: r.rows[0].action as string, groupName: r.rows[0].gn as string } } catch {}
  return null
}

// ===== CF Intel with L2 Redis =====
async function queryCFIntelCached(domain: string) {
  const m = getCFCached(domain); if (m) return m
  const rk = `cfintel:${domain}`; const rc = await redisGet(rk); if (rc) { setCFCache(domain, rc); return rc }
  if (!isCloudflareIntelConfigured()) return null
  try { const r = await queryCloudflareIntel(domain); if (r) { setCFCache(domain, r); redisSet(rk, r, 3600); return r } } catch {}
  return null
}

// ===== Geo detection =====
function detectCountry(req: NextRequest) {
  const vc = req.headers.get('x-vercel-ip-country'); if (vc) return { country: vc, region: req.headers.get('x-vercel-ip-country-region'), city: req.headers.get('x-vercel-ip-city'), source: 'vercel' }
  const cf = req.headers.get('cf-ipcountry'); if (cf) return { country: cf, region: null, city: null, source: 'cloudflare' }
  const cc = req.headers.get('x-client-country'); if (cc) return { country: cc, region: req.headers.get('x-client-region'), city: req.headers.get('x-client-city'), source: 'custom' }
  return { country: null, region: null, city: null, source: 'unknown' }
}
async function checkGeoRules(country: string|null, category: string): Promise<{action:string;ruleName:string}|null> {
  if (!country) return null
  try { const db = getDB(); const rules = await db.execute({ sql: 'SELECT * FROM url_policy_geo_rules WHERE is_active=1 ORDER BY priority', args: [] })
    for (const rule of rules.rows) {
      const countries: string[] = JSON.parse((rule.countries as string)||'[]'); const regions: string[] = JSON.parse((rule.regions as string)||'[]'); const cats: string[] = JSON.parse((rule.categories as string)||'[]')
      const cm = countries.length===0 || countries.includes(country.toUpperCase()); const catm = cats.length===0 || cats.some(c=>c.toLowerCase()===category.toLowerCase())
      if (cm && catm) return { action: rule.action as string, ruleName: rule.name as string }
    }
  } catch {}
  return null
}

// ===== Safe Search config loader =====
let ssConfigCache: { config: SafeSearchConfig; ts: number } | null = null
async function loadSafeSearchConfig(): Promise<SafeSearchConfig> {
  if (ssConfigCache && Date.now() - ssConfigCache.ts < 60000) return ssConfigCache.config
  try { const db = getDB(); const r = await db.execute({ sql: "SELECT config_json FROM url_policy_settings WHERE key='safe_search' LIMIT 1", args: [] })
    if (r.rows.length > 0) { const c = JSON.parse(r.rows[0].config_json as string); ssConfigCache = { config: c, ts: Date.now() }; return c }
  } catch {}
  return DEFAULT_SAFE_SEARCH_CONFIG
}

// ===== Main evaluate function =====
async function evaluateUrl(rawUrl: string, userId: string|null, req: NextRequest) {
  const domain = normalizeDomain(rawUrl)
  if (!domain) return { error: 'Invalid URL', status: 400 }

  // L1 cache check
  const l1 = getCached(domain)
  if (l1) return { ...l1, cache: 'L1' }

  // L2 Redis cache check
  const rk = `urleval:${domain}`
  const l2 = await redisGet(rk)
  if (l2) { setCache(domain, l2); return { ...l2, cache: 'L2' } }

  // Categorize
  const localCats = categorizeUrl(domain)
  const cfIntel = await queryCFIntelCached(domain)
  let allCats = [...new Set([...localCats, ...(cfIntel?.categories || [])])]

  // DGA detection
  const dgaResult = detectDGA(domain)
  let isMalicious = false
  if (dgaResult && dgaResult.isDGA) {
    isMalicious = true
    if (!allCats.includes('Suspicious')) allCats.push('Suspicious')
    if (!allCats.includes('Malware')) allCats.push('Malware')
  }

  // AI classification fallback
  if (allCats.length === 1 && allCats[0] === 'Uncategorized' && isAIClassificationAvailable()) {
    try {
      const aiResult = await classifyUrlWithAI(domain)
      if (aiResult && aiResult.categories?.length) {
        allCats = aiResult.categories
      }
    } catch {}
  }

  // Confidence
  const confidence = allCats.includes('Uncategorized') ? 30 : allCats.length > 1 ? 85 : 70

  // Risk
  const { riskLevel, riskScore, riskFactors } = computeRiskLevel(allCats, domain, isMalicious, confidence)

  // Geo detection
  const geo = detectCountry(req)

  // Policy: check group policy first, then geo rules, then default
  let finalAction = 'Allow'
  let policySource = 'default'
  const categoryActions: Record<string, string> = {}

  for (const cat of allCats) {
    // Group policy
    const gp = await queryGroupPolicy(userId, cat)
    if (gp) {
      categoryActions[cat] = gp.action
      if ((ACTION_PRIORITY[gp.action]||0) > (ACTION_PRIORITY[finalAction]||0)) {
        finalAction = gp.action
        policySource = `group:${gp.groupName}`
      }
      continue
    }
    // Geo rules
    const gr = await checkGeoRules(geo.country, cat)
    if (gr) {
      categoryActions[cat] = gr.action
      if ((ACTION_PRIORITY[gr.action]||0) > (ACTION_PRIORITY[finalAction]||0)) {
        finalAction = gr.action
        policySource = `geo:${gr.ruleName}`
      }
      continue
    }
    // Default
    const da = getDefaultAction(cat)
    categoryActions[cat] = da
    if ((ACTION_PRIORITY[da]||0) > (ACTION_PRIORITY[finalAction]||0)) {
      finalAction = da
      policySource = 'default'
    }
  }

  // Safe Search
  const ssConfig = await loadSafeSearchConfig()
  const safeSearch = analyzeSafeSearch(rawUrl, ssConfig)

  // Build result
  const result = {
    url: rawUrl,
    domain,
    categories: allCats,
    categoryActions,
    action: finalAction,
    policySource,
    riskLevel,
    riskScore,
    riskFactors,
    confidence,
    isMalicious,
    dga: dgaResult || null,
    cloudflareIntel: cfIntel ? { categories: cfIntel.categories || [], riskTypes: cfIntel.riskTypes || [] } : null,
    safeSearch: safeSearch.shouldEnforce ? safeSearch : null,
    geo,
    taxonomy: { total: Object.keys(URL_TAXONOMY).length, version: '5.0' },
    ts: new Date().toISOString()
  }

  // Cache result
  setCache(domain, result)
  redisSet(rk, result, 1800)

  return result
}

// ===== GET handler =====
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const rawUrl = searchParams.get('url')
  const userId = searchParams.get('userId') || null

  if (!rawUrl) {
    return NextResponse.json({
      error: 'Missing url parameter',
      usage: '/api/v1/url-policy/evaluate?url=example.com',
      taxonomy: { total: Object.keys(URL_TAXONOMY).length, version: '5.0' }
    }, { status: 400 })
  }

  try {
    const result = await evaluateUrl(rawUrl, userId, req)
    if (result.error) {
      return NextResponse.json(result, { status: result.status || 400 })
    }
    return NextResponse.json(result)
  } catch (e) {
    console.error('Evaluate error:', e)
    return NextResponse.json({ error: 'Internal error', ts: new Date().toISOString() }, { status: 500 })
  }
}
