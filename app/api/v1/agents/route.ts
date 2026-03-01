// Main Agents API - GET /api/v1/agents
// Returns list of registered agents for Console dashboard
// Shares globalThis.__nextguard_agents with register and heartbeat routes
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const agents: Record<string, any> = (globalThis as any).__nextguard_agents || {}
  const agentList = Object.values(agents)

  // Mark offline if no heartbeat in 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  agentList.forEach((a: any) => {
    if (a.lastHeartbeat < fiveMinAgo) a.status = 'offline'
  })

  // Map to Console-expected format
  const mapped = agentList.map((a: any) => ({
    id: a.agentId || a.deviceId || 'unknown',
    hostname: a.hostname || 'unknown',
    username: a.username || 'unknown',
    os: a.os || 'unknown',
    version: a.agentVersion || 'unknown',
    status: a.status || 'offline',
    lastHeartbeat: a.lastHeartbeat || '',
    registeredAt: a.registeredAt || '',
    ip: a.ipAddress || '',
  }))

  return NextResponse.json({
    success: true,
    totalAgents: mapped.length,
    onlineAgents: mapped.filter(a => a.status === 'online').length,
    offlineAgents: mapped.filter(a => a.status === 'offline').length,
    agents: mapped.sort((a, b) => (b.lastHeartbeat || '').localeCompare(a.lastHeartbeat || '')),
  })
}
