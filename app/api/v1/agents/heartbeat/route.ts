// Agent Heartbeat API - NextGuard Management Console
// Reference: PA Panorama heartbeat, CP SIC, Zscaler forwarding profile health
// Implements: FCAPS Performance Management (PM) & Fault Management (FM)

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { deviceId, hostname, agentVersion, policyVersion, stats } = body

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Missing deviceId', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const agents: Record<string, any> = (globalThis as any).__nextguard_agents || {}
    const now = new Date().toISOString()

    if (agents[deviceId]) {
      // Update existing agent
      agents[deviceId].lastHeartbeat = now
      agents[deviceId].status = 'online'
      if (agentVersion) agents[deviceId].agentVersion = agentVersion
      if (hostname) agents[deviceId].hostname = hostname
      if (policyVersion !== undefined) agents[deviceId].policyVersion = policyVersion

      // Store performance stats (PM)
      if (stats) {
        agents[deviceId].lastStats = {
          cpuUsage: stats.cpuUsage,
          memoryUsage: stats.memoryUsage,
          eventsToday: stats.eventsToday,
          blockedToday: stats.blockedToday,
          scanQueueSize: stats.scanQueueSize,
          uptimeSeconds: stats.uptimeSeconds,
          timestamp: now,
        }
      }
    } else {
      // Auto-register if not found
      agents[deviceId] = {
        deviceId,
        hostname: hostname || 'unknown',
        os: body.os || 'unknown',
        osVersion: body.osVersion || 'unknown',
        agentVersion: agentVersion || 'unknown',
        registeredAt: now,
        lastHeartbeat: now,
        status: 'online',
        policyVersion: policyVersion || 0,
      }
    }

    ;(globalThis as any).__nextguard_agents = agents

    // Check if agent needs policy update
    const policies: any[] = (globalThis as any).__nextguard_policies || []
    const latestPolicyVersion = policies.length > 0
      ? Math.max(...policies.map((p: any) => p.version || 1))
      : 1
    const needsPolicyUpdate = (policyVersion || 0) < latestPolicyVersion

    // Check for pending commands (FM - remote management)
    const pendingCommands: any[] = (globalThis as any).__nextguard_commands?.[deviceId] || []

    return NextResponse.json({
      success: true,
      serverTime: now,
      nextHeartbeatSeconds: 300,
      // Policy sync signal (like PA Panorama push notification)
      policyUpdate: needsPolicyUpdate ? {
        available: true,
        currentVersion: policyVersion || 0,
        latestVersion: latestPolicyVersion,
        syncEndpoint: '/api/v1/policies/bundle',
      } : { available: false },
      // Remote commands (like CP SmartEndpoint push operations)
      commands: pendingCommands,
      // Agent health status acknowledgment
      status: 'acknowledged',
    })
  } catch (error) {
    console.error('Heartbeat error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
