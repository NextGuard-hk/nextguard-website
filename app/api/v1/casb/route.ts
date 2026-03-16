// app/api/v1/casb/route.ts
// P3-2: Cloud Access Security Broker (CASB) API
// Tier 1 feature: SaaS app discovery, risk scoring, policy enforcement
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'

// Built-in SaaS app risk database
const SAAS_APPS: Record<string, { name: string; category: string; riskScore: number; compliance: string[]; features: string[] }> = {
  'google.com': { name: 'Google Workspace', category: 'Productivity', riskScore: 10, compliance: ['SOC2','ISO27001','GDPR'], features: ['sso','mfa','dlp','audit'] },
  'microsoft.com': { name: 'Microsoft 365', category: 'Productivity', riskScore: 10, compliance: ['SOC2','ISO27001','GDPR','HIPAA'], features: ['sso','mfa','dlp','audit'] },
  'salesforce.com': { name: 'Salesforce', category: 'CRM', riskScore: 15, compliance: ['SOC2','ISO27001','GDPR'], features: ['sso','mfa','audit'] },
  'slack.com': { name: 'Slack', category: 'Messaging', riskScore: 20, compliance: ['SOC2','ISO27001'], features: ['sso','mfa','dlp'] },
  'dropbox.com': { name: 'Dropbox', category: 'File Sharing', riskScore: 35, compliance: ['SOC2','ISO27001'], features: ['sso','mfa'] },
  'box.com': { name: 'Box', category: 'File Sharing', riskScore: 20, compliance: ['SOC2','ISO27001','HIPAA','FedRAMP'], features: ['sso','mfa','dlp','audit'] },
  'zoom.us': { name: 'Zoom', category: 'Video Conferencing', riskScore: 25, compliance: ['SOC2','ISO27001'], features: ['sso','mfa'] },
  'github.com': { name: 'GitHub', category: 'Development', riskScore: 25, compliance: ['SOC2','ISO27001'], features: ['sso','mfa','audit'] },
  'notion.so': { name: 'Notion', category: 'Productivity', riskScore: 30, compliance: ['SOC2'], features: ['sso','mfa'] },
  'figma.com': { name: 'Figma', category: 'Design', riskScore: 30, compliance: ['SOC2'], features: ['sso','mfa'] },
  'trello.com': { name: 'Trello', category: 'Project Management', riskScore: 35, compliance: ['SOC2'], features: ['sso'] },
  'airtable.com': { name: 'Airtable', category: 'Database', riskScore: 35, compliance: ['SOC2'], features: ['sso','mfa'] },
  'canva.com': { name: 'Canva', category: 'Design', riskScore: 40, compliance: ['SOC2'], features: ['sso'] },
  'chatgpt.com': { name: 'ChatGPT', category: 'AI/ML', riskScore: 55, compliance: ['SOC2'], features: [] },
  'claude.ai': { name: 'Claude', category: 'AI/ML', riskScore: 50, compliance: ['SOC2'], features: [] },
  'wetransfer.com': { name: 'WeTransfer', category: 'File Sharing', riskScore: 65, compliance: [], features: [] },
  'mega.nz': { name: 'MEGA', category: 'File Sharing', riskScore: 75, compliance: [], features: [] },
  'pastebin.com': { name: 'Pastebin', category: 'Code Sharing', riskScore: 70, compliance: [], features: [] },
}

