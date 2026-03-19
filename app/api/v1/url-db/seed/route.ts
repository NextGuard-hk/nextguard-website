import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { categorizeUrl } from '@/lib/url-categories'
import { queryCloudflareIntel, isCloudflareIntelConfigured } from '@/lib/url-categories'

// Vercel function config — upgraded for Tier-1 scale seeding
export const maxDuration = 300
export const dynamic = 'force-dynamic'

const SEED_SECRET = process.env.SEED_API_SECRET || process.env.CRON_SECRET

function authCheck(req: NextRequest): boolean {
  const auth = req.headers.get('x-seed-secret') || req.nextUrl.searchParams.get('secret')
  return auth === SEED_SECRET
}

async function initTable() {
  const db = getDB()
  await db.execute({
    sql: `CREATE TABLE IF NOT EXISTS url_category_db (
      domain TEXT PRIMARY KEY,
      categories TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'seed',
      rank INTEGER,
      is_malicious INTEGER NOT NULL DEFAULT 0,
      threat_type TEXT,
      confidence INTEGER NOT NULL DEFAULT 70,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    args: []
  })
  await db.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_url_db_malicious ON url_category_db(is_malicious)`, args: [] })
  await db.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_url_db_source ON url_category_db(source)`, args: [] })
  await db.execute({ sql: `CREATE INDEX IF NOT EXISTS idx_url_db_categories ON url_category_db(categories)`, args: [] })
  return { ok: true, message: 'Table url_category_db ready' }
}

async function batchUpsert(entries: { domain: string; categories: string; source: string; rank?: number; is_malicious: number; threat_type?: string; confidence: number }[]) {
  const db = getDB()
  const stmts = entries.map(e => ({
    sql: `INSERT INTO url_category_db (domain, categories, source, rank, is_malicious, threat_type, confidence, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(domain) DO UPDATE SET
        categories=excluded.categories,
        source=CASE WHEN excluded.confidence > url_category_db.confidence THEN excluded.source ELSE url_category_db.source END,
        rank=COALESCE(excluded.rank, url_category_db.rank),
        is_malicious=MAX(url_category_db.is_malicious, excluded.is_malicious),
        threat_type=COALESCE(excluded.threat_type, url_category_db.threat_type),
        confidence=MAX(url_category_db.confidence, excluded.confidence),
        updated_at=datetime('now')`,
    args: [e.domain, e.categories, e.source, e.rank ?? null, e.is_malicious, e.threat_type ?? null, e.confidence]
  }))
  const BATCH_SIZE = 400
  let done = 0
  for (let i = 0; i < stmts.length; i += BATCH_SIZE) {
    const chunk = stmts.slice(i, i + BATCH_SIZE)
    try {
      await db.batch(chunk, 'write')
      done += chunk.length
    } catch {
      for (const s of chunk) { try { await db.execute(s); done++ } catch {} }
    }
  }
  return done
}

// Tranco Top 1M — supports pagination for massive imports
async function seedTranco(limit: number = 5000, offset: number = 0) {
  const listRes = await fetch('https://tranco-list.eu/top-1m-id', { redirect: 'follow', signal: AbortSignal.timeout(5000) }).catch(() => null)
  const listId = listRes?.ok ? (await listRes.text()).trim() : 'L76X4'
  const maxRank = Math.min(offset + limit + 1000, 1000000)
  const csvRes = await fetch(`https://tranco-list.eu/download/${listId}/${maxRank}`, { signal: AbortSignal.timeout(60000) })
  if (!csvRes.ok) throw new Error(`Failed to fetch Tranco CSV: ${csvRes.status}`)
  const text = await csvRes.text()
  const allLines = text.trim().split('\n')
  const lines = allLines.slice(offset, offset + limit)
  const entries: { domain: string; categories: string; source: string; rank: number; is_malicious: number; confidence: number }[] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const rank = parseInt(parts[0])
    const domain = parts[1].trim().toLowerCase().replace(/^www\./, '')
    if (!domain || domain.length < 3) continue
    const cats = categorizeUrl(domain)
    entries.push({ domain, categories: JSON.stringify(cats), source: 'tranco', rank, is_malicious: 0, confidence: 75 })
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'tranco', listId, offset, limit, totalAvailable: allLines.length }
}

