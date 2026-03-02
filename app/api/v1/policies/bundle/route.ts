// Policy Bundle API - NextGuard Management Console
// Enterprise-grade DLP Policy Engine with CRUD support
import { NextRequest, NextResponse } from 'next/server'
import { getStore, generateId, DLPPolicy } from '@/lib/multi-tenant-store'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DETECTION_MODES = ['traditional', 'ai', 'hybrid'] as const

// Agent-facing GET: returns all policies for the tenant (or default bundle)
export async function GET(request: NextRequest) {
  const store = getStore()
  const { searchParams } = new URL(request.url)
  const agentId = searchParams.get('agentId')
  const tenantId = searchParams.get('tenantId')

  // If agent requesting bundle
  if (agentId || tenantId) {
    const targetTenantId = tenantId || 'tenant-demo'
    const policies = Array.from(store.policies.values())
      .filter(p => p.tenantId === targetTenantId && p.isEnabled)
      .sort((a, b) => a.priority - b.priority)
      .map(p => ({
        id: p.id, name: p.name, description: p.description,
        patterns: p.conditions.filter(c => c.type === 'regex').map(c => c.value),
        keywords: p.conditions.filter(c => c.type === 'keyword').map(c => c.value),
        severity: p.severity, action: p.action, channels: p.channels,
        enabled: p.isEnabled, complianceFramework: 'PDPO', version: p.version
      }))
    return NextResponse.json({
      success: true,
      bundle: {
        bundleId: `bundle-${Date.now()}`,
        version: 2, policies, totalRules: policies.length,
        timestamp: new Date().toISOString()
      },
      aiConfig: {
        globalDetectionMode: getDetectionMode(store, targetTenantId),
        aiProvider: 'nextguard-ai', aiConfidenceThreshold: 0.85
      },
      detectionModes: DETECTION_MODES
    })
  }

  // Console GET: return all policies for the authenticated tenant
  const user = authenticateRequest(request)
  const resolvedTenantId = user?.tenantId || 'tenant-demo'
  const policies = Array.from(store.policies.values())
    .filter(p => p.tenantId === resolvedTenantId)
    .sort((a, b) => a.priority - b.priority)
    .map(p => ({
      id: p.id, name: p.name, description: p.description,
      patterns: p.conditions.filter(c => c.type === 'regex').map(c => c.value),
      keywords: p.conditions.filter(c => c.type === 'keyword').map(c => c.value),
      severity: p.severity, action: p.action, channels: p.channels,
      enabled: p.isEnabled, complianceFramework: p.updatedAt ? 'PDPO' : 'CUSTOM',
      version: p.version, updatedAt: p.updatedAt, createdAt: p.createdAt
    }))
  return NextResponse.json({
    success: true, policies,
    bundle: { policies, totalRules: policies.length },
    detectionModes: DETECTION_MODES
  })
}

function getDetectionMode(store: any, tenantId: string): string {
  const tenant = store.tenants.get(tenantId)
  return (tenant as any)?.detectionMode || 'hybrid'
}

// Console POST: create or update a policy
export async function POST(request: NextRequest) {
  try {
    const store = getStore()
    const body = await request.json()
    const user = authenticateRequest(request)
    const tenantId = user?.tenantId || 'tenant-demo'

    const { id, name, description, patterns, keywords, severity, action, channels, enabled, complianceFramework } = body

    if (!name) {
      return NextResponse.json({ success: false, error: 'Policy name required' }, { status: 400 })
    }

    if (id) {
      // UPDATE existing policy
      const existing = store.policies.get(id)
      if (!existing) {
        return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
      }
      // Tenant isolation: can only update own tenant policies
      if (existing.tenantId !== tenantId) {
        return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
      }

      const updated: DLPPolicy = {
        ...existing,
        name, description: description || '',
        conditions: [
          ...( patterns ? patterns.split('\n').filter(Boolean).map((v: string) => ({ type: 'regex' as const, value: v.trim(), operator: 'matches' as const, isCaseSensitive: false })) : [] ),
          ...( keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean).map((v: string) => ({ type: 'keyword' as const, value: v, operator: 'contains' as const, isCaseSensitive: false })) : [] )
        ],
        severity: severity || existing.severity,
        action: action || existing.action,
        channels: channels || existing.channels,
        isEnabled: enabled !== undefined ? enabled : existing.isEnabled,
        version: existing.version + 1,
        updatedAt: new Date().toISOString()
      }
      store.policies.set(id, updated)
      return NextResponse.json({ success: true, policy: { id, name, version: updated.version }, action: 'updated' })
    } else {
      // CREATE new policy
      const newId = generateId('pol')
      const now = new Date().toISOString()
      const newPolicy: DLPPolicy = {
        id: newId, tenantId, name, description: description || '',
        version: 1, isEnabled: enabled !== undefined ? enabled : true,
        priority: Array.from(store.policies.values()).filter(p => p.tenantId === tenantId).length + 1,
        channels: channels || ['file', 'clipboard', 'email'],
        conditions: [
          ...( patterns ? patterns.split('\n').filter(Boolean).map((v: string) => ({ type: 'regex' as const, value: v.trim(), operator: 'matches' as const, isCaseSensitive: false })) : [] ),
          ...( keywords ? keywords.split(',').map((k: string) => k.trim()).filter(Boolean).map((v: string) => ({ type: 'keyword' as const, value: v, operator: 'contains' as const, isCaseSensitive: false })) : [] )
        ],
        action: action || 'audit',
        severity: severity || 'medium',
        notifyUser: true, notifyAdmin: true,
        blockMessage: `Policy "${name}" violation detected.`,
        createdAt: now, updatedAt: now,
        createdBy: user?.userId || 'console',
        appliedToAgents: []
      }
      store.policies.set(newId, newPolicy)
      return NextResponse.json({ success: true, policy: { id: newId, name, version: 1 }, action: 'created' })
    }
  } catch (e) {
    console.error(e)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE: remove a policy
export async function DELETE(request: NextRequest) {
  try {
    const store = getStore()
    const user = authenticateRequest(request)
    const tenantId = user?.tenantId || 'tenant-demo'
    const { searchParams } = new URL(request.url)
    const policyId = searchParams.get('id')
    if (!policyId) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 })
    const existing = store.policies.get(policyId)
    if (!existing) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (existing.tenantId !== tenantId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    store.policies.delete(policyId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
