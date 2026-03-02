'use client'
import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/api/v1'

interface Agent {
  id: string; hostname: string; username: string; os: string
  version: string; status: 'online' | 'offline' | 'warning'
  lastHeartbeat: string; registeredAt: string; ip?: string
}

interface IncidentStats {
  total: number
  bySeverity: { critical: number; high: number; medium: number; low: number }
  byStatus: { open: number; investigating: number; escalated: number; resolved: number }
  byChannel: { file: number; clipboard: number; email: number; browser: number; usb: number; network: number }
}

interface Incident {
  id: string; severity: string; policyName: string; hostname: string
  channel: string; status: string; timestamp: string
}

const card = { background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }
const statCard = { ...card, textAlign: 'center' as const }

export default function ConsoleDashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [incidentStats, setIncidentStats] = useState<IncidentStats | null>(null)
  const [policyCount, setPolicyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [detectionMode] = useState<'hybrid'>('hybrid')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [agentsRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/agents`),
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/policies/bundle`)
      ])
      if (agentsRes.ok) { const d = await agentsRes.json(); setAgents(d.agents || []) }
      if (incidentsRes.ok) { const d = await incidentsRes.json(); setIncidents(d.incidents || []); setIncidentStats(d.stats || null) }
      if (policiesRes.ok) { const d = await policiesRes.json(); setPolicyCount(d.bundle?.policies?.length || 0) }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t) }, [fetchData])

  const onlineAgents = agents.filter(a => a.status === 'online').length
  const openIncidents = incidents.filter(i => i.status === 'open').length
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length

  const sevColor: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60, color: '#64748b' }}>Loading dashboard...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Total Agents</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{agents.length}</div>
          <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>{onlineAgents} online</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Active Policies</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{policyCount}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>enterprise DLP rules</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Open Incidents</div>
          <div style={{ fontSize: 28, fontWeight: 700, color: openIncidents > 0 ? '#ef4444' : '#fff' }}>{openIncidents}</div>
          <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{criticalIncidents} critical</div>
        </div>
        <div style={statCard}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Detection Mode</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#06b6d4' }}>{detectionMode}</div>
          <div style={{ fontSize: 12, color: '#22c55e', marginTop: 4 }}>AI Engine Active</div>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Incidents by Severity</h3>
          {incidentStats ? Object.entries(incidentStats.bySeverity).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 70, fontSize: 12, color: sevColor[k] || '#94a3b8', textTransform: 'capitalize' }}>{k}</span>
              <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`, background: sevColor[k] || '#64748b', borderRadius: 4 }} />
              </div>
              <span style={{ width: 30, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>{v}</span>
            </div>
          )) : <div style={{ color: '#475569', fontSize: 13 }}>No data</div>}
        </div>
        <div style={card}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Incidents by Channel</h3>
          {incidentStats ? Object.entries(incidentStats.byChannel).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ width: 70, fontSize: 12, color: '#94a3b8' }}>{k}</span>
              <div style={{ flex: 1, height: 8, background: '#1e293b', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`, background: '#06b6d4', borderRadius: 4 }} />
              </div>
              <span style={{ width: 30, fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>{v}</span>
            </div>
          )) : <div style={{ color: '#475569', fontSize: 13 }}>No data</div>}
        </div>
      </div>

      {/* Recent incidents */}
      <div style={card}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', marginBottom: 16 }}>Recent Incidents</h3>
        {incidents.slice(0, 8).map(inc => (
          <div key={inc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #1e293b' }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: `${sevColor[inc.severity]}20`, color: sevColor[inc.severity] || '#94a3b8' }}>{inc.severity}</span>
            <span style={{ flex: 1, fontSize: 13, color: '#e2e8f0' }}>{inc.policyName}</span>
            <span style={{ fontSize: 12, color: '#64748b' }}>{inc.hostname}</span>
            <span style={{ fontSize: 11, color: '#475569' }}>{new Date(inc.timestamp).toLocaleString()}</span>
          </div>
        ))}
        {incidents.length === 0 && <div style={{ color: '#475569', fontSize: 13, textAlign: 'center', padding: 20 }}>No incidents recorded yet</div>}
      </div>
    </div>
  )
}
