'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const STATUS_COLOR: Record<string,string> = {
  draft:'#6b7280', sent:'#3b82f6', accepted:'#22c55e',
  rejected:'#ef4444', expired:'#f59e0b', cancelled:'#9ca3af'
}
const STATUS_LABEL: Record<string,string> = {
  draft:'Draft', sent:'Sent', accepted:'Accepted',
  rejected:'Rejected', expired:'Expired', cancelled:'Cancelled'
}

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
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) router.replace('/qt-login')
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetch(`/api/qt-quotations/${id}`).then(r => {
      if (r.status === 401) { router.replace('/qt-login'); return r.json() }
      if (r.status === 404) { setError('Quotation not found'); return r.json() }
      return r.json()
    }).then(d => {
      if (d?.quotation) {
        setQt(d.quotation)
        setLines(d.lines || [])
      }
    }).catch(e => setError(e.message))
    .finally(() => setLoading(false))
  }, [id, router])

  async function updateStatus(status: string) {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/qt-quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const d = await res.json()
      if (d.quotation) setQt(d.quotation)
    } catch (e: any) {
      setError(e.message)
    } finally { setStatusUpdating(false) }
  }

  const fmt = (n: number, c = qt?.currency || 'HKD') =>
    new Intl.NumberFormat('en-HK', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  const card = { background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginBottom: 16 }
  const lbl = { color: '#9ca3af', fontSize: 12, marginBottom: 2, display: 'block' as const }
  const val = { color: '#f9fafb', fontSize: 14 }
  const btn = (color: string) => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' })

  if (loading) return <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#9ca3af', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Loading...</div>
  if (error) return <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>{error}</div>
  if (!qt) return null

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#0d1117', borderBottom: '1px solid #1f2937', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56 }}>
        <button onClick={() => router.push('/qt')} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 20, marginRight: 12 }}>&#8592;</button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>NEXT GUARD &nbsp;|&nbsp; {qt.ref_number}</span>
        <span style={{ marginLeft: 12, background: STATUS_COLOR[qt.status]+'33', color: STATUS_COLOR[qt.status], borderRadius: 6, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{STATUS_LABEL[qt.status]}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {qt.status === 'draft' && <button onClick={() => updateStatus('sent')} disabled={statusUpdating} style={btn('#3b82f6')}>Mark Sent</button>}
          {qt.status === 'sent' && <button onClick={() => updateStatus('accepted')} disabled={statusUpdating} style={btn('#22c55e')}>Mark Accepted</button>}
          {qt.status === 'sent' && <button onClick={() => updateStatus('rejected')} disabled={statusUpdating} style={btn('#ef4444')}>Mark Rejected</button>}
          {['draft','sent'].includes(qt.status) && <button onClick={() => updateStatus('cancelled')} disabled={statusUpdating} style={btn('#6b7280')}>Cancel</button>}
          <button onClick={() => router.push(`/qt/${id}/pdf`)} style={btn('#374151')}>View PDF</button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Customer Info</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={lbl}>Customer Type</span><span style={val}>{qt.customer_type === 'partner' ? 'Partner' : 'End User'}</span></div>
              <div><span style={lbl}>Customer Name</span><span style={val}>{qt.customer_name}</span></div>
              {qt.partner_name && <div><span style={lbl}>Partner</span><span style={val}>{qt.partner_name}</span></div>}
              {qt.end_user_name && <div><span style={lbl}>End User</span><span style={val}>{qt.end_user_name}</span></div>}
              {qt.project_name && <div style={{ gridColumn: 'span 2' }}><span style={lbl}>Project</span><span style={val}>{qt.project_name}</span></div>}
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Contract Terms</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={lbl}>Term</span><span style={val}>{qt.term_years} Year{qt.term_years > 1 ? 's' : ''}</span></div>
              <div><span style={lbl}>Payment</span><span style={val}>{qt.payment_model === 'one_off' ? 'One-off Upfront' : 'Yearly'}</span></div>
              <div><span style={lbl}>Currency</span><span style={val}>{qt.currency}</span></div>
              <div><span style={lbl}>Validity</span><span style={val}>{qt.validity_days} days</span></div>
              <div><span style={lbl}>Issue Date</span><span style={val}>{fmtDate(qt.created_at)}</span></div>
              <div><span style={lbl}>Expiry Date</span><span style={val}>{fmtDate(qt.expires_at)}</span></div>
              <div><span style={lbl}>Professional Services</span><span style={val}>{qt.include_ps ? 'Included' : 'Not Included'}</span></div>
              <div><span style={lbl}>Annual Maintenance</span><span style={val}>{qt.include_annual_service ? 'Included' : 'Not Included'}</span></div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Product Lines</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151', color: '#9ca3af' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '6px 8px' }}>Site Type</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Appliance Unit</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Appliance Total</th>
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>License/yr Unit</th>
                  {Array.from({length: qt.term_years}, (_, i) => <th key={i} style={{ textAlign: 'right', padding: '6px 8px' }}>Yr {i+1} Fee</th>)}
                  <th style={{ textAlign: 'right', padding: '6px 8px' }}>Line Total</th>
                  <th style={{ textAlign: 'center', padding: '6px 8px' }}>Incl?</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '8px', fontWeight: 500 }}>
                      <div>{line.description || line.product_code}</div>
                      <div style={{ color: '#6b7280', fontSize: 11 }}>{line.product_code}</div>
                    </td>
                    <td style={{ padding: '8px', color: '#9ca3af', textTransform: 'capitalize' }}>{line.site_type}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{line.qty}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(line.appliance_unit_price)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(line.appliance_total)}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{fmt(line.license_unit_price)}</td>
                    {Array.from({length: qt.term_years}, (_, i) => (
                      <td key={i} style={{ padding: '8px', textAlign: 'right' }}>{fmt([line.year1_fee,line.year2_fee,line.year3_fee,line.year4_fee,line.year5_fee][i]||0)}</td>
                    ))}
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600 }}>{line.is_included ? <span style={{ color: '#6b7280' }}>Included</span> : fmt(line.line_total)}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{line.is_included ? '✓' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Pricing Summary</div>
            <div style={{ fontSize: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ color: '#9ca3af' }}>Appliance Total</span><span>{fmt(qt.appliance_total)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ color: '#9ca3af' }}>License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span>
              </div>
              {qt.service_total > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                  <span style={{ color: '#9ca3af' }}>Service Total</span><span>{fmt(qt.service_total)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                <span style={{ color: '#9ca3af' }}>Grand Total</span><span>{fmt(qt.grand_total)}</span>
              </div>
              {qt.discount_amount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #1f2937' }}>
                  <span style={{ color: '#9ca3af' }}>Discount ({qt.discount_percent?.toFixed(1)}%)</span>
                  <span style={{ color: '#ef4444' }}>-{fmt(qt.discount_amount)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', marginTop: 4 }}>
                <span style={{ fontWeight: 700, fontSize: 16 }}>FINAL PRICE</span>
                <span style={{ fontWeight: 700, fontSize: 18, color: '#22c55e' }}>{fmt(qt.final_price)}</span>
              </div>
            </div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Remarks</div>
            <pre style={{ color: '#9ca3af', fontSize: 12, whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{qt.remarks}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
