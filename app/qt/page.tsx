'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Quotation {
  id: string; ref_number: string;
  customer_name: string; partner_name: string | null
  project_name: string | null;
  customer_type: string; term_years: number; status: string
  final_price: number; currency: string; created_at: string
}
interface User { id: string; email: string; name: string; role: string }

const STATUS_COLOR: Record<string,string> = {
  draft:'#6b7280', sent:'#3b82f6',
  accepted:'#22c55e', rejected:'#ef4444',
  expired:'#f59e0b', cancelled:'#9ca3af'
}
const STATUS_LABEL: Record<string,string> = {
  draft:'Draft', sent:'Sent', accepted:'Accepted',
  rejected:'Rejected', expired:'Expired', cancelled:'Cancelled'
}

const RESPONSIVE_CSS = `
.qt-root { min-height:100vh; background:#0a0f1a; color:#e0e0e0; font-family:system-ui,sans-serif; }
.qt-header { display:flex; align-items:center; padding:14px 24px; background:#0d1117; border-bottom:1px solid #1f2937; flex-wrap:wrap; gap:8px; }
.qt-logo { font-size:18px; font-weight:700; color:#fff; letter-spacing:1px; }
.qt-logo span { color:#22c55e; }
.qt-header-right { margin-left:auto; display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.qt-container { max-width:1200px; margin:0 auto; padding:24px 16px; }
.qt-title-row { display:flex; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
.qt-title { font-size:24px; font-weight:700; color:#f9fafb; }
.qt-subtitle { font-size:13px; color:#6b7280; margin-top:2px; }
.qt-search-row { display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap; }
.qt-search-input { flex:1; min-width:160px; padding:9px 14px; background:#111827; border:1px solid #1f2937; border-radius:8px; color:#e0e0e0; font-size:14px; outline:none; }
.qt-btn-search { padding:9px 18px; background:#1f2937; border:1px solid #374151; border-radius:8px; color:#9ca3af; font-size:14px; cursor:pointer; white-space:nowrap; }
.qt-select-status { padding:9px 14px; background:#111827; border:1px solid #1f2937; border-radius:8px; color:#e0e0e0; font-size:14px; outline:none; }
.qt-btn-new { background:#22c55e; color:#fff; border:none; border-radius:8px; padding:10px 20px; font-size:14px; font-weight:600; cursor:pointer; white-space:nowrap; }
.qt-card { background:#0d1117; border:1px solid #1f2937; border-radius:12px; overflow:hidden; }
.qt-empty { text-align:center; padding:60px 20px; }
.qt-empty-icon { font-size:48px; margin-bottom:12px; }
.qt-empty-title { color:#f9fafb; font-size:16px; font-weight:600; margin-bottom:6px; }
.qt-empty-sub { color:#6b7280; font-size:14px; margin-bottom:20px; }
.qt-table-wrap { overflow-x:auto; }
.qt-table { width:100%; border-collapse:collapse; font-size:13px; min-width:650px; }
.qt-table th { text-align:left; padding:10px 12px; color:#9ca3af; font-weight:500; border-bottom:1px solid #1f2937; white-space:nowrap; }
.qt-table td { padding:10px 12px; vertical-align:middle; }
.qt-table tr:not(:last-child) td { border-bottom:1px solid #1f2937; }
.qt-table tbody tr:hover { background:#1a2235; cursor:pointer; }
.qt-ref { color:#3b82f6; font-weight:600; }
.qt-cust { font-weight:500; color:#f9fafb; }
.qt-proj { font-size:11px; color:#6b7280; }
.qt-badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:11px; font-weight:600; color:#fff; }
.qt-actions { display:flex; gap:6px; flex-wrap:wrap; }
.qt-btn-sm { background:#1f2937; border:1px solid #374151; color:#9ca3af; border-radius:6px; padding:5px 10px; font-size:12px; cursor:pointer; white-space:nowrap; }
.qt-ml { display:none; }
.qt-mc { background:#111827; border:1px solid #1f2937; border-radius:10px; padding:14px; margin-bottom:10px; cursor:pointer; }
.qt-mc:active { background:#1a2235; }
.qt-mc-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.qt-mc-ref { color:#3b82f6; font-weight:600; font-size:13px; }
.qt-mc-name { color:#f9fafb; font-weight:600; font-size:15px; margin-bottom:4px; }
.qt-mc-proj { color:#6b7280; font-size:12px; }
.qt-mc-bottom { display:flex; justify-content:space-between; align-items:center; margin-top:10px; }
.qt-mc-price { color:#f9fafb; font-weight:600; font-size:14px; }
.qt-mc-date { color:#6b7280; font-size:12px; }
.qt-mc-actions { display:flex; gap:6px; margin-top:10px; }
@media (max-width:640px) {
  .qt-header { padding:10px 14px; }
  .qt-container { padding:16px 10px; }
  .qt-title { font-size:20px; }
  .qt-table-wrap { display:none; }
  .qt-ml { display:block; }
  .qt-btn-new { width:100%; text-align:center; }
  .qt-title-row { flex-direction:column; align-items:flex-start; }
}
`

