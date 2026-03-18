import { NextRequest, NextResponse } from 'next/server'
import { getDB, initDB } from '@/lib/db'

export async function GET(request: NextRequest) {
  await initDB()
  const db = getDB()
  const hours = parseInt(request.nextUrl.searchParams.get('hours') || '24')
  const format = request.nextUrl.searchParams.get('format') || 'csv'
  const actionFilter = request.nextUrl.searchParams.get('action') || ''

  try {
    const args: any[] = []
    let sql = `SELECT domain, action, category, risk_level, user_id, evaluated_at FROM url_policy_log WHERE evaluated_at > datetime('now', ?)`
    args.push(`-${Math.min(hours, 720)} hours`)
    if (actionFilter) {
      sql += ` AND LOWER(action) = LOWER(?)`
      args.push(actionFilter)
    }
    sql += ' ORDER BY evaluated_at DESC LIMIT 10000'
    const result = await db.execute({ sql, args })

    if (format === 'json') {
      return NextResponse.json({
        logs: result.rows,
        total: result.rows.length,
        period: `${hours}h`,
        exportedAt: new Date().toISOString()
      })
    }

    const header = 'Domain,Action,Category,Risk Level,User ID,Evaluated At\n'
    const rows = result.rows.map(r =>
      `"${r.domain}","${r.action}","${r.category || ''}","${r.risk_level || ''}","${r.user_id || ''}","${r.evaluated_at}"`
    ).join('\n')

    return new NextResponse(header + rows, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="nextguard-swg-log-${new Date().toISOString().slice(0,10)}.csv"`,
      }
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
