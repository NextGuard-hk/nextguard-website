'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Quotation {
  id: string; ref_number: string; customer_name: string; partner_name: string | null
  project_name: string | null; customer_type: string; term_years: number; status: string
  final_price: number; currency: string; created_at: string
}
interface User { id: string; email: string; name: string; role: string }

const STATUS_COLOR: Record<string,string> = { draft:'#6b7280', sent:'#3b82f6', accepted:'#22c55e', rejected:'#ef4444', expired:'#f59e0b', cancelled:'#9ca3af' }
const STATUS_LABEL: Record<string,string> = { draft:'Draft', sent:'Sent', accepted:'Accepted', rejected:'Rejected', expired:'Expired', cancelled:'Cancelled' }

export default function QtDashboard() {
  const router = useRouter()
  const [user, setUser] = useState<User|null>(null)
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
    } catch {}
    finally { setLoading(false) }
  }, [search, statusFilter, router])

  useEffect(() => { if(user) load() }, [user, load])

  async function logout() {
    await fetch('/api/qt-auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'logout'})})
    router.replace('/qt-login')
  }

  const fmt = (n:number,c='HKD') => new Intl.NumberFormat('en-HK',{style:'currency',currency:c,minimumFractionDigits:0}).format(n)
  const fmtDate = (d:string) => new Date(d).toLocaleDateString('en-HK',{day:'2-digit',month:'short',year:'numeric'})

  if (!user) return <div style={{minHeight:'100vh',background:'#0a0a1a',display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#888'}}>Loading...</div></div>

  return (
    <div style={{minHeight:'100vh',background:'#0a0a1a',fontFamily:'-apple-system,BlinkMacSystemFont,sans-serif',color:'#e0e0e0'}}>
      <div style={{background:'#111827',borderBottom:'1px solid #1f2937',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:60,position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <span style={{fontSize:18,fontWeight:800,color:'#fff'}}>NEXT<span style={{color:'#22c55e'}}>GUARD</span></span>
          <span style={{color:'#374151',fontSize:18}}>|</span>
          <span style={{color:'#9ca3af',fontSize:14}}>Quotation System</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{color:'#9ca3af',fontSize:13}}>{user.name}</span>
          {user.role==='admin'&&<span style={{background:'#7c3aed22',color:'#a78bfa',border:'1px solid #7c3aed44',borderRadius:6,padding:'2px 8px',fontSize:11}}>Admin</span>}
          <button onClick={logout} style={{background:'transparent',border:'1px solid #374151',color:'#9ca3af',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer'}}>Logout</button>
        </div>
      </div>
      <div style={{maxWidth:1200,margin:'0 auto',padding:'32px 24px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:24}}>
          <div>
            <h1 style={{color:'#fff',fontSize:24,fontWeight:700,margin:0}}>Quotations</h1>
            <p style={{color:'#6b7280',fontSize:14,margin:'4px 0 0 0'}}>{total} total</p>
          </div>
          <button onClick={()=>router.push('/qt/new')} style={{background:'#22c55e',color:'#fff',border:'none',borderRadius:8,padding:'10px 20px',fontSize:14,fontWeight:600,cursor:'pointer'}}>+ New Quotation</button>
        </div>
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          <input value={searchInput} onChange={e=>setSearchInput(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')setSearch(searchInput)}}
            placeholder="Search customer, project, ref..." style={{flex:1,minWidth:200,padding:'9px 14px',background:'#111827',border:'1px solid #1f2937',borderRadius:8,color:'#e0e0e0',fontSize:14,outline:'none'}} />
          <button onClick={()=>setSearch(searchInput)} style={{padding:'9px 18px',background:'#1f2937',border:'1px solid #374151',borderRadius:8,color:'#9ca3af',fontSize:14,cursor:'pointer'}}>Search</button>
          <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:'9px 14px',background:'#111827',border:'1px solid #1f2937',borderRadius:8,color:'#e0e0e0',fontSize:14,outline:'none'}}>
            <option value="">All Status</option>
            {['draft','sent','accepted','rejected','expired'].map(s=><option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
          </select>
        </div>
        <div style={{background:'#111827',border:'1px solid #1f2937',borderRadius:12,overflow:'hidden'}}>
          {loading?(<div style={{padding:48,textAlign:'center',color:'#6b7280'}}>Loading...</div>)
          :quotations.length===0?(
            <div style={{padding:64,textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:16}}>📄</div>
              <div style={{color:'#fff',fontSize:18,fontWeight:600,marginBottom:8}}>No quotations yet</div>
              <div style={{color:'#6b7280',fontSize:14,marginBottom:24}}>Create your first quotation to get started</div>
              <button onClick={()=>router.push('/qt/new')} style={{background:'#22c55e',color:'#fff',border:'none',borderRadius:8,padding:'10px 24px',fontSize:14,fontWeight:600,cursor:'pointer'}}>+ New Quotation</button>
            </div>
          ):(
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse'}}>
                <thead><tr style={{borderBottom:'1px solid #1f2937'}}>
                  {['Ref #','Customer / Project','Type','Term','Amount','Status','Date',''].map(h=><th key={h} style={{padding:'12px 16px',textAlign:'left',color:'#6b7280',fontSize:11,fontWeight:600,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {quotations.map(q=>(
                    <tr key={q.id} onClick={()=>router.push(`/qt/${q.id}`)} style={{borderBottom:'1px solid #1f2937',cursor:'pointer'}}
                      onMouseEnter={e=>(e.currentTarget.style.background='#1f2937')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <td style={{padding:'14px 16px',color:'#22c55e',fontSize:13,fontWeight:600,fontFamily:'monospace',whiteSpace:'nowrap'}}>{q.ref_number}</td>
                      <td style={{padding:'14px 16px',minWidth:180}}>
                        <div style={{color:'#fff',fontSize:14,fontWeight:600}}>{q.customer_name}</div>
                        {q.project_name&&<div style={{color:'#6b7280',fontSize:12,marginTop:2}}>{q.project_name}</div>}
                      </td>
                      <td style={{padding:'14px 16px'}}><span style={{background:'#1f293744',border:'1px solid #374151',borderRadius:6,padding:'2px 8px',fontSize:11,color:'#9ca3af'}}>{q.customer_type==='partner'?'Partner':'End User'}</span></td>
                      <td style={{padding:'14px 16px',color:'#9ca3af',fontSize:13,whiteSpace:'nowrap'}}>{q.term_years}Y</td>
                      <td style={{padding:'14px 16px',color:'#fff',fontSize:14,fontWeight:600,whiteSpace:'nowrap'}}>{fmt(q.final_price,q.currency)}</td>
                      <td style={{padding:'14px 16px'}}><span style={{background:(STATUS_COLOR[q.status]||'#6b7280')+'22',color:STATUS_COLOR[q.status]||'#6b7280',border:`1px solid ${(STATUS_COLOR[q.status]||'#6b7280')}44`,borderRadius:6,padding:'3px 10px',fontSize:12}}>{STATUS_LABEL[q.status]||q.status}</span></td>
                      <td style={{padding:'14px 16px',color:'#6b7280',fontSize:12,whiteSpace:'nowrap'}}>{fmtDate(q.created_at)}</td>
                      <td style={{padding:'14px 16px'}}>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={e=>{e.stopPropagation();router.push(`/qt/${q.id}`)}} style={{background:'#1f2937',border:'1px solid #374151',color:'#9ca3af',borderRadius:6,padding:'5px 10px',fontSize:12,cursor:'pointer'}}>View</button>
                          <button onClick={e=>{e.stopPropagation();router.push(`/qt/${q.id}/pdf`)}} style={{background:'#1f2937',border:'1px solid #374151',color:'#9ca3af',borderRadius:6,padding:'5px 10px',fontSize:12,cursor:'pointer'}}>PDF</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
