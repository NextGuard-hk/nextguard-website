import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { verifyUserToken } from '@/lib/auth'

// GET /api/v1/tenants - list all tenants (super admin only)
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const store = getStore()
    const tenants = Array.from(store.tenants.values()).map(t => ({
      id: t.id, name: t.name, domain: t.domain,
      agentCount: t.agents.length, policyCount: t.policies.length,
      createdAt: t.createdAt, status: t.status
    }))
    return NextResponse.json({ success: true, tenants })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/tenants - create tenant (super admin only)
export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const user = verifyUserToken(token)
    if (!user || user.role !== 'super_admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const body = await request.json()
    const { name, domain, adminEmail, adminPassword } = body
    if (!name || !domain || !adminEmail) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }
    const store = getStore()
    const id = `tenant_${Date.now()}`
    const tenant = {
      id, name, domain,
      adminEmail, adminPassword: adminPassword || 'changeme123',
      agents: [], policies: [],
      createdAt: new Date().toISOString(), status: 'active' as const
    }
    store.tenants.set(id, tenant)
    return NextResponse.json({ success: true, tenant: { id, name, domain, adminEmail } })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}
