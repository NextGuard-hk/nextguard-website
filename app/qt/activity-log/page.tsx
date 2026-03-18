'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface LogEntry {
  id: number; user_id: string | null; user_email: string | null
  action: string; entity_type: string | null; entity_id: string | null
  details: string | null; ip_address: string | null; created_at: string
}
interface User { id: string; email: string; name: string; role: string }

const ACTION_ICON: Record<string,string> = {
  login: '🔑', logout: '🚪', quotation_created: '📝', quotation_updated: '✏️',
  quotation_deleted: '🗑️', status_updated: '🔄', pdf_exported: '📄',
  product_viewed: '👁️', user_synced: '🔗',
}
const ACTION_COLOR: Record<string,string> = {
  login: '#22c55e', logout: '#6b7280', quotation_created: '#3b82f6',
  quotation_updated: '#f59e0b', quotation_deleted: '#ef4444',
  status_updated: '#8b5cf6', pdf_exported: '#06b6d4', product_viewed: '#9ca3af',
}

const CSS = `
.al-root { min-height:100vh; background:#0a0f1a; color:#e0e0e0; font-family:system-ui,sans-serif; }
.al-header { display:flex; align-items:center; padding:14px 24px; background:#0d1117; border-bottom:1px solid #1f2937; flex-wrap:wrap; gap:8px; }
.al-logo { font-size:18px; font-weight:700; color:#fff; letter-spacing:1px; }
.al-logo span { color:#22c55e; }
.al-header-right { margin-left:auto; display:flex; align-items:center; gap:8px; }
.al-container { max-width:1200px; margin:0 auto; padding:24px 16px; }
.al-title-row { display:flex; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
.al-title { font-size:24px; font-weight:700; color:#f9fafb; }
.al-subtitle { font-size:13px; color:#6b7280; margin-top:2px; }
.al-filters { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.al-input { padding:9px 14px; background:#111827; border:1px solid #1f2937; border-radius:8px; color:#e0e0e0; font-size:14px; outline:none; min-width:140px; }
.al-select { padding:9px 14px; background:#111827; border:1px solid #1f2937; border-radius:8px; color:#e0e0e0; font-size:14px; outline:none; }
.al-btn { padding:9px 18px; background:#1f2937; border:1px solid #374151; border-radius:8px; color:#9ca3af; font-size:14px; cursor:pointer; white-space:nowrap; }
.al-btn-back { background:#3b82f6; color:#fff; border:none; border-radius:8px; padding:9px 18px; font-size:14px; cursor:pointer; }
.al-card { background:#0d1117; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
.al-table { width:100%; border-collapse:collapse; font-size:13px; }
.al-table th { text-align:left; padding:10px 12px; color:#9ca3af; font-weight:500; border-bottom:1px solid #1f2937; white-space:nowrap; }
.al-table td { padding:10px 12px; vertical-align:middle; }
.al-table tr:not(:last-child) td { border-bottom:1px solid #1f2937; }
.al-table tr:hover td { background:#1a2235; }
.al-action-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; color:#fff; }
.al-details { font-size:11px; color:#6b7280; max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.al-time { font-size:12px; color:#6b7280; white-space:nowrap; }
.al-email { color:#3b82f6; font-size:12px; }
.al-entity { font-size:11px; color:#9ca3af; font-family:monospace; }
.al-pagination { display:flex; justify-content:center; gap:8px; margin-top:16px; }
.al-empty { text-align:center; padding:60px 20px; color:#6b7280; }
@media (max-width:768px) {
  .al-header { padding:10px 14px; }
  .al-container { padding:16px 10px; }
  .al-table { font-size:12px; }
  .al-table th:nth-child(4), .al-table td:nth-child(4),
  .al-table th:nth-child(5), .al-table td:nth-child(5) { display:none; }
}
`

