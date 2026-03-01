// Agent Heartbeat API - NextGuard Management Console
// Compatible with NextGuard Endpoint DLP Agent v1.1.0
import { NextRequest, NextResponse } from 'next/server'

function getAgents(): Record<string, any> {
  if (!(globalThis as any).__nextguard_agents) {
    (globalThis as any).__nextguard_agents = {}
  }
  return (globalThis as any).__nextguard_agents
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // Accept both agentId and deviceId for compatibility
    const agentId = body.agentId || body.deviceId
    const { hostname, username, os, agentVersion, status, uptime } = body

    if (!agentId) {
      return NextResponse.json(
        { error: 'Missing agentId', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const agents = getAgents()
    const now = new Date().toISOString()
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'

    if (agents[agentId]) {
      // Update existing agent
      agents[agentId].lastHeartbeat = now
      agents[agentId].status = 'online'
      if (hostname) agents[agentId].hostname = hostname
      if (username) agents[agentId].username = username
      if (os) agents[agentId].os = os
      if (agentVersion) agents[agentId].agentVersion = agentVersion
      if (uptime) agents[agentId].uptime = uptime
      agents[agentId].ipAddress = clientIp
    } else {
      // Auto-register if not found
      agents[agentId] = {
        agentId,
        hostname: hostname || 'unknown',
        username: username || 'unknown',
        os: os || 'unknown',
        agentVersion: agentVersion || 'unknown',
        ipAddress: clientIp,
        registeredAt: now,
        lastHeartbeat: now,
        status: 'online',
        uptime: uptime || 0,
        policyVersion: 0,
      }
    }

    return NextResponse.json({
      success: true,
      agentId,
      status: 'online',
      serverTime: now,
      nextHeartbeatSeconds: 60,
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
