// Policy Bundle API - NextGuard Management Console
// Reference: PA Panorama Template Stack Push, CP Install Policy, Forcepoint Centralized Policy
// Implements: FCAPS Configuration Management (CM) - Policy distribution to agents

import { NextRequest, NextResponse } from 'next/server'

// Default built-in policies (matching DLPPolicyEngine.swift builtInRules)
const DEFAULT_POLICIES = [
  {
    id: 'cc-detect',
    name: 'Credit Card Number',
    description: 'Visa/MC/Amex credit card patterns (PCI-DSS)',
    patterns: ['\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b'],
    keywords: [],
    severity: 'critical',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email', 'usb', 'cloud', 'print'],
    enabled: true,
    complianceFramework: 'PCI-DSS',
    version: 1,
  },
  {
    id: 'hkid-detect',
    name: 'Hong Kong ID',
    description: 'HKID number pattern (PDPO)',
    patterns: ['\\b[A-Z]{1,2}[0-9]{6}\\(?[0-9A]\\)?\\b'],
    keywords: [],
    severity: 'critical',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email', 'usb', 'cloud', 'print'],
    enabled: true,
    complianceFramework: 'PDPO',
    version: 1,
  },
  {
    id: 'email-detect',
    name: 'Email Address',
    description: 'Email address pattern (GDPR)',
    patterns: ['\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b'],
    keywords: [],
    severity: 'low',
    action: 'audit',
    channels: ['file', 'clipboard', 'network', 'email'],
    enabled: true,
    complianceFramework: 'GDPR',
    version: 1,
  },
  {
    id: 'phone-hk',
    name: 'HK Phone Number',
    description: 'Hong Kong phone number (PDPO)',
    patterns: ['\\b(?:\\+?852[\\s-]?)?[2-9][0-9]{3}[\\s-]?[0-9]{4}\\b'],
    keywords: [],
    severity: 'medium',
    action: 'audit',
    channels: ['file', 'clipboard', 'network', 'email'],
    enabled: true,
    complianceFramework: 'PDPO',
    version: 1,
  },
  {
    id: 'sensitive-keywords',
    name: 'Sensitive Keywords',
    description: 'Classification labels and sensitive terms (ISO27001)',
    patterns: [],
    keywords: ['confidential', 'secret', 'classified', 'internal only', 'do not distribute', 'password', 'restricted', '\u6a5f\u5bc6', '\u79d8\u5bc6', '\u7d55\u5bc6', '\u5167\u90e8', '\u9650\u95b1', '\u7981\u6b62\u5206\u767c', '\u5bc6\u78bc', '\u4fdd\u5bc6'],
    severity: 'high',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email', 'usb', 'cloud', 'print'],
    enabled: true,
    complianceFramework: 'ISO27001',
    version: 1,
  },
  {
    id: 'api-key-detect',
    name: 'API Keys & Secrets',
    description: 'AWS keys, tokens, passwords in code (NIST)',
    patterns: ['(?i)(?:api[_-]?key|secret[_-]?key|access[_-]?key|auth[_-]?token)\\s*[:=]\\s*[\'\"][A-Za-z0-9+/=_-]{16,}[\'\"]', '\\bAKIA[0-9A-Z]{16}\\b'],
    keywords: [],
    severity: 'critical',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email', 'cloud'],
    enabled: true,
    complianceFramework: 'NIST-800-171',
    version: 1,
  },
  {
    id: 'iban-detect',
    name: 'IBAN / Bank Account',
    description: 'International bank account numbers (GDPR)',
    patterns: ['\\b[A-Z]{2}[0-9]{2}\\s?[A-Z0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{4}\\s?[0-9]{0,4}\\b'],
    keywords: [],
    severity: 'high',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email', 'usb'],
    enabled: true,
    complianceFramework: 'GDPR',
    version: 1,
  },
  {
    id: 'passport-detect',
    name: 'Passport Number',
    description: 'Common passport number formats (GDPR)',
    patterns: ['\\b[A-Z][0-9]{8}\\b', '\\b[A-Z]{2}[0-9]{7}\\b'],
    keywords: ['passport', 'travel document'],
    severity: 'high',
    action: 'block',
    channels: ['file', 'clipboard', 'network', 'email'],
    enabled: true,
    complianceFramework: 'GDPR',
    version: 1,
  },
]

// GET: Agent pulls policy bundle (like PA Panorama policy push)
export async function GET(request: NextRequest) {
  try {
    const deviceId = request.nextUrl.searchParams.get('device') || request.headers.get('x-device-id')
    const currentVersion = parseInt(request.nextUrl.searchParams.get('version') || '0')

    // Get custom policies from store
    const customPolicies: any[] = (globalThis as any).__nextguard_policies || []
    const allPolicies = [...DEFAULT_POLICIES, ...customPolicies]
    const bundleVersion = Math.max(1, ...allPolicies.map(p => p.version || 1))

    // 304 Not Modified if agent already has latest
    if (currentVersion >= bundleVersion) {
      return new NextResponse(null, { status: 304 })
    }

    // Update agent's policy version
    if (deviceId) {
      const agents: Record<string, any> = (globalThis as any).__nextguard_agents || {}
      if (agents[deviceId]) {
        agents[deviceId].policyVersion = bundleVersion
        ;(globalThis as any).__nextguard_agents = agents
      }
    }

    return NextResponse.json({
      success: true,
      bundle: {
        bundleId: `bundle-${Date.now()}`,
        version: bundleVersion,
        policies: allPolicies.filter(p => p.enabled),
        totalRules: allPolicies.filter(p => p.enabled).length,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST: Admin creates/updates a custom policy
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, patterns, keywords, severity, action, channels, enabled, complianceFramework } = body

    if (!id || !name || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: id, name, action' },
        { status: 400 }
      )
    }

    const customPolicies: any[] = (globalThis as any).__nextguard_policies || []
    const existingIndex = customPolicies.findIndex(p => p.id === id)
    const maxVersion = Math.max(1, ...customPolicies.map(p => p.version || 1))

    const policy = {
      id,
      name,
      description: description || '',
      patterns: patterns || [],
      keywords: keywords || [],
      severity: severity || 'medium',
      action: action || 'audit',
      channels: channels || ['file', 'clipboard', 'email'],
      enabled: enabled !== false,
      complianceFramework: complianceFramework || 'CUSTOM',
      version: maxVersion + 1,
      createdAt: existingIndex >= 0 ? customPolicies[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      customPolicies[existingIndex] = policy
    } else {
      customPolicies.push(policy)
    }

    ;(globalThis as any).__nextguard_policies = customPolicies

    return NextResponse.json({
      success: true,
      policy,
      message: existingIndex >= 0 ? 'Policy updated' : 'Policy created',
      totalPolicies: DEFAULT_POLICIES.length + customPolicies.length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
