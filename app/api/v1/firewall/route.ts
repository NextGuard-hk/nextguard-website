// app/api/v1/firewall/route.ts
// P3-3: Cloud Firewall Rules API
// Tier 1 feature: L3/L4 network firewall rules (like Zscaler Cloud Firewall)
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'
async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS firewall_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 100,
      direction TEXT NOT NULL DEFAULT 'outbound',
      action TEXT NOT NULL DEFAULT 'block',
      protocol TEXT NOT NULL DEFAULT 'any',
      src_ip TEXT DEFAULT '*',
      src_port TEXT DEFAULT '*',
      dst_ip TEXT DEFAULT '*',
      dst_port TEXT DEFAULT '*',
      dst_domain TEXT,
      application TEXT,
      group_id INTEGER,
      schedule_id INTEGER,
      log_enabled INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      hit_count INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS firewall_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rule_id INTEGER,
      rule_name TEXT,
      action TEXT NOT NULL,
      protocol TEXT,
      src_ip TEXT,
      src_port INTEGER,
      dst_ip TEXT,
      dst_port INTEGER,
      dst_domain TEXT,
      bytes_sent INTEGER DEFAULT 0,
      bytes_received INTEGER DEFAULT 0,
      user_id TEXT,
      evaluated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fw_log_time ON firewall_log(evaluated_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_fw_rules_priority ON firewall_rules(priority, is_active)`)
}
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'rules'
    if (type === 'rules') {
      const groupId = searchParams.get('groupId')
      let rows
      if (groupId) {
        rows = await db.execute({ sql: 'SELECT * FROM firewall_rules WHERE group_id = ? ORDER BY priority ASC', args: [groupId] })
      } else {
        rows = await db.execute('SELECT * FROM firewall_rules ORDER BY priority ASC')
      }
      return NextResponse.json({ rules: rows.rows, total: rows.rows.length })
    }
    if (type === 'evaluate') {
      const protocol = searchParams.get('protocol') || 'tcp'
      const dstPort = searchParams.get('dstPort') || '443'
      const dstDomain = searchParams.get('domain') || ''
      const rules = await db.execute('SELECT * FROM firewall_rules WHERE is_active = 1 ORDER BY priority ASC')
      for (const rule of rules.rows as any[]) {
        const protoMatch = rule.protocol === 'any' || rule.protocol === protocol
        const portMatch = rule.dst_port === '*' || rule.dst_port === dstPort || rule.dst_port.split(',').includes(dstPort)
        const domainMatch = !rule.dst_domain || dstDomain.endsWith(rule.dst_domain)
        if (protoMatch && portMatch && domainMatch) {
          await db.execute({ sql: 'UPDATE firewall_rules SET hit_count = hit_count + 1 WHERE id = ?', args: [rule.id] })
          return NextResponse.json({ action: rule.action, matchedRule: { id: rule.id, name: rule.name, priority: rule.priority }, protocol, dstPort, dstDomain })
        }
      }
      return NextResponse.json({ action: 'allow', matchedRule: null, protocol, dstPort, dstDomain, reason: 'default-allow' })
    }
    if (type === 'stats') {
      const hours = parseInt(searchParams.get('hours') || '24')
      const [total, blocked, byProto, topRules] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) as c FROM firewall_log WHERE evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT COUNT(*) as c FROM firewall_log WHERE action = 'block' AND evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT protocol, COUNT(*) as c FROM firewall_log WHERE evaluated_at > datetime('now', ?) GROUP BY protocol ORDER BY c DESC`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT rule_name, action, COUNT(*) as hits FROM firewall_log WHERE evaluated_at > datetime('now', ?) GROUP BY rule_id ORDER BY hits DESC LIMIT 10`, args: [`-${hours} hours`] }),
      ])
      return NextResponse.json({
        period: `${hours}h`,
        total: (total.rows[0] as any)?.c || 0,
        blocked: (blocked.rows[0] as any)?.c || 0,
        byProtocol: byProto.rows,
        topRules: topRules.rows,
      })
    }
    return NextResponse.json({ error: 'Invalid type. Use: rules, evaluate, stats' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { name, description = '', priority = 100, direction = 'outbound', action = 'block',
      protocol = 'any', src_ip = '*', src_port = '*', dst_ip = '*', dst_port = '*',
      dst_domain, application, group_id, schedule_id, log_enabled = true } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result = await db.execute({
      sql: `INSERT INTO firewall_rules (name, description, priority, direction, action, protocol,
        src_ip, src_port, dst_ip, dst_port, dst_domain, application, group_id, schedule_id, log_enabled)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [name, description, priority, direction, action, protocol,
        src_ip, src_port, dst_ip, dst_port, dst_domain || null, application || null,
        group_id || null, schedule_id || null, log_enabled ? 1 : 0]
    })
    return NextResponse.json({ success: true, ruleId: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { ruleId, ...fields } = body
    if (!ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })
    const updates: string[] = []
    const args: any[] = []
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue
      if (['log_enabled','is_active'].includes(k)) { updates.push(`${k} = ?`); args.push(v ? 1 : 0) }
      else { updates.push(`${k} = ?`); args.push(v) }
    }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`)
      args.push(ruleId)
      await db.execute({ sql: `UPDATE firewall_rules SET ${updates.join(', ')} WHERE id = ?`, args })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const ruleId = request.nextUrl.searchParams.get('ruleId')
    if (!ruleId) return NextResponse.json({ error: 'ruleId required' }, { status: 400 })
    await db.execute({ sql: 'DELETE FROM firewall_rules WHERE id = ?', args: [ruleId] })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
