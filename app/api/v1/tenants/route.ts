import { NextResponse } from 'next/server'
import { getStore, generateId, simpleHash, TenantUser } from '@/lib/multi-tenant-store'
import { authenticateRequest, registerTenant, signToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// Role hierarchy & permissions (MS AD-style RBAC)
const ROLE_HIERARCHY: Record<string, number> = {
  'super-admin': 100,
  'admin': 80,
  'it-admin': 60,
  'analyst': 40,
  'viewer': 20,
  'user': 10
}

const ROLE_PERMISSIONS: Record<string, string[]> = {
  'super-admin': ['read','view','modify','delete','add','manage-tenants','manage-roles','manage-agents','manage-policies','view-audit','export-data','manage-settings'],
  'admin': ['read','view','modify','delete','add','manage-agents','manage-policies','view-audit','export-data','manage-settings'],
  'it-admin': ['read','view','modify','add','manage-agents','manage-policies','view-audit'],
  'analyst': ['read','view','view-audit','export-data'],
  'viewer': ['read','view'],
  'user': ['view']
}

// GET /api/v1/tenants - list all tenants (super admin) or own tenant
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const store = getStore()
    // Super admin sees all tenants
    if (user.role === 'admin' || user.role === 'super-admin') {
      const tenants = Array.from(store.tenants.values()).map(t => ({
        id: t.id, name: t.name, domain: t.domain, plan: t.plan,
        maxAgents: t.maxAgents,
        agentCount: Array.from(store.agents.values()).filter(a => a.tenantId === t.id).length,
        policyCount: Array.from(store.policies.values()).filter(p => p.tenantId === t.id).length,
        userCount: Array.from(store.users.values()).filter(u => u.tenantId === t.id).length,
        createdAt: t.createdAt,
        status: t.isActive ? 'active' : 'suspended'
      }))
      return NextResponse.json({
        success: true, tenants,
        roleHierarchy: ROLE_HIERARCHY,
        rolePermissions: ROLE_PERMISSIONS
      })
    }
    // Non-admin: only own tenant
    const tenant = store.tenants.get(user.tenantId)
    if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
    return NextResponse.json({
      success: true,
      tenants: [{
        id: tenant.id, name: tenant.name, domain: tenant.domain, plan: tenant.plan,
        agentCount: Array.from(store.agents.values()).filter(a => a.tenantId === tenant.id).length,
        policyCount: Array.from(store.policies.values()).filter(p => p.tenantId === tenant.id).length,
        status: tenant.isActive ? 'active' : 'suspended'
      }]
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/tenants - create new tenant (super admin) or register
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    // Action: create-tenant (requires super-admin or admin auth)
    if (action === 'create-user') {
      const user = authenticateRequest(request)
      if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      const { tenantId, email, password, name: userName, role } = body
      const targetTenantId = tenantId || user.tenantId
      const store = getStore()
      // Validate role
      if (!ROLE_HIERARCHY[role]) {
        return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 })
      }
      // Cannot assign role higher than own
      if (ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[user.role]) {
        return NextResponse.json({ success: false, error: 'Cannot assign equal or higher role' }, { status: 403 })
      }
      const existing = Array.from(store.users.values()).find(u => u.email === email)
      if (existing) return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 409 })
      const newUser: TenantUser = {
        id: generateId('user'), tenantId: targetTenantId, email,
        passwordHash: simpleHash(password), name: userName,
        role: role as any, createdAt: new Date().toISOString(), isActive: true
      }
      store.users.set(newUser.id, newUser)
      return NextResponse.json({ success: true, user: { id: newUser.id, email, name: userName, role, tenantId: targetTenantId } })
    }

    // Default: register new tenant
    const { name, domain, adminEmail, adminPassword } = body
    if (!name || !domain || !adminEmail || !adminPassword) {
      return NextResponse.json({ success: false, error: 'name, domain, adminEmail, adminPassword required' }, { status: 400 })
    }
    const result = registerTenant({
      tenantName: name, domain, adminEmail, adminPassword,
      adminName: name + ' Admin', plan: body.plan || 'starter'
    })
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 409 })
    }
    return NextResponse.json({
      success: true,
      tenant: { id: result.tenantId, name, domain },
      token: result.token
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// PUT /api/v1/tenants - update tenant or user role
export async function PUT(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const body = await request.json()
    const store = getStore()
    const { action } = body

    if (action === 'update-role') {
      if (user.role !== 'admin' && user.role !== 'super-admin') {
        return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
      }
      const targetUser = store.users.get(body.userId)
      if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
      // Tenant isolation: admin can only manage own tenant users
      if (user.role === 'admin' && targetUser.tenantId !== user.tenantId) {
        return NextResponse.json({ success: false, error: 'Cross-tenant access denied' }, { status: 403 })
      }
      if (ROLE_HIERARCHY[body.role] >= ROLE_HIERARCHY[user.role]) {
        return NextResponse.json({ success: false, error: 'Cannot assign equal or higher role' }, { status: 403 })
      }
      targetUser.role = body.role
      store.users.set(targetUser.id, targetUser)
      return NextResponse.json({ success: true, user: { id: targetUser.id, role: body.role } })
    }

    if (action === 'update-tenant') {
      const tenant = store.tenants.get(body.tenantId || user.tenantId)
      if (!tenant) return NextResponse.json({ success: false, error: 'Tenant not found' }, { status: 404 })
      if (body.name) tenant.name = body.name
      if (body.plan) tenant.plan = body.plan
      if (body.isActive !== undefined) tenant.isActive = body.isActive
      store.tenants.set(tenant.id, tenant)
      return NextResponse.json({ success: true, tenant: { id: tenant.id, name: tenant.name } })
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// DELETE /api/v1/tenants - delete user (admin only)
export async function DELETE(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user || (user.role !== 'admin' && user.role !== 'super-admin')) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 })
    const store = getStore()
    const targetUser = store.users.get(userId)
    if (!targetUser) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
    if (user.role === 'admin' && targetUser.tenantId !== user.tenantId) {
      return NextResponse.json({ success: false, error: 'Cross-tenant access denied' }, { status: 403 })
    }
    store.users.delete(userId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
