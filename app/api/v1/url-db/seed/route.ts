import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
import { categorizeUrl } from '@/lib/url-categories'
import { queryCloudflareIntel, isCloudflareIntelConfigured } from '@/lib/url-categories'

// Vercel function config
export const maxDuration = 60
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
  return { ok: true, message: 'Table url_category_db ready' }
}

// Tranco seeding - download only needed range (top 10k not 1M)
async function seedTranco(limit: number = 2000, offset: number = 0, cfEnrich: boolean = false) {
  const db = getDB()
  const listRes = await fetch('https://tranco-list.eu/top-1m-id', { redirect: 'follow', signal: AbortSignal.timeout(5000) }).catch(() => null)
  const listId = listRes?.ok ? (await listRes.text()).trim() : 'L76X4'
  // Download only top 10k instead of 1M for speed
  const maxRank = Math.min(offset + limit + 1000, 10000)
  const csvRes = await fetch(`https://tranco-list.eu/download/${listId}/${maxRank}`, { signal: AbortSignal.timeout(30000) })
  if (!csvRes.ok) throw new Error(`Failed to fetch Tranco CSV: ${csvRes.status}`)
  const text = await csvRes.text()
  const allLines = text.trim().split('\n')
  const lines = allLines.slice(offset, offset + limit)
  let inserted = 0, skipped = 0
  const BATCH = 100
  for (let i = 0; i < lines.length; i += BATCH) {
    const batch = lines.slice(i, i + BATCH)
    const entries: { domain: string; rank: number; cats: string[] }[] = []
    for (const line of batch) {
      const parts = line.split(',')
      if (parts.length < 2) continue
      const rank = parseInt(parts[0])
      const domain = parts[1].trim().toLowerCase().replace(/^www\./, '')
      if (!domain || domain.length < 3) continue
      const cats = categorizeUrl(domain)
      let finalCats = cats
      if (cfEnrich && isCloudflareIntelConfigured() && cats.includes('Uncategorized')) {
        try { const cfCats = await queryCloudflareIntel(domain); if (cfCats?.length) finalCats = cfCats } catch {}
      }
      entries.push({ domain, rank, cats: finalCats })
    }
    for (const e of entries) {
      try {
        await db.execute({
          sql: `INSERT INTO url_category_db (domain, categories, source, rank, confidence) VALUES (?, ?, 'tranco', ?, 75) ON CONFLICT(domain) DO UPDATE SET categories=excluded.categories, rank=excluded.rank, updated_at=datetime('now')`,
          args: [e.domain, JSON.stringify(e.cats), e.rank]
        })
        inserted++
      } catch { skipped++ }
    }
  }
  return { ok: true, inserted, skipped, source: 'tranco', listId, offset, limit, totalAvailable: allLines.length }
}

// OISD blocklist - use small list for speed
async function seedOISD(limit: number = 5000) {
  const db = getDB()
  const res = await fetch('https://small.oisd.nl/domainswild', { signal: AbortSignal.timeout(15000) })
  if (!res.ok) throw new Error('OISD fetch failed')
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('#'))
  let inserted = 0, skipped = 0
  for (const line of lines.slice(0, limit)) {
    const domain = line.trim().replace(/^\*\./, '').toLowerCase()
    if (!domain || domain.length < 3 || domain.includes(' ')) continue
    const cats = categorizeUrl(domain)
    const finalCats = cats.includes('Uncategorized') ? ['Ads/Tracking'] : cats
    try {
      await db.execute({
        sql: `INSERT INTO url_category_db (domain, categories, source, is_malicious, threat_type, confidence) VALUES (?, ?, 'oisd', 1, 'ads-tracking', 80) ON CONFLICT(domain) DO UPDATE SET categories=CASE WHEN url_category_db.source IN ('urlhaus','phishtank','threatfox') THEN url_category_db.categories ELSE excluded.categories END, updated_at=datetime('now')`,
        args: [domain, JSON.stringify(finalCats)]
      })
      inserted++
    } catch { skipped++ }
  }
  return { ok: true, inserted, skipped, source: 'oisd', totalAvailable: lines.length }
}

