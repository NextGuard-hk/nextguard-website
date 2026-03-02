'use client'
import { useState, useEffect } from 'react'

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', domain: '', adminEmail: '', adminPassword: '' })

  function getAuth() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ng_token') : null
    return { token }
  }

  async function loadTenants() {
    const { token } = getAuth()
    if (!token) { setLoading(false); return }
    try {
      const res = await fetch('/api/v1/tenants', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setTenants(data.tenants || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadTenants() }, [])

  async function createTenant() {
    const { token } = getAuth()
    if (!token) return
    const res = await fetch('/api/v1/tenants', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    const data = await res.json()
    if (data.success) {
      loadTenants()
      setShowCreate(false)
      setForm({ name: '', domain: '', adminEmail: '', adminPassword: '' })
    }
  }

  const cardStyle = { background: '#1e293b', borderRadius: 12, padding: 24, marginBottom: 16 }
  const btnStyle = { background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 as const, fontSize: 14 }
  const inputStyle = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', padding: 32 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Tenant Management</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0' }}>Super Admin - Manage multi-tenant organizations</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} style={btnStyle}>
            {showCreate ? 'Cancel' : '+ Add Tenant'}
          </button>
        </div>
        {showCreate && (
          <div style={{ ...cardStyle, border: '1px solid #2563eb' }}>
            <h3 style={{ margin: '0 0 16px', color: '#00d4ff' }}>Register New Tenant</h3>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company Name" style={inputStyle} />
            <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="Domain (e.g. acme-corp.com)" style={inputStyle} />
            <input value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="Admin Email" style={inputStyle} />
            <input value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="Admin Password" type="password" style={inputStyle} />
            <button onClick={createTenant} style={{ ...btnStyle, background: '#059669' }}>Create Tenant</button>
          </div>
        )}
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>Loading...</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: 16 }}>
            {tenants.map(t => (
              <div key={t.id} style={cardStyle}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{t.name}</div>
                <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>{t.domain}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#00d4ff' }}>{t.agentCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Agents</div>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{t.policyCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Policies</div>
                  </div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ background: t.status === 'active' ? '#064e3b' : '#7f1d1d', borderRadius: 12, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                    {t.status?.toUpperCase()}
                  </span>
                  <span style={{ color: '#475569', fontSize: 11 }}>ID: {t.id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
