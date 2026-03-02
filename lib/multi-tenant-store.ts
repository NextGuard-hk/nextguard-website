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

export type DLPChannel =
  'filesystem'|'usb'|'network'|'email'|'clipboard'|
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
    id: 'tenant-alpha',
    name: 'Alpha Financial Ltd',
    domain: 'alpha-financial.com',
    plan: 'enterprise',
    maxAgents: 5000,
    createdAt: '2026-01-01T00:00:00Z',
    isActive: true,
    settings: { mfaRequired: true, sessionTimeout: 3600, allowedIPs: [] }
  }
  const tenantB: Tenant = {
    id: 'tenant-beta',
    name: 'Beta Tech Solutions',
    domain: 'betatech.hk',
    plan: 'professional',
    maxAgents: 500,
    createdAt: '2026-01-15T00:00:00Z',
    isActive: true,
    settings: { mfaRequired: false, sessionTimeout: 7200, allowedIPs: [] }
  }
  const tenantC: Tenant = {
    id: 'tenant-demo',
    name: 'NextGuard Demo',
    domain: 'next-guard.com',
    plan: 'enterprise',
    maxAgents: 9999,
    createdAt: '2025-12-01T00:00:00Z',
    isActive: true,
    settings: { mfaRequired: false, sessionTimeout: 86400, allowedIPs: [] }
  }
  store.tenants.set(tenantA.id, tenantA)
  store.tenants.set(tenantB.id, tenantB)
  store.tenants.set(tenantC.id, tenantC)

  // Seed demo users (password: 'Admin@123' hashed)
  const users: TenantUser[] = [
    {
      id: 'user-001',
      tenantId: 'tenant-alpha',
      email: 'admin@alpha-financial.com',
      passwordHash: 'hashed:Admin@123',
      name: 'Alpha Admin',
      role: 'admin',
      createdAt: '2026-01-01T00:00:00Z',
      isActive: true
    },
    {
      id: 'user-002',
      tenantId: 'tenant-beta',
      email: 'admin@betatech.hk',
      passwordHash: 'hashed:Admin@123',
      name: 'Beta Admin',
      role: 'admin',
      createdAt: '2026-01-15T00:00:00Z',
      isActive: true
    },
    {
      id: 'user-003',
      tenantId: 'tenant-demo',
      email: 'admin@next-guard.com',
      passwordHash: 'hashed:Admin@123',
      name: 'Demo Admin',
      role: 'admin',
      createdAt: '2025-12-01T00:00:00Z',
      isActive: true
    }
  ]
  users.forEach(u => store.users.set(u.id, u))

  // Seed demo policies for tenant-demo
  const demoPolicies: DLPPolicy[] = [
    {
      id: 'pol-usb-block',
      tenantId: 'tenant-demo',
      name: 'Block All USB Storage',
      description: 'Prevent any file copy to USB drives',
      version: 1,
      isEnabled: true,
      priority: 1,
      channels: ['usb'],
      conditions: [],
      action: 'block',
      severity: 'critical',
      notifyUser: true,
      notifyAdmin: true,
      blockMessage: 'USB file transfer blocked by NextGuard DLP policy.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'user-003',
      appliedToAgents: [],
      lastPushedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'pol-credit-card',
      tenantId: 'tenant-demo',
      name: 'Credit Card Number Detection',
      description: 'Block upload/send of files containing credit card numbers',
      version: 2,
      isEnabled: true,
      priority: 2,
      channels: ['email','browser_upload','messaging','clipboard'],
      conditions: [
        { type: 'regex', value: '\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b', operator: 'matches', isCaseSensitive: false }
      ],
      action: 'block',
      severity: 'critical',
      notifyUser: true,
      notifyAdmin: true,
      blockMessage: 'Transmission of credit card data is not permitted.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-15T00:00:00Z',
      createdBy: 'user-003',
      appliedToAgents: [],
      lastPushedAt: '2026-01-15T00:00:00Z'
    },
    {
      id: 'pol-hkid',
      tenantId: 'tenant-demo',
      name: 'Hong Kong ID Detection',
      description: 'Block transmission of HKID numbers',
      version: 1,
      isEnabled: true,
      priority: 3,
      channels: ['email','browser_upload','print','messaging'],
      conditions: [
        { type: 'regex', value: '[A-Z]{1,2}[0-9]{6}\\([0-9A]\\)', operator: 'matches', isCaseSensitive: false }
      ],
      action: 'block',
      severity: 'critical',
      notifyUser: true,
      notifyAdmin: true,
      blockMessage: 'HKID data transmission is blocked under PDPO compliance.',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'user-003',
      appliedToAgents: [],
      lastPushedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'pol-confidential',
      tenantId: 'tenant-demo',
      name: 'Confidential Document Control',
      description: 'Audit files labeled CONFIDENTIAL or TOP SECRET',
      version: 1,
      isEnabled: true,
      priority: 4,
      channels: ['filesystem','email','airdrop','cloud_storage','usb'],
      conditions: [
        { type: 'keyword', value: 'CONFIDENTIAL', operator: 'contains', isCaseSensitive: false },
        { type: 'keyword', value: 'TOP SECRET', operator: 'contains', isCaseSensitive: false }
      ],
      action: 'audit',
      severity: 'high',
      notifyUser: false,
      notifyAdmin: true,
      blockMessage: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'user-003',
      appliedToAgents: [],
      lastPushedAt: '2026-01-01T00:00:00Z'
    },
    {
      id: 'pol-print-audit',
      tenantId: 'tenant-demo',
      name: 'Print Job Audit',
      description: 'Log all print jobs for compliance',
      version: 1,
      isEnabled: true,
      priority: 10,
      channels: ['print'],
      conditions: [],
      action: 'audit',
      severity: 'low',
      notifyUser: false,
      notifyAdmin: false,
      blockMessage: '',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      createdBy: 'user-003',
      appliedToAgents: [],
      lastPushedAt: '2026-01-01T00:00:00Z'
    }
  ]
  demoPolicies.forEach(p => store.policies.set(p.id, p))

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
