'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
const STATUS_COLOR: Record<string,string> = { draft:'#6b7280', sent:'#3b82f6', accepted:'#22c55e', rejected:'#ef4444', expired:'#f59e0b', cancelled:'#9ca3af' }
const STATUS_LABEL: Record<string,string> = { draft:'Draft', sent:'Sent', accepted:'Accepted', rejected:'Rejected', expired:'Expired', cancelled:'Cancelled' }
const CSS = `
.qd-root{min-height:100vh;background:#0a0e17;color:#e0e0e0;font-family:system-ui,sans-serif}
.qd-root *{box-sizing:border-box}
.qd-hdr{background:#0d1117;border-bottom:1px solid #1f2937;padding:12px 16px;display:flex;align-items:center;flex-wrap:wrap;gap:8px}
.qd-back{background:none;border:none;color:#9ca3af;cursor:pointer;font-size:20px;margin-right:8px}
.qd-hdr-t{font-weight:700;font-size:15px;color:#fff}
.qd-badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;color:#fff;margin-left:8px}
.qd-hdr-r{margin-left:auto;display:flex;gap:6px;flex-wrap:wrap}
.qd-b{color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.qd-b:disabled{opacity:.6;cursor:not-allowed}
.qd-ctr{max-width:1200px;margin:0 auto;padding:16px}
.qd-err{background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#fca5a5}
.qd-g{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
.qd-c{background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:16px}
.qd-ct{font-weight:600;margin-bottom:16px;color:#f9fafb;font-size:15px}
.qd-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qd-f{margin-bottom:10px}
.qd-l{color:#9ca3af;font-size:12px;margin-bottom:2px;display:block}
.qd-v{color:#f9fafb;font-size:14px}
.qd-tw{overflow-x:auto}
.qd-tb{width:100%;border-collapse:collapse;font-size:13px;min-width:600px}
.qd-tb th{text-align:left;padding:8px;color:#9ca3af;font-weight:500;border-bottom:1px solid #374151;white-space:nowrap}
.qd-tb td{padding:8px;vertical-align:middle}
.qd-tb tr:not(:last-child) td{border-bottom:1px solid #1f2937}
.qd-sum{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px}
.qd-sl{color:#9ca3af}
.qd-fl{color:#f9fafb;font-weight:700;font-size:15px}
.qd-fv{color:#22c55e;font-weight:700;font-size:18px}
.qd-rmk{white-space:pre-wrap;color:#d1d5db;font-size:14px;line-height:1.6}
@media(max-width:768px){
.qd-hdr{padding:10px 12px}
.qd-hdr-r{width:100%;justify-content:flex-start}
.qd-ctr{padding:12px 8px}
.qd-g{grid-template-columns:1fr}
.qd-row{grid-template-columns:1fr 1fr}
.qd-c{padding:14px}
.qd-b{padding:6px 12px;font-size:12px}
.qd-tb{min-width:500px}
}
@media(max-width:480px){
.qd-row{grid-template-columns:1fr}
.qd-hdr-t{font-size:13px}
}
`
export default function QuotationDetail() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [qt, setQt] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => { if (!d.authenticated) router.replace('/qt-login') }).catch(() => router.replace('/qt-login'))
  }, [router])
  useEffect(() => {
    if (!id) return; setLoading(true)
    fetch(`/api/qt-quotations/${id}`).then(r => { if (r.status===401) { router.replace('/qt-login'); return r.json() } if (r.status===404) { setError('Quotation not found'); return r.json() } return r.json() }).then(d => { if (d?.quotation) { setQt(d.quotation); setLines(d.lines||[]) } }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id, router])
  async function updateStatus(status: string) {
    setStatusUpdating(true)
    try { const res = await fetch(`/api/qt-quotations/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status}) }); const d = await res.json(); if (d.quotation) setQt(d.quotation) } catch (e:any) { setError(e.message) } finally { setStatusUpdating(false) }
  }
  const fmt = (n: number, c = qt?.currency||'HKD') => new Intl.NumberFormat('en-HK', { style:'currency', currency:c, minimumFractionDigits:0 }).format(n)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', { day:'2-digit', month:'short', year:'numeric' }) : '-'
  if (loading) return <div className="qd-root"><style>{CSS}</style><div style={{padding:40,textAlign:'center',color:'#6b7280'}}>Loading...</div></div>
  if (error) return <div className="qd-root"><style>{CSS}</style><div className="qd-ctr"><div className="qd-err">{error}</div></div></div>
  if (!qt) return null
  return (
    <div className="qd-root">
      <style>{CSS}</style>
      <div className="qd-hdr">
        <button onClick={() => router.push('/qt')} className="qd-back">←</button>
        <span className="qd-hdr-t">NEXT GUARD | {qt.ref_number}</span>
        <span className="qd-badge" style={{background:STATUS_COLOR[qt.status]}}>{STATUS_LABEL[qt.status]}</span>
        <div className="qd-hdr-r">
          {qt.status==='draft' && <button onClick={() => updateStatus('sent')} disabled={statusUpdating} className="qd-b" style={{background:'#3b82f6'}}>Mark Sent</button>}
          {qt.status==='sent' && <button onClick={() => updateStatus('accepted')} disabled={statusUpdating} className="qd-b" style={{background:'#22c55e'}}>Accept</button>}
          {qt.status==='sent' && <button onClick={() => updateStatus('rejected')} disabled={statusUpdating} className="qd-b" style={{background:'#ef4444'}}>Reject</button>}
          {['draft','sent'].includes(qt.status) && <button onClick={() => updateStatus('cancelled')} disabled={statusUpdating} className="qd-b" style={{background:'#6b7280'}}>Cancel</button>}
          <button onClick={() => router.push(`/qt/${id}/pdf`)} className="qd-b" style={{background:'#374151'}}>PDF</button>
        </div>
      </div>
      <div className="qd-ctr">
        <div className="qd-g">
          <div className="qd-c">
            <div className="qd-ct">Customer Info</div>
            <div className="qd-row">
              <div className="qd-f"><span className="qd-l">Customer Type</span><div className="qd-v">{qt.customer_type==='partner'?'Partner':'End User'}</div></div>
              <div className="qd-f"><span className="qd-l">Customer Name</span><div className="qd-v">{qt.customer_name}</div></div>
              {qt.partner_name && <div className="qd-f"><span className="qd-l">Partner</span><div className="qd-v">{qt.partner_name}</div></div>}
              {qt.end_user_name && <div className="qd-f"><span className="qd-l">End User</span><div className="qd-v">{qt.end_user_name}</div></div>}
              {qt.project_name && <div className="qd-f"><span className="qd-l">Project</span><div className="qd-v">{qt.project_name}</div></div>}
            </div>
          </div>
          <div className="qd-c">
            <div className="qd-ct">Contract Terms</div>
            <div className="qd-row">
              <div className="qd-f"><span className="qd-l">Term</span><div className="qd-v">{qt.term_years} Year{qt.term_years>1?'s':''}</div></div>
              <div className="qd-f"><span className="qd-l">Payment</span><div className="qd-v">{qt.payment_model==='one_off'?'One-off Upfront':'Yearly'}</div></div>
              <div className="qd-f"><span className="qd-l">Currency</span><div className="qd-v">{qt.currency}</div></div>
              <div className="qd-f"><span className="qd-l">Validity</span><div className="qd-v">{qt.validity_days} days</div></div>
              <div className="qd-f"><span className="qd-l">Issue Date</span><div className="qd-v">{fmtDate(qt.created_at)}</div></div>
              <div className="qd-f"><span className="qd-l">Expiry Date</span><div className="qd-v">{fmtDate(qt.expires_at)}</div></div>
              <div className="qd-f"><span className="qd-l">Professional Services</span><div className="qd-v">{qt.include_ps?'Included':'Not Included'}</div></div>
              <div className="qd-f"><span className="qd-l">Annual Maintenance</span><div className="qd-v">{qt.include_annual_service?'Included':'Not Included'}</div></div>
            </div>
          </div>
        </div>
        <div className="qd-c">
          <div className="qd-ct">Product Lines</div>
          <div className="qd-tw">
            <table className="qd-tb">
              <thead><tr><th>Product</th><th>Site</th><th>Qty</th><th>Appliance</th><th>App Total</th><th>License/yr</th>{Array.from({length:qt.term_years},(_,i) => <th key={i}>Yr {i+1}</th>)}<th>Line Total</th><th>Incl?</th></tr></thead>
              <tbody>
                {lines.map((line: any) => (
                  <tr key={line.id}>
                    <td><div style={{fontWeight:500,color:'#f9fafb'}}>{line.description||line.product_code}</div><div style={{fontSize:11,color:'#6b7280'}}>{line.product_code}</div></td>
                    <td>{line.site_type}</td>
                    <td>{line.qty}</td>
                    <td>{fmt(line.appliance_unit_price)}</td>
                    <td>{fmt(line.appliance_total)}</td>
                    <td>{fmt(line.license_unit_price)}</td>
                    {Array.from({length:qt.term_years},(_,i) => <td key={i}>{fmt([line.year1_fee,line.year2_fee,line.year3_fee,line.year4_fee,line.year5_fee][i]||0)}</td>)}
                    <td>{line.is_included ? <span style={{color:'#22c55e'}}>Included</span> : fmt(line.line_total)}</td>
                    <td>{line.is_included ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="qd-g">
          <div className="qd-c">
            <div className="qd-ct">Pricing Summary</div>
            <div className="qd-sum">
              <div className="qd-sl">Appliance Total</div><div className="qd-v">{fmt(qt.appliance_total)}</div>
              <div className="qd-sl">License Total ({qt.term_years}yr)</div><div className="qd-v">{fmt(qt.license_total)}</div>
              {qt.service_total > 0 && <><div className="qd-sl">Service Total</div><div className="qd-v">{fmt(qt.service_total)}</div></>}
              <div className="qd-sl">Grand Total</div><div className="qd-v">{fmt(qt.grand_total)}</div>
              {qt.discount_amount > 0 && <><div className="qd-sl">Discount ({qt.discount_percent?.toFixed(1)}%)</div><div style={{color:'#ef4444'}}>-{fmt(qt.discount_amount)}</div></>}
              <div className="qd-fl">FINAL PRICE</div><div className="qd-fv">{fmt(qt.final_price)}</div>
            </div>
          </div>
          <div className="qd-c">
            <div className="qd-ct">Remarks</div>
            <div className="qd-rmk">{qt.remarks}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
