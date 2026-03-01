// App-level DLP Events API - GET & POST /api/v1/app-events
// Receives and serves real-time DLP events from endpoint agents
// Channels: messaging, print, airdrop, browser, cloud, email, usb
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface AppDLPEvent {
  id: string
  timestamp: string
  agentId: string
  hostname: string
  username: string
  eventType: string
  channel: string
  severity: string
  action: string
  policyName: string
  appName?: string
  appCategory?: string
  fileName?: string
  filePath?: string
  contentSnippet?: string
  matchedRules?: string[]
  details?: Record<string, string>
}

// In-memory event store (production: use persistent DB)
const getStore = (): AppDLPEvent[] => {
  if (!(globalThis as any).__nextguard_app_events) {
    (globalThis as any).__nextguard_app_events = generateDemoEvents()
  }
  return (globalThis as any).__nextguard_app_events
}

// GET: Retrieve app DLP events with filtering
export async function GET(request: NextRequest) {
  const events = getStore()
  const { searchParams } = new URL(request.url)
  const channel = searchParams.get('channel')
  const severity = searchParams.get('severity')
  const eventType = searchParams.get('eventType')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  let filtered = [...events]
  if (channel && channel !== 'all') filtered = filtered.filter(e => e.channel === channel)
  if (severity && severity !== 'all') filtered = filtered.filter(e => e.severity === severity)
  if (eventType && eventType !== 'all') filtered = filtered.filter(e => e.eventType === eventType)

  // Sort newest first
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Stats
  const stats = {
    total: events.length,
    byChannel: {} as Record<string, number>,
    bySeverity: {} as Record<string, number>,
    byEventType: {} as Record<string, number>,
    byApp: {} as Record<string, number>,
  }
  events.forEach(e => {
    stats.byChannel[e.channel] = (stats.byChannel[e.channel] || 0) + 1
    stats.bySeverity[e.severity] = (stats.bySeverity[e.severity] || 0) + 1
    stats.byEventType[e.eventType] = (stats.byEventType[e.eventType] || 0) + 1
    if (e.appName) stats.byApp[e.appName] = (stats.byApp[e.appName] || 0) + 1
  })

  return NextResponse.json({
    success: true,
    stats,
    events: filtered.slice(offset, offset + limit),
    total: filtered.length,
    channels: [...new Set(events.map(e => e.channel))],
    eventTypes: [...new Set(events.map(e => e.eventType))],
  })
}

// POST: Receive new DLP events from agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const events = getStore()

    if (Array.isArray(body.events)) {
      for (const evt of body.events) {
        events.unshift({ ...evt, id: evt.id || crypto.randomUUID(), timestamp: evt.timestamp || new Date().toISOString() })
      }
    } else {
      events.unshift({ ...body, id: body.id || crypto.randomUUID(), timestamp: body.timestamp || new Date().toISOString() })
    }

    // Keep max 5000 events
    if (events.length > 5000) events.splice(5000)

    return NextResponse.json({ success: true, totalEvents: events.length })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 })
  }
}

