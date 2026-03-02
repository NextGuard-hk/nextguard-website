'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const ROLES = ['super-admin','admin','it-admin','analyst','viewer','user']
const ROLE_COLORS: Record<string,string> = {
  'super-admin':'#dc2626','admin':'#ea580c','it-admin':'#2563eb',
  'analyst':'#8b5cf6','viewer':'#6b7280','user':'#64748b'
}
const ROLE_DESC: Record<string,string> = {
  'super-admin':'Full system access, manage all tenants',
  'admin':'Tenant admin, manage agents/policies/users',
  'it-admin':'IT operations, manage agents & policies',
  'analyst':'View & export audit data',
  'viewer':'Read-only access',
  'user':'Basic view only'
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showUserForm, setShowUserForm] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<any>(null)
  const [tenantUsers, setTenantUsers] = useState<any[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [form, setForm] = useState({ name: '', domain: '', adminEmail: '', adminPassword: '', plan: 'starter' })
  const [userForm, setUserForm] = useState({ email: '', password: '', name: '', role: 'viewer', tenantId: '' })

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
      else setError(data.error || 'Failed to load tenants')
    } catch { setError('Network error') }
    setLoading(false)
  }

  useEffect(() => { loadTenants() }, [])

  async function createTenant() {
    setError(''); setSuccess('')
    const { token } = getAuth()
    if (!token) { setError('Not authenticated'); return }
    if (!form.name || !form.domain || !form.adminEmail || !form.adminPassword) {
      setError('All fields are required'); return
    }
    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`Tenant "${form.name}" created successfully!`)
        loadTenants()
        setShowCreate(false)
        setForm({ name: '', domain: '', adminEmail: '', adminPassword: '', plan: 'starter' })
      } else { setError(data.error || 'Failed to create tenant') }
    } catch { setError('Network error') }
  }

  async function createUser() {
    setError(''); setSuccess('')
    const { token } = getAuth()
    if (!token) return
    if (!userForm.email || !userForm.password || !userForm.name) {
      setError('All user fields required'); return
    }
    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-user', ...userForm, tenantId: userForm.tenantId || selectedTenant?.id })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`User "${userForm.name}" created with role: ${userForm.role}`)
        setShowUserForm(false)
        setUserForm({ email: '', password: '', name: '', role: 'viewer', tenantId: '' })
      } else { setError(data.error || 'Failed') }
    } catch { setError('Network error') }
  }

  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const input = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' as const, marginBottom: 12 }
  const btn = { background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600 as const, fontSize: 14 }

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: '0 auto', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Tenant Management</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 14 }}>Multi-tenant organizations &amp; RBAC user management</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowUserForm(!showUserForm)} style={{ ...btn, background: '#7c3aed' }}>+ Add User</button>
          <button onClick={() => setShowCreate(!showCreate)} style={btn}>{showCreate ? 'Cancel' : '+ Add Tenant'}</button>
          <Link href="/console" style={{ ...btn, background: '#334155', textDecoration: 'none' }}>← Console</Link>
        </div>
      </div>

      {error && <div style={{ background: '#7f1d1d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button></div>}
      {success && <div style={{ background: '#14532d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', color: '#86efac', cursor: 'pointer' }}>✕</button></div>}

      {showCreate && (
        <div style={card}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Register New Tenant</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company Name" style={input} />
            <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="Domain (e.g. acme-corp.com)" style={input} />
            <input value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="Admin Email" style={input} />
            <input value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="Admin Password" type="password" style={input} />
            <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} style={input}>
              <option value="starter">Starter (50 agents)</option>
              <option value="professional">Professional (500 agents)</option>
              <option value="enterprise">Enterprise (unlimited)</option>
            </select>
          </div>
          <button onClick={createTenant} style={btn}>Create Tenant</button>
        </div>
      )}

      {showUserForm && (
        <div style={card}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Add User to Tenant (RBAC)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <input value={userForm.name} onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))} placeholder="Full Name" style={input} />
            <input value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="Email" style={input} />
            <input value={userForm.password} onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))} placeholder="Password" type="password" style={input} />
            <select value={userForm.tenantId} onChange={e => setUserForm(f => ({ ...f, tenantId: e.target.value }))} style={input}>
              <option value="">Select Tenant</option>
              {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <select value={userForm.role} onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))} style={input}>
              {ROLES.map(r => <option key={r} value={r}>{r} — {ROLE_DESC[r]}</option>)}
            </select>
          </div>
          <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: '#94a3b8', margin: 0 }}>Role Permissions (AD-style):</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {['Read','View','Modify','Delete','Add','Manage Agents','Manage Policies','View Audit','Export','Settings'].map((p, i) => (
                <span key={i} style={{ background: i < (['super-admin','admin','it-admin','analyst','viewer','user'].indexOf(userForm.role) < 2 ? 10 : ['super-admin','admin','it-admin','analyst','viewer','user'].indexOf(userForm.role) < 3 ? 7 : ['super-admin','admin','it-admin','analyst','viewer','user'].indexOf(userForm.role) < 4 ? 4 : 2) ? '#22c55e33' : '#33415533', color: '#94a3b8', fontSize: 11, padding: '2px 8px', borderRadius: 4 }}>{p}</span>
              ))}
            </div>
          </div>
          <button onClick={createUser} style={btn}>Create User</button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading...</div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {tenants.map(t => (
              <div key={t.id} style={{ ...card, cursor: 'pointer', border: selectedTenant?.id === t.id ? '2px solid #3b82f6' : '1px solid #334155' }}
                onClick={() => setSelectedTenant(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h3 style={{ fontSize: 16, margin: 0 }}>{t.name}</h3>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: t.status === 'active' ? '#22c55e33' : '#ef444433', color: t.status === 'active' ? '#4ade80' : '#f87171' }}>{t.status?.toUpperCase()}</span>
                </div>
                <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 12px' }}>{t.domain}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>{t.agentCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Agents</div>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{t.policyCount}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Policies</div>
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>{t.userCount || 0}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Users</div>
                  </div>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                  Plan: <span style={{ color: '#f1f5f9' }}>{t.plan}</span> | ID: <span style={{ fontFamily: 'monospace' }}>{t.id}</span>
                </div>
              </div>
            ))}
          </div>
          {tenants.length === 0 && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>No tenants found. Login as admin to view tenants.</div>}
        </div>
      )}
    </div>
  )
}
