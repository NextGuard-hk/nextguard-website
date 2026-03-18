// app/api/qt-audit-log/route.ts
// Activity Log API - GET (list with filters)
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const db = getDB()
  const { searchParams } = req.nextUrl
  const action = searchParams.get('action')
  const userId = searchParams.get('userId')
  const entityType = searchParams.get('entityType')
  const search = searchParams.get('search')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  let sql = `SELECT * FROM qt_audit_log`
  const args: (string | number)[] = []
  const where: string[] = []

  if (action) { where.push(`action = ?`); args.push(action) }
  // Fix: userId filter now checks both user_id and user_email
  if (userId) { where.push(`(user_id = ? OR user_email = ?)`); args.push(userId, userId) }
  if (entityType) { where.push(`entity_type = ?`); args.push(entityType) }
  if (search) {
    where.push(`(user_email LIKE ? OR action LIKE ? OR entity_id LIKE ? OR details LIKE ?)`)
    const s = `%${search}%`
    args.push(s, s, s, s)
  }
  if (from) { where.push(`created_at >= ?`); args.push(from) }
  if (to) { where.push(`created_at <= ?`); args.push(to) }

  if (where.length > 0) sql += ` WHERE ` + where.join(' AND ')
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
  args.push(limit, offset)

  const result = await db.execute({ sql, args })

  const countSql = `SELECT COUNT(*) as total FROM qt_audit_log${where.length > 0 ? ' WHERE ' + where.join(' AND ') : ''}`
  const countResult = await db.execute({ sql: countSql, args: args.slice(0, args.length - 2) })

  // Get distinct actions for filter dropdown
  const actionsResult = await db.execute({ sql: `SELECT DISTINCT action FROM qt_audit_log ORDER BY action` })
  const usersResult = await db.execute({ sql: `SELECT DISTINCT user_email FROM qt_audit_log WHERE user_email IS NOT NULL ORDER BY user_email` })

  return NextResponse.json({
    logs: result.rows,
    total: (countResult.rows[0] as any).total,
    actions: actionsResult.rows.map((r: any) => r.action),
    users: usersResult.rows.map((r: any) => r.user_email),
    limit,
    offset,
  })
}
