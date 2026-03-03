// Agent Heartbeat API - NextGuard Management Console
import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { syncRealAgentsToStore, saveRealAgent } from '@/lib/agent-persistence'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, hostname, status, metrics, tenantId } = body
    if (!agentId) {
      return NextResponse.json({ error: 'Missing agentId' }, { status: 400 })
    }
    const store = getStore()
      syncRealAgentsToStore()
    const agent = store.agents.get(agentId)
    if (agent) {
      agent.lastHeartbeat = new Date().toISOString()
      agent.status = 'online'
      if (hostname) agent.hostname = hostname
          saveRealAgent(agent)
      return NextResponse.json({
        success: true, agentId,
        serverTime: new Date().toISOString(),
        pendingPolicyPush: agent.pendingPolicyPush,
        commands: [],
      })
    }
    // Agent not found in store - still accept heartbeat
    return NextResponse.json({
      success: true, agentId,
      serverTime: new Date().toISOString(),
      needsRegistration: true,
      message: 'Agent not found. Please re-register.',
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
