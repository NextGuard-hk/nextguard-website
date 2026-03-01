import { NextResponse } from 'next/server'

interface AppEvent {
  id: string
  timestamp: string
  agentId: string
  hostname: string
  channel: 'messaging' | 'print' | 'airdrop' | 'email' | 'browser' | 'clipboard'
  appName: string
  action: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  status: 'blocked' | 'allowed' | 'flagged'
  user: string
  details: string
  policyId?: string
  fileInfo?: { name: string; size: number; type: string }
}

const demoEvents: AppEvent[] = [
  {
    id: 'evt-001',
    timestamp: new Date(Date.now() - 120000).toISOString(),
    agentId: 'agent-mac-001',
    hostname: 'MBP-Engineering-01',
    channel: 'messaging',
    appName: 'WhatsApp',
    action: 'file_transfer',
    severity: 'critical',
    status: 'blocked',
    user: 'john.chen',
    details: 'Attempted to send confidential PDF via WhatsApp',
    policyId: 'POL-MSG-001',
    fileInfo: { name: 'Q4-Financial-Report.pdf', size: 2450000, type: 'application/pdf' }
  },
  {
    id: 'evt-002',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    agentId: 'agent-mac-002',
    hostname: 'MBP-Marketing-03',
    channel: 'airdrop',
    appName: 'AirDrop',
    action: 'file_share',
    severity: 'high',
    status: 'blocked',
    user: 'sarah.wong',
    details: 'AirDrop transfer of source code archive blocked',
    policyId: 'POL-AD-001',
    fileInfo: { name: 'project-src.zip', size: 15800000, type: 'application/zip' }
  },
  {
    id: 'evt-003',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    agentId: 'agent-mac-001',
    hostname: 'MBP-Engineering-01',
    channel: 'print',
    appName: 'CUPS Print',
    action: 'print_job',
    severity: 'medium',
    status: 'flagged',
    user: 'john.chen',
    details: 'Print job containing sensitive keywords detected',
    policyId: 'POL-PRT-001',
    fileInfo: { name: 'employee-salaries.xlsx', size: 340000, type: 'application/vnd.ms-excel' }
  },
  {
    id: 'evt-004',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    agentId: 'agent-mac-003',
    hostname: 'MBP-Design-02',
    channel: 'messaging',
    appName: 'Telegram',
    action: 'text_message',
    severity: 'high',
    status: 'flagged',
    user: 'mike.lai',
    details: 'Message containing credit card numbers detected',
    policyId: 'POL-MSG-002'
  },
  {
    id: 'evt-005',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    agentId: 'agent-mac-004',
    hostname: 'MBP-Finance-01',
    channel: 'email',
    appName: 'Mail.app',
    action: 'attachment_send',
    severity: 'critical',
    status: 'blocked',
    user: 'lisa.ho',
    details: 'Email with customer PII database attachment blocked',
    policyId: 'POL-EML-001',
    fileInfo: { name: 'customers-export.csv', size: 8900000, type: 'text/csv' }
  },
  {
    id: 'evt-006',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    agentId: 'agent-mac-002',
    hostname: 'MBP-Marketing-03',
    channel: 'clipboard',
    appName: 'System Clipboard',
    action: 'copy_paste',
    severity: 'low',
    status: 'allowed',
    user: 'sarah.wong',
    details: 'Clipboard copy of internal document text',
    policyId: 'POL-CB-001'
  }
]

export async function GET() {
  const summary = {
    total: demoEvents.length,
    blocked: demoEvents.filter(e => e.status === 'blocked').length,
    flagged: demoEvents.filter(e => e.status === 'flagged').length,
    allowed: demoEvents.filter(e => e.status === 'allowed').length,
    bySeverity: {
      critical: demoEvents.filter(e => e.severity === 'critical').length,
      high: demoEvents.filter(e => e.severity === 'high').length,
      medium: demoEvents.filter(e => e.severity === 'medium').length,
      low: demoEvents.filter(e => e.severity === 'low').length
    },
    byChannel: {
      messaging: demoEvents.filter(e => e.channel === 'messaging').length,
      airdrop: demoEvents.filter(e => e.channel === 'airdrop').length,
      print: demoEvents.filter(e => e.channel === 'print').length,
      email: demoEvents.filter(e => e.channel === 'email').length,
      clipboard: demoEvents.filter(e => e.channel === 'clipboard').length
    }
  }

  return NextResponse.json({
    success: true,
    data: { events: demoEvents, summary },
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return NextResponse.json({
      success: true,
      message: 'Event received',
      eventId: `evt-${Date.now()}`,
      timestamp: new Date().toISOString()
    }, { status: 201 })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
