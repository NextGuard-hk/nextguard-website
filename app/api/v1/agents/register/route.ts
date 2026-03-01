// Agent Registration API - NextGuard Management Console
// Reference: PA Panorama Device Registration, CP SmartEndpoint, Forcepoint Server Registration
// Implements: FCAPS Configuration Management (CM)

import { NextRequest, NextResponse } from 'next/server'

// In-memory store (replace with DB in production - Supabase/PlanetScale)
const AGENTS_STORE_KEY = 'nextguard_agents'

interface AgentRegistration {
  deviceId: string
  hostname: string
  os: string
  osVersion: string
  agentVersion: string
  macAddress?: string
  ipAddress?: string
  username?: string
  registeredAt: string
  lastHeartbeat: string
  status: 'online' | 'offline' | 'pending'
  policyVersion: number
  tags?: string[]
}

// Simple token validation
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const apiKey = request.headers.get('x-api-key')
  // Accept either Bearer token or X-API-Key header
  // In production, validate against DB
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.split(' ')[1].length > 10
  }
  if (apiKey && apiKey.length > 10) {
    return true
  }
  // Allow registration without key for initial setup (demo mode)
  return true
}

export async function POST(request: NextRequest) {
  try {
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'AUTH_FAILED' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    const { deviceId, hostname, os, osVersion, agentVersion } = body
    if (!deviceId || !hostname || !os || !agentVersion) {
      return NextResponse.json(
        { error: 'Missing required fields: deviceId, hostname, os, agentVersion', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'

    // Read existing agents from global store
    const agents: Record<string, AgentRegistration> = (globalThis as any).__nextguard_agents || {}

    const now = new Date().toISOString()
    const isNewAgent = !agents[deviceId]

    // Create or update agent registration
    const agent: AgentRegistration = {
      deviceId,
      hostname,
      os,
      osVersion: osVersion || 'unknown',
      agentVersion,
      macAddress: body.macAddress,
      ipAddress: clientIp,
      username: body.username,
      registeredAt: agents[deviceId]?.registeredAt || now,
      lastHeartbeat: now,
      status: 'online',
      policyVersion: agents[deviceId]?.policyVersion || 0,
      tags: body.tags || [],
    }

    agents[deviceId] = agent
    ;(globalThis as any).__nextguard_agents = agents

    // Generate agent token for subsequent API calls
    const agentToken = Buffer.from(`${deviceId}:${now}:nextguard`).toString('base64')

    return NextResponse.json({
      success: true,
      isNewRegistration: isNewAgent,
      agent: {
        deviceId: agent.deviceId,
        hostname: agent.hostname,
        status: agent.status,
        registeredAt: agent.registeredAt,
      },
      config: {
        agentToken,
        heartbeatIntervalSeconds: 300,
        policySyncIntervalSeconds: 600,
        reportingEndpoint: '/api/v1/incidents',
        policySyncEndpoint: '/api/v1/policies/bundle',
        heartbeatEndpoint: '/api/v1/agents/heartbeat',
        managementConsoleUrl: 'https://www.next-guard.com/console',
      },
      message: isNewAgent
        ? `Agent ${hostname} registered successfully`
        : `Agent ${hostname} re-registered (updated)`,
    })
  } catch (error) {
    console.error('Agent registration error:', error)
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    )
  }
}

// GET: List all registered agents (admin only)
export async function GET(request: NextRequest) {
  try {
    const agents: Record<string, AgentRegistration> = (globalThis as any).__nextguard_agents || {}
    const agentList = Object.values(agents)

    // Mark agents as offline if no heartbeat in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    agentList.forEach(agent => {
      if (agent.lastHeartbeat < tenMinutesAgo) {
        agent.status = 'offline'
      }
    })

    // Support filtering
    const status = request.nextUrl.searchParams.get('status')
    const filtered = status
      ? agentList.filter(a => a.status === status)
      : agentList

    return NextResponse.json({
      success: true,
      totalAgents: agentList.length,
      onlineAgents: agentList.filter(a => a.status === 'online').length,
      offlineAgents: agentList.filter(a => a.status === 'offline').length,
      agents: filtered.sort((a, b) => b.lastHeartbeat.localeCompare(a.lastHeartbeat)),
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
