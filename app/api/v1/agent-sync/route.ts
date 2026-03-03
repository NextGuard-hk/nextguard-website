import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateAgent } from '@/lib/auth'
import { getAgentPolicies } from '@/lib/policy-bundle-store'

export const dynamic = 'force-dynamic'

// Shared handler for both GET and POST (Agent uses POST)
async function handleSync(request: Request) {
  try {
    // Try token auth first, fall back to body-based auth
    let agentAuth = authenticateAgent(request)
    let tenantId = agentAuth?.tenantId
    let agentId = agentAuth?.agentId

    // If no token auth, try reading from POST body
    if (!agentAuth && request.method === 'POST') {
      try {
        const body = await request.json()
        tenantId = body.tenantId || 'tenant-demo'
        agentId = body.agentId
      } catch {}
    }

    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Missing tenant info' }, { status: 400 })
    }

    const store = getStore()
    const tenant = store.tenants.get(tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Update agent lastSeen
    if (agentId) {
      const agent = store.agents.get(agentId)
      if (agent && agent.tenantId === tenantId) {
        agent.lastHeartbeat = new Date().toISOString()
        agent.status = 'online'
      }
    }

    // Get policies from store.policies (same source that register uses)
    const enabledPolicies = getAgentPolicies(tenantId)

    return NextResponse.json({
      success: true,
      tenantId,
      agentId,
      policies: enabledPolicies,
      policyCount: enabledPolicies.length,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Agent sync error:', error)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return handleSync(request)
}

export async function POST(request: Request) {
  return handleSync(request)
}