export default function ActivityLogPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [users, setUsers] = useState<string[]>([])
  const [page, setPage] = useState(0)
  const LIMIT = 50

  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated || d.user.role !== 'admin') { router.replace('/qt'); return }
      setUser(d.user)
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (actionFilter) p.set('action', actionFilter)
    if (userFilter) p.set('userId', userFilter)
    p.set('limit', String(LIMIT))
    p.set('offset', String(page * LIMIT))
    try {
      const res = await fetch('/api/qt-audit-log?' + p)
      if (res.status === 401 || res.status === 403) { router.replace('/qt'); return }
      const d = await res.json()
      setLogs(d.logs || [])
      setTotal(d.total || 0)
      if (d.actions) setActions(d.actions)
      if (d.users) setUsers(d.users)
    } catch {} finally { setLoading(false) }
  }, [search, actionFilter, userFilter, page, router])

  useEffect(() => { if (user) load() }, [user, load])

  const fmtTime = (d: string) => {
    const dt = new Date(d + 'Z')
    return dt.toLocaleString('en-HK', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false })
  }

  const parseDetails = (d: string | null) => {
    if (!d) return null
    try { return JSON.parse(d) } catch { return d }
  }

  const fmtAction = (a: string) => a.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const totalPages = Math.ceil(total / LIMIT)

  if (!user) return <div className="al-root"><style>{CSS}</style><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh',color:'#9ca3af'}}>Loading...</div></div>

  return (
    <div className="al-root">
      <style>{CSS}</style>
      <div className="al-header">
        <div className="al-logo">NEXT<span>GUARD</span>&nbsp;&nbsp;|&nbsp;&nbsp;Activity Log</div>
        <div className="al-header-right">
          <button onClick={() => router.push('/qt')} className="al-btn-back">← Back to Quotations</button>
          <button onClick={() => { fetch('/api/qt-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})}); router.replace('/qt-login') }} className="al-btn">Logout</button>
        </div>
      </div>
      <div className="al-container">
        <div className="al-title-row">
          <div>
            <div className="al-title">Activity Log</div>
            <div className="al-subtitle">{total} events recorded</div>
          </div>
          <button onClick={load} className="al-btn">🔄 Refresh</button>
        </div>

        <div className="al-filters">
          <input className="al-input" style={{flex:1}} placeholder="Search email, action, entity..." value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} />
          <select className="al-select" value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0) }}>
            <option value="">All Actions</option>
            {actions.map(a => <option key={a} value={a}>{fmtAction(a)}</option>)}
          </select>
          <select className="al-select" value={userFilter} onChange={e => { setUserFilter(e.target.value); setPage(0) }}>
            <option value="">All Users</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="al-card"><div style={{textAlign:'center',padding:'40px',color:'#9ca3af'}}>Loading...</div></div>
        ) : logs.length === 0 ? (
          <div className="al-card"><div className="al-empty">No activity logs found</div></div>
        ) : (
          <div className="al-card" style={{overflowX:'auto'}}>
            <table className="al-table">
              <thead><tr>
                <th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Details</th>
              </tr></thead>
              <tbody>
                {logs.map(log => {
                  const details = parseDetails(log.details)
                  const color = ACTION_COLOR[log.action] || '#6b7280'
                  const icon = ACTION_ICON[log.action] || '📋'
                  return (
                    <tr key={log.id}>
                      <td><div className="al-time">{fmtTime(log.created_at)}</div></td>
                      <td><div className="al-email">{log.user_email || '-'}</div></td>
                      <td><span className="al-action-badge" style={{background:color}}>{icon} {fmtAction(log.action)}</span></td>
                      <td>
                        {log.entity_type && <div className="al-entity">{log.entity_type}{log.entity_id ? `: ${log.entity_id.slice(0,20)}` : ''}</div>}
                      </td>
                      <td>
                        {details && typeof details === 'object' ? (
                          <div className="al-details" title={JSON.stringify(details)}>
                            {Object.entries(details).map(([k,v]) => `${k}: ${v}`).join(', ')}
                          </div>
                        ) : details ? <div className="al-details">{String(details)}</div> : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="al-pagination">
            <button className="al-btn" disabled={page===0} onClick={() => setPage(p=>p-1)}>← Prev</button>
            <span style={{padding:'9px 14px',color:'#9ca3af',fontSize:'14px'}}>Page {page+1} of {totalPages}</span>
            <button className="al-btn" disabled={page>=totalPages-1} onClick={() => setPage(p=>p+1)}>Next →</button>
          </div>
        )}
      </div>
    </div>
  )
}
