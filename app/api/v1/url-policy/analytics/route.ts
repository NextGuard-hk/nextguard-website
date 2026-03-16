// app/api/v1/url-policy/analytics/route.ts
// P1+P2: URL Policy Analytics API with userId filtering
// GET /api/v1/url-policy/analytics?type=summary&hours=24&userId=xxx
// GET /api/v1/url-policy/analytics?type=top-blocked&userId=xxx
// GET /api/v1/url-policy/analytics?type=top-warned
// GET /api/v1/url-policy/analytics?type=recent
// GET /api/v1/url-policy/analytics?type=risk-distribution
// GET /api/v1/url-policy/analytics?type=category-distribution
// GET /api/v1/url-policy/analytics?type=timeline
// GET /api/v1/url-policy/analytics?type=user-activity&userId=xxx
// GET /api/v1/url-policy/analytics?type=group-summary
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
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_url_log_evaluated_at ON url_policy_log(evaluated_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_url_log_action ON url_policy_log(action, evaluated_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_url_log_user_id ON url_policy_log(user_id, evaluated_at)`)
}
function userFilter(userId: string | null): { where: string; args: any[] } {
  if (!userId) return { where: '', args: [] }
  return { where: ' AND user_id = ?', args: [userId] }
}
export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureLogTable(db)
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'summary'
    const hours = parseInt(searchParams.get('hours') || '24')
    const limit = parseInt(searchParams.get('limit') || '10')
    const userId = searchParams.get('userId') || null
    const uf = userFilter(userId)
    switch (type) {
    case 'summary': {
      const timeArg = `-${hours} hours`
      const [total, blocked, warned, byRisk, recentErrors] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE evaluated_at > datetime('now', ?)${uf.where}`, args: [timeArg, ...uf.args] }),
        db.execute({ sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE action = 'Block' AND evaluated_at > datetime('now', ?)${uf.where}`, args: [timeArg, ...uf.args] }),
        db.execute({ sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE action = 'Warn' AND evaluated_at > datetime('now', ?)${uf.where}`, args: [timeArg, ...uf.args] }),
        db.execute({ sql: `SELECT risk_level, COUNT(*) as count FROM url_policy_log WHERE evaluated_at > datetime('now', ?)${uf.where} GROUP BY risk_level ORDER BY count DESC`, args: [timeArg, ...uf.args] }),
        db.execute({ sql: `SELECT COUNT(*) as count FROM url_policy_log WHERE risk_level IN ('high','critical') AND evaluated_at > datetime('now', '-1 hours')${uf.where}`, args: [...uf.args] })
      ])
      const totalCount = (total.rows[0]?.count as number) || 0
      const blockedCount = (blocked.rows[0]?.count as number) || 0
      const warnedCount = (warned.rows[0]?.count as number) || 0
      return NextResponse.json({
        period: `${hours}h`, userId,
        totalEvaluations: totalCount,
        blocked: blockedCount, warned: warnedCount,
        allowed: totalCount - blockedCount - warnedCount,
        blockRate: totalCount > 0 ? Math.round((blockedCount / totalCount) * 100) : 0,
        highRiskLastHour: (recentErrors.rows[0]?.count as number) || 0,
        riskDistribution: byRisk.rows,
      })
    }
    case 'top-blocked': {
      const rows = await db.execute({
        sql: `SELECT domain, category, risk_level, COUNT(*) as hit_count
        FROM url_policy_log
        WHERE action = 'Block' AND evaluated_at > datetime('now', ?)${uf.where}
        GROUP BY domain ORDER BY hit_count DESC LIMIT ?`,
        args: [`-${hours} hours`, ...uf.args, limit]
      })
      return NextResponse.json({ topBlocked: rows.rows, period: `${hours}h`, userId })
    }
    case 'top-warned': {
      const rows = await db.execute({
        sql: `SELECT domain, category, risk_level, COUNT(*) as hit_count
        FROM url_policy_log
        WHERE action = 'Warn' AND evaluated_at > datetime('now', ?)${uf.where}
        GROUP BY domain ORDER BY hit_count DESC LIMIT ?`,
        args: [`-${hours} hours`, ...uf.args, limit]
      })
      return NextResponse.json({ topWarned: rows.rows, period: `${hours}h`, userId })
    }
    case 'category-distribution': {
      const rows = await db.execute({
        sql: `SELECT category, COUNT(*) as count, action
        FROM url_policy_log
        WHERE evaluated_at > datetime('now', ?)${uf.where}
        GROUP BY category, action ORDER BY count DESC LIMIT ?`,
        args: [`-${hours} hours`, ...uf.args, limit]
      })
      return NextResponse.json({ categories: rows.rows, period: `${hours}h`, userId })
    }
    case 'risk-distribution': {
      const rows = await db.execute({
        sql: `SELECT risk_level, COUNT(*) as count FROM url_policy_log
        WHERE evaluated_at > datetime('now', ?)${uf.where} GROUP BY risk_level`,
        args: [`-${hours} hours`, ...uf.args]
      })
      return NextResponse.json({ riskDistribution: rows.rows, period: `${hours}h`, userId })
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
        WHERE evaluated_at > datetime('now', ?)${uf.where}
        GROUP BY hour ORDER BY hour ASC`,
        args: [`-${hours} hours`, ...uf.args]
      })
      return NextResponse.json({ timeline: rows.rows, period: `${hours}h`, userId })
    }
    case 'recent': {
      const rows = await db.execute({
        sql: `SELECT domain, action, category, risk_level, user_id, evaluated_at
        FROM url_policy_log
        WHERE 1=1${uf.where}
        ORDER BY evaluated_at DESC LIMIT ?`,
        args: [...uf.args, limit]
      })
      return NextResponse.json({ recent: rows.rows, userId })
    }
    case 'user-activity': {
      if (!userId) return NextResponse.json({ error: 'userId required for user-activity' }, { status: 400 })
      const [userStats, topDomains, recentActivity] = await Promise.all([
        db.execute({
          sql: `SELECT action, COUNT(*) as count FROM url_policy_log
          WHERE user_id = ? AND evaluated_at > datetime('now', ?)
          GROUP BY action ORDER BY count DESC`,
          args: [userId, `-${hours} hours`]
        }),
        db.execute({
          sql: `SELECT domain, category, COUNT(*) as visits FROM url_policy_log
          WHERE user_id = ? AND evaluated_at > datetime('now', ?)
          GROUP BY domain ORDER BY visits DESC LIMIT ?`,
          args: [userId, `-${hours} hours`, limit]
        }),
        db.execute({
          sql: `SELECT domain, action, category, risk_level, evaluated_at FROM url_policy_log
          WHERE user_id = ? ORDER BY evaluated_at DESC LIMIT ?`,
          args: [userId, limit]
        })
      ])
      return NextResponse.json({
        userId, period: `${hours}h`,
        actionBreakdown: userStats.rows,
        topDomains: topDomains.rows,
        recentActivity: recentActivity.rows
      })
    }
    case 'group-summary': {
      const rows = await db.execute({
        sql: `SELECT g.id, g.name, g.priority,
        COUNT(DISTINCT a.user_id) as member_count,
        COUNT(l.id) as total_evaluations,
        SUM(CASE WHEN l.action = 'Block' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN l.risk_level IN ('high','critical') THEN 1 ELSE 0 END) as high_risk
        FROM url_policy_groups g
        LEFT JOIN url_policy_user_assignments a ON a.group_id = g.id
        LEFT JOIN url_policy_log l ON l.user_id = a.user_id AND l.evaluated_at > datetime('now', ?)
        WHERE g.is_active = 1
        GROUP BY g.id ORDER BY g.priority ASC`,
        args: [`-${hours} hours`]
      })
      return NextResponse.json({ groups: rows.rows, period: `${hours}h` })
    }
    default:
      return NextResponse.json({ error: 'Invalid type. Use: summary, top-blocked, top-warned, category-distribution, risk-distribution, timeline, recent, user-activity, group-summary' }, { status: 400 })
    }
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
