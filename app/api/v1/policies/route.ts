import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { verifyUserToken } from '@/lib/auth'

function getTenantFromUser(user: { tenantId?: string; role: string }) {
  return user.tenantId || null
}

// GET /api/v1/policies?tenantId=xxx
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const tenantId = user.role === 'super_admin' ? url.searchParams.get('tenantId') : getTenantFromUser(user)
    if (!tenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })
    const store = getStore()
    const tenant = store.tenants.get(tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    return NextResponse.json({ success: true, policies: tenant.policies })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/policies - create policy
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { tenantId, name, rules, actions, enabled } = body
    const effectiveTenantId = user.role === 'super_admin' ? tenantId : getTenantFromUser(user)
    if (!effectiveTenantId) return NextResponse.json({ success: false, error: 'tenantId required' }, { status: 400 })
    const store = getStore()
    const tenant = store.tenants.get(effectiveTenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    const policy = {
      id: `policy_${Date.now()}`,
      tenantId: effectiveTenantId,
      name: name || 'New Policy',
      rules: rules || [],
      actions: actions || ['log'],
      enabled: enabled !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    tenant.policies.push(policy)
    return NextResponse.json({ success: true, policy })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/v1/policies - update policy
export async function PUT(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const { policyId, tenantId, ...updates } = body
    const effectiveTenantId = user.role === 'super_admin' ? tenantId : getTenantFromUser(user)
    const store = getStore()
    const tenant = store.tenants.get(effectiveTenantId || '')
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    const idx = tenant.policies.findIndex(p => p.id === policyId)
    if (idx === -1) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })
    tenant.policies[idx] = { ...tenant.policies[idx], ...updates, updatedAt: new Date().toISOString() }
    return NextResponse.json({ success: true, policy: tenant.policies[idx] })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/v1/policies?policyId=xxx&tenantId=xxx
export async function DELETE(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const url = new URL(request.url)
    const policyId = url.searchParams.get('policyId')
    const effectiveTenantId = user.role === 'super_admin' ? url.searchParams.get('tenantId') : getTenantFromUser(user)
    const store = getStore()
    const tenant = store.tenants.get(effectiveTenantId || '')
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    tenant.policies = tenant.policies.filter(p => p.id !== policyId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
