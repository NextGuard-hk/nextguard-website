import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateAgent } from '@/lib/auth'
import { getAgentPolicies } from '@/lib/policy-bundle-store'

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

    // Get enabled policies from the SHARED policy bundle store (same source as Console UI)
    const enabledPolicies = getAgentPolicies(agentAuth.tenantId)

    return NextResponse.json({
      success: true,
      tenantId: agentAuth.tenantId,
      agentId: agentAuth.agentId,
      policies: enabledPolicies,
      policyCount: enabledPolicies.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Agent sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
