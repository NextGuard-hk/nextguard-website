'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const API_BASE = '/api/v1'

interface Agent { id: string; hostname: string; username: string; os: string; version: string; status: 'online'|'offline'|'warning'; lastHeartbeat: string; registeredAt: string; ip?: string }
interface IncidentStats { total: number; bySeverity: { critical:number;high:number;medium:number;low:number }; byStatus: { open:number;investigating:number;escalated:number;resolved:number }; byChannel: { file:number;clipboard:number;email:number;browser:number;usb:number;network:number } }
interface Incident { id: string; severity: string; policyName: string; hostname: string; channel: string; status: string; timestamp: string }

function getTenantId(): string {
  try {
    const user = JSON.parse(localStorage.getItem('ng_user') || '{}')
    return user.tenantId || 'tenant-demo'
  } catch { return 'tenant-demo' }
}

function getUserName(): string {
  try {
    const user = JSON.parse(localStorage.getItem('ng_user') || '{}')
    return user.name || user.email || ''
  } catch { return '' }
}

const card = { background: '#111827', borderRadius: 12, padding: 20, border: '1px solid #1e293b' }
const statCard = { ...card, textAlign: 'center' as const }

export default function ConsoleDashboard() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [incidentStats, setIncidentStats] = useState<IncidentStats|null>(null)
  const [policyCount, setPolicyCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('tenant-demo')
  const [userName, setUserName] = useState('')
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  useEffect(() => {
    setTenantId(getTenantId())
    setUserName(getUserName())
  }, [])

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const tid = getTenantId()
      const [agentsRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/agents?tenantId=${tid}`),
        fetch(`${API_BASE}/incidents?tenantId=${tid}&limit=50`),
        fetch(`${API_BASE}/policies/bundle?tenantId=${tid}`)
      ])
      if (agentsRes.ok) { const d = await agentsRes.json(); setAgents(d.agents || []) }
      if (incidentsRes.ok) { const d = await incidentsRes.json(); setIncidents(d.incidents || []); setIncidentStats(d.stats || null) }
      if (policiesRes.ok) { const d = await policiesRes.json(); setPolicyCount(d.bundle?.policies?.length || 0) }
      setLastRefresh(new Date())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData, tenantId])
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t) }, [fetchData])

  const onlineAgents = agents.filter(a => a.status === 'online').length
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'escalated').length
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length
  const sevColor: Record<string,string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#3b82f6' }

  if (loading) return <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100vh', color:'#64748b', fontFamily:'system-ui' }}>Loading dashboard...</div>

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#f1f5f9', padding:24, fontFamily:'system-ui' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div>
          <h1 style={{ margin:0, fontSize:22, fontWeight:700 }}>NextGuard DLP Console</h1>
          <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>
            {userName ? `Welcome, ${userName} • ` : ''}
            Tenant: <span style={{ color:'#00ffc8' }}>{tenantId}</span>
          </p>
        </div>
        <div style={{ fontSize:11, color:'#475569', textAlign:'right' }}>
          <div><span style={{ color:'#22c55e' }}>●</span> Online</div>
          <div>Refreshed {lastRefresh.toLocaleTimeString()}</div>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24, marginTop:20 }}>
        {[['Total Agents', agents.length, '#f1f5f9', `${onlineAgents} online`], ['Active Policies', policyCount, '#f1f5f9', 'DLP rules'], ['Open Incidents', openIncidents, openIncidents>0?'#ef4444':'#22c55e', `${criticalIncidents} critical`], ['Detection Mode', 'Hybrid', '#00ffc8', 'AI + Traditional']].map(([l,v,c,sub]) => (
          <div key={l as string} style={statCard}>
            <div style={{ color:'#64748b', fontSize:12, marginBottom:8 }}>{l as string}</div>
            <div style={{ fontSize: typeof v === 'number' ? 28 : 20, fontWeight:700, color: c as string }}>{v as any}</div>
            <div style={{ color:'#475569', fontSize:11, marginTop:4 }}>{sub as string}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:24 }}>
        {/* Incidents by Severity */}
        <div style={card}>
          <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:600 }}>Incidents by Severity</h3>
          {incidentStats ? Object.entries(incidentStats.bySeverity).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ width:64, fontSize:12, color: sevColor[k]||'#64748b', textTransform:'capitalize' }}>{k}</span>
              <div style={{ flex:1, background:'#1e293b', borderRadius:4, height:8 }}>
                <div style={{ width:`${incidentStats.total>0?(v/incidentStats.total*100):0}%`, background:sevColor[k]||'#64748b', borderRadius:4, height:8 }} />
              </div>
              <span style={{ width:24, fontSize:12, textAlign:'right', color:'#94a3b8' }}>{v}</span>
            </div>
          )) : <div style={{ color:'#475569', fontSize:13 }}>No data</div>}
        </div>

        {/* Incidents by Channel */}
        <div style={card}>
          <h3 style={{ margin:'0 0 16px', fontSize:14, fontWeight:600 }}>Incidents by Channel</h3>
          {incidentStats ? Object.entries(incidentStats.byChannel).map(([k, v]) => (
            <div key={k} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
              <span style={{ width:64, fontSize:12, color:'#94a3b8', textTransform:'capitalize' }}>{k}</span>
              <div style={{ flex:1, background:'#1e293b', borderRadius:4, height:8 }}>
                <div style={{ width:`${incidentStats.total>0?(v/incidentStats.total*100):0}%`, background:'#06b6d4', borderRadius:4, height:8 }} />
              </div>
              <span style={{ width:24, fontSize:12, textAlign:'right', color:'#94a3b8' }}>{v}</span>
            </div>
          )) : <div style={{ color:'#475569', fontSize:13 }}>No data</div>}
        </div>
      </div>

      {/* Recent Incidents */}
      <div style={card}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:600 }}>Recent Incidents</h3>
          <Link href="/console/incidents" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none' }}>View All →</Link>
        </div>
        {incidents.slice(0,8).map(inc => (
          <div key={inc.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:'1px solid #1e293b' }}>
            <div>
              <span style={{ background:sevColor[inc.severity]+'33', color:sevColor[inc.severity], padding:'2px 8px', borderRadius:20, fontSize:11, fontWeight:700, marginRight:8 }}>{inc.severity}</span>
              <span style={{ fontSize:13 }}>{inc.policyName}</span>
            </div>
            <div style={{ color:'#64748b', fontSize:12 }}>{inc.hostname} • {new Date(inc.timestamp).toLocaleTimeString()}</div>
          </div>
        ))}
        {incidents.length===0 && <div style={{ color:'#475569', fontSize:13, textAlign:'center', padding:24 }}>No incidents recorded yet</div>}
      </div>

      {/* Agent Status Quick View */}
      <div style={{ ...card, marginTop:16 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
          <h3 style={{ margin:0, fontSize:14, fontWeight:600 }}>Agent Status</h3>
          <Link href="/console/agents" style={{ color:'#60a5fa', fontSize:12, textDecoration:'none' }}>Manage Agents →</Link>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {[['Online', agents.filter(a=>a.status==='online').length, '#22c55e'], ['Offline', agents.filter(a=>a.status==='offline').length, '#ef4444'], ['Warning', agents.filter(a=>a.status==='warning').length, '#eab308']].map(([l,v,c]) => (
            <div key={l as string} style={{ textAlign:'center' }}>
              <div style={{ fontSize:24, fontWeight:700, color: c as string }}>{v as number}</div>
              <div style={{ fontSize:12, color:'#64748b' }}>{l as string}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
