import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateAgent } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/v1/agent-sync - agent pulls its assigned policies
export async function GET(request: Request) {
  try {
    const agentAuth = authenticateAgent(request)
    if (!agentAuth) return NextResponse.json({ success: false, error: 'Invalid agent token' }, { status: 401 })

    const store = getStore()
    const tenant = store.tenants.get(agentAuth.tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Update agent lastSeen via store.agents Map
    const agent = store.agents.get(agentAuth.agentId)
    if (agent && agent.tenantId === agentAuth.tenantId) {
      agent.lastHeartbeat = new Date().toISOString()
      agent.status = 'online'
    }

    // Get enabled policies for this tenant from store.policies Map
    const enabledPolicies: any[] = []
    store.policies.forEach((p) => {
      if (p.tenantId === agentAuth.tenantId && p.isEnabled) {
        enabledPolicies.push(p)
      }
    })

    return NextResponse.json({
      success: true,
      tenantId: agentAuth.tenantId,
      agentId: agentAuth.agentId,
      policies: enabledPolicies,
      policyCount: enabledPolicies.length,
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
    const { tenantId, agentId, hostname, username, macAddress, osVersion, agentVersion, ip, action } = body
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })

    const store = getStore()
    const tenant = store.tenants.get(tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Heartbeat for existing agent
    if (action === 'heartbeat' && agentId) {
      const agent = store.agents.get(agentId)
      if (agent && agent.tenantId === tenantId) {
        agent.lastHeartbeat = new Date().toISOString()
        agent.status = 'online'
        return NextResponse.json({ success: true, action: 'heartbeat_ok' })
      }
    }

    // Register or update agent
    let existingAgent: any = null
    if (agentId) {
      existingAgent = store.agents.get(agentId)
    }
    if (!existingAgent && macAddress) {
      // Find by MAC address
      store.agents.forEach((a) => {
        if (a.macAddress === macAddress && a.tenantId === tenantId) existingAgent = a
      })
    }

    if (!existingAgent) {
      // Register new agent
      const newId = `agent_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      const newAgent = {
        id: newId,
        tenantId,
        hostname: hostname || 'unknown',
        username: username || 'unknown',
        os: 'macOS',
        osVersion: osVersion || 'unknown',
        agentVersion: agentVersion || '1.0.0',
        macAddress: macAddress || `mac_${Date.now()}`,
        ip: ip || '0.0.0.0',
        status: 'online' as const,
        lastHeartbeat: new Date().toISOString(),
        registeredAt: new Date().toISOString(),
        policyVersion: 0,
        pendingPolicyPush: true,
        tags: []
      }
      store.agents.set(newId, newAgent)
      existingAgent = newAgent

      // Log registration
      store.logs.push({
        id: `log_${Date.now()}`,
        tenantId,
        agentId: newId,
        timestamp: new Date().toISOString(),
        level: 'info',
        facility: 'agent-registration',
        message: `New agent registered: ${hostname} (${macAddress})`
      })
    } else {
      existingAgent.lastHeartbeat = new Date().toISOString()
      existingAgent.status = 'online'
      existingAgent.hostname = hostname || existingAgent.hostname
      existingAgent.agentVersion = agentVersion || existingAgent.agentVersion
      existingAgent.ip = ip || existingAgent.ip
    }

    // Get enabled policies for this tenant
    const enabledPolicies: any[] = []
    store.policies.forEach((p) => {
      if (p.tenantId === tenantId && p.isEnabled) enabledPolicies.push(p)
    })

    return NextResponse.json({
      success: true,
      agentId: existingAgent.id,
      policies: enabledPolicies,
      policyCount: enabledPolicies.length,
      syncedAt: new Date().toISOString()
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
