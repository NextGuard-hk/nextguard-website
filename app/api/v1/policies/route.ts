import { NextResponse } from 'next/server'
import { getStore, generateId } from '@/lib/multi-tenant-store'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getTenantId(user: { tenantId?: string; role: string }, url?: URL): string | null {
  if (user.role === 'super_admin' && url) return url.searchParams.get('tenantId') || user.tenantId || null
  return user.tenantId || null
}

// GET /api/v1/policies?tenantId=xxx
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const tenantId = getTenantId(user, url)
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })
    const store = getStore()
    if (!store.tenants.has(tenantId)) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    // Get policies from store.policies Map filtered by tenantId
    const policies: any[] = []
    store.policies.forEach((p) => {
      if (p.tenantId === tenantId) policies.push(p)
    })
    policies.sort((a, b) => a.priority - b.priority)

    return NextResponse.json({ success: true, policies, total: policies.length })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/policies - create policy
export async function POST(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const tenantId = getTenantId(user) || body.tenantId
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })
    const store = getStore()
    if (!store.tenants.has(tenantId)) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })

    const policyId = generateId('pol')
    const now = new Date().toISOString()
    const policy = {
      id: policyId,
      tenantId,
      name: body.name || 'New Policy',
      description: body.description || '',
      version: 1,
      isEnabled: body.enabled !== false,
      priority: body.priority || 10,
      channels: body.channels || ['filesystem'],
      conditions: (body.patterns || []).map((p: string) => ({
        type: 'regex', value: p, operator: 'matches', isCaseSensitive: false
      })).concat((body.keywords || []).map((k: string) => ({
        type: 'keyword', value: k, operator: 'contains', isCaseSensitive: false
      }))),
      action: body.action || 'audit',
      severity: body.severity || 'medium',
      notifyUser: body.notifyUser !== false,
      notifyAdmin: true,
      blockMessage: body.blockMessage || `Blocked by policy: ${body.name}`,
      createdAt: now,
      updatedAt: now,
      createdBy: user.userId || 'console',
      appliedToAgents: [],
      complianceFramework: body.complianceFramework || 'CUSTOM'
    }
    store.policies.set(policyId, policy as any)

    // Mark all tenant agents for policy push
    store.agents.forEach((a) => {
      if (a.tenantId === tenantId) a.pendingPolicyPush = true
    })

    return NextResponse.json({ success: true, policy })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/v1/policies - update policy
export async function PUT(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { policyId, ...updates } = body
    if (!policyId) return NextResponse.json({ success: false, error: 'policyId required' }, { status: 400 })

    const store = getStore()
    const existing = store.policies.get(policyId)
    if (!existing) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    // Verify tenant access
    const tenantId = getTenantId(user) || existing.tenantId
    if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const updated = {
      ...existing,
      ...updates,
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    }
    store.policies.set(policyId, updated)

    // Mark agents for policy push
    store.agents.forEach((a) => {
      if (a.tenantId === existing.tenantId) a.pendingPolicyPush = true
    })

    return NextResponse.json({ success: true, policy: updated })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/v1/policies?policyId=xxx
export async function DELETE(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const policyId = url.searchParams.get('policyId')
    if (!policyId) return NextResponse.json({ success: false, error: 'policyId required' }, { status: 400 })

    const store = getStore()
    const existing = store.policies.get(policyId)
    if (!existing) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    const tenantId = getTenantId(user, url) || existing.tenantId
    if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    store.policies.delete(policyId)

    // Mark agents for policy push
    store.agents.forEach((a) => {
      if (a.tenantId === existing.tenantId) a.pendingPolicyPush = true
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
