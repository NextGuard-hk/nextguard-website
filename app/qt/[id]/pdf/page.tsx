'use client'
import React, { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function QuotationPDF() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [qt, setQt] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

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
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Loading...</div>
  if (!qt) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>Quotation not found</div>

  return (
    <>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        @page { margin: 15mm; size: A4; }
      `}</style>

      <div className='no-print' style={{ background: '#0a0e17', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => router.push(`/qt/${id}`)} style={{ background: '#374151', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Back to Detail</button>
        <button onClick={() => window.print()} style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer' }}>Print / Save PDF</button>
      </div>

      <div style={{ maxWidth: 850, margin: '0 auto', padding: '32px 24px', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111', background: '#fff', minHeight: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#111' }}>NEXT GUARD</h1>
            <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>NextGuard Technology Limited</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Secure Your Digital Frontier</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#111' }}>QUOTATION</h2>
            <div style={{ fontSize: 14, color: '#333', marginTop: 4, fontWeight: 600 }}>{qt.ref_number}</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Date: {fmtDate(qt.created_at)}</div>
            <div style={{ fontSize: 12, color: '#666' }}>Valid until: {fmtDate(qt.expires_at)}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 8, letterSpacing: 1 }}>Bill To</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{qt.customer_name}</div>
            {qt.partner_name && <div style={{ fontSize: 12, color: '#555' }}>Partner: {qt.partner_name}</div>}
            {qt.end_user_name && <div style={{ fontSize: 12, color: '#555' }}>End User: {qt.end_user_name}</div>}
            {qt.project_name && <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Project: {qt.project_name}</div>}
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 8, letterSpacing: 1 }}>Details</div>
            <div style={{ fontSize: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              <span style={{ color: '#888' }}>Type:</span><span>{qt.customer_type === 'partner' ? 'Partner' : 'End User'}</span>
              <span style={{ color: '#888' }}>Term:</span><span>{qt.term_years} Year{qt.term_years > 1 ? 's' : ''}</span>
              <span style={{ color: '#888' }}>Payment:</span><span>{qt.payment_model === 'one_off' ? 'One-off' : 'Annual'}</span>
              <span style={{ color: '#888' }}>Currency:</span><span>{qt.currency}</span>
            </div>
          </div>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24, fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Item</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Description</th>
              <th style={{ textAlign: 'center', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Site</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Qty</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Appliance Unit</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Appliance Total</th>
              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>License/yr</th>
              {Array.from({ length: qt.term_years }, (_, i) => (
                <th key={i} style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Yr {i + 1}</th>
              ))}
              <th style={{ textAlign: 'right', padding: '8px 10px', borderBottom: '2px solid #d1d5db' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line: any, idx: number) => (
              <tr key={line.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 10px' }}>{idx + 1}</td>
                <td style={{ padding: '8px 10px' }}>
                  <div style={{ fontWeight: 500 }}>{line.description || line.product_code}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{line.product_code}</div>
                  {line.notes && <div style={{ fontSize: 10, color: '#666', fontStyle: 'italic' }}>{line.notes}</div>}
                </td>
                <td style={{ padding: '8px 10px', textAlign: 'center', textTransform: 'capitalize' }}>{line.site_type}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{line.qty}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(line.appliance_unit_price)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(line.appliance_total)}</td>
                <td style={{ padding: '8px 10px', textAlign: 'right' }}>{fmt(line.license_unit_price)}</td>
                {Array.from({ length: qt.term_years }, (_, i) => (
                  <td key={i} style={{ padding: '8px 10px', textAlign: 'right' }}>
                    {fmt([line.year1_fee, line.year2_fee, line.year3_fee, line.year4_fee, line.year5_fee][i] || 0)}
                  </td>
                ))}
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600 }}>
                  {line.is_included ? <span style={{ color: '#888' }}>Included</span> : fmt(line.line_total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24 }}>
          <div style={{ width: 320, border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Appliance Total</span><span>{fmt(qt.appliance_total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
              <span style={{ color: '#666' }}>License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span>
            </div>
            {qt.service_total > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ color: '#666' }}>Service Total</span><span>{fmt(qt.service_total)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
              <span style={{ color: '#666' }}>Grand Total</span><span>{fmt(qt.grand_total)}</span>
            </div>
            {qt.discount_amount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', fontSize: 12 }}>
                <span style={{ color: '#666' }}>Discount ({qt.discount_percent?.toFixed(1)}%)</span><span style={{ color: '#dc2626' }}>-{fmt(qt.discount_amount)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#f3f4f6', fontWeight: 700, fontSize: 15 }}>
              <span>TOTAL ({qt.currency})</span><span>{fmt(qt.final_price)}</span>
            </div>
          </div>
        </div>

        {qt.remarks && (
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#666', marginBottom: 8, letterSpacing: 1 }}>Terms & Conditions</div>
            <pre style={{ fontSize: 11, color: '#555', whiteSpace: 'pre-wrap', margin: 0, lineHeight: 1.6 }}>{qt.remarks}</pre>
          </div>
        )}

        <div style={{ marginTop: 48, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#999' }}>
          <div>NextGuard Technology Limited | Confidential</div>
          <div>{qt.ref_number} | Page 1 of 1</div>
        </div>
      </div>
    </>
  )
}
