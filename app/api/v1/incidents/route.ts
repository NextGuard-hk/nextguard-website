import { NextRequest, NextResponse } from 'next/server'

// In-memory incident store (replace with database in production)
interface DLPIncident {
  id: string
  agentId: string
  hostname: string
  username: string
  policyId: string
  policyName: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  action: 'block' | 'audit' | 'encrypt' | 'quarantine' | 'alert'
  channel: 'file' | 'clipboard' | 'email' | 'browser' | 'usb' | 'print' | 'network'
  status: 'open' | 'investigating' | 'resolved' | 'false_positive' | 'escalated'
  details: {
    sourceApp?: string
    destinationApp?: string
    filePath?: string
    fileName?: string
    fileSize?: number
    fileHash?: string
    url?: string
    emailRecipient?: string
    contentSnippet?: string
    matchedPatterns?: string[]
    matchedKeywords?: string[]
  }
  timestamp: string
  reportedAt: string
  resolvedAt?: string
  resolvedBy?: string
  notes?: string
}

const incidents: DLPIncident[] = []

// POST - Agent reports a new incident
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      agentId, hostname, username, policyId, policyName,
      severity, action, channel, details
    } = body

    if (!agentId || !policyId || !channel) {
      return NextResponse.json(
        { error: 'Missing required fields: agentId, policyId, channel' },
        { status: 400 }
      )
    }

    const incident: DLPIncident = {
      id: `INC-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      agentId,
      hostname: hostname || 'unknown',
      username: username || 'unknown',
      policyId,
      policyName: policyName || 'Unknown Policy',
      severity: severity || 'medium',
      action: action || 'audit',
      channel,
      status: 'open',
      details: details || {},
      timestamp: body.timestamp || new Date().toISOString(),
      reportedAt: new Date().toISOString(),
    }

    // Auto-escalate critical incidents
    if (incident.severity === 'critical') {
      incident.status = 'escalated'
    }

    incidents.push(incident)

    // Keep max 10000 incidents in memory
    if (incidents.length > 10000) {
      incidents.splice(0, incidents.length - 10000)
    }

    return NextResponse.json({
      success: true,
      incidentId: incident.id,
      status: incident.status,
      message: incident.severity === 'critical'
        ? 'Critical incident reported and auto-escalated'
        : 'Incident reported successfully',
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET - Console retrieves incidents with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const agentId = searchParams.get('agentId')
    const severity = searchParams.get('severity')
    const status = searchParams.get('status')
    const channel = searchParams.get('channel')
    const policyId = searchParams.get('policyId')
    const from = searchParams.get('from')
    const to = searchParams.get('to')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200)

    let filtered = [...incidents]

    if (agentId) filtered = filtered.filter(i => i.agentId === agentId)
    if (severity) filtered = filtered.filter(i => i.severity === severity)
    if (status) filtered = filtered.filter(i => i.status === status)
    if (channel) filtered = filtered.filter(i => i.channel === channel)
    if (policyId) filtered = filtered.filter(i => i.policyId === policyId)
    if (from) filtered = filtered.filter(i => i.timestamp >= from)
    if (to) filtered = filtered.filter(i => i.timestamp <= to)

    // Sort by timestamp descending (newest first)
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = filtered.length
    const start = (page - 1) * limit
    const paginated = filtered.slice(start, start + limit)

    // Compute summary stats
    const stats = {
      total: incidents.length,
      bySeverity: {
        critical: incidents.filter(i => i.severity === 'critical').length,
        high: incidents.filter(i => i.severity === 'high').length,
        medium: incidents.filter(i => i.severity === 'medium').length,
        low: incidents.filter(i => i.severity === 'low').length,
      },
      byStatus: {
        open: incidents.filter(i => i.status === 'open').length,
        investigating: incidents.filter(i => i.status === 'investigating').length,
        escalated: incidents.filter(i => i.status === 'escalated').length,
        resolved: incidents.filter(i => i.status === 'resolved').length,
      },
      byChannel: {
        file: incidents.filter(i => i.channel === 'file').length,
        clipboard: incidents.filter(i => i.channel === 'clipboard').length,
        email: incidents.filter(i => i.channel === 'email').length,
        browser: incidents.filter(i => i.channel === 'browser').length,
        usb: incidents.filter(i => i.channel === 'usb').length,
        network: incidents.filter(i => i.channel === 'network').length,
      },
    }

    return NextResponse.json({
      success: true,
      incidents: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      stats,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update incident status (for console operators)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { incidentId, status, notes, resolvedBy } = body

    if (!incidentId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: incidentId, status' },
        { status: 400 }
      )
    }

    const validStatuses = ['open', 'investigating', 'resolved', 'false_positive', 'escalated']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const incident = incidents.find(i => i.id === incidentId)
    if (!incident) {
      return NextResponse.json({ error: 'Incident not found' }, { status: 404 })
    }

    incident.status = status as DLPIncident['status']
    if (notes) incident.notes = notes
    if (status === 'resolved' || status === 'false_positive') {
      incident.resolvedAt = new Date().toISOString()
      incident.resolvedBy = resolvedBy || 'admin'
    }

    return NextResponse.json({
      success: true,
      incident,
      message: `Incident ${incidentId} updated to ${status}`,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
