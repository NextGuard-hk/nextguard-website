'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface Category {
  id: string; name: string; code_prefix: string; sort_order: number
}
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
  return {
    id: Math.random().toString(36).slice(2),
    productId: '', productCode: '', description: '', categoryId: '',
    siteType: 'production', qty: 1,
    applianceUnitPrice: 0, licenseUnitPrice: 0,
    isIncluded: false, notes: '',
  }
}
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
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) router.replace('/qt-login')
    }).catch(() => router.replace('/qt-login'))
    fetch('/api/qt-products').then(r=>r.json()).then(d => {
      setCategories(d.categories || [])
      setProducts(d.products || [])
    })
  }, [router])

  const getModelsForCategory = useCallback((catId: string) => {
    return products.filter(p => p.category_id === catId)
  }, [products])

  const updateLine = useCallback((id: string, changes: Partial<LineItem>) => {
    setLines(ls => ls.map(l => l.id === id ? { ...l, ...changes } : l))
  }, [])

  const removeLine = useCallback((id: string) => {
    setLines(ls => ls.filter(l => l.id !== id))
  }, [])

  const addLine = useCallback(() => {
    setLines(ls => [...ls, newLine()])
  }, [])

  const getPrice = useCallback((productId: string, qty: number) => {
    const prod = products.find(p => p.id === productId)
    if (!prod) return { app: 0, lic: 0 }
    const price = prod.prices
      .filter(p => p.term_years === termYears && p.min_qty <= qty)
      .sort((a, b) => b.min_qty - a.min_qty)[0]
    return { app: price?.appliance_unit_price ?? 0, lic: price?.license_unit_price ?? 0 }
  }, [products, termYears])

  function onCategoryChange(lineId: string, catId: string) {
    updateLine(lineId, { categoryId: catId, productId: '', productCode: '', description: '', applianceUnitPrice: 0, licenseUnitPrice: 0 })
  }

  function onProductChange(lineId: string, productId: string) {
    const prod = products.find(p => p.id === productId)
    if (!prod) return
    const line = lines.find(l => l.id === lineId)
    const { app, lic } = getPrice(productId, line?.qty ?? 1)
    updateLine(lineId, { productId: prod.id, productCode: prod.code, description: prod.name, applianceUnitPrice: app, licenseUnitPrice: lic })
  }

  function onQtyChange(lineId: string, qty: number) {
    const line = lines.find(l => l.id === lineId)
    if (!line) return
    const { app, lic } = getPrice(line.productId, qty)
    updateLine(lineId, { qty, applianceUnitPrice: app, licenseUnitPrice: lic })
  }

  async function calcPreview() {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/qt-quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload(true)) })
      if (res.status === 401) { router.replace('/qt-login'); return }
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setPreview(d.pricing)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  function buildPayload(previewOnly = false) {
    return {
      customerName, partnerName: partnerName || undefined,
      endUserName: endUserName || undefined, projectName: projectName || undefined,
      customerType, termYears, paymentModel, currency,
      includePs, includeAnnualService, validityDays, leadTime, deliveryLocation,
      remarks: remarks || undefined,
      discountPercent: discountPercent || undefined,
      targetFinalPrice: targetPrice ? parseFloat(targetPrice) : undefined,
      lines: lines.map(l => ({ productId: l.productId, productCode: l.productCode, siteType: l.siteType, qty: l.qty, applianceUnitPrice: l.applianceUnitPrice, licenseUnitPrice: l.licenseUnitPrice, isIncluded: l.isIncluded, notes: l.notes })),
    }
  }

  async function handleSave() {
    if (!customerName.trim()) { setError('Customer name is required'); return }
    if (lines.length === 0) { setError('Add at least one product line'); return }
    setSaving(true); setError('')
    try {
      const res = await fetch('/api/qt-quotations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(buildPayload()) })
      if (res.status === 401) { router.replace('/qt-login'); return }
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      router.push('/qt/' + d.quotation.id)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('en-HK', { style: 'currency', currency, minimumFractionDigits: 0 }).format(n)
  const inp: React.CSSProperties = { background: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#e0e0e0', padding: '9px 12px', fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' }
  const lbl: React.CSSProperties = { color: '#9ca3af', fontSize: 13, marginBottom: 4, display: 'block' }
  const card: React.CSSProperties = { background: '#0d1117', border: '1px solid #1f2937', borderRadius: 12, padding: 20, marginBottom: 16 }
  const btn = (color: string): React.CSSProperties => ({ background: color, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', color: '#e0e0e0', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0d1117', borderBottom: '1px solid #1f2937', padding: '0 16px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, minHeight: 56 }}>
        <span style={{ fontWeight: 700, fontSize: 15 }}>NEXT GUARD | New Quotation</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => router.push('/qt')} style={btn('#374151')}>Cancel</button>
          <button onClick={calcPreview} disabled={loading} style={btn('#3b82f6')}>{loading ? 'Calc...' : 'Preview'}</button>
          <button onClick={handleSave} disabled={saving} style={btn('#22c55e')}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px' }}>
        {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#fca5a5' }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {/* Left column */}
          <div>
            {/* Customer Info */}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Customer Info</div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Customer Type</label>
                <select value={customerType} onChange={e => setCustomerType(e.target.value as any)} style={inp}>
                  <option value='end_user'>End User</option>
                  <option value='partner'>Partner</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>Customer Name *</label>
                <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder='e.g. ABC Company Ltd' style={inp} />
              </div>
              {customerType === 'partner' && (<>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Partner Name</label>
                  <input value={partnerName} onChange={e => setPartnerName(e.target.value)} placeholder='Partner / Reseller' style={inp} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>End User Name</label>
                  <input value={endUserName} onChange={e => setEndUserName(e.target.value)} placeholder='End User Company' style={inp} />
                </div>
              </>)}
              <div>
                <label style={lbl}>Project Name</label>
                <input value={projectName} onChange={e => setProjectName(e.target.value)} placeholder='e.g. Network Security Upgrade' style={inp} />
              </div>
            </div>
            {/* Contract Terms */}
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Contract Terms</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={lbl}>Term (Years)</label>
                  <select value={termYears} onChange={e => setTermYears(parseInt(e.target.value))} style={inp}>
                    {[1,2,3,4,5].map(y => <option key={y} value={y}>{y} Year{y>1?'s':''}</option>)}
                  </select>
                </div>
                <div>
                  <label style={lbl}>Currency</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} style={inp}>
                    <option value='HKD'>HKD</option>
                    <option value='USD'>USD</option>
                    <option value='SGD'>SGD</option>
                    <option value='MYR'>MYR</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Payment Model</label>
                  <select value={paymentModel} onChange={e => setPaymentModel(e.target.value as any)} style={inp}>
                    <option value='one_off'>One-off (Full Upfront)</option>
                    <option value='yearly'>Yearly</option>
                  </select>
                </div>
                <div>
                  <label style={lbl}>Validity (Days)</label>
                  <input type='number' value={validityDays} onChange={e => setValidityDays(parseInt(e.target.value))} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Lead Time</label>
                  <input value={leadTime} onChange={e => setLeadTime(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Delivery Location</label>
                  <input value={deliveryLocation} onChange={e => setDeliveryLocation(e.target.value)} style={inp} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type='checkbox' checked={includePs} onChange={e => setIncludePs(e.target.checked)} /> Include Professional Services
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 14 }}>
                  <input type='checkbox' checked={includeAnnualService} onChange={e => setIncludeAnnualService(e.target.checked)} /> Include Annual Maintenance
                </label>
              </div>
            </div>
          </div>
          {/* Right column - Pricing & Remarks */}
          <div>
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Pricing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={lbl}>Discount (%)</label>
                  <input type='number' min='0' max='100' step='0.5' value={discountPercent} onChange={e => { setDiscountPercent(parseFloat(e.target.value)||0); setTargetPrice('') }} style={inp} />
                </div>
                <div>
                  <label style={lbl}>Target Final Price (override)</label>
                  <input type='number' value={targetPrice} onChange={e => { setTargetPrice(e.target.value); setDiscountPercent(0) }} placeholder='Leave blank for discount%' style={inp} />
                </div>
              </div>
              {preview && (
                <div style={{ background: '#111827', borderRadius: 8, padding: 16 }}>
                  <div style={{ fontWeight: 600, marginBottom: 10, color: '#22c55e' }}>Pricing Preview</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                    <div style={{ color: '#9ca3af' }}>Appliance Total:</div><div>{fmt(preview.totals.applianceTotal)}</div>
                    <div style={{ color: '#9ca3af' }}>License Total:</div><div>{fmt(preview.totals.licenseTotal)}</div>
                    {preview.totals.serviceTotal > 0 && <><div style={{ color: '#9ca3af' }}>Service Total:</div><div>{fmt(preview.totals.serviceTotal)}</div></>}
                    <div style={{ color: '#9ca3af' }}>Grand Total:</div><div>{fmt(preview.totals.grandTotal)}</div>
                    {preview.totals.discountAmount > 0 && <><div style={{ color: '#9ca3af' }}>Discount:</div><div style={{ color: '#ef4444' }}>-{fmt(preview.totals.discountAmount)}</div></>}
                    <div style={{ color: '#f9fafb', fontWeight: 700 }}>FINAL PRICE:</div>
                    <div style={{ color: '#22c55e', fontWeight: 700, fontSize: 16 }}>{fmt(preview.totals.finalPrice)}</div>
                  </div>
                </div>
              )}
            </div>
            <div style={card}>
              <div style={{ fontWeight: 600, marginBottom: 16, color: '#f9fafb' }}>Remarks</div>
              <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={5} placeholder='Remarks will be auto-generated if blank' style={{ ...inp, resize: 'vertical' as const }} />
            </div>
          </div>
        </div>
        {/* Product Lines */}
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontWeight: 600, color: '#f9fafb', fontSize: 16 }}>Product Lines</div>
            <button onClick={addLine} style={{ marginLeft: 'auto', ...btn('#1f2937'), border: '1px solid #374151', fontSize: 13 }}>+ Add Line</button>
          </div>
          {/* Mobile: card-style rows; Desktop: table */}
          <div style={{ display: 'none' }} className='mobile-lines'>
            {lines.map((line, idx) => (
              <div key={line.id} style={{ background: '#111827', borderRadius: 8, padding: 12, marginBottom: 12, border: '1px solid #1f2937' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#9ca3af', fontSize: 13 }}>Line {idx + 1}</span>
                  <button onClick={() => removeLine(line.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18 }}>✕</button>
                </div>
                <div style={{ marginBottom: 8 }}>
                  <label style={lbl}>Product Category</label>
                  <select value={line.categoryId} onChange={e => onCategoryChange(line.id, e.target.value)} style={inp}>
                    <option value=''>-- Select Category --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                {line.categoryId && (
                  <div style={{ marginBottom: 8 }}>
                    <label style={lbl}>Model</label>
                    <select value={line.productId} onChange={e => onProductChange(line.id, e.target.value)} style={inp}>
                      <option value=''>-- Select Model --</option>
                      {getModelsForCategory(line.categoryId).map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                    </select>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={lbl}>Site Type</label>
                    <select value={line.siteType} onChange={e => updateLine(line.id, { siteType: e.target.value })} style={inp}>
                      <option value='production'>Production</option>
                      <option value='dr'>DR</option>
                      <option value='test'>Test</option>
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Qty</label>
                    <input type='number' min='1' value={line.qty} onChange={e => onQtyChange(line.id, parseInt(e.target.value)||1)} style={inp} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={lbl}>Appliance Price</label>
                    <input type='number' value={line.applianceUnitPrice} onChange={e => updateLine(line.id, { applianceUnitPrice: parseFloat(e.target.value)||0 })} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>License/yr Price</label>
                    <input type='number' value={line.licenseUnitPrice} onChange={e => updateLine(line.id, { licenseUnitPrice: parseFloat(e.target.value)||0 })} style={inp} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
                    <input type='checkbox' checked={line.isIncluded} onChange={e => updateLine(line.id, { isIncluded: e.target.checked })} /> Included (no charge)
                  </label>
                </div>
                <div style={{ marginTop: 8 }}>
                  <input value={line.notes} onChange={e => updateLine(line.id, { notes: e.target.value })} placeholder='Notes' style={inp} />
                </div>
              </div>
            ))}
          </div>
          {/* Desktop table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #374151' }}>
                  {['Category','Model','Site Type','Qty','Appliance Unit','License/yr Unit','Incl?','Notes',''].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: '#9ca3af', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '6px 4px', minWidth: 160 }}>
                      <select value={line.categoryId} onChange={e => onCategoryChange(line.id, e.target.value)} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13, width: '100%' }}>
                        <option value=''>-- Category --</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px', minWidth: 180 }}>
                      <select value={line.productId} onChange={e => onProductChange(line.id, e.target.value)} disabled={!line.categoryId} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: line.categoryId ? '#e0e0e0' : '#6b7280', padding: '6px 8px', fontSize: 13, width: '100%' }}>
                        <option value=''>-- Model --</option>
                        {line.categoryId && getModelsForCategory(line.categoryId).map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <select value={line.siteType} onChange={e => updateLine(line.id, { siteType: e.target.value })} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13 }}>
                        <option value='production'>Prod</option>
                        <option value='dr'>DR</option>
                        <option value='test'>Test</option>
                      </select>
                    </td>
                    <td style={{ padding: '6px 4px', width: 60 }}>
                      <input type='number' min='1' value={line.qty} onChange={e => onQtyChange(line.id, parseInt(e.target.value)||1)} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13, width: 55 }} />
                    </td>
                    <td style={{ padding: '6px 4px', width: 110 }}>
                      <input type='number' value={line.applianceUnitPrice} onChange={e => updateLine(line.id, { applianceUnitPrice: parseFloat(e.target.value)||0 })} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13, width: 100 }} />
                    </td>
                    <td style={{ padding: '6px 4px', width: 110 }}>
                      <input type='number' value={line.licenseUnitPrice} onChange={e => updateLine(line.id, { licenseUnitPrice: parseFloat(e.target.value)||0 })} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13, width: 100 }} />
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'center' }}>
                      <input type='checkbox' checked={line.isIncluded} onChange={e => updateLine(line.id, { isIncluded: e.target.checked })} title='Include in scope (no charge)' />
                    </td>
                    <td style={{ padding: '6px 4px', minWidth: 100 }}>
                      <input value={line.notes} onChange={e => updateLine(line.id, { notes: e.target.value })} placeholder='Notes' style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 6, color: '#e0e0e0', padding: '6px 8px', fontSize: 13, width: '100%' }} />
                    </td>
                    <td style={{ padding: '6px 4px' }}>
                      <button onClick={() => removeLine(line.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16 }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lines.length === 0 && <div style={{ textAlign: 'center', color: '#6b7280', padding: '24px 0' }}>No product lines added yet. Click &quot;+ Add Line&quot; to start.</div>}
        </div>
      </div>
    </div>
  )
}
