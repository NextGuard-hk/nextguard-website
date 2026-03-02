import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { verifyAgentToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/v1/agent-sync - agent pulls its assigned policies
// Agent must send: Authorization: Bearer <agentToken>
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const agentAuth = verifyAgentToken(token)
    if (!agentAuth) return NextResponse.json({ success: false, error: 'Invalid agent token' }, { status: 401 })
    const store = getStore()
    const tenant = store.tenants.get(agentAuth.tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    // Update agent lastSeen
    const agent = tenant.agents.find(a => a.id === agentAuth.agentId)
    if (agent) {
      agent.lastSeen = new Date().toISOString()
      agent.status = 'online'
    }
    // Return only enabled policies
    const enabledPolicies = tenant.policies.filter(p => p.enabled)
    return NextResponse.json({
      success: true,
      tenantId: agentAuth.tenantId,
      agentId: agentAuth.agentId,
      policies: enabledPolicies,
      syncedAt: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/agent-sync - agent registers/heartbeat with tenant
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { tenantId, agentId, hostname, macAddress, osVersion, agentVersion, action } = body
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })
    const store = getStore()
    const tenant = store.tenants.get(tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    if (action === 'heartbeat' && agentId) {
      const agent = tenant.agents.find(a => a.id === agentId)
      if (agent) {
        agent.lastSeen = new Date().toISOString()
        agent.status = 'online'
        return NextResponse.json({ success: true, action: 'heartbeat_ok' })
      }
    }
    // Register new agent
    let agent = macAddress ? tenant.agents.find(a => a.macAddress === macAddress) : null
    if (!agent) {
      agent = {
        id: `agent_${Date.now()}`,
        tenantId,
        hostname: hostname || 'unknown',
        macAddress: macAddress || `mac_${Date.now()}`,
        osVersion: osVersion || 'macOS',
        agentVersion: agentVersion || '1.0.0',
        status: 'online' as const,
        lastSeen: new Date().toISOString(),
        registeredAt: new Date().toISOString()
      }
      tenant.agents.push(agent)
    } else {
      agent.lastSeen = new Date().toISOString()
      agent.status = 'online'
      agent.hostname = hostname || agent.hostname
    }
    const enabledPolicies = tenant.policies.filter(p => p.enabled)
    return NextResponse.json({
      success: true,
      agentId: agent.id,
      policies: enabledPolicies,
      syncedAt: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
