// Shared Policy Bundle Store - Single source of truth for policies
// Used by Console UI, Agent Registration, and Agent Sync
// Syncs modifications to multi-tenant-store for persistence across Vercel instances
import { getStore, DLPPolicy } from '@/lib/multi-tenant-store'

export const DEFAULT_POLICIES = [
  { id: 'pii-cc-detect', name: 'Credit Card Number', description: 'Visa/MC/Amex/Discover/JCB/UnionPay credit card patterns (PCI-DSS)', category: 'PII', patterns: ['\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PCI-DSS', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-hkid-detect', name: 'Hong Kong ID', description: 'HKID number pattern (PDPO)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6}\\(?[0-9A]\\)?\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-email-detect', name: 'Email Address', description: 'Email address pattern (GDPR)', category: 'PII', patterns: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b'], keywords: [], severity: 'low', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'traditional', version: 1 },
  { id: 'pii-phone-hk', name: 'HK Phone Number', description: 'Hong Kong phone number (PDPO)', category: 'PII', patterns: ['\\b(?:\\+?852[\\s-]?)?[2-9][0-9]{3}[\\s-]?[0-9]{4}\\b'], keywords: [], severity: 'medium', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'traditional', version: 1 },
  { id: 'pii-ssn-us', name: 'US Social Security Number', description: 'US SSN pattern (HIPAA/SOX)', category: 'PII', patterns: ['\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-passport', name: 'Passport Number', description: 'Common passport number formats (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6,8}\\b'], keywords: ['passport','travel document'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-iban', name: 'IBAN / Bank Account', description: 'International bank account numbers (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{2}[0-9]{2}\\s?[A-Z0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{0,4}\\s?[0-9]{0,4}\\b'], keywords: [], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-cn-id', name: 'China National ID', description: 'PRC Resident Identity Card number (PIPL)', category: 'PII', patterns: ['\\b[0-9]{6}(19|20)[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{3}[0-9Xx]\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'PIPL', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-sensitive-keywords', name: 'Sensitive Keywords', description: 'Classification labels and sensitive terms (ISO27001)', category: 'Classification', patterns: [], keywords: ['confidential','secret','classified','internal only','do not distribute','password','restricted'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'traditional', version: 1 },
  { id: 'cls-api-keys', name: 'API Keys & Secrets', description: 'AWS keys, tokens, passwords in code (NIST)', category: 'Credentials', patterns: ['(?i)(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\\s*[=:]\\s*[\'"'][A-Za-z0-9-_]{16,}'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-private-keys', name: 'Private Keys & Certificates', description: 'SSH keys, SSL certificates, PEM files', category: 'Credentials', patterns: ['-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----','-----BEGIN CERTIFICATE-----'], keywords: ['private key','ssl cert','ssh key'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'traditional', version: 1 },
  { id: 'ip-source-code', name: 'Software Source Code', description: 'Detection of proprietary source code exfiltration', category: 'IP', patterns: [], keywords: ['import ','#include','def ','class ','function ','const ','export default'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'fin-swift-code', name: 'SWIFT/BIC Code', description: 'SWIFT bank identifier codes', category: 'Financial', patterns: ['\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b'], keywords: ['SWIFT','BIC','wire transfer'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'SOX', detectionMode: 'traditional', version: 1 },
  { id: 'phi-medical-record', name: 'Medical Record Number', description: 'Healthcare medical record identifiers (HIPAA)', category: 'PHI', patterns: ['\\bMRN[:\\s]?[0-9]{6,10}\\b'], keywords: ['medical record','patient ID','MRN'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'ai-prompt-data-leak', name: 'GenAI Prompt Data Leakage', description: 'Sensitive data submitted to AI/LLM services', category: 'AI-Security', patterns: [], keywords: ['ChatGPT','Claude','Gemini','Copilot','prompt','AI assistant'], severity: 'high', action: 'audit', channels: ['browser','network','clipboard'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
]

// In-memory custom policy overrides (bundle format)
const customPolicies: Map<string, any> = new Map()

export function getCustomPolicies(): Map<string, any> { return customPolicies }

export function setCustomPolicy(id: string, policy: any): void {
  customPolicies.set(id, policy)
  // CRITICAL: Also sync to multi-tenant-store so Agent APIs get the update
  syncPolicyToStore(id, policy)
}

export function deleteCustomPolicy(id: string): boolean { return customPolicies.delete(id) }
export function hasCustomPolicy(id: string): boolean { return customPolicies.has(id) }

export function getMergedPolicies(): any[] {
  const merged = [...DEFAULT_POLICIES]
  customPolicies.forEach((policy, id) => {
    const idx = merged.findIndex(p => p.id === id)
    if (idx >= 0) { merged[idx] = policy } else { merged.push(policy) }
  })
  return merged
}

// Sync a bundle-format policy to multi-tenant-store (DLPPolicy format)
function syncPolicyToStore(id: string, bundlePolicy: any): void {
  try {
    const store = getStore()
    const agentPolicy = toAgentPolicy(bundlePolicy)
    // Find existing store policy to preserve metadata
    const existing = store.policies.get(id)
    const now = new Date().toISOString()
    const dlpPolicy: DLPPolicy = {
      id: agentPolicy.id,
      tenantId: existing?.tenantId || 'tenant-demo',
      name: agentPolicy.name,
      description: agentPolicy.description,
      version: agentPolicy.version || (existing?.version || 0) + 1,
      isEnabled: agentPolicy.isEnabled,
      priority: agentPolicy.priority,
      channels: agentPolicy.channels,
      conditions: agentPolicy.conditions,
      action: agentPolicy.action,
      severity: agentPolicy.severity,
      notifyUser: agentPolicy.notifyUser,
      notifyAdmin: agentPolicy.notifyAdmin,
      blockMessage: agentPolicy.blockMessage || '',
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      createdBy: existing?.createdBy || 'console',
      appliedToAgents: existing?.appliedToAgents || [],
      lastPushedAt: now,
    }
    store.policies.set(id, dlpPolicy)
  } catch (e) {
    console.error('syncPolicyToStore error:', e)
  }
}

// Convert bundle-format policy to agent-compatible format
export function toAgentPolicy(p: any): any {
  const conditions: any[] = []
  if (p.patterns) {
    p.patterns.forEach((pat: string) => {
      if (pat) conditions.push({ type: 'regex', value: pat, operator: 'matches', isCaseSensitive: false })
    })
  }
  if (p.keywords) {
    p.keywords.forEach((kw: string) => {
      if (kw) conditions.push({ type: 'keyword', value: kw, operator: 'contains', isCaseSensitive: false })
    })
  }
  const channelMapping: Record<string, string> = {
    'file': 'filesystem', 'usb': 'usb', 'clipboard': 'clipboard',
    'email': 'email', 'network': 'network', 'browser': 'browser_upload',
    'cloud': 'cloud_storage', 'print': 'print'
  }
  return {
    id: p.id,
    name: p.name,
    description: p.description || '',
    version: p.version || 1,
    isEnabled: p.enabled !== false,
    priority: DEFAULT_POLICIES.findIndex(d => d.id === p.id) + 1 || 99,
    channels: (p.channels || []).map((ch: string) => channelMapping[ch] || ch),
    conditions,
    action: p.action || 'audit',
    severity: p.severity || 'medium',
    notifyUser: p.action === 'block',
    notifyAdmin: true,
    blockMessage: p.action === 'block' ? `Blocked by policy: ${p.name}` : '',
    category: p.category || 'Custom',
    complianceFramework: p.complianceFramework || 'CUSTOM',
    detectionMode: p.detectionMode || 'hybrid',
  }
}

// Get all policies formatted for agent consumption
// Reads DIRECTLY from store.policies (multi-tenant-store) which is the persistent global store
export function getAgentPolicies(tenantId?: string): any[] {
  const store = getStore()
  const policies: any[] = []
  store.policies.forEach((p) => {
    if (tenantId && p.tenantId !== tenantId) return
    if (p.isEnabled) policies.push(p)
  })
  return policies
}
