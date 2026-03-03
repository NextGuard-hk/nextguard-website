'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const SEV_COLOR: Record<string,string> = { critical:'#ef4444', high:'#f97316', medium:'#eab308', low:'#22c55e' }
const STA_COLOR: Record<string,string> = { open:'#ef4444', escalated:'#a855f7', investigating:'#f97316', resolved:'#22c55e' }

function getTenantId(): string {
  try { const u = JSON.parse(localStorage.getItem('ng_user')||'{}'); return u.tenantId||'tenant-demo' }
  catch { return 'tenant-demo' }
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [search, setSearch] = useState('')
  const [sevFilter, setSevFilter] = useState('all')
  const [staFilter, setStaFilter] = useState('all')
  const [chanFilter, setChanFilter] = useState('all')
  const [selected, setSelected] = useState<any>(null)
  const [updating, setUpdating] = useState(false)

  const fetchIncidents = useCallback(async () => {
    try {
      const tid = getTenantId()
      const params = new URLSearchParams({ limit: '100', tenantId: tid })
      if (sevFilter !== 'all') params.set('severity', sevFilter)
      if (staFilter !== 'all') params.set('status', staFilter)
      if (chanFilter !== 'all') params.set('channel', chanFilter)
      const r = await fetch('/api/v1/incidents?' + params.toString())
      const d = await r.json()
      if (d.success) {
        setIncidents(d.incidents || [])
        setStats(d.stats || {})
        setLastRefresh(new Date())
      }
    } catch {}
    finally { setLoading(false) }
  }, [sevFilter, staFilter, chanFilter])

  useEffect(() => { fetchIncidents() }, [fetchIncidents])
  useEffect(() => { const t = setInterval(fetchIncidents, 15000); return () => clearInterval(t) }, [fetchIncidents])

  const updateStatus = async (id: string, status: string) => {
    setUpdating(true)
    await fetch('/api/v1/incidents', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ incidentId: id, status, tenantId: getTenantId() })
    })
    await fetchIncidents()
    if (selected?.id === id) setSelected((prev: any) => ({ ...prev, status }))
    setUpdating(false)
  }

  const filtered = incidents.filter(i => {
    if (search) {
      const q = search.toLowerCase()
      if (!i.policyName?.toLowerCase().includes(q) && !i.hostname?.toLowerCase().includes(q) && !i.username?.toLowerCase().includes(q)) return false
    }
    return true
  })

  const inp = { background:'#0f172a', color:'#94a3b8', border:'1px solid #334155', borderRadius:8, padding:'8px 12px', fontSize:14 }
  const card = { background:'#1e293b', borderRadius:12, padding:20, marginBottom:12, cursor:'pointer' }

  if (selected) {
    return (
      <div style={{ minHeight:'100vh', background:'#0f172a', color:'#f1f5f9', padding:24, fontFamily:'system-ui' }}>
        <button onClick={() => setSelected(null)} style={{ color:'#60a5fa', background:'none', border:'none', cursor:'pointer', marginBottom:16, fontSize:14 }}>← Back to Incidents</button>
        <div style={{ background:'#1e293b', borderRadius:16, padding:28, maxWidth:800 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
            <div>
              <h2 style={{ margin:0, fontSize:20 }}>{selected.policyName}</h2>
              <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>Incident {selected.id}</p>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <span style={{ background:SEV_COLOR[selected.severity]+'33', color:SEV_COLOR[selected.severity], padding:'4px 10px', borderRadius:20, fontSize:12, fontWeight:700, textTransform:'uppercase' }}>{selected.severity}</span>
              <span style={{ background:STA_COLOR[selected.status]+'33', color:STA_COLOR[selected.status], padding:'4px 10px', borderRadius:20, fontSize:12, textTransform:'uppercase' }}>{selected.status?.replace('_',' ')}</span>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
            {[['Channel',selected.channel],['Action',selected.action],['Host',selected.hostname],['User',selected.username],['Time',new Date(selected.timestamp||selected.reportedAt).toLocaleString()],['Policy ID',selected.policyId]].map(([k,v]) => (
              <div key={k} style={{ background:'#0f172a', borderRadius:8, padding:'12px 16px' }}>
                <div style={{ color:'#64748b', fontSize:11, textTransform:'uppercase', marginBottom:4 }}>{k}</div>
                <div style={{ fontSize:14, wordBreak:'break-all' }}>{v as string}</div>
              </div>
            ))}
          </div>
          {selected.details && (
            <div style={{ background:'#0f172a', borderRadius:8, padding:16, marginBottom:20 }}>
              <div style={{ color:'#64748b', fontSize:11, textTransform:'uppercase', marginBottom:12 }}>Forensic Details</div>
              {selected.details.fileName && <div style={{ marginBottom:8 }}><span style={{ color:'#64748b', fontSize:12 }}>File: </span><span>{selected.details.fileName}</span></div>}
              {selected.details.filePath && <div style={{ marginBottom:8 }}><span style={{ color:'#64748b', fontSize:12 }}>Path: </span><code style={{ fontSize:12, color:'#94a3b8' }}>{selected.details.filePath}</code></div>}
              {selected.details.url && <div style={{ marginBottom:8 }}><span style={{ color:'#64748b', fontSize:12 }}>Destination: </span><span style={{ color:'#f97316' }}>{selected.details.url}</span></div>}
              {selected.details.sourceApp && <div style={{ marginBottom:8 }}><span style={{ color:'#64748b', fontSize:12 }}>Process: </span><span>{selected.details.sourceApp}</span></div>}
              {selected.details.contentSnippet && (
                <div style={{ marginTop:8 }}>
                  <div style={{ color:'#64748b', fontSize:12, marginBottom:4 }}>Details:</div>
                  <pre style={{ background:'#1e293b', padding:12, borderRadius:6, fontSize:12, color:'#94a3b8', whiteSpace:'pre-wrap', margin:0 }}>{selected.details.contentSnippet}</pre>
                </div>
              )}
            </div>
          )}
          <div>
            <div style={{ color:'#64748b', fontSize:11, textTransform:'uppercase', marginBottom:10 }}>Update Status</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {['open','investigating','escalated','resolved'].map(s => (
                <button key={s} onClick={() => updateStatus(selected.id, s)} disabled={updating || selected.status===s}
                  style={{ padding:'8px 16px', borderRadius:8, border:'none', cursor:selected.status===s?'default':'pointer', fontSize:13, fontWeight:600,
                    background:selected.status===s?STA_COLOR[s]+'33':'#334155', color:selected.status===s?STA_COLOR[s]:'#94a3b8', opacity:updating?0.5:1 }}>
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0f172a', color:'#f1f5f9', padding:24, fontFamily:'system-ui' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700 }}>DLP Incidents</h1>
          <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:13 }}>Real-time security incidents • Tenant: <span style={{ color:'#00ffc8' }}>{getTenantId()}</span></p>
        </div>
        <Link href="/console" style={{ color:'#60a5fa', fontSize:13, textDecoration:'none' }}>← Console</Link>
      </div>
      <div style={{ color:'#475569', fontSize:11, marginBottom:20 }}>Last refresh: {lastRefresh.toLocaleTimeString()} • Auto-refreshes every 15s</div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:24 }}>
        {[['Total',stats.total||incidents.length,'#f1f5f9'],['Open',stats.byStatus?.open||0,'#ef4444'],['Critical',stats.bySeverity?.critical||0,'#f97316'],['Resolved',stats.byStatus?.resolved||0,'#22c55e']].map(([l,v,c]) => (
          <div key={l as string} style={{ background:'#1e293b', borderRadius:12, padding:16 }}>
            <div style={{ color:'#64748b', fontSize:12 }}>{l as string}</div>
            <div style={{ fontSize:28, fontWeight:700, color:c as string }}>{v as number}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' }}>
        <input placeholder="Search policy, host, user..." value={search} onChange={e=>setSearch(e.target.value)} style={{ ...inp, flex:1, minWidth:180 }} />
        <select value={sevFilter} onChange={e=>setSevFilter(e.target.value)} style={inp}>
          <option value="all">All Severities</option>
          {['critical','high','medium','low'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={staFilter} onChange={e=>setStaFilter(e.target.value)} style={inp}>
          <option value="all">All Statuses</option>
          {['open','investigating','escalated','resolved'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={chanFilter} onChange={e=>setChanFilter(e.target.value)} style={inp}>
          <option value="all">All Channels</option>
          {['filesystem','usb','network','email','clipboard','browser_upload','browser_download','print','airdrop','messaging','cloud_storage'].map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <button onClick={fetchIncidents} style={{ ...inp, background:'#1d4ed8', color:'#fff', border:'none', cursor:'pointer' }}>Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:60 }}>Loading incidents...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', color:'#64748b', padding:60 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>✓</div>
          <div style={{ fontSize:16, marginBottom:4 }}>No incidents found</div>
          <div style={{ fontSize:13 }}>Incidents appear when endpoint agents detect policy violations.</div>
        </div>
      ) : (
        <div>
          {filtered.map(inc => (
            <div key={inc.id} onClick={()=>setSelected(inc)} style={{ ...card, borderLeft:`4px solid ${SEV_COLOR[inc.severity]||'#334155'}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <div style={{ fontWeight:600, fontSize:15 }}>{inc.policyName}</div>
                <div style={{ display:'flex', gap:6 }}>
                  <span style={{ background:SEV_COLOR[inc.severity]+'33', color:SEV_COLOR[inc.severity], padding:'3px 8px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>{inc.severity}</span>
                  <span style={{ background:STA_COLOR[inc.status]+'33', color:STA_COLOR[inc.status], padding:'3px 8px', borderRadius:20, fontSize:11, textTransform:'uppercase' }}>{inc.status?.replace('_',' ')}</span>
                </div>
              </div>
              <div style={{ color:'#64748b', fontSize:13, marginBottom:4 }}>{inc.channel} • {inc.hostname} • {inc.username}</div>
              <div style={{ color:'#475569', fontSize:12 }}>{new Date(inc.timestamp||inc.reportedAt).toLocaleString()} • Action: <span style={{ color:inc.action==='block'?'#ef4444':inc.action==='audit'?'#eab308':'#22c55e' }}>{inc.action}</span></div>
            </div>
          ))}
          <div style={{ color:'#475569', fontSize:12, textAlign:'center', padding:'12px 0' }}>Showing {filtered.length} of {incidents.length} incidents</div>
        </div>
      )}
    </div>
  )
}