async function seedURLhaus() {
  const db = getDB()
  const res = await fetch('https://urlhaus.abuse.ch/downloads/csv_online/', { signal: AbortSignal.timeout(20000) })
  if (!res.ok) throw new Error('URLhaus fetch failed')
  const text = await res.text()
  const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
  let inserted = 0, skipped = 0
  for (const line of lines.slice(0, 50000)) {
    const parts = line.split(',')
    if (parts.length < 6) continue
    const url = parts[2]?.replace(/"/g, '').trim()
    const threat = parts[5]?.replace(/"/g, '').trim() || 'malware'
    if (!url || !url.startsWith('http')) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      if (!domain) continue
      const cats = threat.toLowerCase().includes('phish') ? JSON.stringify(['Phishing', 'Malware']) : JSON.stringify(['Malware'])
      await db.execute({
        sql: `INSERT INTO url_category_db (domain, categories, source, is_malicious, threat_type, confidence) VALUES (?, ?, 'urlhaus', 1, ?, 95) ON CONFLICT(domain) DO UPDATE SET is_malicious=1, threat_type=excluded.threat_type, categories=excluded.categories, updated_at=datetime('now')`,
        args: [domain, cats, threat]
      })
      inserted++
    } catch { skipped++ }
  }
  return { ok: true, inserted, skipped, source: 'urlhaus' }
}

async function seedPhishTank() {
  const db = getDB()
  const res = await fetch('https://data.phishtank.com/data/online-valid.csv', {
    headers: { 'User-Agent': 'NextGuard-Security/1.0 (nextguard@nextguard.com)' },
    signal: AbortSignal.timeout(20000)
  })
  if (!res.ok) throw new Error(`PhishTank fetch failed: ${res.status}`)
  const text = await res.text()
  const lines = text.split('\n').filter(l => l.trim() && !l.startsWith('phish_id'))
  let inserted = 0, skipped = 0
  for (const line of lines.slice(0, 30000)) {
    const parts = line.split(',')
    const url = parts[1]?.replace(/"/g, '').trim()
    if (!url || !url.startsWith('http')) continue
    try {
      const domain = new URL(url).hostname.replace(/^www\./, '').toLowerCase()
      if (!domain) continue
      await db.execute({
        sql: `INSERT INTO url_category_db (domain, categories, source, is_malicious, threat_type, confidence) VALUES (?, ?, 'phishtank', 1, 'phishing', 97) ON CONFLICT(domain) DO UPDATE SET is_malicious=1, threat_type='phishing', categories=excluded.categories, updated_at=datetime('now')`,
        args: [domain, JSON.stringify(['Phishing', 'Scam/Fraud'])]
      })
      inserted++
    } catch { skipped++ }
  }
  return { ok: true, inserted, skipped, source: 'phishtank' }
}

async function seedAbuseFeeds() {
  const db = getDB()
  let inserted = 0, skipped = 0
  try {
    const res = await fetch('https://threatfox.abuse.ch/export/csv/domains/recent/', { signal: AbortSignal.timeout(15000) })
    if (res.ok) {
      const text = await res.text()
      const lines = text.split('\n').filter(l => !l.startsWith('#') && l.trim())
      for (const line of lines.slice(0, 20000)) {
        const parts = line.split(',')
        const domain = parts[1]?.replace(/"/g, '').trim().toLowerCase()
        const threat = parts[3]?.replace(/"/g, '').trim() || 'malware'
        const conf = parseInt(parts[5] || '80') || 80
        if (!domain || domain.length < 3 || domain.includes('/')) continue
        const cats = threat.toLowerCase().includes('botnet') ? JSON.stringify(['Botnet/C2', 'Malware']) : JSON.stringify(['Malware'])
        try {
          await db.execute({
            sql: `INSERT INTO url_category_db (domain, categories, source, is_malicious, threat_type, confidence) VALUES (?, ?, 'threatfox', 1, ?, ?) ON CONFLICT(domain) DO UPDATE SET is_malicious=1, threat_type=excluded.threat_type, categories=excluded.categories, updated_at=datetime('now')`,
            args: [domain, cats, threat, conf]
          })
          inserted++
        } catch { skipped++ }
      }
    }
  } catch {}
  return { ok: true, inserted, skipped, sources: ['threatfox'] }
}

async function getStats() {
  const db = getDB()
  const total = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM url_category_db', args: [] })
  const bySource = await db.execute({ sql: 'SELECT source, COUNT(*) as cnt FROM url_category_db GROUP BY source ORDER BY cnt DESC', args: [] })
  const malicious = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM url_category_db WHERE is_malicious=1', args: [] })
  const topCats = await db.execute({ sql: `SELECT categories, COUNT(*) as cnt FROM url_category_db GROUP BY categories ORDER BY cnt DESC LIMIT 20`, args: [] })
  return {
    total: (total.rows[0] as any).cnt,
    malicious: (malicious.rows[0] as any).cnt,
    bySource: bySource.rows.map((r: any) => ({ source: r.source, count: r.cnt })),
    topCategories: topCats.rows.map((r: any) => ({ categories: r.categories, count: r.cnt })).slice(0, 10)
  }
}

export async function GET(req: NextRequest) {
  if (!authCheck(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const action = req.nextUrl.searchParams.get('action') || 'stats'
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '2000')
  const offset = parseInt(req.nextUrl.searchParams.get('offset') || '0')
  const cfEnrich = req.nextUrl.searchParams.get('cf') === '1'
  try {
    if (action === 'init') return NextResponse.json(await initTable())
    if (action === 'tranco') { await initTable(); return NextResponse.json(await seedTranco(limit, offset, cfEnrich)) }
    if (action === 'urlhaus') { await initTable(); return NextResponse.json(await seedURLhaus()) }
    if (action === 'phishtank') { await initTable(); return NextResponse.json(await seedPhishTank()) }
    if (action === 'oisd') { await initTable(); return NextResponse.json(await seedOISD(limit)) }
    if (action === 'threats') {
      await initTable()
      const [urlhaus, phishtank, abuse] = await Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds()])
      return NextResponse.json({
        ok: true,
        urlhaus: urlhaus.status === 'fulfilled' ? urlhaus.value : { error: String((urlhaus as any).reason) },
        phishtank: phishtank.status === 'fulfilled' ? phishtank.value : { error: String((phishtank as any).reason) },
        threatfox: abuse.status === 'fulfilled' ? abuse.value : { error: String((abuse as any).reason) }
      })
    }
    if (action === 'stats') return NextResponse.json(await getStats())
    if (action === 'cron') {
      await initTable()
      const [threats, oisd] = await Promise.allSettled([
        Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds()]),
        seedOISD()
      ])
      const stats = await getStats()
      return NextResponse.json({ ok: true, threats: threats.status === 'fulfilled' ? 'done' : 'failed', oisd: oisd.status === 'fulfilled' ? oisd.value : { error: String((oisd as any).reason) }, stats })
    }
    if (action === 'all') {
      await initTable()
      const tranco = await seedTranco(limit, offset, false)
      const [urlhaus, phishtank, abuse, oisd] = await Promise.allSettled([seedURLhaus(), seedPhishTank(), seedAbuseFeeds(), seedOISD()])
      const stats = await getStats()
      return NextResponse.json({ ok: true, tranco, urlhaus: urlhaus.status === 'fulfilled' ? urlhaus.value : { error: String((urlhaus as any).reason) }, phishtank: phishtank.status === 'fulfilled' ? phishtank.value : { error: String((phishtank as any).reason) }, threatfox: abuse.status === 'fulfilled' ? abuse.value : { error: String((abuse as any).reason) }, oisd: oisd.status === 'fulfilled' ? oisd.value : { error: String((oisd as any).reason) }, stats })
    }
    return NextResponse.json({ error: 'Unknown action', actions: ['init','tranco','urlhaus','phishtank','oisd','threats','cron','all','stats'] }, { status: 400 })
  } catch (e: any) {
    console.error('Seed error:', e)
    return NextResponse.json({ error: e.message || 'Internal error' }, { status: 500 })
  }
}
