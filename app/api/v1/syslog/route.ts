// Syslog API - NextGuard DLP Console System Logging
// Provides centralized logging for agent events, system operations, and troubleshooting
import { NextRequest, NextResponse } from 'next/server'

interface SyslogEntry {
  id: string
  timestamp: string
  level: 'emergency' | 'alert' | 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug'
  facility: string
  source: string
  hostname: string
  message: string
  details?: Record<string, unknown>
}

// In-memory syslog store (production would use persistent storage)
const syslogStore: SyslogEntry[] = []
let logIdCounter = 1000

// Generate seed logs for demo
function seedLogs() {
  if (syslogStore.length > 0) return
  const now = Date.now()
  const facilities = ['agent', 'console', 'policy-engine', 'scanner', 'network', 'auth', 'config', 'deployment', 'siem', 'heartbeat']
  const levels: SyslogEntry['level'][] = ['info', 'info', 'info', 'warning', 'error', 'notice', 'debug', 'info', 'critical', 'info']
  const seedData: Omit<SyslogEntry, 'id'>[] = [
    { timestamp: new Date(now - 120000).toISOString(), level: 'info', facility: 'heartbeat', source: 'agent-service', hostname: 'ngd-agent-01', message: 'Agent heartbeat received successfully', details: { agentVersion: '1.1.0', os: 'Windows 11', uptime: 86400 } },
    { timestamp: new Date(now - 115000).toISOString(), level: 'info', facility: 'policy-engine', source: 'policy-sync', hostname: 'console-server', message: 'Policy bundle v43 synchronized to 0 agents', details: { policyCount: 43, bundleSize: '128KB' } },
    { timestamp: new Date(now - 100000).toISOString(), level: 'warning', facility: 'scanner', source: 'content-inspector', hostname: 'ngd-agent-01', message: 'Content scan timeout - file exceeds 500MB scan limit', details: { file: 'archive.zip', size: '512MB', scanTime: 30000 } },
    { timestamp: new Date(now - 95000).toISOString(), level: 'info', facility: 'network', source: 'http-monitor', hostname: 'ngd-agent-01', message: 'HTTPS/SSL interception initialized on port 8443', details: { port: 8443, certExpiry: '2027-01-01' } },
    { timestamp: new Date(now - 90000).toISOString(), level: 'error', facility: 'agent', source: 'agent-updater', hostname: 'ngd-agent-02', message: 'Agent auto-update failed: unable to download v1.1.1 package', details: { currentVersion: '1.0.3', targetVersion: '1.1.1', errorCode: 'DOWNLOAD_TIMEOUT' } },
    { timestamp: new Date(now - 85000).toISOString(), level: 'notice', facility: 'config', source: 'config-manager', hostname: 'console-server', message: 'Agent configuration updated: net-bypass feature toggled to enabled', details: { featureId: 'net-bypass', newState: true, changedBy: 'admin' } },
    { timestamp: new Date(now - 80000).toISOString(), level: 'info', facility: 'auth', source: 'auth-service', hostname: 'console-server', message: 'Admin login successful from 192.168.1.100', details: { user: 'admin@nextguard.com', ip: '192.168.1.100', method: '2FA' } },
    { timestamp: new Date(now - 75000).toISOString(), level: 'critical', facility: 'agent', source: 'watchdog', hostname: 'ngd-agent-03', message: 'Agent process crashed - auto-restart initiated', details: { pid: 4521, exitCode: -1, restartCount: 3, crashDump: '/var/log/ngd/crash_20260302.dmp' } },
    { timestamp: new Date(now - 70000).toISOString(), level: 'info', facility: 'siem', source: 'siem-forwarder', hostname: 'console-server', message: 'SIEM event batch forwarded to Splunk (15 events)', details: { destination: 'splunk.corp.local:514', eventCount: 15, protocol: 'TCP/TLS' } },
    { timestamp: new Date(now - 65000).toISOString(), level: 'warning', facility: 'network', source: 'ssl-inspector', hostname: 'ngd-agent-01', message: 'Certificate pinning detected - bypassing inspection for banking site', details: { domain: 'online.hsbc.com.hk', action: 'bypass', reason: 'cert-pinning' } },
    { timestamp: new Date(now - 60000).toISOString(), level: 'info', facility: 'deployment', source: 'deploy-manager', hostname: 'console-server', message: 'SCCM deployment package created for v1.1.0', details: { packageId: 'NGD-2026-0302', targetCount: 50, method: 'SCCM/GPO' } },
    { timestamp: new Date(now - 55000).toISOString(), level: 'debug', facility: 'scanner', source: 'regex-engine', hostname: 'ngd-agent-01', message: 'PII detection regex compiled: 43 patterns loaded in 12ms', details: { patternCount: 43, compileTime: 12, engine: 'RE2' } },
    { timestamp: new Date(now - 50000).toISOString(), level: 'error', facility: 'network', source: 'ftp-monitor', hostname: 'ngd-agent-02', message: 'FTP channel monitor failed to bind port 21 - port already in use', details: { port: 21, conflictPid: 1234, service: 'vsftpd' } },
    { timestamp: new Date(now - 45000).toISOString(), level: 'info', facility: 'policy-engine', source: 'ai-classifier', hostname: 'console-server', message: 'AI classification model updated to v3.2 - accuracy 97.8%', details: { modelVersion: '3.2', accuracy: 0.978, trainingData: '2.1M samples' } },
    { timestamp: new Date(now - 40000).toISOString(), level: 'warning', facility: 'agent', source: 'disk-monitor', hostname: 'ngd-agent-01', message: 'Agent log directory approaching 90% capacity (4.5GB/5GB)', details: { used: '4.5GB', total: '5GB', logRotation: 'enabled', retentionDays: 30 } },
    { timestamp: new Date(now - 35000).toISOString(), level: 'info', facility: 'heartbeat', source: 'agent-service', hostname: 'ngd-agent-02', message: 'Agent heartbeat received - status: online', details: { agentVersion: '1.0.3', os: 'macOS 14.2', uptime: 172800 } },
    { timestamp: new Date(now - 30000).toISOString(), level: 'notice', facility: 'config', source: 'config-manager', hostname: 'console-server', message: 'Global detection mode changed from traditional to hybrid', details: { oldMode: 'traditional', newMode: 'hybrid', changedBy: 'admin' } },
    { timestamp: new Date(now - 25000).toISOString(), level: 'info', facility: 'console', source: 'report-engine', hostname: 'console-server', message: 'Weekly DLP compliance report generated and queued for delivery', details: { reportId: 'RPT-2026-W09', recipients: 3, format: 'PDF' } },
    { timestamp: new Date(now - 20000).toISOString(), level: 'error', facility: 'agent', source: 'im-monitor', hostname: 'ngd-agent-03', message: 'WeChat monitoring hook failed - app version incompatible', details: { wechatVersion: '8.0.50', requiredVersion: '>=8.0.40', module: 'im-wechat' } },
    { timestamp: new Date(now - 15000).toISOString(), level: 'info', facility: 'scanner', source: 'content-inspector', hostname: 'ngd-agent-01', message: 'DLP scan completed: 1,247 files scanned, 3 violations found', details: { filesScanned: 1247, violations: 3, scanDuration: 45000, mode: 'hybrid' } },
    { timestamp: new Date(now - 10000).toISOString(), level: 'alert', facility: 'agent', source: 'tamper-detect', hostname: 'ngd-agent-02', message: 'Agent tamper protection triggered - unauthorized modification attempt blocked', details: { targetFile: 'ngd-service.exe', action: 'blocked', alertSent: true } },
    { timestamp: new Date(now - 5000).toISOString(), level: 'info', facility: 'network', source: 'http-monitor', hostname: 'ngd-agent-01', message: 'GenAI service access detected: ChatGPT upload intercepted and audited', details: { service: 'chat.openai.com', action: 'audit', dataSize: '2.3KB', user: 'john.doe' } },
  ]
  seedData.forEach(entry => {
    syslogStore.push({ ...entry, id: `SYS-${++logIdCounter}` })
  })
}

