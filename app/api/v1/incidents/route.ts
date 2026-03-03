import { NextRequest, NextResponse } from 'next/server'
import { getStore, DLPEvent } from '@/lib/multi-tenant-store'

export const dynamic = 'force-dynamic'

// POST - Agent reports a new incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { agentId, hostname, username, policyId, policyName, severity, action, channel, details, tenantId } = body
    if (!agentId || !policyId || !channel) {
      return NextResponse.json({ error: 'Missing required fields: agentId, policyId, channel' }, { status: 400 })
    }
    const store = getStore()
    const id = `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`
    const event: DLPEvent = {
      id, tenantId: tenantId || 'tenant-demo', agentId,
      hostname: hostname || 'unknown', username: username || 'unknown',
      policyId, policyName: policyName || 'Unknown Policy',
      channel: channel as DLPEvent['channel'],
      action: action || 'audit', severity: severity || 'medium',
      status: severity === 'critical' ? 'blocked' : 'flagged',
      timestamp: body.timestamp || new Date().toISOString(),
      details: typeof details === 'string' ? details : JSON.stringify(details || {}),
      fileName: details?.fileName, filePath: details?.filePath,
      fileSize: details?.fileSize, fileHash: details?.fileHash,
      destination: details?.destination || details?.url,
      processName: details?.sourceApp, riskScore: body.riskScore || 50
    }
    store.events.push(event)
    if (store.events.length > 10000) store.events.splice(0, store.events.length - 10000)
    return NextResponse.json({ success: true, incidentId: id, status: event.status })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Console retrieves incidents with filtering
export async function GET(request: NextRequest) {
  try {
    const store = getStore()
    const { searchParams } = new URL(request.url)
    const tenantId = searchParams.get('tenantId')     const agentId = searchParams.get('agentId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const policyId = searchParams.get('policyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    let filtered = [...store.events]     if (tenantId) filtered = filtered.filter(i => i.tenantId === tenantId)
    if (agentId) filtered = filtered.filter(i => i.agentId === agentId)
    if (severity) filtered = filtered.filter(i => i.severity === severity)
    if (status) filtered = filtered.filter(i => i.status === status)
    if (channel) filtered = filtered.filter(i => i.channel === channel)
    if (policyId) filtered = filtered.filter(i => i.policyId === policyId)
    if (from) filtered = filtered.filter(i => i.timestamp >= from)
    if (to) filtered = filtered.filter(i => i.timestamp <= to)

    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const total = filtered.length
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    // Map events to incident format expected by console
    const incidents = paginated.map(e => ({
      id: e.id, agentId: e.agentId, hostname: e.hostname, username: e.username,
      policyId: e.policyId, policyName: e.policyName, severity: e.severity,
      action: e.action, channel: e.channel, status: mapStatus(e.status),
      details: { filePath: e.filePath, fileName: e.fileName, fileSize: e.fileSize,
        fileHash: e.fileHash, url: e.destination, sourceApp: e.processName,
        contentSnippet: e.details },
      timestamp: e.timestamp, reportedAt: e.timestamp
    }))

    const allEvents = tenantId ? store.events.filter(e => e.tenantId === tenantId) : store.events
    const stats = {
      total: allEvents.length,
      bySeverity: {
        critical: allEvents.filter(i => i.severity === 'critical').length,
        high: allEvents.filter(i => i.severity === 'high').length,
        medium: allEvents.filter(i => i.severity === 'medium').length,
        low: allEvents.filter(i => i.severity === 'low').length,
      },
      byStatus: {
        open: allEvents.filter(i => i.status === 'flagged').length,
        investigating: 0, escalated: allEvents.filter(i => i.status === 'blocked').length,
        resolved: allEvents.filter(i => i.status === 'allowed').length,
      },
      byChannel: {
        file: allEvents.filter(i => ['filesystem','cloud_storage'].includes(i.channel)).length,
        clipboard: allEvents.filter(i => i.channel === 'clipboard').length,
        email: allEvents.filter(i => i.channel === 'email').length,
        browser: allEvents.filter(i => ['browser_upload','browser_download'].includes(i.channel)).length,
        usb: allEvents.filter(i => i.channel === 'usb').length,
        network: allEvents.filter(i => ['network','messaging','airdrop','print'].includes(i.channel)).length,
      },
    }

    return NextResponse.json({
      success: true, incidents,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats,
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function mapStatus(s: string): string {
  if (s === 'blocked') return 'escalated'
  if (s === 'flagged') return 'open'
  if (s === 'allowed') return 'resolved'
  if (s === 'quarantined') return 'investigating'
  return 'open'
}

// PATCH - Update incident status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { incidentId, status } = body
    if (!incidentId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    const store = getStore()
    const reqTenantId = body.tenantId     const event = store.events.find(e => e.id === incidentId && (!reqTenantId || e.tenantId === reqTenantId))
    if (!event) return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    // Map console status back to event status
    if (status === 'resolved') event.status = 'allowed'
    else if (status === 'escalated') event.status = 'blocked'
    else if (status === 'investigating') event.status = 'quarantined'
    else event.status = 'flagged'
    return NextResponse.json({ success: true, message: `Incident ${incidentId} updated` })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
