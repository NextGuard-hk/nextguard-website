'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const CSS = `
.pm-root{min-height:100vh;background:#0a0e17;color:#e0e0e0;font-family:system-ui,sans-serif}
.pm-root *{box-sizing:border-box}
.pm-hdr{background:#0d1117;border-bottom:1px solid #1f2937;padding:12px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pm-hdr-t{font-weight:700;font-size:15px;color:#fff}
.pm-hdr-r{margin-left:auto;display:flex;gap:8px}
.pm-b{color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap}
.pm-b:disabled{opacity:.6;cursor:not-allowed}
.pm-ctr{max-width:1200px;margin:0 auto;padding:16px}
.pm-err{background:#7f1d1d;border:1px solid #ef4444;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#fca5a5}
.pm-ok{background:#064e3b;border:1px solid #22c55e;border-radius:8px;padding:12px 16px;margin-bottom:16px;color:#86efac}
.pm-tabs{display:flex;gap:8px;margin-bottom:16px}
.pm-tab{padding:8px 20px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;border:1px solid #1f2937;background:#0d1117;color:#9ca3af}
.pm-tab-active{background:#1f2937;color:#fff;border-color:#374151}
.pm-c{background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:20px;margin-bottom:16px}
.pm-ct{font-weight:600;margin-bottom:16px;color:#f9fafb;font-size:16px;display:flex;align-items:center;gap:8px}
.pm-i{background:#111827;border:1px solid #1f2937;border-radius:8px;color:#e0e0e0;padding:9px 12px;font-size:14px;outline:none;width:100%;box-sizing:border-box}
.pm-i:focus{border-color:#374151}
.pm-l{color:#9ca3af;font-size:13px;margin-bottom:4px;display:block}
.pm-f{margin-bottom:12px}
.pm-g2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.pm-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px}
.pm-tbl{width:100%;border-collapse:collapse;font-size:13px}
.pm-tbl th{text-align:left;padding:10px 8px;color:#9ca3af;font-weight:500;border-bottom:1px solid #374151}
.pm-tbl td{padding:10px 8px;border-bottom:1px solid #1f2937}
.pm-tbl tr:hover td{background:#111827}
.pm-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600}
.pm-act{display:flex;gap:6px}
.pm-modal-bg{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:100;padding:16px}
.pm-modal{background:#0d1117;border:1px solid #1f2937;border-radius:12px;padding:24px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto}
.pm-modal-t{font-weight:700;font-size:16px;color:#fff;margin-bottom:16px}
@media(max-width:768px){
.pm-g2,.pm-g3{grid-template-columns:1fr}
.pm-tbl{font-size:12px}
.pm-tbl th,.pm-tbl td{padding:8px 4px}
.pm-b{padding:6px 12px;font-size:12px}
.pm-ctr{padding:12px 8px}
}
`

const TYPE_OPTIONS = [
  { value: 'management', label: 'Management Server' },
  { value: 'endpoint', label: 'Endpoint DLP Agent' },
  { value: 'email_gateway', label: 'Email Security Gateway' },
  { value: 'web_gateway', label: 'Web Security Gateway' },
  { value: 'service', label: 'Professional Services' },
]

export default function ProductManagement() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [prices, setPrices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [role, setRole] = useState('')
  const [tab, setTab] = useState<'products'|'prices'>('products')
  // Product modal
  const [showProductModal, setShowProductModal] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [pCode, setPCode] = useState('')
  const [pName, setPName] = useState('')
  const [pType, setPType] = useState('management')
  const [pDesc, setPDesc] = useState('')
  const [pSort, setPSort] = useState(0)
  const [pSaving, setPSaving] = useState(false)
  // Price modal
  const [showPriceModal, setShowPriceModal] = useState(false)
  const [editPrice, setEditPrice] = useState<any>(null)
  const [prProductId, setPrProductId] = useState('')
  const [prTermYears, setPrTermYears] = useState(1)
  const [prMinQty, setPrMinQty] = useState(1)
  const [prMaxQty, setPrMaxQty] = useState(999999)
  const [prAppPrice, setPrAppPrice] = useState(0)
  const [prLicPrice, setPrLicPrice] = useState(0)
  const [prSaving, setPrSaving] = useState(false)

  useEffect(() => {
    fetch('/api/qt-auth').then(r=>r.json()).then(d => {
      if (!d.authenticated) { router.replace('/qt-login'); return }
      if (d.user?.role !== 'admin') { setError('Admin access required'); setLoading(false); return }
      setRole(d.user.role)
      loadData()
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  async function loadData() {
    setLoading(true)
    try {
      const res = await fetch('/api/qt-products?includeInactive=true')
      const d = await res.json()
      const prods = d.products || []
      setProducts(prods)
      // Collect all prices from products
      const allPrices: any[] = []
      for (const p of prods) {
        if (p.prices) for (const pr of p.prices) allPrices.push({ ...pr, product_code: p.code, product_name: p.name })
      }
      setPrices(allPrices)
    } catch (e: any) { setError(e.message) } finally { setLoading(false) }
  }

  function openNewProduct() {
    setEditProduct(null); setPCode(''); setPName(''); setPType('management'); setPDesc(''); setPSort(0)
    setShowProductModal(true); setError('')
  }
  function openEditProduct(p: any) {
    setEditProduct(p); setPCode(p.code); setPName(p.name); setPType(p.type); setPDesc(p.description||''); setPSort(p.sort_order||0)
    setShowProductModal(true); setError('')
  }

  async function saveProduct() {
    if (!pCode.trim() || !pName.trim()) { setError('Code and Name are required'); return }
    setPSaving(true); setError('')
    try {
      const body = editProduct
        ? { action: 'update-product', id: editProduct.id, code: pCode, name: pName, type: pType, description: pDesc, sortOrder: pSort, isActive: true }
        : { action: 'create-product', code: pCode, name: pName, type: pType, description: pDesc, sortOrder: pSort }
      const res = await fetch('/api/qt-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setShowProductModal(false)
      setSuccess(editProduct ? 'Product updated' : 'Product created')
      setTimeout(() => setSuccess(''), 3000)
      await loadData()
    } catch (e: any) { setError(e.message) } finally { setPSaving(false) }
  }

  async function toggleProductActive(p: any) {
    try {
      await fetch('/api/qt-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update-product', id: p.id, code: p.code, name: p.name, type: p.type, description: p.description, sortOrder: p.sort_order, isActive: !p.is_active }) })
      await loadData()
    } catch (e: any) { setError(e.message) }
  }

  function openNewPrice(productId?: string) {
    setEditPrice(null); setPrProductId(productId||''); setPrTermYears(1); setPrMinQty(1); setPrMaxQty(999999); setPrAppPrice(0); setPrLicPrice(0)
    setShowPriceModal(true); setError('')
  }
  function openEditPrice(pr: any) {
    setEditPrice(pr); setPrProductId(pr.product_id); setPrTermYears(pr.term_years); setPrMinQty(pr.min_qty); setPrMaxQty(pr.max_qty); setPrAppPrice(pr.appliance_unit_price); setPrLicPrice(pr.license_unit_price)
    setShowPriceModal(true); setError('')
  }

  async function savePrice() {
    if (!prProductId) { setError('Product is required'); return }
    setPrSaving(true); setError('')
    try {
      const body = editPrice
        ? { action: 'update-price', id: editPrice.id, applianceUnitPrice: prAppPrice, licenseUnitPrice: prLicPrice, termYears: prTermYears, minQty: prMinQty, maxQty: prMaxQty, isActive: true }
        : { action: 'create-price', productId: prProductId, termYears: prTermYears, minQty: prMinQty, maxQty: prMaxQty, applianceUnitPrice: prAppPrice, licenseUnitPrice: prLicPrice }
      const res = await fetch('/api/qt-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setShowPriceModal(false)
      setSuccess(editPrice ? 'Price updated' : 'Price created')
      setTimeout(() => setSuccess(''), 3000)
      await loadData()
    } catch (e: any) { setError(e.message) } finally { setPrSaving(false) }
  }

  async function deletePrice(priceId: string) {
    if (!confirm('Delete this price entry?')) return
    try {
      await fetch('/api/qt-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete-price', id: priceId }) })
      setSuccess('Price deleted')
      setTimeout(() => setSuccess(''), 3000)
      await loadData()
    } catch (e: any) { setError(e.message) }
  }

  const typeName = (t: string) => TYPE_OPTIONS.find(o => o.value === t)?.label || t

  if (loading) return <div className="pm-root"><style>{CSS}</style><div style={{padding:40,textAlign:'center'}}>Loading...</div></div>

  return (
    <div className="pm-root">
      <style>{CSS}</style>
      <div className="pm-hdr">
        <button onClick={() => router.push('/qt')} className="pm-b" style={{background:'none',color:'#9ca3af',fontSize:20,padding:0}}>{"\u2190"}</button>
        <span className="pm-hdr-t">Product Management</span>
        <div className="pm-hdr-r">
          {tab==='products' && <button onClick={openNewProduct} className="pm-b" style={{background:'#22c55e'}}>+ New Product</button>}
          {tab==='prices' && <button onClick={()=>openNewPrice()} className="pm-b" style={{background:'#22c55e'}}>+ New Price</button>}
        </div>
      </div>
      <div className="pm-ctr">
        {error && <div className="pm-err">{error}</div>}
        {success && <div className="pm-ok">{success}</div>}

        <div className="pm-tabs">
          <div className={`pm-tab ${tab==='products'?'pm-tab-active':''}`} onClick={()=>setTab('products')}>Products ({products.length})</div>
          <div className={`pm-tab ${tab==='prices'?'pm-tab-active':''}`} onClick={()=>setTab('prices')}>Prices ({prices.length})</div>
        </div>

        {tab==='products' && <div className="pm-c">
          <div style={{overflowX:'auto'}}>
            <table className="pm-tbl">
              <thead><tr><th>Code</th><th>Name</th><th>Category</th><th>Status</th><th>Prices</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map((p:any) => (
                  <tr key={p.id}>
                    <td style={{fontWeight:600,color:'#fff'}}>{p.code}</td>
                    <td>{p.name}</td>
                    <td>{typeName(p.type)}</td>
                    <td><span className="pm-badge" style={{background:p.is_active?'#22c55e':'#6b7280',color:'#fff'}}>{p.is_active?'Active':'Inactive'}</span></td>
                    <td>{(p.prices||[]).length}</td>
                    <td><div className="pm-act">
                      <button onClick={()=>openEditProduct(p)} className="pm-b" style={{background:'#3b82f6',padding:'4px 10px',fontSize:12}}>Edit</button>
                      <button onClick={()=>toggleProductActive(p)} className="pm-b" style={{background:p.is_active?'#6b7280':'#22c55e',padding:'4px 10px',fontSize:12}}>{p.is_active?'Deactivate':'Activate'}</button>
                      <button onClick={()=>openNewPrice(p.id)} className="pm-b" style={{background:'#8b5cf6',padding:'4px 10px',fontSize:12}}>+ Price</button>
                    </div></td>
                  </tr>
                ))}
                {products.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'#6b7280',padding:24}}>No products found. Click "+ New Product" to create one.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}

        {tab==='prices' && <div className="pm-c">
          <div style={{overflowX:'auto'}}>
            <table className="pm-tbl">
              <thead><tr><th>Product</th><th>Term</th><th>Min Qty</th><th>Appliance Price</th><th>License/yr Price</th><th>Actions</th></tr></thead>
              <tbody>
                {prices.map((pr:any) => (
                  <tr key={pr.id}>
                    <td style={{fontWeight:600,color:'#fff'}}>{pr.product_code} - {pr.product_name}</td>
                    <td>{pr.term_years} Year{pr.term_years>1?'s':''}</td>
                    <td>{pr.min_qty}</td>
                    <td>HK${pr.appliance_unit_price?.toLocaleString()}</td>
                    <td>HK${pr.license_unit_price?.toLocaleString()}</td>
                    <td><div className="pm-act">
                      <button onClick={()=>openEditPrice(pr)} className="pm-b" style={{background:'#3b82f6',padding:'4px 10px',fontSize:12}}>Edit</button>
                      <button onClick={()=>deletePrice(pr.id)} className="pm-b" style={{background:'#ef4444',padding:'4px 10px',fontSize:12}}>Delete</button>
                    </div></td>
                  </tr>
                ))}
                {prices.length===0 && <tr><td colSpan={6} style={{textAlign:'center',color:'#6b7280',padding:24}}>No prices found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>}

        {/* Product Modal */}
        {showProductModal && <div className="pm-modal-bg" onClick={()=>setShowProductModal(false)}>
          <div className="pm-modal" onClick={e=>e.stopPropagation()}>
            <div className="pm-modal-t">{editProduct ? 'Edit Product' : 'New Product'}</div>
            <div className="pm-g2">
              <div className="pm-f"><label className="pm-l">Product Code *</label><input value={pCode} onChange={e=>setPCode(e.target.value)} placeholder="e.g. UCSS-1100" className="pm-i" /></div>
              <div className="pm-f"><label className="pm-l">Category (Type) *</label><select value={pType} onChange={e=>setPType(e.target.value)} className="pm-i">{TYPE_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            </div>
            <div className="pm-f"><label className="pm-l">Product Name *</label><input value={pName} onChange={e=>setPName(e.target.value)} placeholder="e.g. SecGator Management Server 1100" className="pm-i" /></div>
            <div className="pm-f"><label className="pm-l">Description</label><textarea value={pDesc} onChange={e=>setPDesc(e.target.value)} rows={3} className="pm-i" style={{resize:'vertical'}} /></div>
            <div className="pm-f"><label className="pm-l">Sort Order</label><input type="number" value={pSort} onChange={e=>setPSort(parseInt(e.target.value)||0)} className="pm-i" style={{width:100}} /></div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
              <button onClick={()=>setShowProductModal(false)} className="pm-b" style={{background:'#374151'}}>Cancel</button>
              <button onClick={saveProduct} disabled={pSaving} className="pm-b" style={{background:'#22c55e'}}>{pSaving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>}

        {/* Price Modal */}
        {showPriceModal && <div className="pm-modal-bg" onClick={()=>setShowPriceModal(false)}>
          <div className="pm-modal" onClick={e=>e.stopPropagation()}>
            <div className="pm-modal-t">{editPrice ? 'Edit Price' : 'New Price'}</div>
            <div className="pm-f"><label className="pm-l">Product *</label><select value={prProductId} onChange={e=>setPrProductId(e.target.value)} className="pm-i" disabled={!!editPrice}><option value=''>-- Select Product --</option>{products.map((p:any)=><option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}</select></div>
            <div className="pm-g3">
              <div className="pm-f"><label className="pm-l">Term (Years)</label><select value={prTermYears} onChange={e=>setPrTermYears(parseInt(e.target.value))} className="pm-i">{[1,2,3,4,5].map(y=><option key={y} value={y}>{y}</option>)}</select></div>
              <div className="pm-f"><label className="pm-l">Min Qty</label><input type="number" min="1" value={prMinQty} onChange={e=>setPrMinQty(parseInt(e.target.value)||1)} className="pm-i" /></div>
              <div className="pm-f"><label className="pm-l">Max Qty</label><input type="number" value={prMaxQty} onChange={e=>setPrMaxQty(parseInt(e.target.value)||999999)} className="pm-i" /></div>
            </div>
            <div className="pm-g2">
              <div className="pm-f"><label className="pm-l">Appliance Unit Price</label><input type="number" value={prAppPrice} onChange={e=>setPrAppPrice(parseFloat(e.target.value)||0)} className="pm-i" /></div>
              <div className="pm-f"><label className="pm-l">License/yr Unit Price</label><input type="number" value={prLicPrice} onChange={e=>setPrLicPrice(parseFloat(e.target.value)||0)} className="pm-i" /></div>
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'flex-end',marginTop:16}}>
              <button onClick={()=>setShowPriceModal(false)} className="pm-b" style={{background:'#374151'}}>Cancel</button>
              <button onClick={savePrice} disabled={prSaving} className="pm-b" style={{background:'#22c55e'}}>{prSaving?'Saving...':'Save'}</button>
            </div>
          </div>
        </div>}

      </div>
    </div>
  )
}