seedLogs()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const level = searchParams.get('level')
  const facility = searchParams.get('facility')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '100')
  const offset = parseInt(searchParams.get('offset') || '0')

  let filtered = [...syslogStore].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  if (level && level !== 'all') {
    filtered = filtered.filter(l => l.level === level)
  }
  if (facility && facility !== 'all') {
    filtered = filtered.filter(l => l.facility === facility)
  }
  if (search) {
    const s = search.toLowerCase()
    filtered = filtered.filter(l => l.message.toLowerCase().includes(s) || l.hostname.toLowerCase().includes(s) || l.source.toLowerCase().includes(s))
  }

  const total = filtered.length
  const paginated = filtered.slice(offset, offset + limit)

  // Stats
  const stats = {
    total: syslogStore.length,
    byLevel: {} as Record<string, number>,
    byFacility: {} as Record<string, number>,
  }
  syslogStore.forEach(l => {
    stats.byLevel[l.level] = (stats.byLevel[l.level] || 0) + 1
    stats.byFacility[l.facility] = (stats.byFacility[l.facility] || 0) + 1
  })

  return NextResponse.json({
    success: true,
    logs: paginated,
    pagination: { total, offset, limit, hasMore: offset + limit < total },
    stats,
    facilities: [...new Set(syslogStore.map(l => l.facility))],
  })
}

// POST: Receive new syslog entries from agents
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { level, facility, source, hostname, message, details } = body

    if (!message) {
      return NextResponse.json({ success: false, error: 'message is required' }, { status: 400 })
    }

    const entry: SyslogEntry = {
      id: `SYS-${++logIdCounter}`,
      timestamp: new Date().toISOString(),
      level: level || 'info',
      facility: facility || 'agent',
      source: source || 'unknown',
      hostname: hostname || 'unknown',
      message,
      details,
    }

    syslogStore.push(entry)

    // Keep max 10000 entries
    if (syslogStore.length > 10000) {
      syslogStore.splice(0, syslogStore.length - 10000)
    }

    return NextResponse.json({ success: true, entry })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 })
  }
}
