// Shared Policy Bundle Store - Multi-Tenant Architecture
// Each tenant has isolated policy storage in /tmp/nextguard_policies_{tenantId}.json
// DEFAULT_POLICIES serve as templates that are cloned per tenant on first access
import * as fs from 'fs'
import * as path from 'path'

// --- Tenant-scoped /tmp persistence ---
function tenantPolicyFile(tenantId: string): string {
  return `/tmp/nextguard_policies_${tenantId}.json`
}

function loadTenantPoliciesFromDisk(tenantId: string): Map<string, any> {
  try {
    const file = tenantPolicyFile(tenantId)
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'))
      return new Map(Object.entries(data))
    }
  } catch (e) {
    console.error(`loadTenantPolicies(${tenantId}) error:`, e)
  }
  return new Map()
}

function saveTenantPoliciesToDisk(tenantId: string, map: Map<string, any>): void {
  try {
    const obj: Record<string, any> = {}
    map.forEach((v, k) => { obj[k] = v })
    fs.writeFileSync(tenantPolicyFile(tenantId), JSON.stringify(obj, null, 2))
  } catch (e) {
    console.error(`saveTenantPolicies(${tenantId}) error:`, e)
  }
}
// --- Default policy templates (cloned per tenant on first access) ---
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
  { id: 'cls-api-keys', name: 'API Keys & Secrets', description: 'AWS keys, tokens, passwords in code (NIST)', category: 'Credentials', patterns: ['(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\\s*[=:]\\s*\\S{16,}'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-private-keys', name: 'Private Keys & Certificates', description: 'SSH keys, SSL certificates, PEM files', category: 'Credentials', patterns: ['-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----','-----BEGIN CERTIFICATE-----'], keywords: ['private key','ssl cert','ssh key'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'traditional', version: 1 },
  { id: 'ip-source-code', name: 'Software Source Code', description: 'Detection of proprietary source code exfiltration', category: 'IP', patterns: [], keywords: ['import ','#include','def ','class ','function ','const ','export default'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'fin-swift-code', name: 'SWIFT/BIC Code', description: 'SWIFT bank identifier codes', category: 'Financial', patterns: ['\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b'], keywords: ['SWIFT','BIC','wire transfer'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'SOX', detectionMode: 'traditional', version: 1 },
  { id: 'phi-medical-record', name: 'Medical Record Number', description: 'Healthcare medical record identifiers (HIPAA)', category: 'PHI', patterns: ['\\bMRN[:\\s]?[0-9]{6,10}\\b'], keywords: ['medical record','patient ID','MRN'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'ai-prompt-data-leak', name: 'GenAI Prompt Data Leakage', description: 'Sensitive data submitted to AI/LLM services', category: 'AI-Security', patterns: [], keywords: ['ChatGPT','Claude','Gemini','Copilot','prompt','AI assistant'], severity: 'high', action: 'audit', channels: ['browser','network','clipboard'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
]

// --- Tenant-scoped CRUD operations ---

// Ensure tenant has policies initialized (clone defaults on first access)
function ensureTenantPolicies(tenantId: string): Map<string, any> {
  const existing = loadTenantPoliciesFromDisk(tenantId)
  if (existing.size > 0) return existing
  // First access: clone DEFAULT_POLICIES for this tenant
  const map = new Map<string, any>()
  DEFAULT_POLICIES.forEach(p => map.set(p.id, { ...p, tenantId }))
  saveTenantPoliciesToDisk(tenantId, map)
  return map
}

// Get all policies for a specific tenant (merged: defaults + custom overrides)
export function getTenantPolicies(tenantId: string): any[] {
  const map = ensureTenantPolicies(tenantId)
  return Array.from(map.values())
}

// Set/update a policy for a specific tenant
export function setTenantPolicy(tenantId: string, id: string, policy: any): void {
  const map = ensureTenantPolicies(tenantId)
  map.set(id, { ...policy, tenantId })
  saveTenantPoliciesToDisk(tenantId, map)
}

// Delete a policy for a specific tenant
export function deleteTenantPolicy(tenantId: string, id: string): boolean {
  const map = ensureTenantPolicies(tenantId)
  const isDefault = DEFAULT_POLICIES.some(p => p.id === id)
  if (isDefault) return false // Cannot delete built-in; disable instead
  const existed = map.delete(id)
  if (existed) saveTenantPoliciesToDisk(tenantId, map)
  return existed
}

// Check if a tenant has a specific policy
export function hasTenantPolicy(tenantId: string, id: string): boolean {
  return ensureTenantPolicies(tenantId).has(id)
}

// --- Backward-compatible wrappers (default to tenant-demo) ---
// These exist so existing code that doesn't pass tenantId still works

export function getCustomPolicies(): Map<string, any> {
  return loadTenantPoliciesFromDisk('tenant-demo')
}

export function setCustomPolicy(id: string, policy: any): void {
  setTenantPolicy('tenant-demo', id, policy)
}

export function deleteCustomPolicy(id: string): boolean {
  return deleteTenantPolicy('tenant-demo', id)
}

export function hasCustomPolicy(id: string): boolean {
  return hasTenantPolicy('tenant-demo', id)
}

export function getMergedPolicies(): any[] {
  return getTenantPolicies('tenant-demo')
}

// --- Agent policy format conversion ---
const channelMap: Record<string, string> = {
  'file': 'filesystem', 'usb': 'usb', 'clipboard': 'clipboard',
  'email': 'email', 'network': 'network', 'browser': 'browser_upload',
  'cloud': 'cloud_storage', 'print': 'print'
}

function toAgentFormat(bundlePolicy: any, tenantId: string): any {
  const conditions: any[] = []
  if (bundlePolicy.patterns) {
    bundlePolicy.patterns.forEach((pat: string) => {
      if (pat) conditions.push({ type: 'regex', value: pat, operator: 'matches', isCaseSensitive: false })
    })
  }
  if (bundlePolicy.keywords) {
    bundlePolicy.keywords.forEach((kw: string) => {
      if (kw) conditions.push({ type: 'keyword', value: kw, operator: 'contains', isCaseSensitive: false })
    })
  }
  return {
    id: bundlePolicy.id,
    name: bundlePolicy.name,
    description: bundlePolicy.description || '',
    tenantId,
    isEnabled: bundlePolicy.enabled !== false,
    priority: bundlePolicy.priority || 99,
    channels: (bundlePolicy.channels || []).map((ch: string) => channelMap[ch] || ch),
    conditions,
    action: bundlePolicy.action || 'audit',
    severity: bundlePolicy.severity || 'medium',
    notifyUser: bundlePolicy.action === 'block',
    notifyAdmin: true,
    blockMessage: bundlePolicy.action === 'block' ? `Blocked by policy: ${bundlePolicy.name}` : '',
    version: bundlePolicy.version || 1,
    createdAt: bundlePolicy.createdAt || new Date().toISOString(),
    updatedAt: bundlePolicy.updatedAt || new Date().toISOString(),
    createdBy: 'console',
    appliedToAgents: [],
    lastPushedAt: new Date().toISOString(),
  }
}

// Get all enabled policies for agent consumption, scoped to tenant
export function getAgentPolicies(tenantId: string = 'tenant-demo'): any[] {
  const policies = getTenantPolicies(tenantId)
  return policies
    .filter(p => p.enabled !== false)
    .map(p => toAgentFormat(p, tenantId))
}

export function toAgentPolicy(p: any): any {
  return p
}
