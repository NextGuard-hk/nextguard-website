// Agent Registration API - NextGuard Management Console
// Compatible with NextGuard Endpoint DLP Agent v1.1.0
import { NextRequest, NextResponse } from 'next/server'

// Shared in-memory store (globalThis persists across requests in same serverless instance)
function getAgents(): Record<string, any> {
  if (!(globalThis as any).__nextguard_agents) {
    (globalThis as any).__nextguard_agents = {}
  }
  return (globalThis as any).__nextguard_agents
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hostname, username, os, agentVersion, capabilities, deviceId } = body

    if (!hostname) {
      return NextResponse.json(
        { error: 'Missing required field: hostname', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const now = new Date().toISOString()

    // Generate agentId from deviceId or hostname+username
    const agentId = deviceId || `agent-${hostname}-${username || 'default'}`.toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const agents = getAgents()
    const isNew = !agents[agentId]

    agents[agentId] = {
      agentId,
      hostname,
      username: username || 'unknown',
      os: os || 'unknown',
      agentVersion: agentVersion || 'unknown',
      capabilities: capabilities || [],
      ipAddress: clientIp,
      registeredAt: agents[agentId]?.registeredAt || now,
      lastHeartbeat: now,
      status: 'online',
      policyVersion: agents[agentId]?.policyVersion || 0,
    }

    return NextResponse.json({
      success: true,
      agentId,
      isNewRegistration: isNew,
      agent: {
        agentId,
        hostname,
        status: 'online',
        registeredAt: agents[agentId].registeredAt,
      },
      config: {
        heartbeatIntervalSeconds: 60,
        policySyncIntervalSeconds: 300,
        heartbeatEndpoint: '/api/v1/agents/heartbeat',
        policySyncEndpoint: '/api/v1/policies/bundle',
        reportingEndpoint: '/api/v1/incidents',
      },
      message: isNew ? `Agent ${hostname} registered successfully` : `Agent ${hostname} re-registered`,
    })
  } catch (error) {
    console.error('Agent registration error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET: List all registered agents
export async function GET() {
  const agents = getAgents()
  const agentList = Object.values(agents)

  // Mark offline if no heartbeat in 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  agentList.forEach((a: any) => {
    if (a.lastHeartbeat < fiveMinAgo) a.status = 'offline'
  })

  return NextResponse.json({
    success: true,
    totalAgents: agentList.length,
    onlineAgents: agentList.filter((a: any) => a.status === 'online').length,
    offlineAgents: agentList.filter((a: any) => a.status === 'offline').length,
    agents: agentList.sort((a: any, b: any) => b.lastHeartbeat.localeCompare(a.lastHeartbeat)),
  })
}
