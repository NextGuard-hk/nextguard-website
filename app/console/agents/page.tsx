'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const STATUS_COLOR: Record<string,string> = { online:'#22c55e', offline:'#ef4444', warning:'#eab308', unknown:'#6b7280' }

function getTenantId(): string {
  try { const u = JSON.parse(localStorage.getItem('ng_user')||'{}'); return u.tenantId||'tenant-demo' }
  catch { return 'tenant-demo' }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [osFilter, setOsFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchAgents = useCallback(async () => {
    try {
      const tid = getTenantId()
      const r = await fetch(`/api/v1/agents?tenantId=${tid}`)
      const d = await r.json()
      if (d.success) { setAgents(d.agents || []); setLastRefresh(new Date()) }
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAgents() }, [fetchAgents])
  useEffect(() => { const t = setInterval(fetchAgents, 30000); return () => clearInterval(t) }, [fetchAgents])

  const filtered = agents.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false
    if (osFilter !== 'all' && !(a.os||'').toLowerCase().includes(osFilter.toLowerCase())) return false
    return true
  })

  const stats = {
    total: agents.length,
    online: agents.filter(a => a.status === 'online').length,
    offline: agents.filter(a => a.status === 'offline').length,
    warning: agents.filter(a => a.status === 'warning').length
  }

  const card = { background:'#1e293b', borderRadius:12, padding:20, marginBottom:12 }
  const inp = { background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', fontSize:14 }

  if (selected) {
    const policyPending = selected.pendingPolicyPush
    return (
      <div style={{ minHeight:'100vh', background:'#0f172a', color:'#f1f5f9', padding:24, fontFamily:'system-ui' }}>
        <button onClick={() => setSelected(null)} style={{ color:'#60a5fa', background:'none', border:'none', cursor:'pointer', marginBottom:16, fontSize:14 }}>← Back to Agents</button>
        <div style={{ background:'#1e293b', borderRadius:16, padding:28, maxWidth:800 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <h2 style={{ margin:0, fontSize:20 }}>{selected.hostname}</h2>
              <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>{selected.id}</p>
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ background:STATUS_COLOR[selected.status]+'33', color:STATUS_COLOR[selected.status], padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, textTransform:'uppercase' }}>{selected.status}</span>
              {policyPending && <span style={{ background:'#f97316'+'33', color:'#f97316', padding:'4px 10px', borderRadius:20, fontSize:11 }}>Policy Pending</span>}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['OS', `${selected.os||''} ${selected.osVersion||''}`.trim()||'N/A'],['Agent Version', selected.version||selected.agentVersion||'N/A'],['Username', selected.username||'N/A'],['IP Address', selected.ip||selected.ipAddress||'N/A'],['MAC Address', selected.macAddress||'N/A'],['Policy Version', `v${selected.policyVersion||0}`],['Last Heartbeat', selected.lastHeartbeat?new Date(selected.lastHeartbeat).toLocaleString():'N/A'],['Registered', selected.registeredAt?new Date(selected.registeredAt).toLocaleString():'N/A']].map(([k,v]) => (
              <div key={k} style={{ background:'#0f172a', borderRadius:8, padding:'12px 16px' }}>
                <div style={{ color:'#64748b', fontSize:11, textTransform:'uppercase', marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:14, wordBreak:'break-all' }}>{v as string}</div>
              </div>
            ))}
          </div>
          {selected.tags?.length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ color:'#64748b', fontSize:11, textTransform:'uppercase', marginBottom:8 }}>Tags</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {selected.tags.map((t: string) => <span key={t} style={{ background:'#334155', color:'#94a3b8', padding:'3px 10px', borderRadius:20, fontSize:12 }}>{t}</span>)}
              </div>
            </div>
          )}
          <div style={{ display:'flex', gap:8, marginTop:20 }}>
            <Link href={`/console/incidents?agentId=${selected.id}`} style={{ padding:'8px 16px', borderRadius:8, background:'#1d4ed8', color:'#fff', fontSize:13, textDecoration:'none' }}>View Incidents</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#f1f5f9', padding:24, fontFamily:'system-ui' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>Endpoint Agents</h1>
          <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>Tenant: <span style={{ color:'#00ffc8' }}>{getTenantId()}</span></p>
        </div>
        <Link href="/console" style={{ color:'#60a5fa', fontSize:13, textDecoration:'none' }}>← Console</Link>
      </div>
      <div style={{ color:'#475569', fontSize:11, marginBottom:20 }}>Last refresh: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 30s</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[['Total',stats.total,'#f1f5f9'],['Online',stats.online,'#22c55e'],['Offline',stats.offline,'#ef4444'],['Warning',stats.warning,'#eab308']].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#1e293b', borderRadius:12, padding:16, textAlign:'center' }}>
            <div style={{ color:'#64748b', fontSize:12 }}>{l as string}</div>
            <div style={{ fontSize:28, fontWeight:700, color:c as string }}>{v as number}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={inp}>
          <option value="all">All Status</option>
          {['online','offline','warning'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={osFilter} onChange={e=>setOsFilter(e.target.value)} style={inp}>
          <option value="all">All OS</option>
          {['macOS','Windows','Linux'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={fetchAgents} style={{ ...inp, background:'#1d4ed8', color:'#fff', border:'none', cursor:'pointer' }}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:60 }}>Loading agents...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>🖥</div>
          <div style={{ fontSize:16, marginBottom:4 }}>No agents registered</div>
          <div style={{ fontSize:13 }}>Agents appear after connecting to the management console.</div>
        </div>
      ) : (
        <div>
          {filtered.map(agent => (
            <div key={agent.id} onClick={()=>setSelected(agent)}
              style={{ ...card, cursor:'pointer', borderLeft:`4px solid ${STATUS_COLOR[agent.status]||'#6b7280'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{agent.hostname}</div>
                <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                  {agent.pendingPolicyPush && <span style={{ background:'#f97316'+'22', color:'#f97316', padding:'2px 8px', borderRadius:20, fontSize:11 }}>Policy Pending</span>}
                  <span style={{ background:STATUS_COLOR[agent.status]+'33', color:STATUS_COLOR[agent.status], padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>{agent.status}</span>
                </div>
              </div>
              <div style={{ color:'#64748b', fontSize:13, marginBottom:4 }}>{agent.os||''} {agent.osVersion||''} • v{agent.version||agent.agentVersion||'?'} • {agent.username||'N/A'}</div>
              <div style={{ color:'#475569', fontSize:12 }}>Last seen: {agent.lastHeartbeat ? new Date(agent.lastHeartbeat).toLocaleString() : 'Never'} • IP: {agent.ip||'N/A'}</div>
            </div>
          ))}
          <div style={{ color:'#475569', fontSize:12, textAlign:'center', padding:'12px 0' }}>Showing {filtered.length} of {agents.length} agents</div>
        </div>
      )}
    </div>
  )
}
