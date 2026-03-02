// Agent Registration API - NextGuard Management Console
import { NextRequest, NextResponse } from 'next/server'
import { getStore, Agent, generateId } from '@/lib/multi-tenant-store'
import { signAgentToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hostname, username, os, agentVersion, capabilities, deviceId, tenantId,
            osVersion, macAddress } = body
    if (!hostname) {
      return NextResponse.json({ error: 'Missing required field: hostname' }, { status: 400 })
    }
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const now = new Date().toISOString()
    const store = getStore()
    const agentId = deviceId || `agent-${hostname}-${username || 'default'}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const tid = tenantId || 'tenant-demo'
    const existing = store.agents.get(agentId)
    const isNew = !existing

    const agent: Agent = {
      id: agentId,
      tenantId: tid,
      hostname,
      username: username || 'unknown',
      os: os || 'unknown',
      osVersion: osVersion || 'unknown',
      agentVersion: agentVersion || 'unknown',
      macAddress: macAddress || `mac_${Date.now()}`,
      ip: clientIp,
      status: 'online',
      lastHeartbeat: now,
      registeredAt: existing?.registeredAt || now,
      policyVersion: existing?.policyVersion || 0,
      pendingPolicyPush: true,
      tags: existing?.tags || [],
    }
    store.agents.set(agentId, agent)

    if (isNew) {
      store.logs.push({
        id: generateId('log'),
        tenantId: tid,
        agentId,
        timestamp: now,
        level: 'info',
        facility: 'agent-registration',
        message: `New agent registered: ${hostname} (${macAddress || 'unknown'})`
      })
    }

    // Get policies for this tenant
    const policies: any[] = []
    store.policies.forEach(p => {
      if (p.tenantId === tid && p.isEnabled) policies.push(p)
    })

    // Generate agent token for subsequent API calls
    const agentToken = signAgentToken(agentId, tid)

    return NextResponse.json({
      success: true,
      agentId,
      agentToken,
      isNewRegistration: isNew,
      agent: { agentId, hostname, status: 'online', registeredAt: agent.registeredAt },
      config: {
        heartbeatIntervalSeconds: 60,
        policySyncIntervalSeconds: 300,
        heartbeatEndpoint: '/api/v1/agents/heartbeat',
        policySyncEndpoint: '/api/v1/agent-sync',
        reportingEndpoint: '/api/v1/incidents',
      },
      policies,
      policyCount: policies.length,
      message: isNew ? `Agent ${hostname} registered successfully` : `Agent ${hostname} re-registered`,
    })
  } catch (error) {
    console.error('Agent registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  const store = getStore()
  const agentList = Array.from(store.agents.values())
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  agentList.forEach(a => { if (a.lastHeartbeat < fiveMinAgo) a.status = 'offline' })
  return NextResponse.json({
    success: true,
    totalAgents: agentList.length,
    onlineAgents: agentList.filter(a => a.status === 'online').length,
    offlineAgents: agentList.filter(a => a.status === 'offline').length,
    agents: agentList.sort((a, b) => b.lastHeartbeat.localeCompare(a.lastHeartbeat)),
  })
}
