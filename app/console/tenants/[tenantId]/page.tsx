'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function TenantDetailPage() {
  const params = useParams()
  const tenantId = params.tenantId as string
  const [tenant, setTenant] = useState<any>(null)
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function getToken() {
    const t = localStorage.getItem('ng_token')
    if (t) return t
    try {
      const res = await fetch('/api/v1/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email: 'admin@next-guard.com', password: 'Admin@123' }) })
      const d = await res.json()
      const tk = d.token || d.data?.token
      if (tk) { localStorage.setItem('ng_token', tk); return tk }
    } catch {}
    return null
  }

  useEffect(() => {
    async function load() {
      const token = await getToken()
      // Load tenant info
      try {
        const res = await fetch('/api/v1/tenants', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const data = await res.json()
        if (data.success && data.tenants) {
          const t = data.tenants.find((x: any) => x.id === tenantId)
          if (t) setTenant(t)
        }
      } catch {}
      // Load agents
      try {
        const res = await fetch('/api/v1/agents/register', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const data = await res.json()
        if (data.success && data.agents) {
          setAgents(data.agents.filter((a: any) => a.tenantId === tenantId))
        }
      } catch {}
      setLoading(false)
    }
    load()
    const interval = setInterval(() => { load() }, 15000)
    return () => clearInterval(interval)
  }, [tenantId])

  const statusColor = (s: string) => s === 'online' ? '#22c55e' : s === 'warning' ? '#eab308' : '#ef4444'
  const ago = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime()
    if (diff < 60000) return `${Math.floor(diff/1000)}s ago`
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`
    return `${Math.floor(diff/3600000)}h ago`
  }

  if (loading) return <div style={{ padding: 40, color: '#94a3b8' }}>Loading tenant details...</div>
  if (!tenant) return <div style={{ padding: 40, color: '#ef4444' }}>Tenant not found: {tenantId}</div>

  const online = agents.filter(a => a.status === 'online').length
  const offline = agents.filter(a => a.status !== 'online').length

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1200 }}>
      <Link href="/console/tenants" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: 14 }}>
        &larr; Back to Tenants
      </Link>

      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>
          {tenant.name}
        </h1>
        <p style={{ color: '#94a3b8', margin: '4px 0' }}>{tenant.domain} | Plan: <strong>{tenant.plan}</strong> | ID: <code style={{ color: '#38bdf8' }}>{tenant.id}</code></p>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[{ label: 'Total Agents', value: agents.length, color: '#38bdf8' },
          { label: 'Online', value: online, color: '#22c55e' },
          { label: 'Offline', value: offline, color: '#ef4444' },
          { label: 'Policies', value: tenant.policyCount || 0, color: '#a78bfa' },
          { label: 'Users', value: tenant.userCount || 0, color: '#fbbf24' },
        ].map((s, i) => (
          <div key={i} style={{ background: '#1e293b', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Agent List */}
      <h2 style={{ fontSize: 20, color: '#f1f5f9', marginBottom: 12 }}>Agents ({agents.length})</h2>
      {agents.length === 0 ? (
        <div style={{ background: '#1e293b', borderRadius: 10, padding: 24, color: '#94a3b8', textAlign: 'center' }}>
          No agents registered for this tenant.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {agents.map(a => (
            <div key={a.id} style={{ background: '#1e293b', borderRadius: 10, padding: '14px 18px',
              borderLeft: `4px solid ${statusColor(a.status)}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: 15 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: statusColor(a.status), marginRight: 8 }} />
                    {a.hostname}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                    {a.username} | {a.os} {a.osVersion} | v{a.agentVersion}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: a.status === 'online' ? '#052e16' : a.status === 'warning' ? '#422006' : '#450a0a',
                    color: statusColor(a.status), border: `1px solid ${statusColor(a.status)}40` }}>
                    {a.status?.toUpperCase()}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#64748b', flexWrap: 'wrap' }}>
                <span>IP: {a.ip}</span>
                <span>MAC: {a.macAddress}</span>
                <span>ID: {a.id}</span>
                <span>Last seen: {a.lastHeartbeat ? ago(a.lastHeartbeat) : 'N/A'}</span>
                {a.tags?.length > 0 && <span>Tags: {a.tags.join(', ')}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
