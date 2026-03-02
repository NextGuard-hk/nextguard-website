// NextGuard Multi-Tenant Store
// In-memory store (replace with DB in production)

export interface Tenant {
  id: string
  name: string
  domain: string
  plan: 'starter'|'professional'|'enterprise'
  maxAgents: number
  createdAt: string
  isActive: boolean
  settings: {
    mfaRequired: boolean
    sessionTimeout: number
    allowedIPs: string[]
    webhookUrl?: string
    syslogServer?: string
  }
}

export interface TenantUser {
  id: string
  tenantId: string
  email: string
  passwordHash: string
  name: string
  role: 'admin'|'analyst'|'viewer'
  createdAt: string
  lastLogin?: string
  isActive: boolean
}

export interface Agent {
  id: string
  tenantId: string
  hostname: string
  username: string
  os: string
  osVersion: string
  agentVersion: string
  macAddress: string
  ip: string
  status: 'online'|'offline'|'warning'
  lastHeartbeat: string
  registeredAt: string
  policyVersion: number
  lastPolicySync?: string
  pendingPolicyPush: boolean
  tags: string[]
}

export interface DLPPolicy {
  id: string
  tenantId: string
  name: string
  description: string
  version: number
  isEnabled: boolean
  priority: number
  channels: DLPChannel[]
  conditions: DLPCondition[]
  action: 'block'|'allow'|'audit'|'quarantine'|'notify'
  severity: 'critical'|'high'|'medium'|'low'
  notifyUser: boolean
  notifyAdmin: boolean
  blockMessage: string
  createdAt: string
  updatedAt: string
  createdBy: string
  appliedToAgents: string[]
  lastPushedAt?: string
}

export type DLPChannel = 'filesystem'|'usb'|'network'|'email'|'clipboard'|
  'browser_upload'|'browser_download'|'print'|'airdrop'|
  'messaging'|'screenshot'|'screen_record'|'cloud_storage'

export interface DLPCondition {
  type: 'keyword'|'regex'|'file_type'|'file_size'|'classification'|'destination'
  value: string
  operator: 'contains'|'matches'|'equals'|'greater_than'|'less_than'
  isCaseSensitive: boolean
}

export interface DLPEvent {
  id: string
  tenantId: string
  agentId: string
  hostname: string
  username: string
  policyId: string
  policyName: string
  channel: DLPChannel
  action: string
  severity: string
  status: 'blocked'|'allowed'|'flagged'|'quarantined'
  timestamp: string
  details: string
  filePath?: string
  fileName?: string
  fileSize?: number
  fileHash?: string
  destination?: string
  processName?: string
  processPid?: number
  forensicId?: string
  riskScore: number
}

export interface ForensicRecord {
  id: string
  tenantId: string
  agentId: string
  eventId: string
  timestamp: string
  type: 'file_snapshot'|'clipboard_content'|'network_capture'|'process_tree'|'screen_capture'
  dataRef: string
  size: number
  hash: string
  encrypted: boolean
  retentionDays: number
}

export interface AgentLog {
  id: string
  tenantId: string
  agentId: string
  timestamp: string
  level: 'debug'|'info'|'warning'|'error'|'critical'
  facility: string
  message: string
  details?: Record<string, unknown>
}

// Global in-memory store (singleton per serverless instance)
declare global {
  // eslint-disable-next-line no-var
  var __ngStore: NextGuardStore | undefined
}

export interface NextGuardStore {
  tenants: Map<string, Tenant>
  users: Map<string, TenantUser>
  agents: Map<string, Agent>
  policies: Map<string, DLPPolicy>
  events: DLPEvent[]
  forensics: ForensicRecord[]
  logs: AgentLog[]
}