// Majestic Million — top websites by referring subnets
async function seedMajestic(limit: number = 10000, offset: number = 0) {
  const res = await fetch('https://downloads.majestic.com/majestic_million.csv', { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Majestic fetch failed: ${res.status}`)
  const text = await res.text()
  const allLines = text.trim().split('\n').slice(1) // skip header
  const lines = allLines.slice(offset, offset + limit)
  const entries: { domain: string; categories: string; source: string; rank: number; is_malicious: number; confidence: number }[] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 3) continue
    const rank = parseInt(parts[0])
    const domain = parts[2]?.trim().toLowerCase().replace(/^www\./, '')
    if (!domain || domain.length < 3) continue
    const cats = categorizeUrl(domain)
    entries.push({ domain, categories: JSON.stringify(cats), source: 'majestic', rank, is_malicious: 0, confidence: 72 })
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'majestic', offset, limit, totalAvailable: allLines.length }
}

// Cisco Umbrella Top 1M
async function seedUmbrella(limit: number = 10000, offset: number = 0) {
  // Try direct S3 zip first, but fall back to CSV mirror
  const res = await fetch('https://s3-us-west-1.amazonaws.com/umbrella-static/top-1m.csv.zip', { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`Umbrella fetch failed: ${res.status}`)
  // ZIP handling: try to read as text first (some proxies unzip)
  let text = await res.text()
  // If it's binary zip data, we can't parse it server-side without a lib
  if (text.startsWith('PK')) throw new Error('Umbrella returned ZIP binary — use pre-extracted mirror')
  const allLines = text.trim().split('\n').filter(l => l.trim())
  const lines = allLines.slice(offset, offset + limit)
  const entries: { domain: string; categories: string; source: string; rank: number; is_malicious: number; confidence: number }[] = []
  for (const line of lines) {
    const parts = line.split(',')
    if (parts.length < 2) continue
    const rank = parseInt(parts[0])
    const domain = parts[1].trim().toLowerCase().replace(/^www\./, '')
    if (!domain || domain.length < 3) continue
    const cats = categorizeUrl(domain)
    entries.push({ domain, categories: JSON.stringify(cats), source: 'umbrella', rank, is_malicious: 0, confidence: 73 })
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'umbrella', offset, limit }
}

// UT1 Blacklists (Toulouse University) — categorized blocklists
async function seedUT1(category: string = 'all', limit: number = 50000) {
  const ut1Categories: Record<string, string[]> = {
    adult: ['Adult/Mature Content'],
    gambling: ['Gambling'],
    malware: ['Malware'],
    phishing: ['Phishing'],
    drugs: ['Drugs'],
    hacking: ['Hacking'],
    warez: ['Software Piracy'],
    violence: ['Violence'],
    weapons: ['Weapons'],
    ads: ['Ads/Tracking'],
    cryptomining: ['Cryptocurrency Mining'],
    dating: ['Dating/Personals'],
    filehosting: ['File Sharing'],
    games: ['Games'],
    social: ['Social Networking'],
    vpn: ['Proxy/VPN']
  }
  const targets = category === 'all' ? Object.keys(ut1Categories) : [category]
  let totalInserted = 0
  const results: Record<string, any> = {}
  for (const cat of targets) {
    try {
      const url = `https://dsi.ut-capitole.fr/blacklists/download/${cat}.tar.gz`
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
      if (!res.ok) { results[cat] = { error: `fetch failed: ${res.status}` }; continue }
      // tar.gz can't be parsed easily, try the plain domain list
      const plainUrl = `https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists/${cat}/domains`
      const plainRes = await fetch(plainUrl, { signal: AbortSignal.timeout(15000) })
      if (!plainRes.ok) { results[cat] = { error: 'github mirror failed' }; continue }
      const text = await plainRes.text()
      const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))
      const catLabels = ut1Categories[cat] || ['Uncategorized']
      const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type?: string; confidence: number }[] = []
      for (const line of lines.slice(0, limit)) {
        const domain = line.trim().toLowerCase().replace(/^www\./, '')
        if (!domain || domain.length < 3 || domain.includes(' ') || domain.includes('/')) continue
        const isMalicious = ['malware', 'phishing'].includes(cat) ? 1 : 0
        entries.push({ domain, categories: JSON.stringify(catLabels), source: `ut1-${cat}`, is_malicious: isMalicious, threat_type: isMalicious ? cat : undefined, confidence: 82 })
      }
      const inserted = await batchUpsert(entries)
      totalInserted += inserted
      results[cat] = { inserted, total: entries.length, available: lines.length }
    } catch (e: any) {
      results[cat] = { error: e.message }
    }
  }
  return { ok: true, inserted: totalInserted, categories: results, source: 'ut1' }
}

