'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'

interface Category { id: string; name: string; code_prefix: string; sort_order: number }
interface Product {
  id: string; code: string; name: string; type: string
  category_id: string; description: string; sort_order: number
  prices: { term_years: number; appliance_unit_price: number; license_unit_price: number; min_qty: number }[]
}
interface LineItem {
  id: string; productId: string; productCode: string; description: string
  categoryId: string; siteType: string; qty: number
  applianceUnitPrice: number; licenseUnitPrice: number
  isIncluded: boolean; notes: string
}

function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), productId: '', productCode: '', description: '', categoryId: '', siteType: 'production', qty: 1, applianceUnitPrice: 0, licenseUnitPrice: 0, isIncluded: false, notes: '' }
}

const STATUS_COLOR: Record<string,string> = {
  draft:'#6b7280', sent:'#3b82f6', accepted:'#22c55e',
  rejected:'#ef4444', expired:'#f59e0b', cancelled:'#9ca3af'
}
const STATUS_LABEL: Record<string,string> = {
  draft:'Draft', sent:'Sent', accepted:'Accepted',
  rejected:'Rejected', expired:'Expired', cancelled:'Cancelled'
}
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
.qd-i{background:#111827;border:1px solid #1f2937;border-radius:8px;color:#e0e0e0;padding:9px 12px;font-size:14px;outline:none;width:100%;box-sizing:border-box}
.qd-i:focus{border-color:#374151}
.qd-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qd-chk{display:flex;gap:20px;margin-top:12px;flex-wrap:wrap}
.qd-cl{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px}
.qd-ti{background:#111827;border:1px solid #1f2937;border-radius:6px;color:#e0e0e0;padding:6px 8px;font-size:13px;width:100%}
.qd-rb{background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px}
.qd-ml{display:none}
.qd-mc{background:#111827;border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid #1f2937}
.qd-mc-row{display:flex;justify-content:space-between;padding:4px 0;font-size:13px}
.qd-mc-label{color:#9ca3af}
.qd-mc-val{color:#f9fafb;font-weight:500}
.qd-mc-title{color:#f9fafb;font-weight:600;font-size:14px;margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid #1f2937}
.qd-sum-mobile{display:none}
@media(max-width:768px){
.qd-hdr{padding:10px 12px}
.qd-hdr-r{width:100%;justify-content:flex-start;overflow-x:auto;padding-bottom:4px}
.qd-ctr{padding:12px 8px}
.qd-g{grid-template-columns:1fr}
.qd-row{grid-template-columns:1fr 1fr}
.qd-c{padding:14px}
.qd-b{padding:6px 12px;font-size:12px}
.qd-tb{min-width:500px}
.qd-tw{display:none}
.qd-ml{display:block}
.qd-sum{display:none}
.qd-sum-mobile{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:14px}
}
@media(max-width:480px){
.qd-row{grid-template-columns:1fr}
.qd-hdr-t{font-size:13px}
.qd-b{padding:5px 10px;font-size:11px}
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
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  // Edit form state
  const [eCustomerName, setECustomerName] = useState('')
  const [ePartnerName, setEPartnerName] = useState('')
  const [eEndUserName, setEEndUserName] = useState('')
  const [eProjectName, setEProjectName] = useState('')
  const [eCustomerType, setECustomerType] = useState<'partner'|'end_user'>('end_user')
  const [eTermYears, setETermYears] = useState(1)
  const [ePaymentModel, setEPaymentModel] = useState<'one_off'|'yearly'>('one_off')
  const [eCurrency, setECurrency] = useState('HKD')
  const [eIncludePs, setEIncludePs] = useState(false)
  const [eIncludeAnnualService, setEIncludeAnnualService] = useState(true)
  const [eValidityDays, setEValidityDays] = useState(30)
  const [eLeadTime, setELeadTime] = useState('2-6 weeks')
  const [eDeliveryLocation, setEDeliveryLocation] = useState('Customer Site')
  const [eDiscountPercent, setEDiscountPercent] = useState(0)
  const [eTargetPrice, setETargetPrice] = useState('')
  const [eRemarks, setERemarks] = useState('')
  const [eLines, setELines] = useState<LineItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])

  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) router.replace('/qt-login')
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  useEffect(() => {
    if (!id) return;
    setLoading(true)
    fetch(`/api/qt-quotations/${id}`).then(r => {
      if (r.status===401) { router.replace('/qt-login'); return r.json() }
      if (r.status===404) { setError('Quotation not found'); return r.json() }
      return r.json()
    }).then(d => {
      if (d?.quotation) { setQt(d.quotation); setLines(d.lines||[]) }
    }).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [id, router])

  useEffect(() => {
    fetch('/api/qt-products').then(r=>r.json()).then(d => {
      setCategories(d.categories || []); setProducts(d.products || [])
    }).catch(() => {})
  }, [])

  function startEdit() {
    if (!qt) return
    setECustomerName(qt.customer_name || '')
    setEPartnerName(qt.partner_name || '')
    setEEndUserName(qt.end_user_name || '')
    setEProjectName(qt.project_name || '')
    setECustomerType(qt.customer_type || 'end_user')
    setETermYears(qt.term_years || 1)
    setEPaymentModel(qt.payment_model || 'one_off')
    setECurrency(qt.currency || 'HKD')
    setEIncludePs(!!qt.include_ps)
    setEIncludeAnnualService(!!qt.include_annual_service)
    setEValidityDays(qt.validity_days || 30)
    setELeadTime(qt.lead_time || '2-6 weeks')
    setEDeliveryLocation(qt.delivery_location || 'Customer Site')
    setEDiscountPercent(qt.discount_percent || 0)
    setETargetPrice('')
    setERemarks(qt.remarks || '')
    const editLines: LineItem[] = lines.map((l: any) => ({
      id: l.id || Math.random().toString(36).slice(2),
      productId: l.product_id || '',
      productCode: l.product_code || '',
      description: l.description || '',
      categoryId: '',
      siteType: l.site_type || 'production',
      qty: l.qty || 1,
      applianceUnitPrice: l.appliance_unit_price || 0,
      licenseUnitPrice: l.license_unit_price || 0,
      isIncluded: !!l.is_included,
      notes: l.notes || ''
    }))
    // Try to find categoryId for each line
    for (const el of editLines) {
      const prod = products.find(p => p.id === el.productId || p.code === el.productCode)
      if (prod) { el.categoryId = prod.category_id; el.productId = prod.id; el.productCode = prod.code }
    }
    setELines(editLines.length > 0 ? editLines : [newLine()])
    setEditing(true)
    setError('')
  }

  function cancelEdit() { setEditing(false); setError('') }

  const getModelsForCategory = useCallback((catId: string) => products.filter(p => p.category_id === catId), [products])

  const updateLine = useCallback((lid: string, ch: Partial<LineItem>) => {
    setELines(ls => ls.map(l => l.id === lid ? { ...l, ...ch } : l))
  }, [])

  const removeLine = useCallback((lid: string) => {
    setELines(ls => ls.filter(l => l.id !== lid))
  }, [])

  const addLine = useCallback(() => { setELines(ls => [...ls, newLine()]) }, [])

  const getPrice = useCallback((pid: string, qty: number) => {
    const prod = products.find(p => p.id === pid)
    if (!prod) return { app: 0, lic: 0 }
    const pr = prod.prices.filter(p => p.term_years === eTermYears && p.min_qty <= qty).sort((a, b) => b.min_qty - a.min_qty)[0]
    return { app: pr?.appliance_unit_price ?? 0, lic: pr?.license_unit_price ?? 0 }
  }, [products, eTermYears])

  function onCategoryChange(lid: string, catId: string) {
    updateLine(lid, { categoryId: catId, productId: '', productCode: '', description: '', applianceUnitPrice: 0, licenseUnitPrice: 0 })
  }
  function onProductChange(lid: string, pid: string) {
    const prod = products.find(p => p.id === pid); if (!prod) return
    const line = eLines.find(l => l.id === lid)
    const { app, lic } = getPrice(pid, line?.qty ?? 1)
    updateLine(lid, { productId: prod.id, productCode: prod.code, description: prod.name, applianceUnitPrice: app, licenseUnitPrice: lic })
  }
  function onQtyChange(lid: string, qty: number) {
    const line = eLines.find(l => l.id === lid); if (!line) return
    const { app, lic } = getPrice(line.productId, qty)
    updateLine(lid, { qty, applianceUnitPrice: app, licenseUnitPrice: lic })
  }

  async function handleSave() {
    if (!eCustomerName.trim()) { setError('Customer name is required'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch(`/api/qt-quotations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: eCustomerName,
          partnerName: ePartnerName || undefined,
          endUserName: eEndUserName || undefined,
          projectName: eProjectName || undefined,
          customerType: eCustomerType,
          termYears: eTermYears,
          paymentModel: ePaymentModel,
          currency: eCurrency,
          includePs: eIncludePs,
          includeAnnualService: eIncludeAnnualService,
          validityDays: eValidityDays,
          leadTime: eLeadTime,
          deliveryLocation: eDeliveryLocation,
          remarks: eRemarks || undefined,
          discountPercent: eDiscountPercent || undefined,
          targetFinalPrice: eTargetPrice ? parseFloat(eTargetPrice) : undefined,
          lines: eLines.map(l => ({
            productId: l.productId,
            productCode: l.productCode,
            siteType: l.siteType,
            qty: l.qty,
            applianceUnitPrice: l.applianceUnitPrice,
            licenseUnitPrice: l.licenseUnitPrice,
            isIncluded: l.isIncluded,
            notes: l.notes
          }))
        })
      })
      if (res.status === 401) { router.replace('/qt-login'); return }
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setQt(d.quotation)
      setLines(d.lines || [])
      setEditing(false)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  async function updateStatus(status: string) {
    setStatusUpdating(true)
    try {
      const res = await fetch(`/api/qt-quotations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const d = await res.json()
      if (d.quotation) setQt(d.quotation)
    } catch (e: any) { setError(e.message) } finally { setStatusUpdating(false) }
  }

  const fmt = (n: number, c = qt?.currency || eCurrency || 'HKD') => new Intl.NumberFormat('en-HK', { style: 'currency', currency: c, minimumFractionDigits: 0 }).format(n)
  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-HK', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

  if (loading) return <div className="qd-root"><style>{CSS}</style><div style={{padding:40,textAlign:'center'}}>Loading...</div></div>
  if (error && !qt) return <div className="qd-root"><style>{CSS}</style><div className="qd-ctr"><div className="qd-err">{error}</div></div></div>
  if (!qt) return null

  return (
    <div className="qd-root">
      <style>{CSS}</style>
      <div className="qd-hdr">
        <button onClick={() => router.push('/qt')} className="qd-back">{"\u2190"}</button>
        <span className="qd-hdr-t">NEXT GUARD | {qt.ref_number}</span>
        <span className="qd-badge" style={{background:STATUS_COLOR[qt.status]}}>{STATUS_LABEL[qt.status]}</span>
        <div className="qd-hdr-r">
          {!editing && ['draft','sent'].includes(qt.status) && <button onClick={startEdit} className="qd-b" style={{background:'#8b5cf6'}}>Edit</button>}
          {editing && <><button onClick={cancelEdit} className="qd-b" style={{background:'#374151'}}>Cancel Edit</button><button onClick={handleSave} disabled={saving} className="qd-b" style={{background:'#22c55e'}}>{saving?'Saving...':'Save'}</button></>}
          {!editing && <>
            {qt.status==='draft' && <button onClick={()=>updateStatus('sent')} disabled={statusUpdating} className="qd-b" style={{background:'#3b82f6'}}>Mark Sent</button>}
            {qt.status==='sent' && <button onClick={()=>updateStatus('accepted')} disabled={statusUpdating} className="qd-b" style={{background:'#22c55e'}}>Accept</button>}
            {qt.status==='sent' && <button onClick={()=>updateStatus('rejected')} disabled={statusUpdating} className="qd-b" style={{background:'#ef4444'}}>Reject</button>}
            {['draft','sent'].includes(qt.status) && <button onClick={()=>updateStatus('cancelled')} disabled={statusUpdating} className="qd-b" style={{background:'#6b7280'}}>Cancel</button>}
            <button onClick={()=>router.push(`/qt/${id}/pdf`)} className="qd-b" style={{background:'#374151'}}>PDF</button> <button onClick={() => router.push(`/qt/${id}/invoice`)} className="qd-b" style={{background:'#059669'}}>Invoice</button> <button onClick={() => router.push(`/qt/${id}/invoice`)} className="qd-b" style={{background:'#059669'}}>Invoice</button>
          </>}
        </div>
      </div>
      <div className="qd-ctr">
        {error && <div className="qd-err">{error}</div>}

        <div className="qd-g">
          {/* Customer Info */}
          <div className="qd-c">
            <div className="qd-ct">Customer Info</div>
            {editing ? <>
              <div className="qd-f"><label className="qd-l">Customer Type</label><select value={eCustomerType} onChange={e=>setECustomerType(e.target.value as any)} className="qd-i"><option value="end_user">End User</option><option value="partner">Partner</option></select></div>
              <div className="qd-f"><label className="qd-l">Customer Name *</label><input value={eCustomerName} onChange={e=>setECustomerName(e.target.value)} className="qd-i" /></div>
              {eCustomerType==='partner' && <><div className="qd-f"><label className="qd-l">Partner Name</label><input value={ePartnerName} onChange={e=>setEPartnerName(e.target.value)} className="qd-i" /></div><div className="qd-f"><label className="qd-l">End User Name</label><input value={eEndUserName} onChange={e=>setEEndUserName(e.target.value)} className="qd-i" /></div></>}
              <div className="qd-f"><label className="qd-l">Project Name</label><input value={eProjectName} onChange={e=>setEProjectName(e.target.value)} className="qd-i" /></div>
            </> : <>
              <div className="qd-row"><div className="qd-f"><span className="qd-l">Customer Type</span><div className="qd-v">{qt.customer_type==='partner'?'Partner':'End User'}</div></div><div className="qd-f"><span className="qd-l">Customer Name</span><div className="qd-v">{qt.customer_name}</div></div></div>
              {qt.partner_name && <div className="qd-f"><span className="qd-l">Partner</span><div className="qd-v">{qt.partner_name}</div></div>}
              {qt.end_user_name && <div className="qd-f"><span className="qd-l">End User</span><div className="qd-v">{qt.end_user_name}</div></div>}
              {qt.project_name && <div className="qd-f"><span className="qd-l">Project</span><div className="qd-v">{qt.project_name}</div></div>}
            </>}
          </div>

          {/* Contract Terms */}
          <div className="qd-c">
            <div className="qd-ct">Contract Terms</div>
            {editing ? <>
              <div className="qd-g2">
                <div className="qd-f"><label className="qd-l">Term (Years)</label><select value={eTermYears} onChange={e=>setETermYears(parseInt(e.target.value))} className="qd-i">{[1,2,3,4,5].map(y=><option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}</select></div>
                <div className="qd-f"><label className="qd-l">Currency</label><select value={eCurrency} onChange={e=>setECurrency(e.target.value)} className="qd-i"><option value="HKD">HKD</option><option value="USD">USD</option><option value="SGD">SGD</option><option value="MYR">MYR</option></select></div>
                <div className="qd-f"><label className="qd-l">Payment Model</label><select value={ePaymentModel} onChange={e=>setEPaymentModel(e.target.value as any)} className="qd-i"><option value="one_off">One-off (Full Upfront)</option><option value="yearly">Yearly</option></select></div>
                <div className="qd-f"><label className="qd-l">Validity (Days)</label><input type="number" value={eValidityDays} onChange={e=>setEValidityDays(parseInt(e.target.value))} className="qd-i" /></div>
                <div className="qd-f"><label className="qd-l">Lead Time</label><input value={eLeadTime} onChange={e=>setELeadTime(e.target.value)} className="qd-i" /></div>
                <div className="qd-f"><label className="qd-l">Delivery Location</label><input value={eDeliveryLocation} onChange={e=>setEDeliveryLocation(e.target.value)} className="qd-i" /></div>
              </div>
              <div className="qd-chk">
                <label className="qd-cl"><input type="checkbox" checked={eIncludePs} onChange={e=>setEIncludePs(e.target.checked)} /> Include Professional Services</label>
                <label className="qd-cl"><input type="checkbox" checked={eIncludeAnnualService} onChange={e=>setEIncludeAnnualService(e.target.checked)} /> Include Annual Maintenance</label>
              </div>
            </> : <>
              <div className="qd-row"><div className="qd-f"><span className="qd-l">Term</span><div className="qd-v">{qt.term_years} Year{qt.term_years>1?'s':''}</div></div><div className="qd-f"><span className="qd-l">Payment</span><div className="qd-v">{qt.payment_model==='one_off'?'One-off Upfront':'Yearly'}</div></div></div>
              <div className="qd-row"><div className="qd-f"><span className="qd-l">Currency</span><div className="qd-v">{qt.currency}</div></div><div className="qd-f"><span className="qd-l">Validity</span><div className="qd-v">{qt.validity_days} days</div></div></div>
              <div className="qd-row"><div className="qd-f"><span className="qd-l">Issue Date</span><div className="qd-v">{fmtDate(qt.created_at)}</div></div><div className="qd-f"><span className="qd-l">Expiry Date</span><div className="qd-v">{fmtDate(qt.expires_at)}</div></div></div>
              <div className="qd-row"><div className="qd-f"><span className="qd-l">Professional Services</span><div className="qd-v">{qt.include_ps?'Included':'Not Included'}</div></div><div className="qd-f"><span className="qd-l">Annual Maintenance</span><div className="qd-v">{qt.include_annual_service?'Included':'Not Included'}</div></div></div>
            </>}
          </div>
        </div>

        {/* Product Lines */}
        <div className="qd-c">
          <div style={{display:'flex',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8}}>
            <div className="qd-ct" style={{marginBottom:0}}>Product Lines</div>
            {editing && <button onClick={addLine} className="qd-b" style={{background:'#1f2937',border:'1px solid #374151',fontSize:13,marginLeft:'auto'}}>+ Add Line</button>}
          </div>
          {editing ? <>
            {/* Edit mode - desktop table */}
            <div className="qd-tw">
              <table className="qd-tb">
                <thead><tr>{['Category','Model','Site','Qty','Appliance','License/yr','Incl?','Notes',''].map(h=><th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {eLines.map(line => (
                    <tr key={line.id}>
                      <td style={{minWidth:160}}><select value={line.categoryId} onChange={e=>onCategoryChange(line.id,e.target.value)} className="qd-ti"><option value=''>-- Category --</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                      <td style={{minWidth:180}}><select value={line.productId} onChange={e=>onProductChange(line.id,e.target.value)} disabled={!line.categoryId} className="qd-ti"><option value=''>-- Model --</option>{line.categoryId && getModelsForCategory(line.categoryId).map(p=><option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></td>
                      <td><select value={line.siteType} onChange={e=>updateLine(line.id,{siteType:e.target.value})} className="qd-ti"><option value='production'>Prod</option><option value='dr'>DR</option><option value='test'>Test</option></select></td>
                      <td style={{width:60}}><input type='number' min='1' value={line.qty} onChange={e=>onQtyChange(line.id,parseInt(e.target.value)||1)} className="qd-ti" style={{width:55}} /></td>
                      <td style={{width:110}}><input type='number' value={line.applianceUnitPrice} onChange={e=>updateLine(line.id,{applianceUnitPrice:parseFloat(e.target.value)||0})} className="qd-ti" style={{width:100}} /></td>
                      <td style={{width:110}}><input type='number' value={line.licenseUnitPrice} onChange={e=>updateLine(line.id,{licenseUnitPrice:parseFloat(e.target.value)||0})} className="qd-ti" style={{width:100}} /></td>
                      <td style={{textAlign:'center'}}><input type='checkbox' checked={line.isIncluded} onChange={e=>updateLine(line.id,{isIncluded:e.target.checked})} /></td>
                      <td style={{minWidth:100}}><input value={line.notes} onChange={e=>updateLine(line.id,{notes:e.target.value})} placeholder='Notes' className="qd-ti" /></td>
                      <td><button onClick={()=>removeLine(line.id)} className="qd-rb">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Edit mode - mobile cards */}
            <div className="qd-ml">
              {eLines.map((line,idx)=>(
                <div key={line.id} className="qd-mc">
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}><span style={{color:'#9ca3af',fontSize:13}}>Line {idx+1}</span><button onClick={()=>removeLine(line.id)} className="qd-rb">✕</button></div>
                  <div className="qd-f"><label className="qd-l">Category</label><select value={line.categoryId} onChange={e=>onCategoryChange(line.id,e.target.value)} className="qd-i"><option value=''>-- Select --</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                  {line.categoryId && <div className="qd-f"><label className="qd-l">Model</label><select value={line.productId} onChange={e=>onProductChange(line.id,e.target.value)} className="qd-i"><option value=''>-- Select --</option>{getModelsForCategory(line.categoryId).map(p=><option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></div>}
                  <div className="qd-g2">
                    <div><label className="qd-l">Site</label><select value={line.siteType} onChange={e=>updateLine(line.id,{siteType:e.target.value})} className="qd-i"><option value='production'>Prod</option><option value='dr'>DR</option><option value='test'>Test</option></select></div>
                    <div><label className="qd-l">Qty</label><input type='number' min='1' value={line.qty} onChange={e=>onQtyChange(line.id,parseInt(e.target.value)||1)} className="qd-i" /></div>
                    <div><label className="qd-l">Appliance</label><input type='number' value={line.applianceUnitPrice} onChange={e=>updateLine(line.id,{applianceUnitPrice:parseFloat(e.target.value)||0})} className="qd-i" /></div>
                    <div><label className="qd-l">License/yr</label><input type='number' value={line.licenseUnitPrice} onChange={e=>updateLine(line.id,{licenseUnitPrice:parseFloat(e.target.value)||0})} className="qd-i" /></div>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}><label className="qd-cl"><input type='checkbox' checked={line.isIncluded} onChange={e=>updateLine(line.id,{isIncluded:e.target.checked})} /> Included</label></div>
                  <div style={{marginTop:8}}><input value={line.notes} onChange={e=>updateLine(line.id,{notes:e.target.value})} placeholder='Notes' className="qd-i" /></div>
                </div>
              ))}
            </div>
          </> : <>
            {/* View mode - desktop table */}
            <div className="qd-tw">
              <table className="qd-tb">
                <thead><tr><th>Product</th><th>Site</th><th>Qty</th><th>Appliance</th><th>App Total</th><th>License/yr</th>{Array.from({length:qt.term_years},(_,i)=><th key={i}>Yr {i+1}</th>)}<th>Line Total</th><th>Incl?</th></tr></thead>
                <tbody>
                  {lines.map((line:any)=>(
                    <tr key={line.id}>
                      <td>{line.description||line.product_code}<br/><span style={{color:'#6b7280',fontSize:11}}>{line.product_code}</span></td>
                      <td>{line.site_type}</td>
                      <td>{line.qty}</td>
                      <td>{fmt(line.appliance_unit_price)}</td>
                      <td>{fmt(line.appliance_total)}</td>
                      <td>{fmt(line.license_unit_price)}</td>
                      {Array.from({length:qt.term_years},(_,i)=><td key={i}>{fmt([line.year1_fee,line.year2_fee,line.year3_fee,line.year4_fee,line.year5_fee][i]||0)}</td>)}
                      <td>{line.is_included ? <span style={{color:'#22c55e'}}>Included</span> : fmt(line.line_total)}</td>
                      <td>{line.is_included ? '\u2713' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* View mode - mobile cards */}
            <div className="qd-ml">
              {lines.map((line:any,idx:number)=>(
                <div key={line.id} className="qd-mc">
                  <div className="qd-mc-title">{line.description||line.product_code}</div>
                  <div className="qd-mc-row"><span className="qd-mc-label">Code</span><span className="qd-mc-val">{line.product_code}</span></div>
                  <div className="qd-mc-row"><span className="qd-mc-label">Site</span><span className="qd-mc-val">{line.site_type}</span></div>
                  <div className="qd-mc-row"><span className="qd-mc-label">Qty</span><span className="qd-mc-val">{line.qty}</span></div>
                  <div className="qd-mc-row"><span className="qd-mc-label">Appliance</span><span className="qd-mc-val">{fmt(line.appliance_unit_price)}</span></div>
                  <div className="qd-mc-row"><span className="qd-mc-label">App Total</span><span className="qd-mc-val">{fmt(line.appliance_total)}</span></div>
                  <div className="qd-mc-row"><span className="qd-mc-label">License/yr</span><span className="qd-mc-val">{fmt(line.license_unit_price)}</span></div>
                  {Array.from({length:qt.term_years},(_,i)=>(
                    <div key={i} className="qd-mc-row"><span className="qd-mc-label">Yr {i+1}</span><span className="qd-mc-val">{fmt([line.year1_fee,line.year2_fee,line.year3_fee,line.year4_fee,line.year5_fee][i]||0)}</span></div>
                  ))}
                  <div className="qd-mc-row"><span className="qd-mc-label">Line Total</span><span className="qd-mc-val">{line.is_included ? 'Included' : fmt(line.line_total)}</span></div>
                </div>
              ))}
            </div>
          </>}
        </div>

        {/* Pricing Summary & Remarks */}
        <div className="qd-g">
          <div className="qd-c">
            <div className="qd-ct">Pricing Summary</div>
            {editing ? <>
              <div className="qd-g2" style={{marginBottom:12}}>
                <div className="qd-f"><label className="qd-l">Discount (%)</label><input type="number" min="0" max="100" step="0.5" value={eDiscountPercent} onChange={e=>{setEDiscountPercent(parseFloat(e.target.value)||0);setETargetPrice('')}} className="qd-i" /></div>
                <div className="qd-f"><label className="qd-l">Target Final Price</label><input type="number" value={eTargetPrice} onChange={e=>{setETargetPrice(e.target.value);setEDiscountPercent(0)}} placeholder='Leave blank for discount%' className="qd-i" /></div>
              </div>
              <div style={{color:'#9ca3af',fontSize:13}}>Pricing will be recalculated on save.</div>
            </> : <>
              <div className="qd-sum">
                <span className="qd-sl">Appliance Total</span><span>{fmt(qt.appliance_total)}</span>
                <span className="qd-sl">License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span>
                {qt.service_total > 0 && <><span className="qd-sl">Service Total</span><span>{fmt(qt.service_total)}</span></>}
                <span className="qd-sl">Grand Total</span><span>{fmt(qt.grand_total)}</span>
                {qt.discount_amount > 0 && <><span className="qd-sl">Discount ({qt.discount_percent?.toFixed(1)}%)</span><span>-{fmt(qt.discount_amount)}</span></>}
                <span className="qd-fl">FINAL PRICE</span><span className="qd-fv">{fmt(qt.final_price)}</span>
              </div>
              <div className="qd-sum-mobile">
                <span className="qd-sl">Appliance Total</span><span>{fmt(qt.appliance_total)}</span>
                <span className="qd-sl">License Total ({qt.term_years}yr)</span><span>{fmt(qt.license_total)}</span>
                {qt.service_total > 0 && <><span className="qd-sl">Service Total</span><span>{fmt(qt.service_total)}</span></>}
                <span className="qd-sl">Grand Total</span><span>{fmt(qt.grand_total)}</span>
                {qt.discount_amount > 0 && <><span className="qd-sl">Discount ({qt.discount_percent?.toFixed(1)}%)</span><span>-{fmt(qt.discount_amount)}</span></>}
                <span className="qd-fl">FINAL PRICE</span><span className="qd-fv">{fmt(qt.final_price)}</span>
              </div>
            </>}
          </div>

          <div className="qd-c">
            <div className="qd-ct">Remarks</div>
            {editing
              ? <textarea value={eRemarks} onChange={e=>setERemarks(e.target.value)} rows={8} className="qd-i" style={{resize:'vertical'}} />
              : <div className="qd-rmk">{qt.remarks}</div>
            }
          </div>
        </div>

      </div>
    </div>
  )
}
