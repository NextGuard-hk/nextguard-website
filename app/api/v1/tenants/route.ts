import { NextResponse } from 'next/server'
import { getStore } from '@/lib/multi-tenant-store'
import { authenticateRequest } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET /api/v1/tenants - list all tenants (super admin)
export async function GET(request: Request) {
  try {
    const user = authenticateRequest(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    const store = getStore()
    const tenants = Array.from(store.tenants.values()).map(t => ({
      id: t.id, name: t.name, domain: t.domain,
      plan: t.plan, maxAgents: t.maxAgents,
      agentCount: Array.from(store.agents.values()).filter(a => a.tenantId === t.id).length,
      policyCount: Array.from(store.policies.values()).filter(p => p.tenantId === t.id).length,
      createdAt: t.createdAt, status: t.isActive ? 'active' : 'suspended'
    }))
    return NextResponse.json({ success: true, tenants })
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

// POST /api/v1/tenants - handled by /api/v1/auth register action
export async function POST(request: Request) {
  return NextResponse.json({ success: false, error: 'Use /api/v1/auth with action=register' }, { status: 400 })
}