// OISD blocklist — ads/tracking domains
async function seedOISD(limit: number = 50000) {
  const res = await fetch('https://small.oisd.nl/domainswild', { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('OISD fetch failed')
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type: string; confidence: number }[] = []
  for (const line of lines.slice(0, limit)) {
    const domain = line.trim().replace(/^\*\./, '').toLowerCase()
    if (!domain || domain.length < 3 || domain.includes(' ')) continue
    const cats = categorizeUrl(domain)
    const finalCats = cats.includes('Uncategorized') ? ['Ads/Tracking'] : cats
    entries.push({ domain, categories: JSON.stringify(finalCats), source: 'oisd', is_malicious: 1, threat_type: 'ads-tracking', confidence: 80 })
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'oisd', totalAvailable: lines.length }
}

async function seedURLhaus() {
  const res = await fetch('https://urlhaus.abuse.ch/downloads/csv_online/', { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error('URLhaus fetch failed')
  const text = await res.text()
  const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
  const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type: string; confidence: number }[] = []
  for (const line of lines.slice(0, 50000)) {
    const parts = line.split(',')
    if (parts.length < 6) continue
    const url = parts[2]?.replace(/"/g, '').trim()
    const threat = parts[5]?.replace(/"/g, '').trim() || 'malware'
    if (!url || !url.startsWith('http')) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      if (!domain) continue
      const cats = threat.toLowerCase().includes('phish') ? ['Phishing', 'Malware'] : ['Malware']
      entries.push({ domain, categories: JSON.stringify(cats), source: 'urlhaus', is_malicious: 1, threat_type: threat, confidence: 95 })
    } catch { continue }
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'urlhaus' }
}

async function seedPhishTank() {
  const res = await fetch('https://data.phishtank.com/data/online-valid.csv', {
    headers: { 'User-Agent': 'NextGuard-Security/1.0 (nextguard@nextguard.com)' },
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`PhishTank fetch failed: ${res.status}`)
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('phish_id'))
  const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type: string; confidence: number }[] = []
  for (const line of lines.slice(0, 30000)) {
    const parts = line.split(',')
    const url = parts[1]?.replace(/"/g, '').trim()
    if (!url || !url.startsWith('http')) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      if (!domain) continue
      entries.push({ domain, categories: JSON.stringify(['Phishing', 'Scam/Fraud']), source: 'phishtank', is_malicious: 1, threat_type: 'phishing', confidence: 97 })
    } catch { continue }
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'phishtank' }
}

async function seedAbuseFeeds() {
  let inserted = 0
  try {
    const res = await fetch('https://threatfox.abuse.ch/export/csv/domains/recent/', { signal: AbortSignal.timeout(15000) })
    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
      const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type: string; confidence: number }[] = []
      for (const line of lines.slice(0, 20000)) {
        const parts = line.split(',')
        const domain = parts[1]?.replace(/"/g, '').trim().toLowerCase()
        const threat = parts[3]?.replace(/"/g, '').trim() || 'malware'
        const conf = parseInt(parts[5] || '80') || 80
        if (!domain || domain.length < 3 || domain.includes('/')) continue
        const cats = threat.toLowerCase().includes('botnet') ? ['Botnet/C2', 'Malware'] : ['Malware']
        entries.push({ domain, categories: JSON.stringify(cats), source: 'threatfox', is_malicious: 1, threat_type: threat, confidence: conf })
      }
      inserted = await batchUpsert(entries)
    }
  } catch {}
  return { ok: true, inserted, sources: ['threatfox'] }
}

async function seedOpenPhish() {
  const res = await fetch('https://openphish.com/feed.txt', { signal: AbortSignal.timeout(50000) })
  if (!res.ok) throw new Error('OpenPhish fetch failed')
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim() && l.startsWith('http'))
  const entries: { domain: string; categories: string; source: string; is_malicious: number; threat_type: string; confidence: number }[] = []
  for (const url of lines) {
    try {
      const domain = new URL(url.trim()).hostname.replace(/^www\./, '').toLowerCase()
      if (!domain) continue
      entries.push({ domain, categories: JSON.stringify(['Phishing']), source: 'openphish', is_malicious: 1, threat_type: 'phishing', confidence: 90 })
    } catch { continue }
  }
  const inserted = await batchUpsert(entries)
  return { ok: true, inserted, total: entries.length, source: 'openphish' }
}

async function recategorize(limit: number = 500) {
  const db = getDB()
  const rows = await db.execute({ sql: `SELECT domain FROM url_category_db WHERE categories LIKE '%Uncategorized%' AND source = 'tranco' ORDER BY rank ASC LIMIT ?`, args: [limit] })
  if (!rows.rows.length) return { ok: true, updated: 0, message: 'No uncategorized entries found' }
  const useCf = isCloudflareIntelConfigured()
  let updated = 0
  const BATCH = 20
  for (let i = 0; i < rows.rows.length; i += BATCH) {
    const batch = rows.rows.slice(i, i + BATCH)
    const updates: { sql: string; args: any[] }[] = []
    for (const row of batch) {
      const domain = (row as any).domain as string
      let newCats: string[] = []
      let source = 'heuristic'
      if (useCf) {
        try { const cfCats = await queryCloudflareIntel(domain); if (cfCats?.length) { newCats = cfCats; source = 'cloudflare-intel' } } catch {}
      }
      if (!newCats.length) {
        const hCats = categorizeUrl(domain)
        if (!hCats.includes('Uncategorized')) { newCats = hCats; source = 'heuristic-v2' }
      }
      if (newCats.length) {
        updates.push({ sql: `UPDATE url_category_db SET categories = ?, source = ?, confidence = CASE WHEN ? = 'cloudflare-intel' THEN 85 ELSE confidence END, updated_at = datetime('now') WHERE domain = ? AND categories LIKE '%Uncategorized%'`, args: [JSON.stringify(newCats), source, source, domain] })
      }
    }
    if (updates.length) {
      try { await db.batch(updates, 'write'); updated += updates.length } catch { for (const u of updates) { try { await db.execute(u); updated++ } catch {} } }
    }
  }
  return { ok: true, updated, total: rows.rows.length, usedCloudflare: useCf }
}

async function getStats() {
  const db = getDB()
  const total = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM url_category_db', args: [] })
  const bySource = await db.execute({ sql: 'SELECT source, COUNT(*) as cnt FROM url_category_db GROUP BY source ORDER BY cnt DESC', args: [] })
  const malicious = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM url_category_db WHERE is_malicious=1', args: [] })
  const topCats = await db.execute({ sql: `SELECT categories, COUNT(*) as cnt FROM url_category_db GROUP BY categories ORDER BY cnt DESC LIMIT 20`, args: [] })
  const uncatCount = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM url_category_db WHERE categories LIKE '%Uncategorized%'`, args: [] })
  return {
    total: (total.rows[0] as any).cnt,
    malicious: (malicious.rows[0] as any).cnt,
    uncategorized: (uncatCount.rows[0] as any).cnt,
    bySource: bySource.rows.map((r: any) => ({ source: r.source, count: r.cnt })),
    topCategories: topCats.rows.map((r: any) => ({ categories: r.categories, count: r.cnt })).slice(0, 15)
  }
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const action = req.nextUrl.searchParams.get('action') || 'stats'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '5000')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0')
  const category = req.nextUrl.searchParams.get('category') || 'all'

  try {
    if (action === 'init') return NextResponse.json(await initTable())
    if (action === 'tranco') { await initTable(); return NextResponse.json(await seedTranco(limit, offset)) }
    if (action === 'majestic') { await initTable(); return NextResponse.json(await seedMajestic(limit, offset)) }
    if (action === 'umbrella') { await initTable(); return NextResponse.json(await seedUmbrella(limit, offset)) }
    if (action === 'ut1') { await initTable(); return NextResponse.json(await seedUT1(category, limit)) }
    if (action === 'urlhaus') { await initTable(); return NextResponse.json(await seedURLhaus()) }
    if (action === 'phishtank') { await initTable(); return NextResponse.json(await seedPhishTank()) }
    if (action === 'oisd') { await initTable(); return NextResponse.json(await seedOISD(limit)) }
    if (action === 'openphish') { await initTable(); return NextResponse.json(await seedOpenPhish()) }
    if (action === 'recategorize') { return NextResponse.json(await recategorize(limit)) }
    if (action === 'threats') {
      await initTable()
      const [urlhaus, phishtank, abuse, openphish] = await Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds(), seedOpenPhish()])
      return NextResponse.json({
        ok: true,
        urlhaus: urlhaus.status === 'fulfilled' ? urlhaus.value : { error: String((urlhaus as any).reason) },
        phishtank: phishtank.status === 'fulfilled' ? phishtank.value : { error: String((phishtank as any).reason) },
        threatfox: abuse.status === 'fulfilled' ? abuse.value : { error: String((abuse as any).reason) },
        openphish: openphish.status === 'fulfilled' ? openphish.value : { error: String((openphish as any).reason) }
      })
    }
    if (action === 'stats') return NextResponse.json(await getStats())
    if (action === 'cron') {
      await initTable()
      const [threats, oisd] = await Promise.allSettled([
        Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds(), seedOpenPhish()]),
        seedOISD()
      ])
      const stats = await getStats()
      return NextResponse.json({ ok: true, threats: threats.status === 'fulfilled' ? 'done' : 'failed', oisd: oisd.status === 'fulfilled' ? oisd.value : { error: String((oisd as any).reason) }, stats })
    }
    if (action === 'all') {
      await initTable()
      const tranco = await seedTranco(limit, offset)
      const [urlhaus, phishtank, abuse, oisd, openphish] = await Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds(), seedOISD(), seedOpenPhish()])
      const recat = await recategorize(300)
      const stats = await getStats()
      return NextResponse.json({
        ok: true, tranco,
        urlhaus: urlhaus.status === 'fulfilled' ? urlhaus.value : { error: String((urlhaus as any).reason) },
        phishtank: phishtank.status === 'fulfilled' ? phishtank.value : { error: String((phishtank as any).reason) },
        threatfox: abuse.status === 'fulfilled' ? abuse.value : { error: String((abuse as any).reason) },
        oisd: oisd.status === 'fulfilled' ? oisd.value : { error: String((oisd as any).reason) },
        openphish: openphish.status === 'fulfilled' ? openphish.value : { error: String((openphish as any).reason) },
        recategorize: recat, stats
      })
    }
    // Phase 1: seed all top-list sources in batch
    if (action === 'phase1-toplists') {
      await initTable()
      const [tranco, majestic] = await Promise.allSettled([seedTranco(limit, offset), seedMajestic(limit, offset)])
      const stats = await getStats()
      return NextResponse.json({
        ok: true,
        tranco: tranco.status === 'fulfilled' ? tranco.value : { error: String((tranco as any).reason) },
        majestic: majestic.status === 'fulfilled' ? majestic.value : { error: String((majestic as any).reason) },
        stats
      })
    }
    return NextResponse.json({ error: 'Unknown action', actions: ['init','tranco','majestic','umbrella','ut1','urlhaus','phishtank','oisd','openphish','threats','recategorize','cron','all','phase1-toplists','stats'] }, { status: 400 })
  } catch (e: any) {
    console.error('Seed error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
