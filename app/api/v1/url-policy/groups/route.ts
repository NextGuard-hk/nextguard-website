// app/api/v1/url-policy/groups/route.ts
// P2-1: User/Group URL Policy Engine
// Tier 1 feature: Per-group/user URL policy (like Zscaler user/group policies)
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'

async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      priority INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_group_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      action TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_group_rules_gid ON url_policy_group_rules(group_id)`)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_user_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      group_id INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, group_id)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_user_assign_uid ON url_policy_user_assignments(user_id)`)
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const userId = request.nextUrl.searchParams.get('userId')
    let groupRows
    if (userId) {
      groupRows = await db.execute({
        sql: `SELECT g.* FROM url_policy_groups g
              JOIN url_policy_user_assignments a ON a.group_id = g.id
              WHERE a.user_id = ? AND g.is_active = 1
              ORDER BY g.priority ASC`,
        args: [userId]
      })
    } else {
      groupRows = await db.execute(`SELECT * FROM url_policy_groups ORDER BY priority ASC`)
    }
    const groups = await Promise.all(groupRows.rows.map(async (g: any) => {
      const rules = await db.execute({
        sql: `SELECT * FROM url_policy_group_rules WHERE group_id = ?`,
        args: [g.id]
      })
      const members = await db.execute({
        sql: `SELECT user_id FROM url_policy_user_assignments WHERE group_id = ?`,
        args: [g.id]
      })
      return { ...g, rules: rules.rows, members: members.rows.map((m: any) => m.user_id) }
    }))
    return NextResponse.json({ groups, total: groups.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { name, description = '', priority = 10, rules = [], members = [] } = body
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 })
    const result = await db.execute({
      sql: `INSERT INTO url_policy_groups (name, description, priority) VALUES (?, ?, ?)`,
      args: [name, description, priority]
    })
    const groupId = result.lastInsertRowid
    for (const rule of rules) {
      await db.execute({
        sql: `INSERT INTO url_policy_group_rules (group_id, category, action) VALUES (?, ?, ?)`,
        args: [groupId, rule.category, rule.action]
      })
    }
    for (const userId of members) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_policy_user_assignments (user_id, group_id) VALUES (?, ?)`,
        args: [userId, groupId]
      })
    }
    return NextResponse.json({ success: true, groupId })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { groupId, name, description, priority, is_active, rules, members } = body
    if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })
    const updates: string[] = []
    const args: any[] = []
    if (name !== undefined) { updates.push('name = ?'); args.push(name) }
    if (description !== undefined) { updates.push('description = ?'); args.push(description) }
    if (priority !== undefined) { updates.push('priority = ?'); args.push(priority) }
    if (is_active !== undefined) { updates.push('is_active = ?'); args.push(is_active ? 1 : 0) }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`)
      args.push(groupId)
      await db.execute({ sql: `UPDATE url_policy_groups SET ${updates.join(', ')} WHERE id = ?`, args })
    }
    if (rules !== undefined) {
      await db.execute({ sql: `DELETE FROM url_policy_group_rules WHERE group_id = ?`, args: [groupId] })
      for (const rule of rules) {
        await db.execute({
          sql: `INSERT INTO url_policy_group_rules (group_id, category, action) VALUES (?, ?, ?)`,
          args: [groupId, rule.category, rule.action]
        })
      }
    }
    if (members !== undefined) {
      await db.execute({ sql: `DELETE FROM url_policy_user_assignments WHERE group_id = ?`, args: [groupId] })
      for (const userId of members) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO url_policy_user_assignments (user_id, group_id) VALUES (?, ?)`,
          args: [userId, groupId]
        })
      }
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
    const groupId = request.nextUrl.searchParams.get('groupId')
    if (!groupId) return NextResponse.json({ error: 'groupId required' }, { status: 400 })
    await db.execute({ sql: `DELETE FROM url_policy_groups WHERE id = ?`, args: [groupId] })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
