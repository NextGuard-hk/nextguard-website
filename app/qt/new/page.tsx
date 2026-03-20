'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
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
  isIncluded: boolean; notes: string; sku: string
}
function newLine(): LineItem {
  return { id: Math.random().toString(36).slice(2), productId: '', productCode: '', description: '', categoryId: '', siteType: 'production', qty: 1, applianceUnitPrice: 0, licenseUnitPrice: 0, isIncluded: false, notes: '', sku: '' }
}
const CSS = `
.qn-root{min-height:100vh;background:#0a0e17;color:#e0e0e0;font-family:system-ui,sans-serif}
.qn-root *{box-sizing:border-box}
.qn-hdr{background:#0d1117;border-bottom:1px solid #1f2937;padding:0 16px;display:flex;align-items:center;flex-wrap:wrap;gap:8px;min-height:56px}
.qn-hdr-t{font-weight:700;font-size:15px;color:#fff}
.qn-hdr-r{margin-left:auto;display:flex;gap:8px;flex-wrap:wrap}
.qn-ctr{max-width:1200px;margin:0 auto;padding:16px}
.qn-err{background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#fca5a5}
.qn-g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.qn-c{background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:16px}
.qn-ct{font-weight:600;margin-bottom:16px;color:#f9fafb}
.qn-f{margin-bottom:12px}
.qn-l{color:#9ca3af;font-size:13px;margin-bottom:4px;display:block}
.qn-i{background:#111827;border:1px solid #1f2937;border-radius:8px;color:#e0e0e0;padding:9px 12px;font-size:14px;outline:none;width:100%;box-sizing:border-box}
.qn-i:focus{border-color:#374151}
.qn-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.qn-chk{display:flex;gap:20px;margin-top:12px;flex-wrap:wrap}
.qn-cl{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px}
.qn-b{color:#fff;border:none;border-radius:8px;padding:10px 20px;font-size:14px;font-weight:600;cursor:pointer;white-space:nowrap}
.qn-b:disabled{opacity:.6;cursor:not-allowed}
.qn-lh{display:flex;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:8px}
.qn-lt{font-weight:600;color:#f9fafb;font-size:16px}
.qn-dt{overflow-x:auto}
.qn-tb{width:100%;border-collapse:collapse;font-size:13px;min-width:700px}
.qn-tb th{text-align:left;padding:6px 8px;color:#9ca3af;font-weight:500;border-bottom:1px solid #374151}
.qn-tb td{padding:6px 4px}
.qn-ti{background:#111827;border:1px solid #1f2937;border-radius:6px;color:#e0e0e0;padding:6px 8px;font-size:13px;width:100%}
.qn-rb{background:none;border:none;color:#ef4444;cursor:pointer;font-size:16px}
.qn-ml{display:none}
.qn-mc{background:#111827;border-radius:8px;padding:12px;margin-bottom:12px;border:1px solid #1f2937}
.qn-mh{display:flex;justify-content:space-between;margin-bottom:8px}
.qn-pb{background:#111827;border-radius:8px;padding:16px}
.qn-pg{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:13px}
@media(max-width:768px){
.qn-hdr{padding:10px 12px;min-height:auto}
.qn-hdr-r{width:100%;justify-content:flex-end}
.qn-ctr{padding:12px 8px}
.qn-g{grid-template-columns:1fr}
.qn-c{padding:14px}
.qn-dt{display:none}
.qn-ml{display:block}
.qn-b{padding:8px 14px;font-size:13px}
}
@media(max-width:480px){
.qn-g2{grid-template-columns:1fr}
.qn-hdr-t{font-size:13px}
}
`
export default function NewQuotation() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<any>(null)
  const [customerName, setCustomerName] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [endUserName, setEndUserName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [customerType, setCustomerType] = useState<'partner'|'end_user'>('end_user')
  const [termYears, setTermYears] = useState(1)
  const [paymentModel, setPaymentModel] = useState<'one_off'|'yearly'>('one_off')
  const [currency, setCurrency] = useState('HKD')
  const [includePs, setIncludePs] = useState(false)
  const [includeAnnualService, setIncludeAnnualService] = useState(true)
  const [validityDays, setValidityDays] = useState(30)
  const [leadTime, setLeadTime] = useState('2-6 weeks')
  const [deliveryLocation, setDeliveryLocation] = useState('Customer Site')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [targetPrice, setTargetPrice] = useState('')
  const [remarks, setRemarks] = useState('')
  const [lines, setLines] = useState<LineItem[]>([newLine()])
  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => { if (!d.authenticated) router.replace('/qt-login') }).catch(() => router.replace('/qt-login'))
    fetch('/api/qt-products').then(r=>r.json()).then(d => { setCategories(d.categories || []); setProducts(d.products || []) })
  }, [router])
  const getModelsForCategory = useCallback((catId: string) => products.filter(p => p.category_id === catId), [products])
  const updateLine = useCallback((id: string, ch: Partial<LineItem>) => { setLines(ls => ls.map(l => l.id === id ? { ...l, ...ch } : l)) }, [])
  const removeLine = useCallback((id: string) => { setLines(ls => ls.filter(l => l.id !== id)) }, [])
  const addLine = useCallback(() => { setLines(ls => [...ls, newLine()]) }, [])
  const getPrice = useCallback((pid: string, qty: number) => {
    const prod = products.find(p => p.id === pid)
    if (!prod) return { app: 0, lic: 0 }
    const pr = prod.prices.filter(p => p.term_years === termYears && p.min_qty <= qty).sort((a, b) => b.min_qty - a.min_qty)[0]
    return { app: pr?.appliance_unit_price ?? 0, lic: pr?.license_unit_price ?? 0 }
  }, [products, termYears])
  function onCategoryChange(lid: string, catId: string) { updateLine(lid, { categoryId: catId, productId: '', productCode: '', description: '', applianceUnitPrice: 0, licenseUnitPrice: 0 }) }
  function onProductChange(lid: string, pid: string) {
    const prod = products.find(p => p.id === pid); if (!prod) return
    const line = lines.find(l => l.id === lid)
    const { app, lic } = getPrice(pid, line?.qty ?? 1)
    updateLine(lid, { productId: prod.id, productCode: prod.code, description: prod.name, applianceUnitPrice: app, licenseUnitPrice: lic })
  }
  function onQtyChange(lid: string, qty: number) {
    const line = lines.find(l => l.id === lid); if (!line) return
    const { app, lic } = getPrice(line.productId, qty)
    updateLine(lid, { qty, applianceUnitPrice: app, licenseUnitPrice: lic })
  }
  function buildPayload(po = false) {
    return { customerName, partnerName: partnerName || undefined, endUserName: endUserName || undefined, projectName: projectName || undefined, customerType, termYears, paymentModel, currency, includePs, includeAnnualService, validityDays, leadTime, deliveryLocation, remarks: remarks || undefined, discountPercent: discountPercent || undefined, targetFinalPrice: targetPrice ? parseFloat(targetPrice) : undefined, previewOnly: po || undefined, lines: lines.map(l => ({ productId: l.productId, productCode: l.productCode, siteType: l.siteType, qty: l.qty, applianceUnitPrice: l.applianceUnitPrice, licenseUnitPrice: l.licenseUnitPrice, isIncluded: l.isIncluded, notes: l.notes, sku: l.sku })) }
  }
  async function calcPreview() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/qt-quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(true)) })
      if (res.status === 401) { router.replace('/qt-login'); return }
      const d = await res.json(); if (d.error) { setError(d.error); return }
      setPreview(d.pricing)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }
  async function handleSave() {
    if (!customerName.trim()) { setError('Customer name is required'); return }
    if (lines.length === 0) { setError('Add at least one product line'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/qt-quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      if (res.status === 401) { router.replace('/qt-login'); return }
      const d = await res.json(); if (d.error) { setError(d.error); return }
      router.push('/qt/' + d.quotation.id)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }
  const fmt = (n: number) => new Intl.NumberFormat('en-HK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
  return (
    <div className="qn-root">
      <style>{CSS}</style>
      <div className="qn-hdr">
        <span className="qn-hdr-t">NEXT GUARD | New Quotation</span>
        <div className="qn-hdr-r">
          <button onClick={() => router.push('/qt')} className="qn-b" style={{background:'#374151'}}>Cancel</button>
          <button onClick={calcPreview} disabled={loading} className="qn-b" style={{background:'#3b82f6'}}>{loading ? 'Calc...' : 'Preview'}</button>
          <button onClick={handleSave} disabled={saving} className="qn-b" style={{background:'#22c55e'}}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
      <div className="qn-ctr">
        {error && <div className="qn-err">{error}</div>}
        <div className="qn-g">
          <div>
            <div className="qn-c">
              <div className="qn-ct">Customer Info</div>
              <div className="qn-f"><label className="qn-l">Customer Type</label><select value={customerType} onChange={e => setCustomerType(e.target.value as any)} className="qn-i"><option value='end_user'>End User</option><option value='partner'>Partner</option></select></div>
              <div className="qn-f"><label className="qn-l">Customer Name *</label><input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder='e.g. ABC Company Ltd' className="qn-i" /></div>
              {customerType === 'partner' && <><div className="qn-f"><label className="qn-l">Partner Name</label><input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder='Partner / Reseller' className="qn-i" /></div><div className="qn-f"><label className="qn-l">End User Name</label><input value={endUserName} onChange={e => setEndUserName(e.target.value)} placeholder='End User Company' className="qn-i" /></div></>}
              <div className="qn-f"><label className="qn-l">Project Name</label><input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder='e.g. Network Security Upgrade' className="qn-i" /></div>
            </div>
            <div className="qn-c">
              <div className="qn-ct">Contract Terms</div>
              <div className="qn-g2">
                <div><label className="qn-l">Term (Years)</label><select value={termYears} onChange={e => setTermYears(parseInt(e.target.value))} className="qn-i">{[1,2,3,4,5].map(y => <option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}</select></div>
                <div><label className="qn-l">Currency</label><select value={currency} onChange={e => setCurrency(e.target.value)} className="qn-i"><option value='HKD'>HKD</option><option value='USD'>USD</option><option value='SGD'>SGD</option><option value='MYR'>MYR</option></select></div>
                <div><label className="qn-l">Payment Model</label><select value={paymentModel} onChange={e => setPaymentModel(e.target.value as any)} className="qn-i"><option value='one_off'>One-off (Full Upfront)</option><option value='yearly'>Yearly</option></select></div>
                <div><label className="qn-l">Validity (Days)</label><input type='number' value={validityDays} onChange={e => setValidityDays(parseInt(e.target.value))} className="qn-i" /></div>
                <div><label className="qn-l">Lead Time</label><input value={leadTime} onChange={e => setLeadTime(e.target.value)} className="qn-i" /></div>
                <div><label className="qn-l">Delivery Location</label><input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} className="qn-i" /></div>
              </div>
              <div className="qn-chk">
                <label className="qn-cl"><input type='checkbox' checked={includePs} onChange={e => setIncludePs(e.target.checked)} /> Include Professional Services</label>
                <label className="qn-cl"><input type='checkbox' checked={includeAnnualService} onChange={e => setIncludeAnnualService(e.target.checked)} /> Include Annual Maintenance</label>
              </div>
            </div>
          </div>
          <div>
            <div className="qn-c">
              <div className="qn-ct">Pricing</div>
notes: l.notes, sku: l.sku            </div>
            <div className="qn-c">
              <div className="qn-ct">Remarks</div>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={5} placeholder='Remarks will be auto-generated if blank' className="qn-i" style={{resize:'vertical'}} />
            </div>
          </div>
        </div>
        <div className="qn-c">
          <div className="qn-lh">
            <div className="qn-lt">Product Lines</div>
            <button onClick={addLine} className="qn-b" style={{background:'#1f2937',border:'1px solid #374151',fontSize:13,marginLeft:'auto'}}>+ Add Line</button>
          </div>
          <div className="qn-ml">
                          <div className="qn-f"><label className="qn-l">SKU</label><input value={line.sku} onChange={e => updateLine(line.id, {sku:e.target.value})} placeholder='SKU' className="qn-i" /></div>
              <div key={line.id} className="qn-mc">
                <div className="qn-f"><label className="qn-l">Category</label><select value={line.categoryId} onChange={e => onCategoryChange(line.id, e.target.value)} className="qn-i"><option value=''>-- Select --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                {line.categoryId && <div className="qn-f"><label className="qn-l">Model</label><select value={line.productId} onChange={e => onProductChange(line.id, e.target.value)} className="qn-i"><option value=''>-- Select --</option>{getModelsForCategory(line.categoryId).map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></div>}
                <div className="qn-g2">
                  <div><label className="qn-l">Site Type</label><select value={line.siteType} onChange={e => updateLine(line.id, {siteType:e.target.value})} className="qn-i"><option value='production'>Prod</option><option value='dr'>DR</option><option value='test'>Test</option><option value='na'>NA</option></select></div>
                  <div><label className="qn-l">Qty</label><input type='number' min='1' value={line.qty} onChange={e => onQtyChange(line.id, parseInt(e.target.value)||1)} className="qn-i" /></div>
                  <div><label className="qn-l">Appliance</label><input type='number' value={line.applianceUnitPrice} onChange={e => updateLine(line.id, {applianceUnitPrice:parseFloat(e.target.value)||0})} className="qn-i" /></div>
                  <div><label className="qn-l">License/yr</label><input type='number' value={line.licenseUnitPrice} onChange={e => updateLine(line.id, {licenseUnitPrice:parseFloat(e.target.value)||0})} className="qn-i" /></div>
                </div>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}><label className="qn-cl"><input type='checkbox' checked={line.isIncluded} onChange={e => updateLine(line.id, {isIncluded:e.target.checked})} /> Included (no charge)</label></div>
                <div style={{marginTop:8}}><input value={line.notes} onChange={e => updateLine(line.id, {notes:e.target.value})} placeholder='Notes' className="qn-i" /></div>
                            <div className="qn-f"><label className="qn-l">SKU</label><input value={line.sku} onChange={e => updateLine(line.id, {sku:e.target.value})} placeholder='SKU' className="qn-i" /></div>
              </div>
            ))}
          </div>
          <div className="qn-dt">
            <table className="qn-tb">
              <thead><tr>{['Category','Model','SKU','Site','Qty','Appliance','License/yr','Incl?','Notes',''].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {lines.map(line => (
                  <tr key={line.id} style={{borderBottom:'1px solid #1f2937'}}>
                    <td style={{minWidth:160}}><select value={line.categoryId} onChange={e => onCategoryChange(line.id, e.target.value)} className="qn-ti"><option value=''>-- Category --</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
                    <td style={{minWidth:180}}><select value={line.productId} onChange={e => onProductChange(line.id, e.target.value)} disabled={!line.categoryId} className="qn-ti" style={{color:line.categoryId?'#e0e0e0':'#6b7280'}}><option value=''>-- Model --</option>{line.categoryId && getModelsForCategory(line.categoryId).map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></td>
                                  <td><input value={line.sku} onChange={e => updateLine(line.id, {sku:e.target.value})} placeholder='SKU' className="qn-ti" style={{width:100}} /></td>
                    <td><select value={line.siteType} onChange={e => updateLine(line.id, {siteType:e.target.value})} className="qn-ti"><option value='production'>Prod</option><option value='dr'>DR</option><option value='test'>Test</option><option value='na'>NA</option></select></td>
                    <td style={{width:60}}><input type='number' min='1' value={line.qty} onChange={e => onQtyChange(line.id, parseInt(e.target.value)||1)} className="qn-ti" style={{width:55}} /></td>
                    <td style={{width:110}}><input type='number' value={line.applianceUnitPrice} onChange={e => updateLine(line.id, {applianceUnitPrice:parseFloat(e.target.value)||0})} className="qn-ti" style={{width:100}} /></td>
                    <td style={{width:110}}><input type='number' value={line.licenseUnitPrice} onChange={e => updateLine(line.id, {licenseUnitPrice:parseFloat(e.target.value)||0})} className="qn-ti" style={{width:100}} /></td>
                    <td style={{textAlign:'center'}}><input type='checkbox' checked={line.isIncluded} onChange={e => updateLine(line.id, {isIncluded:e.target.checked})} /></td>
                    <td style={{minWidth:100}}><input value={line.notes} onChange={e => updateLine(line.id, {notes:e.target.value})} placeholder='Notes' className="qn-ti" /></td>
                    <td><button onClick={() => removeLine(line.id)} className="qn-rb">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lines.length === 0 && <div style={{textAlign:'center',color:'#6b7280',padding:'24px 0'}}>No product lines. Click "+ Add Line" to start.</div>}
        </div>
      </div>
    </div>
  )
}
