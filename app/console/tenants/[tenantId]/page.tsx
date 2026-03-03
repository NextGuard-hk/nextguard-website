'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface AgentInfo {
  agentId: string
  hostname: string
  os: string
  status: string
  lastHeartbeat: string
  version: string
  registeredAt: string
}

interface TenantDetail {
  id: string
  name: string
  agents: AgentInfo[]
  policies: number
}

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchTenant() {
      try {
        const res = await fetch(`/api/v1/tenants/${tenantId}`)
        if (res.ok) {
          const data = await res.json()
          setTenant(data)
        } else {
          setTenant({
            id: tenantId,
            name: tenantId === 'tenant-demo' ? 'NextGuard Demo' : tenantId,
            agents: [],
            policies: 0
          })
        }
      } catch {
        setTenant({
          id: tenantId,
          name: tenantId === 'tenant-demo' ? 'NextGuard Demo' : tenantId,
          agents: [],
          policies: 0
        })
      } finally {
        setLoading(false)
      }
    }
    fetchTenant()
  }, [tenantId])

  if (loading) return <div className="p-8 text-white">Loading...</div>
  if (!tenant) return <div className="p-8 text-white">Tenant not found</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <Link href="/console/tenants" className="text-blue-400 hover:underline mb-4 inline-block">
        &larr; Back to Tenants
      </Link>
      <h1 className="text-3xl font-bold mb-2">{tenant.name}</h1>
      <p className="text-gray-400 mb-8">Tenant ID: {tenant.id}</p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-400">{tenant.agents.length}</div>
          <div className="text-gray-400">Connected Agents</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-400">{tenant.policies}</div>
          <div className="text-gray-400">Active Policies</div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Registered Agents</h2>
      {tenant.agents.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-6 text-center text-gray-400">
          No agents registered yet. Deploy the NextGuard Agent on your endpoints to see them here.
        </div>
      ) : (
        <div className="space-y-3">
          {tenant.agents.map((agent) => (
            <div key={agent.agentId} className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">{agent.hostname}</div>
                  <div className="text-gray-400 text-sm">{agent.os}</div>
                  <div className="text-gray-500 text-xs mt-1">Agent ID: {agent.agentId}</div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded text-sm ${agent.status === 'online' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                    {agent.status}
                  </span>
                  <div className="text-gray-500 text-xs mt-2">v{agent.version}</div>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last heartbeat: {new Date(agent.lastHeartbeat).toLocaleString()}
                {' | '}Registered: {new Date(agent.registeredAt).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
