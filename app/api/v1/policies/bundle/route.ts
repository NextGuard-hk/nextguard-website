// Policy Bundle API - NextGuard Management Console
// Enterprise-grade DLP Policy Engine
// Uses SHARED policy-bundle-store as single source of truth
import { NextRequest, NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateRequest } from '@/lib/auth'
import {
  DEFAULT_POLICIES,
  getMergedPolicies,
  getCustomPolicies,
  setCustomPolicy,
  deleteCustomPolicy,
  hasCustomPolicy
} from '@/lib/policy-bundle-store'

export const dynamic = 'force-dynamic'

const DETECTION_MODES = ['traditional', 'ai', 'hybrid'] as const

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

    setCustomPolicy(policyId, policy)

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

    if (hasCustomPolicy(policyId)) {
      deleteCustomPolicy(policyId)
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
