// app/api/v1/url-policy/change-requests/route.ts
// P2-4: Category Change Request workflow (like Zscaler URL Category Lookup/Request)
// Users can submit requests to recategorize domains; admins can approve/reject
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'

async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_category_change_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      current_category TEXT,
      requested_category TEXT NOT NULL,
      reason TEXT DEFAULT '',
      submitted_by TEXT DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected')),
      reviewed_by TEXT,
      review_note TEXT,
      created_at DATETIME NOT NULL DEFAULT (datetime('now')),
      updated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ccr_domain ON url_category_change_requests(domain)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_ccr_status ON url_category_change_requests(status)`)
}

// GET /api/v1/url-policy/change-requests?status=pending
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const status = request.nextUrl.searchParams.get('status')
    const domain = request.nextUrl.searchParams.get('domain')
    let sql = `SELECT * FROM url_category_change_requests`
    const args: any[] = []
    const conditions: string[] = []
    if (status) { conditions.push(`status = ?`); args.push(status) }
    if (domain) { conditions.push(`domain = ?`); args.push(domain) }
    if (conditions.length > 0) sql += ` WHERE ` + conditions.join(' AND ')
    sql += ` ORDER BY created_at DESC LIMIT 100`
    const rows = await db.execute({ sql, args })
    return NextResponse.json({ requests: rows.rows, total: rows.rows.length })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// POST /api/v1/url-policy/change-requests - submit a request
export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { domain, currentCategory, requestedCategory, reason = '', submittedBy = 'user' } = body
    if (!domain || !requestedCategory) {
      return NextResponse.json({ error: 'domain and requestedCategory required' }, { status: 400 })
    }
    const result = await db.execute({
      sql: `INSERT INTO url_category_change_requests
            (domain, current_category, requested_category, reason, submitted_by)
            VALUES (?, ?, ?, ?, ?)`,
      args: [domain.toLowerCase(), currentCategory || null, requestedCategory, reason, submittedBy]
    })
    return NextResponse.json({ success: true, id: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

// PUT /api/v1/url-policy/change-requests - admin review (approve/reject)
export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { id, status, reviewedBy = 'admin', reviewNote = '' } = body
    if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be approved or rejected' }, { status: 400 })
    }
    await db.execute({
      sql: `UPDATE url_category_change_requests
            SET status = ?, reviewed_by = ?, review_note = ?, updated_at = datetime('now')
            WHERE id = ?`,
      args: [status, reviewedBy, reviewNote, id]
    })
    // If approved, update url_categories table
    if (status === 'approved') {
      const req = await db.execute({
        sql: `SELECT domain, requested_category FROM url_category_change_requests WHERE id = ?`,
        args: [id]
      })
      if (req.rows.length > 0) {
        const { domain, requested_category } = req.rows[0] as any
        await db.execute({
          sql: `INSERT OR REPLACE INTO url_categories (domain, category) VALUES (?, ?)`,
          args: [domain, requested_category]
        })
      }
    }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
