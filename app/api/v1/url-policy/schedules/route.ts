// app/api/v1/url-policy/schedules/route.ts
// P2-3: Time-based URL policy schedules
// Tier 1 feature: Schedule-based access control (like Zscaler time-based policies)
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'
async function ensureTable(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      days_of_week TEXT NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]',
      start_time INTEGER NOT NULL DEFAULT 900,
      end_time INTEGER NOT NULL DEFAULT 1700,
      timezone TEXT NOT NULL DEFAULT 'Asia/Hong_Kong',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_schedules_gid ON url_policy_schedules(group_id)`)
}
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTable(db)
    const groupId = request.nextUrl.searchParams.get('groupId')
    let rows
    if (groupId) {
      rows = await db.execute({ sql: 'SELECT * FROM url_policy_schedules WHERE group_id = ? ORDER BY id ASC', args: [groupId] })
    } else {
      rows = await db.execute('SELECT * FROM url_policy_schedules ORDER BY group_id ASC, id ASC')
    }
    const schedules = rows.rows.map((r: any) => ({
      ...r,
      days_of_week: JSON.parse(r.days_of_week || '[]')
    }))
    return NextResponse.json({ schedules, total: schedules.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTable(db)
    const body = await request.json()
    const { group_id, name, days_of_week = ['mon','tue','wed','thu','fri'], start_time = 900, end_time = 1700, timezone = 'Asia/Hong_Kong' } = body
    if (!group_id || !name) return NextResponse.json({ error: 'group_id and name required' }, { status: 400 })
    const result = await db.execute({
      sql: `INSERT INTO url_policy_schedules (group_id, name, days_of_week, start_time, end_time, timezone) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [group_id, name, JSON.stringify(days_of_week), start_time, end_time, timezone]
    })
    return NextResponse.json({ success: true, scheduleId: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTable(db)
    const body = await request.json()
    const { scheduleId, name, days_of_week, start_time, end_time, timezone, is_active } = body
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId required' }, { status: 400 })
    const updates: string[] = []
    const args: any[] = []
    if (name !== undefined) { updates.push('name = ?'); args.push(name) }
    if (days_of_week !== undefined) { updates.push('days_of_week = ?'); args.push(JSON.stringify(days_of_week)) }
    if (start_time !== undefined) { updates.push('start_time = ?'); args.push(start_time) }
    if (end_time !== undefined) { updates.push('end_time = ?'); args.push(end_time) }
    if (timezone !== undefined) { updates.push('timezone = ?'); args.push(timezone) }
    if (is_active !== undefined) { updates.push('is_active = ?'); args.push(is_active ? 1 : 0) }
    if (updates.length > 0) {
      updates.push(`updated_at = datetime('now')`)
      args.push(scheduleId)
      await db.execute({ sql: `UPDATE url_policy_schedules SET ${updates.join(', ')} WHERE id = ?`, args })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTable(db)
    const scheduleId = request.nextUrl.searchParams.get('scheduleId')
    if (!scheduleId) return NextResponse.json({ error: 'scheduleId required' }, { status: 400 })
    await db.execute({ sql: 'DELETE FROM url_policy_schedules WHERE id = ?', args: [scheduleId] })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