export default function QtDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) { router.replace('/qt-login'); return }
      setUser(d.user)
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  const load = useCallback(async () => {
    setLoading(true)
    const p = new URLSearchParams()
    if (search) p.set('search', search)
    if (statusFilter) p.set('status', statusFilter)
    p.set('limit','50')
    try {
      const res = await fetch('/api/qt-quotations?'+p)
      if (res.status===401) { router.replace('/qt-login'); return }
      const d = await res.json()
      setQuotations(d.quotations||[])
      setTotal(d.total||0)
    } catch {} finally { setLoading(false) }
  }, [search, statusFilter, router])

  useEffect(() => { if(user) load() }, [user, load])

  async function logout() {
    await fetch('/api/qt-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})})
    router.replace('/qt-login')
  }

  const fmt = (n:number,c='HKD') => new Intl.NumberFormat('en-HK',{style:'currency',currency:c,minimumFractionDigits:0}).format(n)
  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-HK',{day:'2-digit',month:'short',year:'numeric'})

  if (!user) return <div className="qt-root"><style>{RESPONSIVE_CSS}</style><div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'60vh',color:'#9ca3af'}}>Loading...</div></div>

  return (
    <div className="qt-root">
      <style>{RESPONSIVE_CSS}</style>
      <div className="qt-header">
        <div className="qt-logo">NEXT<span>GUARD</span>&nbsp;&nbsp;|&nbsp;&nbsp;Quotation System</div>
        <div className="qt-header-right">
          {user.name}
          {user.role==='admin'&& <span className="qt-badge" style={{background:'#3b82f6'}}>Admin</span>}
          <button onClick={logout} className="qt-btn-sm">Logout</button>
                              {['admin','product_manager'].includes(user.role) && <button onClick={()=>router.push('/qt/products')} className="qt-btn-sm" style={{background:'#8b5cf6',color:'#fff',border:'none'}}>Products</button>}{user.role==='admin' && <button onClick={()=>router.push('/qt/activity-log')} className="qt-btn-sm" style={{background:'#f59e0b',color:'#fff',border:'none'}}>Activity Log</button>}
</div>
      </div>

      <div className="qt-container">
        <div className="qt-title-row">
          <div>
            <div className="qt-title">Quotations</div>
            <div className="qt-subtitle">{total} total</div>
          </div>
          <button onClick={() => router.push('/qt/new')} className="qt-btn-new">+ New Quotation</button>
        </div>

        <div className="qt-search-row">
          <input className="qt-search-input" value={searchInput} onChange={e=>setSearchInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setSearch(searchInput)}} placeholder="Search customer, project, ref..." />
          <button onClick={()=>setSearch(searchInput)} className="qt-btn-search">Search</button>
          <select className="qt-select-status" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}>
            <option value="">All Status</option>
            {['draft','sent','accepted','rejected','expired'].map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="qt-card"><div style={{textAlign:'center',padding:'40px 20px',color:'#9ca3af'}}>Loading...</div></div>
        ) : quotations.length===0 ? (
          <div className="qt-card">
            <div className="qt-empty">
              <div className="qt-empty-icon">{"\ud83d\udcc4"}</div>
              <div className="qt-empty-title">No quotations yet</div>
              <div className="qt-empty-sub">Create your first quotation to get started</div>
              <button onClick={() => router.push('/qt/new')} className="qt-btn-new">+ New Quotation</button>
            </div>
          </div>
        ) : (
          <div className="qt-card">
            {/* Desktop table */}
            <div className="qt-table-wrap">
              <table className="qt-table">
                <thead><tr>
                  {['Ref #','Customer / Project','Type','Term','Amount','Status','Date',''].map(h=><th key={h}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {quotations.map(q=>(
                    <tr key={q.id} onClick={()=>router.push(`/qt/${q.id}`)}>
                      <td><span className="qt-ref">{q.ref_number}</span></td>
                      <td><div className="qt-cust">{q.customer_name}</div>{q.project_name&&<div className="qt-proj">{q.project_name}</div>}</td>
                      <td>{q.customer_type==='partner'?'Partner':'End User'}</td>
                      <td>{q.term_years}Y</td>
                      <td>{fmt(q.final_price,q.currency)}</td>
                      <td><span className="qt-badge" style={{background:STATUS_COLOR[q.status]}}>{STATUS_LABEL[q.status]}</span></td>
                      <td>{fmtDate(q.created_at)}</td>
                      <td>
                        <div className="qt-actions">
                          <button onClick={(e)=>{e.stopPropagation();router.push(`/qt/${q.id}`)}} className="qt-btn-sm">View</button>
                          <button onClick={(e)=>{e.stopPropagation();router.push(`/qt/${q.id}/pdf`)}} className="qt-btn-sm">PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <div className="qt-ml">
              {quotations.map(q=>(
                <div key={q.id} className="qt-mc" onClick={()=>router.push(`/qt/${q.id}`)}>
                  <div className="qt-mc-top">
                    <span className="qt-mc-ref">{q.ref_number}</span>
                    <span className="qt-badge" style={{background:STATUS_COLOR[q.status]}}>{STATUS_LABEL[q.status]}</span>
                  </div>
                  <div className="qt-mc-name">{q.customer_name}</div>
                  {q.project_name && <div className="qt-mc-proj">{q.project_name}</div>}
                  <div className="qt-mc-bottom">
                    <span className="qt-mc-price">{fmt(q.final_price,q.currency)}</span>
                    <span className="qt-mc-date">{fmtDate(q.created_at)}</span>
                  </div>
                  <div className="qt-mc-actions">
                    <button onClick={(e)=>{e.stopPropagation();router.push(`/qt/${q.id}`)}} className="qt-btn-sm">View</button>
                    <button onClick={(e)=>{e.stopPropagation();router.push(`/qt/${q.id}/pdf`)}} className="qt-btn-sm">PDF</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
