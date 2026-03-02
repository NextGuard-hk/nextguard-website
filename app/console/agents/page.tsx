'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const statusColors: Record<string, string> = { online: '#22c55e', offline: '#ef4444', unknown: '#6b7280' }

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/agents').then(r => r.json()).then(d => {
      if (d.success) setAgents(d.agents || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = statusFilter === 'all' ? agents : agents.filter(a => a.status === statusFilter)
  const stats = { total: agents.length, online: agents.filter(a => a.status === 'online').length, offline: agents.filter(a => a.status === 'offline').length }
  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const sel = { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 }

  if (selected) {
    return (
      <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => setSelected(null)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: '#f1f5f9', margin: 0 }}>{selected.hostname}</h2>
            <span style={{ background: statusColors[selected.status] + '22', color: statusColors[selected.status], padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{selected.status}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Agent ID', selected.id], ['OS', selected.os || selected.osVersion || 'N/A'], ['Version', selected.version || selected.agentVersion || 'N/A'], ['Username', selected.username || 'N/A'], ['IP Address', selected.ip || selected.ipAddress || 'N/A'], ['Last Heartbeat', selected.lastHeartbeat ? new Date(selected.lastHeartbeat).toLocaleString() : 'N/A'], ['Registered', selected.registeredAt ? new Date(selected.registeredAt).toLocaleString() : 'N/A']].map(([label, val], i) => (
              <div key={i}><span style={{ color: '#64748b', fontSize: 12 }}>{label}</span><br/><span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontSize: 13 }}>{val}</span></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ color: '#f1f5f9', margin: 0 }}>Endpoint Agents</h1><p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Registered DLP agents across your organization</p></div>
        <Link href="/console" style={{ color: '#60a5fa', fontSize: 14, textDecoration: 'none' }}>&larr; Console</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        <div style={card}><div style={{ color: '#64748b', fontSize: 12 }}>Total Agents</div><div style={{ color: '#f1f5f9', fontSize: 28, fontWeight: 700 }}>{stats.total}</div></div>
        <div style={card}><div style={{ color: '#64748b', fontSize: 12 }}>Online</div><div style={{ color: '#22c55e', fontSize: 28, fontWeight: 700 }}>{stats.online}</div></div>
        <div style={card}><div style={{ color: '#64748b', fontSize: 12 }}>Offline</div><div style={{ color: '#ef4444', fontSize: 28, fontWeight: 700 }}>{stats.offline}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select style={sel} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option><option value="online">Online</option><option value="offline">Offline</option>
        </select>
      </div>
      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}><p style={{ color: '#64748b' }}>No agents registered.</p><p style={{ color: '#475569', fontSize: 13 }}>Agents will appear after connecting to the management console.</p></div>
      ) : filtered.map(agent => (
        <div key={agent.id} onClick={() => setSelected(agent)} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${statusColors[agent.status] || '#6b7280'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ color: '#f1f5f9', fontWeight: 600 }}>{agent.hostname}</div>
              <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{agent.os || agent.osVersion || 'N/A'} &bull; v{agent.version || agent.agentVersion || '?'} &bull; {agent.username || 'N/A'}</div>
            </div>
            <span style={{ background: statusColors[agent.status] + '22', color: statusColors[agent.status], padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600 }}>{agent.status}</span>
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>Last seen: {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'}</div>
        </div>
      ))}
    </div>
  )
}