function createStore(): NextGuardStore {
  const store: NextGuardStore = {
    tenants: new Map(),
    users: new Map(),
    agents: new Map(),
    policies: new Map(),
    events: [],
    forensics: [],
    logs: []
  }

  // Seed demo tenants
  const tenantA: Tenant = {
    id: 'tenant-alpha', name: 'Alpha Financial Ltd', domain: 'alpha-financial.com',
    plan: 'enterprise', maxAgents: 5000, createdAt: '2026-01-01T00:00:00Z', isActive: true,
    settings: { mfaRequired: true, sessionTimeout: 3600, allowedIPs: [] }
  }
  const tenantB: Tenant = {
    id: 'tenant-beta', name: 'Beta Tech Solutions', domain: 'betatech.hk',
    plan: 'professional', maxAgents: 500, createdAt: '2026-01-15T00:00:00Z', isActive: true,
    settings: { mfaRequired: false, sessionTimeout: 7200, allowedIPs: [] }
  }
  const tenantC: Tenant = {
    id: 'tenant-demo', name: 'NextGuard Demo', domain: 'next-guard.com',
    plan: 'enterprise', maxAgents: 9999, createdAt: '2025-12-01T00:00:00Z', isActive: true,
    settings: { mfaRequired: false, sessionTimeout: 86400, allowedIPs: [] }
  }
  store.tenants.set(tenantA.id, tenantA)
  store.tenants.set(tenantB.id, tenantB)
  store.tenants.set(tenantC.id, tenantC)

  // Seed demo users
  const users: TenantUser[] = [
    { id: 'user-001', tenantId: 'tenant-alpha', email: 'admin@alpha-financial.com',
      passwordHash: 'hashed:Admin@123', name: 'Alpha Admin', role: 'admin',
      createdAt: '2026-01-01T00:00:00Z', isActive: true },
    { id: 'user-002', tenantId: 'tenant-beta', email: 'admin@betatech.hk',
      passwordHash: 'hashed:Admin@123', name: 'Beta Admin', role: 'admin',
      createdAt: '2026-01-15T00:00:00Z', isActive: true },
    { id: 'user-003', tenantId: 'tenant-demo', email: 'admin@next-guard.com',
      passwordHash: 'hashed:Admin@123', name: 'Demo Admin', role: 'admin',
      createdAt: '2025-12-01T00:00:00Z', isActive: true },
    { id: 'user-super', tenantId: 'tenant-demo', email: 'super@nextguard.com',
      passwordHash: 'hashed:super123', name: 'Super Admin', role: 'admin',
      createdAt: '2025-12-01T00:00:00Z', isActive: true },
    { id: 'user-alpha-corp', tenantId: 'tenant-alpha', email: 'admin@alpha-corp.com',
      passwordHash: 'hashed:alpha123', name: 'Alpha Corp Admin', role: 'admin',
      createdAt: '2026-01-01T00:00:00Z', isActive: true },
    { id: 'user-beta-tech', tenantId: 'tenant-beta', email: 'admin@beta-tech.com',
      passwordHash: 'hashed:beta123', name: 'Beta Tech Admin', role: 'admin',
      createdAt: '2026-01-15T00:00:00Z', isActive: true },
  ]
  users.forEach(u => store.users.set(u.id, u))

  // Seed demo agents (mix of macOS, Windows, Linux)
  const now = new Date().toISOString()
  const recentHB = new Date(Date.now() - 30 * 1000).toISOString()
  const oldHB = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const demoAgents: Agent[] = [
    { id: 'agent-mac-001', tenantId: 'tenant-demo', hostname: 'MacBook-Pro-David', username: 'david.chen',
      os: 'macOS', osVersion: '14.5 Sonoma', agentVersion: '2.0.1', macAddress: 'A4:83:E7:2F:1B:C0',
      ip: '192.168.1.101', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-05T09:30:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['executive','finance'] },
    { id: 'agent-mac-002', tenantId: 'tenant-demo', hostname: 'iMac-Design-Studio', username: 'sarah.wong',
      os: 'macOS', osVersion: '14.4 Sonoma', agentVersion: '2.0.1', macAddress: 'B8:27:EB:3A:4D:E1',
      ip: '192.168.1.102', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-06T10:15:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['design','creative'] },
    { id: 'agent-mac-003', tenantId: 'tenant-demo', hostname: 'MacBook-Air-Legal', username: 'james.lau',
      os: 'macOS', osVersion: '13.6 Ventura', agentVersion: '2.0.0', macAddress: 'C0:3F:D5:6B:8E:22',
      ip: '192.168.1.103', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-07T08:00:00Z', policyVersion: 1, pendingPolicyPush: true, tags: ['legal'] },
    { id: 'agent-win-001', tenantId: 'tenant-demo', hostname: 'WIN-DESKTOP-HR01', username: 'amy.zhao',
      os: 'Windows', osVersion: '11 Pro 23H2', agentVersion: '2.0.1', macAddress: 'D4:5D:DF:12:9A:B3',
      ip: '192.168.1.201', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-02T14:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['hr','compliance'] },
    { id: 'agent-win-002', tenantId: 'tenant-demo', hostname: 'WIN-LAPTOP-SALES05', username: 'kevin.tang',
      os: 'Windows', osVersion: '11 Pro 23H2', agentVersion: '2.0.1', macAddress: 'E8:6F:38:C7:4D:55',
      ip: '10.0.0.55', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-03T11:30:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['sales'] },
    { id: 'agent-win-003', tenantId: 'tenant-demo', hostname: 'WIN-SERVER-FIN01', username: 'SYSTEM',
      os: 'Windows', osVersion: 'Server 2022', agentVersion: '2.0.1', macAddress: 'F0:2A:61:88:5C:D6',
      ip: '10.0.0.10', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-01T00:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['server','finance'] },
    { id: 'agent-linux-001', tenantId: 'tenant-demo', hostname: 'ubuntu-dev-server', username: 'devops',
      os: 'Linux', osVersion: 'Ubuntu 22.04 LTS', agentVersion: '2.0.0', macAddress: '00:1A:2B:3C:4D:5E',
      ip: '10.0.0.20', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-04T16:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['devops','server'] },
    { id: 'agent-mac-004', tenantId: 'tenant-demo', hostname: 'MacBook-Pro-CEO', username: 'peter.chan',
      os: 'macOS', osVersion: '14.5 Sonoma', agentVersion: '2.0.1', macAddress: '11:22:33:44:55:66',
      ip: '192.168.1.100', status: 'offline', lastHeartbeat: oldHB,
      registeredAt: '2026-01-01T08:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['executive','c-suite'] },
    { id: 'agent-win-004', tenantId: 'tenant-demo', hostname: 'WIN-LAPTOP-MKT02', username: 'lisa.ng',
      os: 'Windows', osVersion: '10 Pro 22H2', agentVersion: '1.9.5', macAddress: '77:88:99:AA:BB:CC',
      ip: '192.168.1.210', status: 'offline', lastHeartbeat: oldHB,
      registeredAt: '2026-01-08T13:45:00Z', policyVersion: 1, pendingPolicyPush: true, tags: ['marketing'] },
    { id: 'agent-mac-005', tenantId: 'tenant-demo', hostname: 'Mac-Mini-Reception', username: 'front.desk',
      os: 'macOS', osVersion: '14.3 Sonoma', agentVersion: '2.0.0', macAddress: 'DD:EE:FF:00:11:22',
      ip: '192.168.1.250', status: 'warning', lastHeartbeat: recentHB,
      registeredAt: '2026-01-10T09:00:00Z', policyVersion: 1, pendingPolicyPush: true, tags: ['reception'] },
    // Alpha Financial agents
    { id: 'agent-alpha-001', tenantId: 'tenant-alpha', hostname: 'ALPHA-TRADE-WS01', username: 'trader1',
      os: 'Windows', osVersion: '11 Enterprise', agentVersion: '2.0.1', macAddress: 'AA:BB:CC:DD:EE:01',
      ip: '172.16.0.101', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-02T08:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['trading','floor'] },
    { id: 'agent-alpha-002', tenantId: 'tenant-alpha', hostname: 'ALPHA-COMPLIANCE-MAC', username: 'compliance.officer',
      os: 'macOS', osVersion: '14.5 Sonoma', agentVersion: '2.0.1', macAddress: 'AA:BB:CC:DD:EE:02',
      ip: '172.16.0.102', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-03T09:00:00Z', policyVersion: 2, pendingPolicyPush: false, tags: ['compliance'] },
    // Beta Tech agents
    { id: 'agent-beta-001', tenantId: 'tenant-beta', hostname: 'beta-dev-macbook', username: 'dev.lead',
      os: 'macOS', osVersion: '14.4 Sonoma', agentVersion: '2.0.0', macAddress: 'BB:CC:DD:EE:FF:01',
      ip: '10.10.0.50', status: 'online', lastHeartbeat: recentHB,
      registeredAt: '2026-01-16T10:00:00Z', policyVersion: 1, pendingPolicyPush: false, tags: ['engineering'] },
  ]
  demoAgents.forEach(a => store.agents.set(a.id, a))

  // Seed demo policies for tenant-demo
  const demoPolicies: DLPPolicy[] = [
    { id: 'pol-usb-block', tenantId: 'tenant-demo', name: 'Block All USB Storage',
      description: 'Prevent any file copy to USB drives', version: 1, isEnabled: true, priority: 1,
      channels: ['usb'], conditions: [], action: 'block', severity: 'critical',
      notifyUser: true, notifyAdmin: true, blockMessage: 'USB file transfer blocked by NextGuard DLP policy.',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003',
      appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
    { id: 'pol-credit-card', tenantId: 'tenant-demo', name: 'Credit Card Number Detection',
      description: 'Block upload/send of files containing credit card numbers', version: 2, isEnabled: true, priority: 2,
      channels: ['filesystem','clipboard','email','browser_upload','messaging','airdrop','cloud_storage'],
      conditions: [{ type: 'regex', value: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b', operator: 'matches', isCaseSensitive: false }],
      action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true,
      blockMessage: 'Transmission of credit card data is not permitted.',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z', createdBy: 'user-003',
      appliedToAgents: [], lastPushedAt: '2026-01-15T00:00:00Z' },
    { id: 'pol-hkid', tenantId: 'tenant-demo', name: 'Hong Kong ID Detection',
      description: 'Block transmission of HKID numbers', version: 1, isEnabled: true, priority: 3,
      channels: ['filesystem','clipboard','email','browser_upload','print','messaging','airdrop','cloud_storage'],
      conditions: [{ type: 'regex', value: '[A-Z]{1,2}[0-9]{6}\\([0-9A]\\)', operator: 'matches', isCaseSensitive: false }],
      action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true,
      blockMessage: 'HKID data transmission is blocked under PDPO compliance.',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003',
      appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
    { id: 'pol-confidential', tenantId: 'tenant-demo', name: 'Confidential Document Control',
      description: 'Audit files labeled CONFIDENTIAL or TOP SECRET', version: 1, isEnabled: true, priority: 4,
      channels: ['filesystem','email','airdrop','cloud_storage','usb'],
      conditions: [
        { type: 'keyword', value: 'CONFIDENTIAL', operator: 'contains', isCaseSensitive: false },
        { type: 'keyword', value: 'TOP SECRET', operator: 'contains', isCaseSensitive: false }
      ],
      action: 'audit', severity: 'high', notifyUser: false, notifyAdmin: true, blockMessage: '',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003',
      appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
    { id: 'pol-print-audit', tenantId: 'tenant-demo', name: 'Print Job Audit',
      description: 'Log all print jobs for compliance', version: 1, isEnabled: true, priority: 10,
      channels: ['print'], conditions: [], action: 'audit', severity: 'low',
      notifyUser: false, notifyAdmin: false, blockMessage: '',
      createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003',
      appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-email', tenantId: 'tenant-demo', name: 'Email Address Detection', description: 'Detect email address patterns', version: 1, isEnabled: true, priority: 5, channels: ['filesystem','clipboard','email','browser_upload'], conditions: [{ type: 'regex', value: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', operator: 'matches', isCaseSensitive: false }], action: 'audit', severity: 'low', notifyUser: false, notifyAdmin: false, blockMessage: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-hk-phone', tenantId: 'tenant-demo', name: 'HK Phone Number Detection', description: 'Detect Hong Kong phone numbers', version: 1, isEnabled: true, priority: 6, channels: ['filesystem','clipboard','email','browser_upload'], conditions: [{ type: 'regex', value: '(\\+852[\\s-]?)?[2-9]\\d{3}[\\s-]?\\d{4}', operator: 'matches', isCaseSensitive: false }], action: 'audit', severity: 'medium', notifyUser: false, notifyAdmin: true, blockMessage: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-us-ssn', tenantId: 'tenant-demo', name: 'US Social Security Number', description: 'US SSN pattern detection', version: 1, isEnabled: true, priority: 7, channels: ['filesystem','clipboard','network','email','usb','cloud_storage','print'], conditions: [{ type: 'regex', value: '\\b\\d{3}-\\d{2}-\\d{4}\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'SSN data transmission blocked under HIPAA/SOX.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-passport', tenantId: 'tenant-demo', name: 'Passport Number Detection', description: 'Common passport number formats', version: 1, isEnabled: true, priority: 8, channels: ['filesystem','clipboard','network','email'], conditions: [{ type: 'regex', value: '\\b[A-Z]{1,2}[0-9]{6,9}\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'high', notifyUser: true, notifyAdmin: true, blockMessage: 'Passport data transmission blocked under GDPR.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-iban', tenantId: 'tenant-demo', name: 'IBAN / Bank Account Detection', description: 'International bank account numbers', version: 1, isEnabled: true, priority: 9, channels: ['filesystem','clipboard','network','email','usb'], conditions: [{ type: 'regex', value: '\\b[A-Z]{2}\\d{2}[A-Z0-9]{4,30}\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'high', notifyUser: true, notifyAdmin: true, blockMessage: 'Bank account data transmission blocked under GDPR.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-china-id', tenantId: 'tenant-demo', name: 'China National ID Detection', description: 'PRC Resident Identity Card number', version: 1, isEnabled: true, priority: 11, channels: ['filesystem','clipboard','network','email','usb','cloud_storage'], conditions: [{ type: 'regex', value: '\\b\\d{17}[\\dXx]\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'PRC ID data blocked under PIPL.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-sensitive-keywords', tenantId: 'tenant-demo', name: 'Sensitive Keywords Detection', description: 'Classification labels and sensitive terms', version: 1, isEnabled: true, priority: 12, channels: ['filesystem','clipboard','network','email','usb','cloud_storage','print'], conditions: [{ type: 'keyword', value: 'TOP SECRET', operator: 'contains', isCaseSensitive: false }, { type: 'keyword', value: 'RESTRICTED', operator: 'contains', isCaseSensitive: false }], action: 'block', severity: 'high', notifyUser: true, notifyAdmin: true, blockMessage: 'Sensitive classified content blocked under ISO27001.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-api-keys', tenantId: 'tenant-demo', name: 'API Keys and Secrets Detection', description: 'AWS keys, tokens, passwords in code', version: 1, isEnabled: true, priority: 13, channels: ['filesystem','clipboard','network','email','cloud_storage'], conditions: [{ type: 'regex', value: '(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{32,}|password\\s*=\\s*["\'][^"\']+["\'])', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'API key/secret exposure blocked under NIST.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-private-keys', tenantId: 'tenant-demo', name: 'Private Keys and Certificates', description: 'SSH keys, SSL certificates, PEM files', version: 1, isEnabled: true, priority: 14, channels: ['filesystem','clipboard','network','email','usb','cloud_storage'], conditions: [{ type: 'regex', value: '-----BEGIN (RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'Private key exposure blocked under NIST.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-source-code', tenantId: 'tenant-demo', name: 'Software Source Code Detection', description: 'Detection of proprietary source code exfiltration', version: 1, isEnabled: true, priority: 15, channels: ['filesystem','clipboard','network','email','usb','cloud_storage'], conditions: [{ type: 'keyword', value: 'proprietary', operator: 'contains', isCaseSensitive: false }, { type: 'keyword', value: 'trade secret', operator: 'contains', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'Source code exfiltration blocked.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-swift', tenantId: 'tenant-demo', name: 'SWIFT/BIC Code Detection', description: 'SWIFT bank identifier codes', version: 1, isEnabled: true, priority: 16, channels: ['filesystem','clipboard','network','email','usb'], conditions: [{ type: 'regex', value: '\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'high', notifyUser: true, notifyAdmin: true, blockMessage: 'SWIFT code blocked under SOX.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-medical-record', tenantId: 'tenant-demo', name: 'Medical Record Number Detection', description: 'Healthcare medical record identifiers', version: 1, isEnabled: true, priority: 17, channels: ['filesystem','clipboard','network','email','usb','cloud_storage','print'], conditions: [{ type: 'regex', value: '\\b(MRN|MR#|Medical Record)[:\\s]*[A-Z0-9]{6,12}\\b', operator: 'matches', isCaseSensitive: false }], action: 'block', severity: 'critical', notifyUser: true, notifyAdmin: true, blockMessage: 'Medical record data blocked under HIPAA.', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
        { id: 'pol-genai-prompt', tenantId: 'tenant-demo', name: 'GenAI Prompt Data Leakage', description: 'Sensitive data submitted to AI/LLM services', version: 1, isEnabled: true, priority: 18, channels: ['browser_upload','network','clipboard'], conditions: [{ type: 'keyword', value: 'openai.com', operator: 'contains', isCaseSensitive: false }, { type: 'keyword', value: 'chat.openai', operator: 'contains', isCaseSensitive: false }, { type: 'keyword', value: 'claude.ai', operator: 'contains', isCaseSensitive: false }], action: 'audit', severity: 'high', notifyUser: false, notifyAdmin: true, blockMessage: '', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z', createdBy: 'user-003', appliedToAgents: [], lastPushedAt: '2026-01-01T00:00:00Z' },
  ]
  demoPolicies.forEach(p => store.policies.set(p.id, p))

  // Seed demo DLP events/incidents
  const demoEvents: DLPEvent[] = [
    { id: 'evt-001', tenantId: 'tenant-demo', agentId: 'agent-mac-001', hostname: 'MacBook-Pro-David',
      username: 'david.chen', policyId: 'pol-credit-card', policyName: 'Credit Card Number Detection',
      channel: 'email', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-20T14:32:00Z', details: 'Email attachment contained 3 credit card numbers',
      fileName: 'Q4-Expenses.xlsx', fileSize: 245760, riskScore: 95 },
    { id: 'evt-002', tenantId: 'tenant-demo', agentId: 'agent-win-001', hostname: 'WIN-DESKTOP-HR01',
      username: 'amy.zhao', policyId: 'pol-hkid', policyName: 'Hong Kong ID Detection',
      channel: 'browser_upload', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-20T11:15:00Z', details: 'File upload to Google Drive contained HKID numbers',
      fileName: 'Employee-Records-2026.pdf', fileSize: 1048576, destination: 'drive.google.com', riskScore: 92 },
    { id: 'evt-003', tenantId: 'tenant-demo', agentId: 'agent-mac-002', hostname: 'iMac-Design-Studio',
      username: 'sarah.wong', policyId: 'pol-usb-block', policyName: 'Block All USB Storage',
      channel: 'usb', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-20T09:45:00Z', details: 'USB mass storage device write attempt blocked',
      fileName: 'Brand-Assets-2026.zip', fileSize: 52428800, riskScore: 88 },
    { id: 'evt-004', tenantId: 'tenant-demo', agentId: 'agent-win-002', hostname: 'WIN-LAPTOP-SALES05',
      username: 'kevin.tang', policyId: 'pol-confidential', policyName: 'Confidential Document Control',
      channel: 'email', action: 'audit', severity: 'high', status: 'flagged',
      timestamp: '2026-01-20T16:20:00Z', details: 'Email with CONFIDENTIAL document sent to external recipient',
      fileName: 'Sales-Forecast-CONFIDENTIAL.docx', fileSize: 102400, destination: 'partner@external.com', riskScore: 75 },
    { id: 'evt-005', tenantId: 'tenant-demo', agentId: 'agent-mac-003', hostname: 'MacBook-Air-Legal',
      username: 'james.lau', policyId: 'pol-confidential', policyName: 'Confidential Document Control',
      channel: 'airdrop', action: 'audit', severity: 'high', status: 'flagged',
      timestamp: '2026-01-19T15:30:00Z', details: 'AirDrop transfer of document marked TOP SECRET',
      fileName: 'Merger-Agreement-DRAFT.pdf', fileSize: 524288, riskScore: 82 },
    { id: 'evt-006', tenantId: 'tenant-demo', agentId: 'agent-win-003', hostname: 'WIN-SERVER-FIN01',
      username: 'SYSTEM', policyId: 'pol-credit-card', policyName: 'Credit Card Number Detection',
      channel: 'network', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-19T22:10:00Z', details: 'Outbound data transfer contained PCI data patterns',
      fileSize: 2097152, destination: '203.0.113.50:443', processName: 'sqlexport.exe', riskScore: 98 },
    { id: 'evt-007', tenantId: 'tenant-demo', agentId: 'agent-linux-001', hostname: 'ubuntu-dev-server',
      username: 'devops', policyId: 'pol-confidential', policyName: 'Confidential Document Control',
      channel: 'clipboard', action: 'audit', severity: 'medium', status: 'flagged',
      timestamp: '2026-01-19T10:05:00Z', details: 'Clipboard copy of text containing classification markers',
      riskScore: 45 },
    { id: 'evt-008', tenantId: 'tenant-demo', agentId: 'agent-mac-001', hostname: 'MacBook-Pro-David',
      username: 'david.chen', policyId: 'pol-print-audit', policyName: 'Print Job Audit',
      channel: 'print', action: 'audit', severity: 'low', status: 'allowed',
      timestamp: '2026-01-20T10:00:00Z', details: 'Print job sent to HP LaserJet 4th Floor',
      fileName: 'Meeting-Notes.docx', fileSize: 51200, riskScore: 10 },
    { id: 'evt-009', tenantId: 'tenant-demo', agentId: 'agent-mac-005', hostname: 'Mac-Mini-Reception',
      username: 'front.desk', policyId: 'pol-usb-block', policyName: 'Block All USB Storage',
      channel: 'usb', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-18T08:30:00Z', details: 'Unknown USB device insertion blocked',
      riskScore: 70 },
    { id: 'evt-010', tenantId: 'tenant-demo', agentId: 'agent-win-001', hostname: 'WIN-DESKTOP-HR01',
      username: 'amy.zhao', policyId: 'pol-credit-card', policyName: 'Credit Card Number Detection',
      channel: 'clipboard', action: 'block', severity: 'high', status: 'blocked',
      timestamp: '2026-01-18T14:22:00Z', details: 'Clipboard paste of credit card data to browser blocked',
      destination: 'chat.openai.com', riskScore: 85 },
    { id: 'evt-011', tenantId: 'tenant-demo', agentId: 'agent-mac-002', hostname: 'iMac-Design-Studio',
      username: 'sarah.wong', policyId: 'pol-confidential', policyName: 'Confidential Document Control',
      channel: 'cloud_storage', action: 'audit', severity: 'medium', status: 'flagged',
      timestamp: '2026-01-17T16:45:00Z', details: 'Confidential file synced to Dropbox',
      fileName: 'Product-Roadmap-CONFIDENTIAL.pptx', fileSize: 3145728, destination: 'dropbox.com', riskScore: 60 },
    { id: 'evt-012', tenantId: 'tenant-demo', agentId: 'agent-win-002', hostname: 'WIN-LAPTOP-SALES05',
      username: 'kevin.tang', policyId: 'pol-hkid', policyName: 'Hong Kong ID Detection',
      channel: 'messaging', action: 'block', severity: 'critical', status: 'blocked',
      timestamp: '2026-01-17T11:30:00Z', details: 'WeChat message contained HKID pattern',
      processName: 'WeChat.exe', riskScore: 90 },
  ]
  store.events = demoEvents

  // Seed demo logs
  store.logs = [
    { id: 'log-001', tenantId: 'tenant-demo', agentId: 'agent-mac-001', timestamp: now,
      level: 'info', facility: 'agent-heartbeat', message: 'Agent MacBook-Pro-David heartbeat OK' },
    { id: 'log-002', tenantId: 'tenant-demo', agentId: 'agent-win-001', timestamp: now,
      level: 'info', facility: 'policy-sync', message: 'Policy sync completed - 5 policies active' },
    { id: 'log-003', tenantId: 'tenant-demo', agentId: 'agent-mac-004', timestamp: oldHB,
      level: 'warning', facility: 'agent-heartbeat', message: 'Agent MacBook-Pro-CEO missed heartbeat' },
    { id: 'log-004', tenantId: 'tenant-demo', agentId: 'agent-mac-005', timestamp: now,
      level: 'warning', facility: 'policy-sync', message: 'Agent Mac-Mini-Reception policy version mismatch' },
  ]

  return store
}

export function getStore(): NextGuardStore {
  if (!global.__ngStore) {
    global.__ngStore = createStore()
  }
  return global.__ngStore
}

export function simpleHash(password: string): string {
  return 'hashed:' + password
}

export function verifyHash(password: string, hash: string): boolean {
  return hash === 'hashed:' + password
}

export function generateId(prefix: string): string {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}
