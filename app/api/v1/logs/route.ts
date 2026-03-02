import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { verifyAgentToken, verifyUserToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// POST /api/v1/logs - agent uploads DLP event logs and forensics
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const agentAuth = verifyAgentToken(token)
    if (!agentAuth) return NextResponse.json({ success: false, error: 'Invalid agent token' }, { status: 401 })
    const store = getStore()
    const tenant = store.tenants.get(agentAuth.tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    const body = await request.json()
    const { events } = body
    if (!Array.isArray(events)) {
      return NextResponse.json({ success: false, error: 'events array required' }, { status: 400 })
    }
    const logEntries = events.map((e: any) => ({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tenantId: agentAuth.tenantId,
      agentId: agentAuth.agentId,
      timestamp: e.timestamp || new Date().toISOString(),
      eventType: e.eventType || 'unknown',
      severity: e.severity || 'info',
      policyId: e.policyId || null,
      policyName: e.policyName || null,
      action: e.action || 'log',
      description: e.description || '',
      filePath: e.filePath || null,
      processName: e.processName || null,
      username: e.username || null,
      hostname: e.hostname || null,
      forensicData: e.forensicData || null
    }))
    if (!tenant.logs) tenant.logs = []
    tenant.logs.push(...logEntries)
    // Keep last 10000 logs per tenant
    if (tenant.logs.length > 10000) {
      tenant.logs = tenant.logs.slice(-10000)
    }
    return NextResponse.json({ success: true, accepted: logEntries.length })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// GET /api/v1/logs - console queries logs
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const tenantId = user.role === 'super_admin' ? url.searchParams.get('tenantId') : user.tenantId
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const severity = url.searchParams.get('severity')
    const eventType = url.searchParams.get('eventType')
    const store = getStore()
    const tenant = store.tenants.get(tenantId || '')
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    let logs = tenant.logs || []
    if (severity) logs = logs.filter((l: any) => l.severity === severity)
    if (eventType) logs = logs.filter((l: any) => l.eventType === eventType)
    logs = logs.slice(-limit).reverse()
    return NextResponse.json({ success: true, total: logs.length, logs })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
