// app/api/v1/url-policy/analytics/route.ts
// P1: URL Policy Analytics API
// GET /api/v1/url-policy/analytics?type=summary&hours=24
// GET /api/v1/url-policy/analytics?type=top-blocked
// GET /api/v1/url-policy/analytics?type=top-warned
// GET /api/v1/url-policy/analytics?type=recent
// GET /api/v1/url-policy/analytics?type=risk-distribution
// GET /api/v1/url-policy/analytics?type=category-distribution
// GET /api/v1/url-policy/analytics?type=timeline
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

async function ensureLogTable(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS url_policy_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      action TEXT NOT NULL,
      category TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'unknown',
      user_id TEXT,
      policy_id INTEGER,
      evaluated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  // Index for fast time-range queries
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_url_log_evaluated_at ON url_policy_log(evaluated_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_url_log_action ON url_policy_log(action, evaluated_at)`)
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureLogTable(db)
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'summary'
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '10')
    switch (type) {
      case 'summary': {
        const [total, blocked, warned, byRisk, recentErrors] = await Promise.all([
          db.execute({
            sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE evaluated_at > datetime('now', ?)`,
            args: [`-${hours} hours`]
          }),
          db.execute({
            sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE action = 'Block' AND evaluated_at > datetime('now', ?)`,
            args: [`-${hours} hours`]
          }),
          db.execute({
            sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE action = 'Warn' AND evaluated_at > datetime('now', ?)`,
            args: [`-${hours} hours`]
          }),
          db.execute({
            sql: `SELECT risk_level, COUNT(*) as count FROM url_policy_log
              WHERE evaluated_at > datetime('now', ?) GROUP BY risk_level ORDER BY count DESC`,
            args: [`-${hours} hours`]
          }),
          db.execute({
            sql: `SELECT COUNT(*) as count FROM url_policy_log
              WHERE risk_level IN ('high','critical') AND evaluated_at > datetime('now', '-1 hours')`,
            args: []
          })
        ])
        const totalCount = (total.rows[0]?.count as number) || 0
        const blockedCount = (blocked.rows[0]?.count as number) || 0
        const warnedCount = (warned.rows[0]?.count as number) || 0
        const highRiskLastHour = (recentErrors.rows[0]?.count as number) || 0
        return NextResponse.json({
          period: `${hours}h`,
          totalEvaluations: totalCount,
          blocked: blockedCount,
          warned: warnedCount,
          allowed: totalCount - blockedCount - warnedCount,
          blockRate: totalCount > 0 ? Math.round((blockedCount / totalCount) * 100) : 0,
          highRiskLastHour,
          riskDistribution: byRisk.rows,
        })
      }
      case 'top-blocked': {
        const rows = await db.execute({
          sql: `SELECT domain, category, risk_level, COUNT(*) as hit_count
            FROM url_policy_log
            WHERE action = 'Block' AND evaluated_at > datetime('now', ?)
            GROUP BY domain ORDER BY hit_count DESC LIMIT ?`,
          args: [`-${hours} hours`, limit]
        })
        return NextResponse.json({ topBlocked: rows.rows, period: `${hours}h` })
      }
      case 'top-warned': {
        const rows = await db.execute({
          sql: `SELECT domain, category, risk_level, COUNT(*) as hit_count
            FROM url_policy_log
            WHERE action = 'Warn' AND evaluated_at > datetime('now', ?)
            GROUP BY domain ORDER BY hit_count DESC LIMIT ?`,
          args: [`-${hours} hours`, limit]
        })
        return NextResponse.json({ topWarned: rows.rows, period: `${hours}h` })
      }
      case 'category-distribution': {
        const rows = await db.execute({
          sql: `SELECT category, COUNT(*) as count, action
            FROM url_policy_log
            WHERE evaluated_at > datetime('now', ?)
            GROUP BY category, action ORDER BY count DESC LIMIT ?`,
          args: [`-${hours} hours`, limit]
        })
        return NextResponse.json({ categories: rows.rows, period: `${hours}h` })
      }
      case 'risk-distribution': {
        const rows = await db.execute({
          sql: `SELECT risk_level, COUNT(*) as count FROM url_policy_log
            WHERE evaluated_at > datetime('now', ?) GROUP BY risk_level`,
          args: [`-${hours} hours`]
        })
        return NextResponse.json({ riskDistribution: rows.rows, period: `${hours}h` })
      }
      case 'timeline': {
        const rows = await db.execute({
          sql: `SELECT
            strftime('%Y-%m-%d %H:00', evaluated_at) as hour,
            COUNT(*) as total,
            SUM(CASE WHEN action = 'Block' THEN 1 ELSE 0 END) as blocked,
            SUM(CASE WHEN action = 'Warn' THEN 1 ELSE 0 END) as warned,
            SUM(CASE WHEN risk_level IN ('high','critical') THEN 1 ELSE 0 END) as high_risk
            FROM url_policy_log
            WHERE evaluated_at > datetime('now', ?)
            GROUP BY hour ORDER BY hour ASC`,
          args: [`-${hours} hours`]
        })
        return NextResponse.json({ timeline: rows.rows, period: `${hours}h` })
      }
      case 'recent': {
        const rows = await db.execute({
          sql: `SELECT domain, action, category, risk_level, evaluated_at
            FROM url_policy_log
            ORDER BY evaluated_at DESC LIMIT ?`,
          args: [limit]
        })
        return NextResponse.json({ recent: rows.rows })
      }
      default:
        return NextResponse.json({ error: 'Invalid type. Use: summary, top-blocked, top-warned, category-distribution, risk-distribution, timeline, recent' }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