// Generate realistic demo events for the console
function generateDemoEvents(): AppDLPEvent[] {
  const now = Date.now()
  const events: AppDLPEvent[] = []
  const apps = [
    { name: 'WhatsApp', category: 'messaging', channel: 'messaging' },
    { name: 'WeChat', category: 'messaging', channel: 'messaging' },
    { name: 'Telegram', category: 'messaging', channel: 'messaging' },
    { name: 'Slack', category: 'messaging', channel: 'messaging' },
    { name: 'Microsoft Teams', category: 'messaging', channel: 'messaging' },
    { name: 'Signal', category: 'messaging', channel: 'messaging' },
    { name: 'Discord', category: 'messaging', channel: 'messaging' },
    { name: 'Lark', category: 'messaging', channel: 'messaging' },
    { name: 'DingTalk', category: 'messaging', channel: 'messaging' },
  ]
  const printEvents = [
    { type: 'PRINT_JOB', policy: 'Credit Card Number', severity: 'critical', action: 'block' },
    { type: 'PRINT_COMPLETED', policy: 'PRINT_VOLUME_MONITOR', severity: 'medium', action: 'log' },
    { type: 'PRINT_JOB', policy: 'Sensitive Keywords', severity: 'high', action: 'quarantine' },
    { type: 'PRINT_ACTIVE', policy: 'PRINT_ACTIVITY', severity: 'low', action: 'log' },
  ]
  const airdropEvents = [
    { type: 'AIRDROP_RECEIVE', policy: 'AIRDROP_CRYPTO_KEY_TRANSFER', severity: 'critical', action: 'block', file: 'private_key.pem' },
    { type: 'AIRDROP_RECEIVE', policy: 'AIRDROP_HIGH_RISK_FILETYPE', severity: 'medium', action: 'warn', file: 'Q4_Report.xlsx' },
    { type: 'AIRDROP_SEND', policy: 'AIRDROP_DATABASE_TRANSFER', severity: 'high', action: 'warn', file: 'customers.db' },
    { type: 'AIRDROP_RECEIVE', policy: 'AIRDROP_LARGE_FILE', severity: 'high', action: 'warn', file: 'archive_2026.zip' },
  ]
  const msgTypes = [
    { type: 'CLIPBOARD_PASTE', policy: 'PCI_CREDIT_CARD', severity: 'critical', action: 'block' },
    { type: 'FILE_SEND', policy: 'MESSAGING_FILE_TRANSFER', severity: 'medium', action: 'warn' },
    { type: 'FILE_SEND', policy: 'SOURCE_CODE_LEAK', severity: 'high', action: 'block' },
    { type: 'CLIPBOARD_PASTE', policy: 'PII_HKID', severity: 'critical', action: 'block' },
    { type: 'CLIPBOARD_PASTE', policy: 'BULK_EMAIL_EXFILTRATION', severity: 'high', action: 'warn' },
    { type: 'SCREEN_CAPTURE', policy: 'SCREENSHOT_DURING_MESSAGING', severity: 'medium', action: 'log' },
    { type: 'FILE_SEND', policy: 'MESSAGING_FILE_TRANSFER', severity: 'low', action: 'log' },
  ]

  // Messaging events
  for (let i = 0; i < 25; i++) {
    const app = apps[Math.floor(Math.random() * apps.length)]
    const msg = msgTypes[Math.floor(Math.random() * msgTypes.length)]
    events.push({
      id: crypto.randomUUID(),
      timestamp: new Date(now - Math.random() * 86400000 * 3).toISOString(),
      agentId: 'agent-mr-o-macbook',
      hostname: "Mr.O's MacBook Air",
      username: 'root',
      eventType: msg.type,
      channel: app.channel,
      severity: msg.severity,
      action: msg.action,
      policyName: msg.policy,
      appName: app.name,
      appCategory: app.category,
      matchedRules: [msg.policy],
      details: { app: app.name },
    })
  }

  // Print events
  for (let i = 0; i < 8; i++) {
    const pe = printEvents[Math.floor(Math.random() * printEvents.length)]
    events.push({
      id: crypto.randomUUID(),
      timestamp: new Date(now - Math.random() * 86400000 * 2).toISOString(),
      agentId: 'agent-mr-o-macbook',
      hostname: "Mr.O's MacBook Air",
      username: 'root',
      eventType: pe.type,
      channel: 'print',
      severity: pe.severity,
      action: pe.action,
      policyName: pe.policy,
      appName: 'CUPS Printer',
      details: { printer: 'HP_LaserJet_Pro', jobId: String(1000 + i) },
    })
  }

  // AirDrop events
  for (let i = 0; i < 6; i++) {
    const ae = airdropEvents[Math.floor(Math.random() * airdropEvents.length)]
    events.push({
      id: crypto.randomUUID(),
      timestamp: new Date(now - Math.random() * 86400000 * 2).toISOString(),
      agentId: 'agent-mr-o-macbook',
      hostname: "Mr.O's MacBook Air",
      username: 'root',
      eventType: ae.type,
      channel: 'airdrop',
      severity: ae.severity,
      action: ae.action,
      policyName: ae.policy,
      appName: 'AirDrop',
      fileName: ae.file,
      details: { direction: ae.type.includes('RECEIVE') ? 'received' : 'sent', fileName: ae.file },
    })
  }

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
}
