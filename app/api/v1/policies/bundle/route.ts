// Policy Bundle API - Multi-Tenant Architecture
// All operations require tenantId for proper isolation
import { NextRequest, NextResponse } from 'next/server'
import {
  DEFAULT_POLICIES,
  getTenantPolicies,
  setTenantPolicy,
  deleteTenantPolicy,
  hasTenantPolicy,
  // Backward-compatible (defaults to tenant-demo)
  getMergedPolicies,
  setCustomPolicy,
  deleteCustomPolicy,
  hasCustomPolicy,
  getCustomPolicies,
} from '@/lib/policy-bundle-store'

export const dynamic = 'force-dynamic'

const DETECTION_MODES = ['traditional', 'ai', 'hybrid'] as const

const AI_CONFIG = {
  globalDetectionMode: 'hybrid' as 'traditional' | 'ai' | 'hybrid',
  aiProvider: 'nextguard-ai',
  aiConfidenceThreshold: 0.85,
  aiModelVersion: 'ng-dlp-v2.0',
  features: {
    contentInspection: true, contextAnalysis: true,
    behaviorAnalysis: true, imageOCR: true,
    documentFingerprinting: true, machineLearningClassification: true,
    naturalLanguageProcessing: true, riskAdaptiveProtection: true,
  }
}

// Helper: extract tenantId from request (query param or header)
function resolveTenantId(request: NextRequest): string {
  const { searchParams } = new URL(request.url)
  return searchParams.get('tenantId') ||
    request.headers.get('x-tenant-id') ||
    'tenant-demo'
}

export async function GET(request: NextRequest) {
  const tenantId = resolveTenantId(request)
  const { searchParams } = new URL(request.url)
  const policyId = searchParams.get('policyId')
  const policies = getTenantPolicies(tenantId)

  if (policyId) {
    const policy = policies.find(p => p.id === policyId)
    if (!policy) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
    return NextResponse.json({ success: true, policy, tenantId })
  }

  const bundleId = `bundle-${tenantId}-${Date.now()}`
  const categories = [...new Set(policies.map(p => p.category))]
  const byCategory: Record<string, number> = {}
  categories.forEach(c => { byCategory[c] = policies.filter(p => p.category === c).length })

  return NextResponse.json({
    success: true,
    tenantId,
    bundle: {
      bundleId, version: 2, policies, totalRules: policies.length,
      categories, byCategory, timestamp: new Date().toISOString(),
    },
    aiConfig: AI_CONFIG,
    detectionModes: DETECTION_MODES,
  })
}

// POST: Create or Update policy (tenant-scoped)
export async function POST(request: NextRequest) {
  try {
    const tenantId = resolveTenantId(request)
    const body = await request.json()
    const { id, name, description, patterns, keywords, severity, action,
      channels, enabled, complianceFramework, detectionMode } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'Policy name is required' }, { status: 400 })
    }

    const existingPolicies = getTenantPolicies(tenantId)
    const policyId = id || `custom-${Date.now()}`
    const existingVersion = existingPolicies.find(p => p.id === policyId)?.version || 0

    const policy = {
      id: policyId, name, tenantId,
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

    setTenantPolicy(tenantId, policyId, policy)

    return NextResponse.json({
      success: true, policy, tenantId,
      message: id ? 'Policy updated successfully' : 'Policy created successfully',
    })
  } catch (e) {
    console.error('Policy POST error:', e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE: Remove custom policy (tenant-scoped)
export async function DELETE(request: NextRequest) {
  try {
    const tenantId = resolveTenantId(request)
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('id')
    if (!policyId) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })

    const isDefault = DEFAULT_POLICIES.some(p => p.id === policyId)
    if (isDefault) {
      return NextResponse.json({ success: false, error: 'Cannot delete built-in policies. Disable instead.' }, { status: 400 })
    }

    const deleted = deleteTenantPolicy(tenantId, policyId)
    if (deleted) {
      return NextResponse.json({ success: true, message: 'Policy deleted', tenantId })
    }
    return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
