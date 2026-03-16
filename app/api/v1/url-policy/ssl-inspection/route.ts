// app/api/v1/url-policy/ssl-inspection/route.ts
// P3-1: SSL/TLS Inspection Configuration API
// Tier 1 feature: HTTPS traffic inspection (like Zscaler SSL Inspection)
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'
async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ssl_inspection_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER,
      mode TEXT NOT NULL DEFAULT 'inspect',
      inspect_categories TEXT NOT NULL DEFAULT '["malware","phishing","suspicious"]',
      bypass_categories TEXT NOT NULL DEFAULT '["banking","healthcare","government"]',
      bypass_domains TEXT NOT NULL DEFAULT '[]',
      inspect_domains TEXT NOT NULL DEFAULT '[]',
      certificate_name TEXT DEFAULT 'NextGuard Root CA',
      min_tls_version TEXT NOT NULL DEFAULT '1.2',
      block_expired_certs INTEGER NOT NULL DEFAULT 1,
      block_self_signed INTEGER NOT NULL DEFAULT 1,
      block_untrusted_ca INTEGER NOT NULL DEFAULT 1,
      log_decrypted INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ssl_inspection_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT,
      tls_version TEXT,
      cipher_suite TEXT,
      cert_issuer TEXT,
      cert_expiry TEXT,
      inspected INTEGER NOT NULL DEFAULT 0,
      user_id TEXT,
      evaluated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ssl_log_domain ON ssl_inspection_log(domain, evaluated_at)`)
}
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'config'
    const groupId = searchParams.get('groupId')
    if (type === 'config') {
      let rows
      if (groupId) {
        rows = await db.execute({ sql: 'SELECT * FROM ssl_inspection_config WHERE group_id = ? AND is_active = 1', args: [groupId] })
      } else {
        rows = await db.execute('SELECT * FROM ssl_inspection_config WHERE is_active = 1 ORDER BY id ASC')
      }
      const configs = rows.rows.map((r: any) => ({
        ...r,
        inspect_categories: JSON.parse(r.inspect_categories || '[]'),
        bypass_categories: JSON.parse(r.bypass_categories || '[]'),
        bypass_domains: JSON.parse(r.bypass_domains || '[]'),
        inspect_domains: JSON.parse(r.inspect_domains || '[]'),
      }))
      return NextResponse.json({ configs, total: configs.length })
    }
    if (type === 'check') {
      const domain = searchParams.get('domain')
      if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
      const config = await db.execute('SELECT * FROM ssl_inspection_config WHERE is_active = 1 ORDER BY id ASC LIMIT 1')
      if (config.rows.length === 0) {
        return NextResponse.json({ domain, inspect: false, reason: 'no-config', mode: 'passthrough' })
      }
      const c = config.rows[0] as any
      const bypassDomains: string[] = JSON.parse(c.bypass_domains || '[]')
      const inspectDomains: string[] = JSON.parse(c.inspect_domains || '[]')
      const bypassCats: string[] = JSON.parse(c.bypass_categories || '[]')
      if (bypassDomains.some(d => domain.endsWith(d))) {
        return NextResponse.json({ domain, inspect: false, reason: 'bypass-domain', mode: 'passthrough' })
      }
      if (inspectDomains.some(d => domain.endsWith(d))) {
        return NextResponse.json({ domain, inspect: true, reason: 'inspect-domain', mode: 'decrypt' })
      }
      return NextResponse.json({
        domain, inspect: c.mode === 'inspect', reason: 'default-policy',
        mode: c.mode, minTls: c.min_tls_version,
        blockExpiredCerts: !!c.block_expired_certs,
        blockSelfSigned: !!c.block_self_signed,
      })
    }
    if (type === 'stats') {
      const hours = parseInt(searchParams.get('hours') || '24')
      const [total, inspected, bypassed, blocked] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) as c FROM ssl_inspection_log WHERE evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT COUNT(*) as c FROM ssl_inspection_log WHERE inspected = 1 AND evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT COUNT(*) as c FROM ssl_inspection_log WHERE action = 'bypass' AND evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT COUNT(*) as c FROM ssl_inspection_log WHERE action = 'block' AND evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
      ])
      return NextResponse.json({
        period: `${hours}h`,
        total: (total.rows[0] as any)?.c || 0,
        inspected: (inspected.rows[0] as any)?.c || 0,
        bypassed: (bypassed.rows[0] as any)?.c || 0,
        blocked: (blocked.rows[0] as any)?.c || 0,
      })
    }
    return NextResponse.json({ error: 'Invalid type. Use: config, check, stats' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const {
      group_id = null, mode = 'inspect',
      inspect_categories = ['malware','phishing','suspicious'],
      bypass_categories = ['banking','healthcare','government'],
      bypass_domains = [], inspect_domains = [],
      min_tls_version = '1.2',
      block_expired_certs = true, block_self_signed = true, block_untrusted_ca = true,
      log_decrypted = false,
    } = body
    const result = await db.execute({
      sql: `INSERT INTO ssl_inspection_config
      (group_id, mode, inspect_categories, bypass_categories, bypass_domains, inspect_domains,
       min_tls_version, block_expired_certs, block_self_signed, block_untrusted_ca, log_decrypted)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [group_id, mode, JSON.stringify(inspect_categories), JSON.stringify(bypass_categories),
        JSON.stringify(bypass_domains), JSON.stringify(inspect_domains),
        min_tls_version, block_expired_certs ? 1 : 0, block_self_signed ? 1 : 0,
        block_untrusted_ca ? 1 : 0, log_decrypted ? 1 : 0]
    })
    return NextResponse.json({ success: true, configId: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { configId, ...fields } = body
    if (!configId) return NextResponse.json({ error: 'configId required' }, { status: 400 })
    const updates: string[] = []
    const args: any[] = []
    const jsonFields = ['inspect_categories','bypass_categories','bypass_domains','inspect_domains']
    const boolFields = ['block_expired_certs','block_self_signed','block_untrusted_ca','log_decrypted','is_active']
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue
      if (jsonFields.includes(k)) { updates.push(`${k} = ?`); args.push(JSON.stringify(v)) }
      else if (boolFields.includes(k)) { updates.push(`${k} = ?`); args.push(v ? 1 : 0) }
      else { updates.push(`${k} = ?`); args.push(v) }
    }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`)
      args.push(configId)
      await db.execute({ sql: `UPDATE ssl_inspection_config SET ${updates.join(', ')} WHERE id = ?`, args })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
