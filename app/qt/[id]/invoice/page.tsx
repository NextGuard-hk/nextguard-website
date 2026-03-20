'use client'
import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

const COMPANY = {
  name: 'NextGuard Technology Limited',
  addr1: 'Unit 1203, 12/F, Tower 1',
  addr2: 'Cheung Sha Wan Plaza, 833 Cheung Sha Wan Road',
  addr3: 'Kowloon, Hong Kong',
  phone: '+852 3618 7578',
  email: 'info@next-guard.com',
  web: 'www.next-guard.com',
  brn: '76561484-000-01-26-4',
  bank: 'HSBC Hong Kong',
  bankAddr: '1 Queen\'s Road Central, Hong Kong',
  bankAccName: 'NextGuard Technology Limited',
  bankAccNo: '808-779788-838',
  bankSwift: 'HSBCHKHHHKH',
  bankCode: '004',
}

const INV_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #1a1a1a; }
.inv-wrap { max-width: 900px; margin: 0 auto; padding: 24px 20px; }
.no-print { margin-bottom: 16px; display: flex; gap: 8px; flex-wrap: wrap; }
.inv-doc { background: #fff; padding: 48px 44px; border: 1px solid #d1d5db; border-radius: 4px; position: relative; }
.inv-watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-35deg); font-size: 120px; font-weight: 900; color: rgba(34,197,94,0.08); letter-spacing: 12px; pointer-events: none; z-index: 0; }
.inv-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 3px solid #111; }
.inv-logo-section img { height: 50px; filter: invert(1) grayscale(1); }
.inv-logo-sub { font-size: 10px; color: #6b7280; margin-top: 4px; letter-spacing: 0.5px; }
.inv-title-section { text-align: right; }
.inv-title-section h1 { font-size: 32px; font-weight: 800; letter-spacing: 3px; color: #111; margin-bottom: 6px; }
.inv-title-section .inv-number { font-size: 14px; font-weight: 600; color: #374151; }
.inv-title-section .inv-date-line { font-size: 12px; color: #6b7280; margin-top: 2px; }
.inv-parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 28px; }
.inv-party h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 10px; }
.inv-party p { font-size: 12px; color: #374151; margin-bottom: 3px; line-height: 1.5; }
.inv-party strong { color: #111; font-size: 13px; }
.inv-meta-row { display: flex; gap: 20px; flex-wrap: wrap; margin-bottom: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px 16px; }
.inv-meta-item { font-size: 11px; color: #6b7280; }
.inv-meta-item strong { display: block; font-size: 12px; color: #111; margin-bottom: 1px; }
.inv-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 24px; }
.inv-table thead th { text-align: left; padding: 10px 12px; background: #111; color: #fff; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.inv-table thead th:last-child, .inv-table thead th:nth-child(6), .inv-table thead th:nth-child(7), .inv-table thead th:nth-child(8) { text-align: right; }
.inv-table tbody td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; color: #374151; vertical-align: top; }
.inv-table tbody td:last-child, .inv-table tbody td:nth-child(4), .inv-table tbody td:nth-child(5), .inv-table tbody td:nth-child(6) { text-align: right; font-variant-numeric: tabular-nums; }
.inv-table tbody tr:last-child td { border-bottom: 2px solid #111; }
.inv-desc-main { font-weight: 500; color: #111; }
.inv-desc-sub { font-size: 11px; color: #6b7280; }
.inv-totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
.inv-totals-box { width: 320px; }
.inv-totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; color: #374151; }
.inv-totals-row.final { border-top: 2px solid #111; margin-top: 6px; padding-top: 10px; }
.inv-totals-row.final span:first-child { font-weight: 800; font-size: 14px; color: #111; text-transform: uppercase; }
.inv-totals-row.final span:last-child { font-weight: 800; font-size: 18px; color: #111; }
.inv-payment { margin-bottom: 28px; padding: 16px 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; }
.inv-payment h3 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #374151; margin-bottom: 10px; }
.inv-payment-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 24px; }
.inv-payment-item { font-size: 11px; color: #6b7280; display: flex; gap: 6px; }
.inv-payment-item strong { color: #111; min-width: 100px; }
.inv-notes { margin-bottom: 28px; }
.inv-notes h3 { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #9ca3af; margin-bottom: 8px; }
.inv-notes p { font-size: 11px; color: #6b7280; line-height: 1.6; }
.inv-footer { border-top: 1px solid #e5e7eb; padding-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; flex-wrap: wrap; gap: 8px; }
.inv-footer p { font-size: 10px; color: #9ca3af; }
.inv-footer .inv-sig { text-align: right; }
.inv-footer .inv-sig-line { border-top: 1px solid #374151; width: 180px; margin-top: 40px; padding-top: 4px; font-size: 10px; color: #6b7280; text-align: center; }
@media print {
  .no-print { display: none !important; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .inv-doc { border: none; padding: 0; box-shadow: none; }
  .inv-wrap { padding: 0; }
}
@page { margin: 12mm; size: A4; }
@media (max-width: 640px) {
  .inv-doc { padding: 24px 16px; }
  .inv-parties { grid-template-columns: 1fr; gap: 16px; }
  .inv-payment-grid { grid-template-columns: 1fr; }
  .inv-totals-box { width: 100%; }
  .inv-title-section h1 { font-size: 24px; }
}
`

function generateInvoiceNumber(refNumber: string): string {
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`
  const seq = refNumber ? refNumber.replace(/\D/g,'').slice(-4) : '0001'
  return `INV-${ymd}-${seq}`
}

export default function InvoicePDF() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [qt, setQt] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [paymentTerms, setPaymentTerms] = useState(30)

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
    new Intl.NumberFormat('en-HK', { style: 'currency', currency: c, minimumFractionDigits: 2 }).format(n)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'
  const addDays = (d: string, days: number) => {
    const dt = new Date(d); dt.setDate(dt.getDate() + days); return dt.toISOString()
  }

  if (loading) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#fff',fontFamily:'sans-serif',color:'#666'}}>Loading...</div>
  if (!qt) return <div style={{display:'flex',justifyContent:'center',alignItems:'center',minHeight:'100vh',background:'#fff',fontFamily:'sans-serif',color:'#666'}}>Quotation not found</div>

  const invoiceNumber = generateInvoiceNumber(qt.ref_number)
  const invoiceDate = qt.created_at
  const dueDate = addDays(qt.created_at, paymentTerms)

  return (
    <>
      <style>{INV_CSS}</style>
      <div className="inv-wrap">
        <div className="no-print">
          <button onClick={() => router.push(`/qt/${id}`)} style={{background:'#374151',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>{'\u2190'} Back to Detail</button>
          <button onClick={() => router.push(`/qt/${id}/pdf`)} style={{background:'#6b7280',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontSize:13,cursor:'pointer'}}>View Quotation</button>
          <button onClick={() => window.print()} style={{background:'#111',color:'#fff',border:'none',borderRadius:6,padding:'8px 16px',fontSize:13,cursor:'pointer',fontWeight:600}}>Print / Save Invoice</button>
          <select value={paymentTerms} onChange={e => setPaymentTerms(Number(e.target.value))} style={{background:'#f3f4f6',border:'1px solid #d1d5db',borderRadius:6,padding:'8px 12px',fontSize:13,color:'#111'}}>
            <option value={7}>Net 7 Days</option>
            <option value={14}>Net 14 Days</option>
            <option value={30}>Net 30 Days</option>
            <option value={60}>Net 60 Days</option>
            <option value={90}>Net 90 Days</option>
          </select>
        </div>

        <div className="inv-doc">
          <div className="inv-watermark">INVOICE</div>

          {/* === HEADER === */}
          <div className="inv-header">
            <div className="inv-logo-section">
              <img src="/images/nextguard-logo.png" alt="NextGuard" />
              <div className="inv-logo-sub">{COMPANY.name}</div>
            </div>
            <div className="inv-title-section">
              <h1>INVOICE</h1>
              <div className="inv-number">{invoiceNumber}</div>
              <div className="inv-date-line">Date: {fmtDate(invoiceDate)}</div>
              <div className="inv-date-line">Due: {fmtDate(dueDate)}</div>
            </div>
          </div>

          {/* === FROM / BILL TO === */}
          <div className="inv-parties">
            <div className="inv-party">
              <h3>From</h3>
              <p><strong>{COMPANY.name}</strong></p>
              <p>{COMPANY.addr1}</p>
              <p>{COMPANY.addr2}</p>
              <p>{COMPANY.addr3}</p>
              <p>{COMPANY.phone}</p>
              <p>{COMPANY.email}</p>
              <p style={{marginTop:4,fontSize:11,color:'#9ca3af'}}>BRN: {COMPANY.brn}</p>
            </div>
            <div className="inv-party">
              <h3>Bill To</h3>
              <p><strong>{qt.customer_name}</strong></p>
              {qt.partner_name && <p>Partner: {qt.partner_name}</p>}
              {qt.end_user_name && <p>End User: {qt.end_user_name}</p>}
              {qt.project_name && <p>Project: {qt.project_name}</p>}
              <p style={{marginTop:6,fontSize:11,color:'#9ca3af'}}>Ref: {qt.ref_number}</p>
            </div>
          </div>

          {/* === META ROW === */}
          <div className="inv-meta-row">
            <div className="inv-meta-item"><strong>Payment Terms</strong>Net {paymentTerms} Days</div>
            <div className="inv-meta-item"><strong>Currency</strong>{qt.currency}</div>
            <div className="inv-meta-item"><strong>Term</strong>{qt.term_years} Year{qt.term_years > 1 ? 's' : ''}</div>
            <div className="inv-meta-item"><strong>Payment Model</strong>{qt.payment_model === 'one_off' ? 'One-off Upfront' : 'Annual'}</div>
            <div className="inv-meta-item"><strong>Customer Type</strong>{qt.customer_type === 'partner' ? 'Partner' : 'End User'}</div>
          </div>

          {/* === LINE ITEMS TABLE === */}
          <table className="inv-table">
            <thead>
              <tr>
                <th style={{width:'5%'}}>#</th>
                <th style={{width:'40%'}}>Product</th>
                                    <th style={{width:'10%'}}>SKU</th><th style={{width:'8%'}}>Site</th>
                <th style={{width:'8%'}}>Qty</th>
                <th style={{width:'15%'}}>Appliance</th>
                <th style={{width:'15%'}}>License/yr</th>
                <th style={{width:'17%'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line: any, idx: number) => (
                <tr key={line.id || idx}>
                  <td>{idx + 1}</td>
                  <td>
                    <div className="inv-desc-main">{line.description || line.product_code}</div>
                    {line.product_code && line.description && <div className="inv-desc-sub">{line.product_code}</div>}
                    {line.notes && <div className="inv-desc-sub">{line.notes}</div>}
                     
                  </td>
                  <td>{line.sku || '-'}</td><td>{line.site_type}</td><td>{line.qty}</td>
                  <td>{fmt(line.appliance_unit_price)}</td>
                  <td>{fmt(line.license_unit_price)}</td>
                  <td>{line.is_included ? <em style={{color:'#22c55e',fontWeight:600}}>Included</em> : fmt(line.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* === TOTALS === */}
          <div className="inv-totals">
            <div className="inv-totals-box">
              <div className="inv-totals-row"><span>Appliance Total</span><span>{fmt(qt.appliance_total)}</span></div>
              <div className="inv-totals-row"><span>License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span></div>
              {qt.service_total > 0 && <div className="inv-totals-row"><span>Service Total</span><span>{fmt(qt.service_total)}</span></div>}
              <div className="inv-totals-row"><span>Subtotal</span><span>{fmt(qt.grand_total)}</span></div>
              {qt.discount_amount > 0 && <div className="inv-totals-row"><span>Discount ({qt.discount_percent?.toFixed(1)}%)</span><span>-{fmt(qt.discount_amount)}</span></div>}
              <div className="inv-totals-row final"><span>Total Due ({qt.currency})</span><span>{fmt(qt.final_price)}</span></div>
            </div>
          </div>

          {/* === PAYMENT DETAILS === */}
          <div className="inv-payment">
            <h3>Payment Information</h3>
            <div className="inv-payment-grid">
              <div className="inv-payment-item"><strong>Bank Name</strong>{COMPANY.bank}</div>
              <div className="inv-payment-item"><strong>Bank Address</strong>{COMPANY.bankAddr}</div>
              <div className="inv-payment-item"><strong>Account Name</strong>{COMPANY.bankAccName}</div>
              <div className="inv-payment-item"><strong>Account No.</strong>{COMPANY.bankAccNo}</div>
              <div className="inv-payment-item"><strong>SWIFT Code</strong>{COMPANY.bankSwift}</div>
              <div className="inv-payment-item"><strong>Bank Code</strong>{COMPANY.bankCode}</div>
            </div>
          </div>

          {/* === NOTES === */}
          <div className="inv-notes">
            <h3>Terms & Conditions</h3>
            <p>1. Payment is due within {paymentTerms} days from the date of this invoice.</p>
            <p>2. Please include the invoice number ({invoiceNumber}) as payment reference.</p>
            <p>3. Late payments may be subject to a 1.5% monthly finance charge.</p>
            <p>4. This invoice is generated from Quotation {qt.ref_number}.</p>
            <p>5. All prices are in {qt.currency} and exclusive of any applicable taxes unless stated otherwise.</p>
          </div>

          {/* === FOOTER === */}
          <div className="inv-footer">
            <div>
              <p>{COMPANY.name} | {COMPANY.web}</p>
              <p>BRN: {COMPANY.brn}</p>
              <p>{invoiceNumber} | Page 1 of 1</p>
            </div>
            <div className="inv-sig">
              <div className="inv-sig-line">Authorized Signature</div>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
