import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

// Geo-based URL policy rules
// Uses Vercel's x-vercel-ip-country / cf-ipcountry headers for geo detection
// Allows admins to create country/region-specific URL policy overrides

function json(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS' }
  })
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } })
}

// Detect country from request headers (Vercel, Cloudflare, custom)
export function detectCountry(request: NextRequest): { country: string | null; region: string | null; city: string | null; source: string } {
  // Vercel Edge
  const vercelCountry = request.headers.get('x-vercel-ip-country')
  const vercelRegion = request.headers.get('x-vercel-ip-country-region')
  const vercelCity = request.headers.get('x-vercel-ip-city')
  if (vercelCountry) return { country: vercelCountry, region: vercelRegion, city: vercelCity ? decodeURIComponent(vercelCity) : null, source: 'vercel' }

  // Cloudflare
  const cfCountry = request.headers.get('cf-ipcountry')
  if (cfCountry) return { country: cfCountry, region: null, city: null, source: 'cloudflare' }

  // Custom header (from proxy/agent)
  const customCountry = request.headers.get('x-client-country')
  if (customCountry) return { country: customCountry, region: request.headers.get('x-client-region'), city: request.headers.get('x-client-city'), source: 'custom-header' }

  return { country: null, region: null, city: null, source: 'unknown' }
}

// Country code to region mapping
const COUNTRY_REGIONS: Record<string, string> = {
  // Asia Pacific
  HK: 'APAC', CN: 'APAC', TW: 'APAC', JP: 'APAC', KR: 'APAC', SG: 'APAC', MY: 'APAC', TH: 'APAC', VN: 'APAC', PH: 'APAC', ID: 'APAC', IN: 'APAC', AU: 'APAC', NZ: 'APAC', MO: 'APAC',
  // Europe
  GB: 'EMEA', DE: 'EMEA', FR: 'EMEA', IT: 'EMEA', ES: 'EMEA', NL: 'EMEA', CH: 'EMEA', SE: 'EMEA', NO: 'EMEA', DK: 'EMEA', FI: 'EMEA', PL: 'EMEA', AT: 'EMEA', BE: 'EMEA', PT: 'EMEA', IE: 'EMEA', RU: 'EMEA',
  // Americas
  US: 'AMER', CA: 'AMER', MX: 'AMER', BR: 'AMER', AR: 'AMER', CL: 'AMER', CO: 'AMER',
  // Middle East & Africa
  AE: 'MEA', SA: 'MEA', IL: 'MEA', ZA: 'MEA', NG: 'MEA', EG: 'MEA', KE: 'MEA'
}

export function getRegion(countryCode: string): string {
  return COUNTRY_REGIONS[countryCode.toUpperCase()] || 'OTHER'
}

// GET: List geo rules or detect current geo
export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get('action') || 'list'

  if (action === 'detect') {
    const geo = detectCountry(request)
    const region = geo.country ? getRegion(geo.country) : null
    return json({ geo: { ...geo, region } })
  }

  try {
    const db = getDB()
    const rules = await db.execute({ sql: 'SELECT * FROM url_policy_geo_rules WHERE is_active = 1 ORDER BY priority ASC', args: [] })
    return json({ rules: rules.rows, count: rules.rows.length, regions: COUNTRY_REGIONS })
  } catch (e) {
    return json({ rules: [], count: 0, regions: COUNTRY_REGIONS, note: 'geo_rules table may not exist yet' })
  }
}

// POST: Create a new geo rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { countries, regions, categories, action, priority, name, description } = body

    if (!action || (!countries?.length && !regions?.length)) {
      return json({ error: 'action and at least one country or region required' }, 400)
    }

    const db = getDB()
    await db.execute({
      sql: `INSERT INTO url_policy_geo_rules (name, description, countries, regions, categories, action, priority, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`,
      args: [
        name || 'Geo Rule',
        description || '',
        JSON.stringify(countries || []),
        JSON.stringify(regions || []),
        JSON.stringify(categories || []),
        action,
        priority || 10
      ]
    })

    return json({ success: true, message: 'Geo rule created' })
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

// PUT: Update a geo rule
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body
    if (!id) return json({ error: 'id required' }, 400)

    const db = getDB()
    const sets: string[] = []
    const args: any[] = []

    if (updates.countries !== undefined) { sets.push('countries = ?'); args.push(JSON.stringify(updates.countries)) }
    if (updates.regions !== undefined) { sets.push('regions = ?'); args.push(JSON.stringify(updates.regions)) }
    if (updates.categories !== undefined) { sets.push('categories = ?'); args.push(JSON.stringify(updates.categories)) }
    if (updates.action !== undefined) { sets.push('action = ?'); args.push(updates.action) }
    if (updates.priority !== undefined) { sets.push('priority = ?'); args.push(updates.priority) }
    if (updates.name !== undefined) { sets.push('name = ?'); args.push(updates.name) }
    if (updates.is_active !== undefined) { sets.push('is_active = ?'); args.push(updates.is_active ? 1 : 0) }

    if (!sets.length) return json({ error: 'no fields to update' }, 400)

    sets.push("updated_at = datetime('now')")
    args.push(id)

    await db.execute({ sql: `UPDATE url_policy_geo_rules SET ${sets.join(', ')} WHERE id = ?`, args })
    return json({ success: true })
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

// DELETE: Remove a geo rule
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (!id) return json({ error: 'id required' }, 400)
    const db = getDB()
    await db.execute({ sql: 'DELETE FROM url_policy_geo_rules WHERE id = ?', args: [id] })
    return json({ success: true })
  } catch (e: unknown) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500)
  }
}

// Helper: Check geo rules for a given country and category
// Used by the evaluate endpoint
export async function checkGeoRules(country: string | null, category: string): Promise<{ action: string; ruleName: string } | null> {
  if (!country) return null
  const region = getRegion(country)

  try {
    const db = getDB()
    const rules = await db.execute({ sql: 'SELECT * FROM url_policy_geo_rules WHERE is_active = 1 ORDER BY priority ASC', args: [] })

    for (const rule of rules.rows) {
      const countries: string[] = JSON.parse((rule.countries as string) || '[]')
      const regions: string[] = JSON.parse((rule.regions as string) || '[]')
      const categories: string[] = JSON.parse((rule.categories as string) || '[]')

      const countryMatch = countries.length === 0 || countries.includes(country.toUpperCase())
      const regionMatch = regions.length === 0 || regions.includes(region)
      const categoryMatch = categories.length === 0 || categories.some(c => c.toLowerCase() === category.toLowerCase())

      if ((countryMatch || regionMatch) && categoryMatch) {
        return { action: rule.action as string, ruleName: rule.name as string }
      }
    }
  } catch {}
  return null
}