async function ensureTables(db: ReturnType<typeof getDB>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS casb_policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      app_domain TEXT NOT NULL,
      action TEXT NOT NULL DEFAULT 'Monitor',
      max_risk_score INTEGER DEFAULT 100,
      allowed_actions TEXT DEFAULT '["view","download","upload"]',
      blocked_actions TEXT DEFAULT '[]',
      require_dlp_scan INTEGER NOT NULL DEFAULT 0,
      group_id INTEGER,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS casb_activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      app_domain TEXT NOT NULL,
      app_name TEXT,
      activity TEXT NOT NULL,
      risk_score INTEGER DEFAULT 0,
      action_taken TEXT NOT NULL DEFAULT 'Allow',
      data_size_bytes INTEGER DEFAULT 0,
      evaluated_at DATETIME NOT NULL DEFAULT (datetime('now'))
    )
  `)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_casb_log_app ON casb_activity_log(app_domain, evaluated_at)`)
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_casb_log_user ON casb_activity_log(user_id, evaluated_at)`)
}

export async function GET(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const { searchParams } = request.nextUrl
    const type = searchParams.get('type') || 'apps'

    if (type === 'apps') {
      // Return known SaaS app catalog with risk scores
      const apps = Object.entries(SAAS_APPS).map(([domain, info]) => ({ domain, ...info }))
      return NextResponse.json({ apps, total: apps.length })
    }

    if (type === 'check') {
      const domain = searchParams.get('domain')
      if (!domain) return NextResponse.json({ error: 'domain required' }, { status: 400 })
      const normalized = domain.replace(/^www\./, '').toLowerCase()
      const app = SAAS_APPS[normalized]
      // Check CASB policy
      const policy = await db.execute({
        sql: 'SELECT * FROM casb_policies WHERE app_domain = ? AND is_active = 1 LIMIT 1',
        args: [normalized]
      })
      const p = policy.rows[0] as any
      const riskLevel = app ? (app.riskScore >= 60 ? 'high' : app.riskScore >= 35 ? 'medium' : 'low') : 'unknown'
      return NextResponse.json({
        domain: normalized,
        recognized: !!app,
        app: app ? { name: app.name, category: app.category, riskScore: app.riskScore, compliance: app.compliance, features: app.features } : null,
        riskLevel,
        policy: p ? { action: p.action, allowedActions: JSON.parse(p.allowed_actions || '[]'), blockedActions: JSON.parse(p.blocked_actions || '[]'), requireDlpScan: !!p.require_dlp_scan } : { action: 'Monitor', allowedActions: ['view','download','upload'], blockedActions: [], requireDlpScan: false },
      })
    }

    if (type === 'policies') {
      const rows = await db.execute('SELECT * FROM casb_policies WHERE is_active = 1 ORDER BY id ASC')
      const policies = rows.rows.map((r: any) => ({
        ...r,
        allowed_actions: JSON.parse(r.allowed_actions || '[]'),
        blocked_actions: JSON.parse(r.blocked_actions || '[]'),
      }))
      return NextResponse.json({ policies, total: policies.length })
    }

    if (type === 'shadow-it') {
      // Discover unrecognized/risky apps from activity logs
      const hours = parseInt(searchParams.get('hours') || '168')
      const rows = await db.execute({
        sql: `SELECT app_domain, app_name, COUNT(*) as access_count,
        COUNT(DISTINCT user_id) as user_count,
        MAX(risk_score) as max_risk, AVG(risk_score) as avg_risk
        FROM casb_activity_log WHERE evaluated_at > datetime('now', ?)
        GROUP BY app_domain ORDER BY access_count DESC LIMIT 50`,
        args: [`-${hours} hours`]
      })
      const discovered = (rows.rows as any[]).map(r => {
        const known = SAAS_APPS[r.app_domain]
        return { ...r, recognized: !!known, appInfo: known || null }
      })
      return NextResponse.json({ apps: discovered, period: `${hours}h` })
    }

    if (type === 'stats') {
      const hours = parseInt(searchParams.get('hours') || '24')
      const [total, byApp, byRisk] = await Promise.all([
        db.execute({ sql: `SELECT COUNT(*) as c, COUNT(DISTINCT app_domain) as apps, COUNT(DISTINCT user_id) as users FROM casb_activity_log WHERE evaluated_at > datetime('now', ?)`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT app_domain, app_name, COUNT(*) as count FROM casb_activity_log WHERE evaluated_at > datetime('now', ?) GROUP BY app_domain ORDER BY count DESC LIMIT 10`, args: [`-${hours} hours`] }),
        db.execute({ sql: `SELECT CASE WHEN risk_score >= 60 THEN 'high' WHEN risk_score >= 35 THEN 'medium' ELSE 'low' END as level, COUNT(*) as count FROM casb_activity_log WHERE evaluated_at > datetime('now', ?) GROUP BY level`, args: [`-${hours} hours`] }),
      ])
      const t = total.rows[0] as any
      return NextResponse.json({
        period: `${hours}h`,
        totalActivities: t?.c || 0, uniqueApps: t?.apps || 0, uniqueUsers: t?.users || 0,
        topApps: byApp.rows, riskBreakdown: byRisk.rows,
      })
    }

    return NextResponse.json({ error: 'Invalid type. Use: apps, check, policies, shadow-it, stats' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { app_domain, action = 'Monitor', allowed_actions = ['view','download','upload'], blocked_actions = [], require_dlp_scan = false, group_id = null } = body
    if (!app_domain) return NextResponse.json({ error: 'app_domain required' }, { status: 400 })
    const result = await db.execute({
      sql: `INSERT INTO casb_policies (app_domain, action, allowed_actions, blocked_actions, require_dlp_scan, group_id) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [app_domain, action, JSON.stringify(allowed_actions), JSON.stringify(blocked_actions), require_dlp_scan ? 1 : 0, group_id]
    })
    return NextResponse.json({ success: true, policyId: result.lastInsertRowid })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDB()
    await ensureTables(db)
    const body = await request.json()
    const { policyId, ...fields } = body
    if (!policyId) return NextResponse.json({ error: 'policyId required' }, { status: 400 })
    const updates: string[] = []
    const args: any[] = []
    for (const [k, v] of Object.entries(fields)) {
      if (v === undefined) continue
      if (['allowed_actions','blocked_actions'].includes(k)) { updates.push(`${k} = ?`); args.push(JSON.stringify(v)) }
      else if (['require_dlp_scan','is_active'].includes(k)) { updates.push(`${k} = ?`); args.push(v ? 1 : 0) }
      else { updates.push(`${k} = ?`); args.push(v) }
    }
    if (updates.length > 0) { args.push(policyId); await db.execute({ sql: `UPDATE casb_policies SET ${updates.join(', ')} WHERE id = ?`, args }) }
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
