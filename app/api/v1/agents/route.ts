// Main Agents API - GET /api/v1/agents
// Reads from multi-tenant store (unified data source)
import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'

export const dynamic = 'force-dynamic'

export async function GET() {
  const store = getStore()
  const agentList = Array.from(store.agents.values())

  // Mark offline if no heartbeat in 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString()
  agentList.forEach((a) => {
    if (a.lastHeartbeat < fiveMinAgo) a.status = 'offline'
  })

  // Map to Console-expected format
  const mapped = agentList.map((a) => ({
    id: a.id,
    hostname: a.hostname,
    username: a.username,
    os: a.os,
    version: a.agentVersion,
    status: a.status,
    lastHeartbeat: a.lastHeartbeat,
    registeredAt: a.registeredAt,
    ip: a.ip,
  }))

  return NextResponse.json({
    success: true,
    totalAgents: mapped.length,
    onlineAgents: mapped.filter(a => a.status === 'online').length,
    offlineAgents: mapped.filter(a => a.status === 'offline').length,
    agents: mapped.sort((a, b) => (b.lastHeartbeat || '').localeCompare(a.lastHeartbeat || '')),
  })
}
