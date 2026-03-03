import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { syncRealAgentsToStore } from '@/lib/agent-persistence'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await context.params
  const store = getStore()
    syncRealAgentsToStore()
  const tenant = store.tenants.get(tenantId)

  if (!tenant) {
    return NextResponse.json(
      {
        id: tenantId,
        name: tenantId === 'tenant-demo' ? 'NextGuard Demo' : tenantId,
        agents: [],
        policies: 0
      },
      { status: 200 }
    )
  }

  const allAgents = Array.from(store.agents.values())
  const tenantAgents = allAgents.filter(a => a.tenantId === tenantId)
  const now = Date.now()

  const agents = tenantAgents.map(a => {
    const lastHb = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0
    const isOnline = (now - lastHb) < 5 * 60 * 1000
    return {
      agentId: a.id,
      hostname: a.hostname || 'Unknown',
      os: `${a.os || 'Unknown'} ${a.osVersion || ''}`.trim(),
      status: a.status === 'warning' ? 'warning' : (isOnline ? 'online' : 'offline'),
      lastHeartbeat: a.lastHeartbeat || new Date().toISOString(),
      version: a.agentVersion || '1.0.0',
      registeredAt: a.registeredAt || new Date().toISOString(),
      username: a.username || '',
      ip: a.ip || '',
      tags: a.tags || []
    }
  })

  const allPolicies = Array.from(store.policies.values())
  const policyCount = allPolicies.filter(p => p.tenantId === tenantId).length

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    domain: tenant.domain,
    plan: tenant.plan,
    agents,
    policies: policyCount
  })
}
