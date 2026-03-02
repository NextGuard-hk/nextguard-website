// Policy Bundle API - NextGuard Management Console
// Enterprise-grade DLP Policy Engine
// Implements: FCAPS Configuration Management (CM) - Policy distribution to agents
import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DETECTION_MODES = ['traditional', 'ai', 'hybrid'] as const

// In-memory custom policy store (persists per server instance)
const customPolicies: Map<string, any> = new Map()

const DEFAULT_POLICIES = [
  { id: 'pii-cc-detect', name: 'Credit Card Number', description: 'Visa/MC/Amex/Discover/JCB/UnionPay credit card patterns (PCI-DSS)', category: 'PII', patterns: ['\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PCI-DSS', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-hkid-detect', name: 'Hong Kong ID', description: 'HKID number pattern (PDPO)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6}\\(?[0-9A]\\)?\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-email-detect', name: 'Email Address', description: 'Email address pattern (GDPR)', category: 'PII', patterns: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b'], keywords: [], severity: 'low', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'traditional', version: 1 },
  { id: 'pii-phone-hk', name: 'HK Phone Number', description: 'Hong Kong phone number (PDPO)', category: 'PII', patterns: ['\\b(?:\\+?852[\\s-]?)?[2-9][0-9]{3}[\\s-]?[0-9]{4}\\b'], keywords: [], severity: 'medium', action: 'audit', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'PDPO', detectionMode: 'traditional', version: 1 },
  { id: 'pii-ssn-us', name: 'US Social Security Number', description: 'US SSN pattern (HIPAA/SOX)', category: 'PII', patterns: ['\\b[0-9]{3}-[0-9]{2}-[0-9]{4}\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-passport', name: 'Passport Number', description: 'Common passport number formats (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{1,2}[0-9]{6,8}\\b'], keywords: ['passport','travel document'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-iban', name: 'IBAN / Bank Account', description: 'International bank account numbers (GDPR)', category: 'PII', patterns: ['\\b[A-Z]{2}[0-9]{2}\\s?[A-Z0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{0,4}\\s?[0-9]{0,4}\\b'], keywords: [], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'GDPR', detectionMode: 'hybrid', version: 1 },
  { id: 'pii-cn-id', name: 'China National ID', description: 'PRC Resident Identity Card number (PIPL)', category: 'PII', patterns: ['\\b[0-9]{6}(19|20)[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{3}[0-9Xx]\\b'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'PIPL', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-sensitive-keywords', name: 'Sensitive Keywords', description: 'Classification labels and sensitive terms (ISO27001)', category: 'Classification', patterns: [], keywords: ['confidential','secret','classified','internal only','do not distribute','password','restricted'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'traditional', version: 1 },
  { id: 'cls-api-keys', name: 'API Keys & Secrets', description: 'AWS keys, tokens, passwords in code (NIST)', category: 'Credentials', patterns: ['(?i)(?:api[_-]?key|secret[_-]?key|auth[_-]?token)\\s*[=:]\\s*[\'"][A-Za-z0-9-_]{16,}'], keywords: [], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'hybrid', version: 1 },
  { id: 'cls-private-keys', name: 'Private Keys & Certificates', description: 'SSH keys, SSL certificates, PEM files', category: 'Credentials', patterns: ['-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----','-----BEGIN CERTIFICATE-----'], keywords: ['private key','ssl cert','ssh key'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'NIST-800-171', detectionMode: 'traditional', version: 1 },
  { id: 'ip-source-code', name: 'Software Source Code', description: 'Detection of proprietary source code exfiltration', category: 'IP', patterns: [], keywords: ['import ','#include','def ','class ','function ','const ','export default'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud'], enabled: true, complianceFramework: 'Trade-Secret', detectionMode: 'ai', version: 1 },
  { id: 'fin-swift-code', name: 'SWIFT/BIC Code', description: 'SWIFT bank identifier codes', category: 'Financial', patterns: ['\\b[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?\\b'], keywords: ['SWIFT','BIC','wire transfer'], severity: 'high', action: 'block', channels: ['file','clipboard','network','email','usb'], enabled: true, complianceFramework: 'SOX', detectionMode: 'traditional', version: 1 },
  { id: 'phi-medical-record', name: 'Medical Record Number', description: 'Healthcare medical record identifiers (HIPAA)', category: 'PHI', patterns: ['\\bMRN[:\\s]?[0-9]{6,10}\\b'], keywords: ['medical record','patient ID','MRN'], severity: 'critical', action: 'block', channels: ['file','clipboard','network','email','usb','cloud','print'], enabled: true, complianceFramework: 'HIPAA', detectionMode: 'hybrid', version: 1 },
  { id: 'ai-prompt-data-leak', name: 'GenAI Prompt Data Leakage', description: 'Sensitive data submitted to AI/LLM services', category: 'AI-Security', patterns: [], keywords: ['ChatGPT','Claude','Gemini','Copilot','prompt','AI assistant'], severity: 'high', action: 'audit', channels: ['browser','network','clipboard'], enabled: true, complianceFramework: 'ISO27001', detectionMode: 'ai', version: 1 },
]

const AI_CONFIG = {
  globalDetectionMode: 'hybrid' as 'traditional' | 'ai' | 'hybrid',
  aiProvider: 'nextguard-ai',
  aiConfidenceThreshold: 0.85,
  aiModelVersion: 'ng-dlp-v2.0',
  features: {
    contentInspection: true,
    contextAnalysis: true,
    behaviorAnalysis: true,
    imageOCR: true,
    documentFingerprinting: true,
    machineLearningClassification: true,
    naturalLanguageProcessing: true,
    riskAdaptiveProtection: true,
  }
}

function getMergedPolicies() {
  const merged = [...DEFAULT_POLICIES]
  customPolicies.forEach((policy, id) => {
    const idx = merged.findIndex(p => p.id === id)
    if (idx >= 0) {
      merged[idx] = policy
    } else {
      merged.push(policy)
    }
  })
  return merged
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const policyId = searchParams.get('policyId')
  const policies = getMergedPolicies()

  if (policyId) {
    const policy = policies.find(p => p.id === policyId)
    if (!policy) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
    return NextResponse.json({ success: true, policy })
  }

  const bundleId = `bundle-${Date.now()}`
  const categories = [...new Set(policies.map(p => p.category))]
  const byCategory: Record<string, number> = {}
  categories.forEach(c => { byCategory[c] = policies.filter(p => p.category === c).length })

  return NextResponse.json({
    success: true,
    bundle: {
      bundleId,
      version: 2,
      policies,
      totalRules: policies.length,
      categories,
      byCategory,
      timestamp: new Date().toISOString(),
    },
    aiConfig: AI_CONFIG,
    detectionModes: DETECTION_MODES,
  })
}

// POST: Create or Update policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, patterns, keywords, severity, action, channels, enabled, complianceFramework, detectionMode } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'Policy name is required' }, { status: 400 })
    }

    const existingPolicies = getMergedPolicies()
    const policyId = id || `custom-${Date.now()}`
    const existingVersion = existingPolicies.find(p => p.id === policyId)?.version || 0

    const policy = {
      id: policyId,
      name,
      description: description || '',
      category: body.category || 'Custom',
      patterns: Array.isArray(patterns) ? patterns : (typeof patterns === 'string' ? patterns.split('\n').filter(Boolean) : []),
      keywords: Array.isArray(keywords) ? keywords : (typeof keywords === 'string' ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean) : []),
      severity: severity || 'medium',
      action: action || 'audit',
      channels: Array.isArray(channels) ? channels : ['file', 'clipboard', 'email'],
      enabled: enabled !== undefined ? enabled : true,
      complianceFramework: complianceFramework || 'CUSTOM',
      detectionMode: detectionMode || 'hybrid',
      version: existingVersion + 1,
      updatedAt: new Date().toISOString(),
    }

    customPolicies.set(policyId, policy)

    return NextResponse.json({
      success: true,
      policy,
      message: id ? 'Policy updated successfully' : 'Policy created successfully',
    })
  } catch (e) {
    console.error('Policy POST error:', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE: Remove custom policy
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('id')
    if (!policyId) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    if (customPolicies.has(policyId)) {
      customPolicies.delete(policyId)
      return NextResponse.json({ success: true, message: 'Policy deleted' })
    }

    const isDefault = DEFAULT_POLICIES.some(p => p.id === policyId)
    if (isDefault) {
      return NextResponse.json({ success: false, error: 'Cannot delete built-in policies. Disable instead.' }, { status: 400 })
    }

    return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
