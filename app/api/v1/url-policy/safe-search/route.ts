import { NextRequest, NextResponse } from 'next/server'
import { analyzeSafeSearch, getSafeSearchDNSRecords, getSafeSearchPACRules, SAFE_SEARCH_RULES, DEFAULT_SAFE_SEARCH_CONFIG, type SafeSearchConfig } from '@/lib/safe-search'
import { getDB } from '@/lib/db'

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS' }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } })
}

// GET: Get safe search config + analyze a URL + get DNS records
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  const action = request.nextUrl.searchParams.get('action') || 'config'

  // Load config from DB or use default
  let config = DEFAULT_SAFE_SEARCH_CONFIG
  try {
    const db = getDB()
    const r = await db.execute({ sql: 'SELECT config_json FROM url_policy_settings WHERE key = ? LIMIT 1', args: ['safe_search'] })
    if (r.rows.length > 0) config = JSON.parse(r.rows[0].config_json as string)
  } catch {}

  if (action === 'dns') {
    return json({ records: getSafeSearchDNSRecords(config), config })
  }

  if (action === 'pac') {
    return json({ pacRules: getSafeSearchPACRules(config), config })
  }

  if (action === 'rules') {
    return json({ rules: SAFE_SEARCH_RULES, engines: SAFE_SEARCH_RULES.map(r => r.engine) })
  }

  if (url) {
    const result = analyzeSafeSearch(url, config)
    return json({ url, ...result, config })
  }

  return json({ config, engines: SAFE_SEARCH_RULES.map(r => ({ engine: r.engine, domains: r.domains, restrictDomain: r.restrictDomain })) })
}

// POST: Analyze URL(s) for safe search enforcement
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    let config = DEFAULT_SAFE_SEARCH_CONFIG
    try {
      const db = getDB()
      const r = await db.execute({ sql: 'SELECT config_json FROM url_policy_settings WHERE key = ? LIMIT 1', args: ['safe_search'] })
      if (r.rows.length > 0) config = JSON.parse(r.rows[0].config_json as string)
    } catch {}

    if (body.url) {
      const result = analyzeSafeSearch(body.url, config)
      return json({ url: body.url, ...result })
    }

    if (Array.isArray(body.urls)) {
      const results = body.urls.slice(0, 100).map((u: string) => ({ url: u, ...analyzeSafeSearch(u, config) }))
      return json({ results, count: results.length })
    }

    return json({ error: 'url or urls required' }, 400)
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

// PUT: Update safe search config
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json() as Partial<SafeSearchConfig>
    const newConfig = { ...DEFAULT_SAFE_SEARCH_CONFIG, ...body }
    if (body.engines) newConfig.engines = { ...DEFAULT_SAFE_SEARCH_CONFIG.engines, ...body.engines }

    try {
      const db = getDB()
      await db.execute({
        sql: `INSERT INTO url_policy_settings (key, config_json, updated_at) VALUES ('safe_search', ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET config_json = ?, updated_at = datetime('now')`,
        args: [JSON.stringify(newConfig), JSON.stringify(newConfig)]
      })
    } catch (e) {
      return json({ error: 'Failed to save config', detail: String(e) }, 500)
    }

    return json({ success: true, config: newConfig })
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}
