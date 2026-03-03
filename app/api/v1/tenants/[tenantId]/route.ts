import { NextRequest, NextResponse } from 'next/server'
import { getMultiTenantStore } from '@/lib/multi-tenant-store'

export async function GET(
  request: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params
  const store = getMultiTenantStore()
  const tenant = store.tenants.find((t: any) => t.id === tenantId)

  if (!tenant) {
    return NextResponse.json(
      {
        id: tenantId,
        name: tenantId === 'tenant-demo' ? 'NextGuard Demo' : tenantId,
        agents: [],
        policies: 0
      },
      { status: 200 }
    )
  }

  const agents = (tenant.agents || []).map((a: any) => {
    const now = Date.now()
    const lastHb = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0
    const isOnline = (now - lastHb) < 5 * 60 * 1000
    return {
      agentId: a.agentId || a.id,
      hostname: a.hostname || 'Unknown',
      os: a.os || a.platform || 'Unknown',
      status: isOnline ? 'online' : 'offline',
      lastHeartbeat: a.lastHeartbeat || new Date().toISOString(),
      version: a.version || '1.0.0',
      registeredAt: a.registeredAt || a.createdAt || new Date().toISOString()
    }
  })

  return NextResponse.json({
    id: tenant.id,
    name: tenant.name,
    agents,
    policies: tenant.policies?.length || 0
  })
}
