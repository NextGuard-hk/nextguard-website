// app/api/v1/url-policy/overrides/route.ts
// P2-3: URL Override - per-user Allow/Block overrides (like Zscaler admin overrides)
// Users/admins can override default policy for specific domains
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'

async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      user_id TEXT,
      action TEXT NOT NULL CHECK(action IN ('Allow','Warn','Block','Isolate')),
      reason TEXT DEFAULT '',
      expires_at DATETIME,
      created_by TEXT DEFAULT 'admin',
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      UNIQUE(domain, user_id)
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_overrides_domain ON url_policy_overrides(domain)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_overrides_user ON url_policy_overrides(user_id)`)
}

// GET /api/v1/url-policy/overrides?domain=xxx&userId=yyy
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const domain = request.nextUrl.searchParams.get('domain')
    const userId = request.nextUrl.searchParams.get('userId')
    let sql = `SELECT * FROM url_policy_overrides WHERE (expires_at IS NULL OR expires_at > datetime('now'))`
    const args: any[] = []
    if (domain) { sql += ` AND domain = ?`; args.push(domain) }
    if (userId) { sql += ` AND (user_id = ? OR user_id IS NULL)`; args.push(userId) }
    sql += ` ORDER BY created_at DESC`
    const rows = await db.execute({ sql, args })
    return NextResponse.json({ overrides: rows.rows, total: rows.rows.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// POST /api/v1/url-policy/overrides
export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { domain, userId = null, action, reason = '', expiresHours } = body
    if (!domain || !action) return NextResponse.json({ error: 'domain and action required' }, { status: 400 })
    const validActions = ['Allow', 'Warn', 'Block', 'Isolate']
    if (!validActions.includes(action)) return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    let expiresAt = null
    if (expiresHours) {
      expiresAt = new Date(Date.now() + expiresHours * 3600 * 1000).toISOString().replace('T', ' ').split('.')[0]
    }
    const result = await db.execute({
      sql: `INSERT OR REPLACE INTO url_policy_overrides (domain, user_id, action, reason, expires_at)
            VALUES (?, ?, ?, ?, ?)`,
      args: [domain.toLowerCase(), userId, action, reason, expiresAt]
    })
    return NextResponse.json({ success: true, id: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// DELETE /api/v1/url-policy/overrides?id=xxx
export async function DELETE(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const id = request.nextUrl.searchParams.get('id')
    const domain = request.nextUrl.searchParams.get('domain')
    if (!id && !domain) return NextResponse.json({ error: 'id or domain required' }, { status: 400 })
    if (id) {
      await db.execute({ sql: `DELETE FROM url_policy_overrides WHERE id = ?`, args: [id] })
    } else {
      await db.execute({ sql: `DELETE FROM url_policy_overrides WHERE domain = ?`, args: [domain] })
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
