'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const PDF_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; background: #fff; color: #111; }
.pdf-wrap { max-width: 900px; margin: 0 auto; padding: 24px 20px; }
.no-print { margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; }
.pdf-doc { background: #fff; padding: 40px; border: 1px solid #e5e7eb; border-radius: 8px; }
.pdf-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; flex-wrap: wrap; gap: 16px; }
.pdf-logo { font-size: 22px; font-weight: 800; letter-spacing: 2px; color: #111; }
.pdf-logo span { color: #22c55e; }
.pdf-logo-sub { font-size: 11px; color: #6b7280; margin-top: 2px; }
.pdf-title-block { text-align: right; }
.pdf-title-block h2 { font-size: 22px; font-weight: 700; color: #111; letter-spacing: 1px; }
.pdf-title-block .ref { font-size: 13px; color: #6b7280; margin-top: 4px; }
.pdf-title-block .date { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.pdf-info { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px; }
.pdf-info-block h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
.pdf-info-block p { font-size: 13px; color: #374151; margin-bottom: 4px; }
.pdf-info-block strong { color: #111; }
.pdf-details { display: flex; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; background: #f9fafb; border-radius: 8px; padding: 14px 18px; }
.pdf-detail-item { font-size: 12px; color: #6b7280; }
.pdf-detail-item strong { color: #111; display: block; font-size: 13px; margin-bottom: 2px; }
.pdf-table-wrap { overflow-x: auto; margin-bottom: 24px; }
.pdf-table { width: 100%; border-collapse: collapse; font-size: 12px; min-width: 560px; }
.pdf-table th { text-align: left; padding: 8px 10px; background: #f3f4f6; color: #374151; font-weight: 600; border-bottom: 2px solid #e5e7eb; white-space: nowrap; }
.pdf-table td { padding: 8px 10px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: middle; }
.pdf-table tr:last-child td { border-bottom: none; }
.pdf-table .incl { color: #22c55e; font-weight: 600; }
.pdf-totals { display: flex; justify-content: flex-end; margin-bottom: 28px; }
.pdf-totals-box { width: 100%; max-width: 340px; }
.pdf-totals-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #374151; border-bottom: 1px solid #f3f4f6; }
.pdf-totals-row.final { border-top: 2px solid #111; border-bottom: 2px solid #111; margin-top: 4px; padding: 8px 0; }
.pdf-totals-row.final span:first-child { font-weight: 700; font-size: 14px; color: #111; }
.pdf-totals-row.final span:last-child { font-weight: 800; font-size: 16px; color: #22c55e; }
.pdf-remarks { margin-bottom: 28px; }
.pdf-remarks h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; margin-bottom: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
.pdf-remarks p { font-size: 12px; color: #374151; line-height: 1.7; white-space: pre-wrap; }
.pdf-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #e5e7eb; padding-top: 12px; flex-wrap: wrap; gap: 8px; }
.pdf-footer p { font-size: 11px; color: #9ca3af; }
@media (max-width: 640px) {
  .pdf-doc { padding: 20px 16px; }
  .pdf-header { flex-direction: column; }
  .pdf-title-block { text-align: left; }
  .pdf-info { grid-template-columns: 1fr; gap: 16px; }
  .pdf-details { gap: 12px; }
  .pdf-wrap { padding: 16px 10px; }
  .pdf-totals-box { max-width: 100%; }
}
@media print {
  .no-print { display: none !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .pdf-doc { border: none; padding: 0; }
  .pdf-wrap { padding: 0; }
}
@page { margin: 15mm; size: A4; }
`

export default function QuotationPDF() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [qt, setQt] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
    const [logoSrc, setLogoSrc] = useState('/images/nextguard-logo.png')

    useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const c = document.createElement('canvas')
      c.width = img.width; c.height = img.height
      const ctx = c.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      const d = ctx.getImageData(0, 0, c.width, c.height)
      for (let i = 0; i < d.data.length; i += 4) {
        const r = d.data[i], g = d.data[i+1], b = d.data[i+2]
        if (r < 30 && g < 30 && b < 30) { d.data[i+3] = 0 } else if (r > 200 && g > 200 && b > 200) { d.data[i] = 17; d.data[i+1] = 24; d.data[i+2] = 39 }
      }
      ctx.putImageData(d, 0, 0)
      setLogoSrc(c.toDataURL('image/png'))
    }
    img.src = '/images/nextguard-logo.png'
  }, [])

  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) router.replace('/qt-login')
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  useEffect(() => {
    if (!id) return
    fetch(`/api/qt-quotations/${id}`).then(r => r.json()).then(d => {
      if (d?.quotation) { setQt(d.quotation); setLines(d.lines || []) }
    }).finally(() => setLoading(false))
  }, [id])

  const fmt = (n: number, c = qt?.currency || 'HKD') =>
    new Intl.NumberFormat('en-HK', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', {
    day: '2-digit', month: 'short', year: 'numeric'
  }) : '-'

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',fontFamily:'system-ui',color:'#6b7280'}}>Loading...</div>
  if (!qt) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',fontFamily:'system-ui',color:'#6b7280'}}>Quotation not found</div>

  return (
    <>
      <style>{PDF_CSS}</style>
      <div className="pdf-wrap">
        <div className="no-print">
          <button onClick={() => router.push(`/qt/${id}`)} style={{background:'#374151',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>{'\u2190'} Back to Detail</button>
          <button onClick={() => window.print()} style={{background:'#3b82f6',color:'#fff',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>Print / Save PDF</button>
        </div>

        <div className="pdf-doc">
          <div className="pdf-header">
            <div>
              <img src={logoSrc} alt="NextGuard" style={{height:'40px'}} />
              <div className="pdf-logo-sub">NextGuard Technology Limited</div>
              <div className="pdf-logo-sub">Re-think Data Security</div>
            </div>
            <div className="pdf-title-block">
              <h2>QUOTATION</h2>
              <div className="ref">{qt.ref_number}</div>
              <div className="date">Date: {fmtDate(qt.created_at)}</div>
              <div className="date">Valid until: {fmtDate(qt.expires_at)}</div>
            </div>
          </div>

          <div className="pdf-info">
            <div className="pdf-info-block">
              <h3>Bill To</h3>
              <p><strong>{qt.customer_name}</strong></p>
              {qt.partner_name && <p>Partner: {qt.partner_name}</p>}
              {qt.end_user_name && <p>End User: {qt.end_user_name}</p>}
              {qt.project_name && <p>Project: {qt.project_name}</p>}
            </div>
            <div className="pdf-info-block">
              <h3>Details</h3>
              <p>Type: <strong>{qt.customer_type === 'partner' ? 'Partner' : 'End User'}</strong></p>
              <p>Term: <strong>{qt.term_years} Year{qt.term_years > 1 ? 's' : ''}</strong></p>
              <p>Payment: <strong>{qt.payment_model === 'one_off' ? 'One-off Upfront' : 'Annual'}</strong></p>
              <p>Currency: <strong>{qt.currency}</strong></p>
            </div>
          </div>

          <div className="pdf-table-wrap">
            <table className="pdf-table">
              <thead><tr>
                <th>#</th><th>Description</th><th>Site</th><th>Qty</th>
                <th>Appliance</th><th>App Total</th><th>License/yr</th>
                {Array.from({length:qt.term_years},(_,i) => <th key={i}>Yr {i+1}</th>)}
                <th>Total</th>
              </tr></thead>
              <tbody>
                {lines.map((line: any, idx: number) => (
                  <tr key={line.id||idx}>
                    <td>{idx+1}</td>
                    <td>
                      <div style={{fontWeight:600}}>{line.description||line.product_code}</div>
                      {line.product_code && line.description && <div style={{fontSize:11,color:'#9ca3af'}}>{line.product_code}</div>}
                      {line.notes && <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{line.notes}</div>}
                    </td>
                    <td>{line.site_type}</td>
                    <td>{line.qty}</td>
                    <td>{fmt(line.appliance_unit_price)}</td>
                    <td>{fmt(line.appliance_total)}</td>
                    <td>{fmt(line.license_unit_price)}</td>
                    {Array.from({length:qt.term_years},(_,i) => <td key={i}>{fmt([line.year1_fee,line.year2_fee,line.year3_fee,line.year4_fee,line.year5_fee][i]||0)}</td>)}
                    <td>{line.is_included ? <span className="incl">Included</span> : fmt(line.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pdf-totals">
            <div className="pdf-totals-box">
              <div className="pdf-totals-row"><span>Appliance Total</span><span>{fmt(qt.appliance_total)}</span></div>
              <div className="pdf-totals-row"><span>License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span></div>
              {qt.service_total > 0 && <div className="pdf-totals-row"><span>Service Total</span><span>{fmt(qt.service_total)}</span></div>}
              <div className="pdf-totals-row"><span>Grand Total</span><span>{fmt(qt.grand_total)}</span></div>
              {qt.discount_amount > 0 && <div className="pdf-totals-row"><span>Discount ({qt.discount_percent?.toFixed(1)}%)</span><span>-{fmt(qt.discount_amount)}</span></div>}
              <div className="pdf-totals-row final"><span>TOTAL ({qt.currency})</span><span>{fmt(qt.final_price)}</span></div>
            </div>
          </div>

          {qt.remarks && (
            <div className="pdf-remarks">
              <h3>Terms &amp; Conditions</h3>
              <p>{qt.remarks}</p>
            </div>
          )}

          <div className="pdf-footer">
            <p>NextGuard Technology Limited | Confidential</p>
            <p>{qt.ref_number} | Page 1 of 1</p>
          </div>
        </div>
      </div>
    </>
  )
}
