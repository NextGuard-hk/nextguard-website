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
const PERMISSIONS = ['Read','View','Modify','Delete','Add','Manage Agents','Manage Policies','View Audit','Export','Settings']
const ROLE_PERMS: Record<string,string[]> = {
  'super-admin': ['Read','View','Modify','Delete','Add','Manage Agents','Manage Policies','View Audit','Export','Settings'],
  'admin': ['Read','View','Modify','Delete','Add','Manage Agents','Manage Policies','View Audit','Export','Settings'],
  'it-admin': ['Read','View','Modify','Add','Manage Agents','Manage Policies','View Audit'],
  'analyst': ['Read','View','View Audit','Export'],
  'viewer': ['Read','View'],
  'user': ['View']
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
  const [showPermTable, setShowPermTable] = useState(false)
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
    if (!token) { setError('Not authenticated. Please login first.'); return }
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
        setTimeout(() => setSuccess(''), 4000)
      } else { setError(data.error || 'Failed to create tenant') }
    } catch { setError('Network error') }
  }

  async function createUser() {
    setError(''); setSuccess('')
    const { token } = getAuth()
    if (!token) { setError('Not authenticated'); return }
    if (!userForm.email || !userForm.password || !userForm.name) {
      setError('All user fields required'); return
    }
    const tid = userForm.tenantId || selectedTenant?.id
    if (!tid) { setError('Please select a tenant'); return }
    try {
      const res = await fetch('/api/v1/tenants', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create-user', ...userForm, tenantId: tid })
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(`User "${userForm.name}" created with role: ${userForm.role}`)
        setShowUserForm(false)
        setUserForm({ email: '', password: '', name: '', role: 'viewer', tenantId: '' })
        loadTenants()
        setTimeout(() => setSuccess(''), 4000)
      } else { setError(data.error || 'Failed') }
    } catch { setError('Network error') }
  }

  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const input: React.CSSProperties = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }
  const btn: React.CSSProperties = { background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontWeight: 600, fontSize: 14 }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>Tenant Management</h1>
        <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Multi-tenant organizations & RBAC user management (AD-style permissions)</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <button onClick={() => setShowUserForm(!showUserForm)} style={{ ...btn, background: '#7c3aed' }}>+ Add User</button>
          <button onClick={() => setShowCreate(!showCreate)} style={btn}>{showCreate ? 'Cancel' : '+ Add Tenant'}</button>
          <button onClick={() => setShowPermTable(!showPermTable)} style={{ ...btn, background: '#059669' }}>
            {showPermTable ? 'Hide' : 'Show'} RBAC Permission Matrix
          </button>
          <Link href="/console" style={{ ...btn, background: '#475569', textDecoration: 'none', display: 'inline-block' }}>&larr; Console</Link>
        </div>

        {error && <div style={{ ...card, background: '#450a0a', border: '1px solid #dc2626', display: 'flex', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>&times;</button>
        </div>}
        {success && <div style={{ ...card, background: '#052e16', border: '1px solid #16a34a' }}>{success}</div>}

        {showPermTable && (
          <div style={{ ...card, overflowX: 'auto' }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>RBAC Permission Matrix (AD-style)</h3>
            <p style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>Each tenant has isolated access. Users cannot access other tenants' data.</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={{ textAlign: 'left', padding: 8, color: '#94a3b8' }}>Role</th>
                  {PERMISSIONS.map(p => <th key={p} style={{ textAlign: 'center', padding: 8, color: '#94a3b8' }}>{p}</th>)}
                </tr>
              </thead>
              <tbody>
                {ROLES.map(role => (
                  <tr key={role} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: 8 }}>
                      <span style={{ background: ROLE_COLORS[role], padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{role}</span>
                      <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{ROLE_DESC[role]}</div>
                    </td>
                    {PERMISSIONS.map(p => (
                      <td key={p} style={{ textAlign: 'center', padding: 8 }}>
                        {ROLE_PERMS[role]?.includes(p) ? <span style={{ color: '#4ade80' }}>&#10003;</span> : <span style={{ color: '#475569' }}>&mdash;</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div style={card}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Register New Tenant</h3>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Company Name" style={input} />
            <input value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="Domain (e.g. acme-corp.com)" style={input} />
            <input value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} placeholder="Admin Email" style={input} />
            <input value={form.adminPassword} onChange={e => setForm(f => ({ ...f, adminPassword: e.target.value }))} placeholder="Admin Password" type="password" style={input} />
            <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))} style={input}>
              <option value="starter">Starter (50 agents)</option>
              <option value="professional">Professional (500 agents)</option>
              <option value="enterprise">Enterprise (unlimited)</option>
            </select>
            <button onClick={createTenant} style={btn}>Create Tenant</button>
          </div>
        )}

        {showUserForm && (
          <div style={card}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Add User to Tenant (RBAC)</h3>
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
            <div style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 12 }}>
              <strong>Permissions for {userForm.role}:</strong>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {PERMISSIONS.map(p => (
                  <span key={p} style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    background: ROLE_PERMS[userForm.role]?.includes(p) ? '#166534' : '#1e293b',
                    color: ROLE_PERMS[userForm.role]?.includes(p) ? '#4ade80' : '#475569' }}>{p}</span>
                ))}
              </div>
            </div>
            <button onClick={createUser} style={btn}>Create User</button>
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>Loading...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {tenants.map(t => (
              <div key={t.id} style={{ ...card, cursor: 'pointer', border: selectedTenant?.id === t.id ? '2px solid #3b82f6' : '1px solid #334155' }}
                onClick={() => setSelectedTenant(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700 }}>{t.name}</h3>
                  <span style={{ background: t.status === 'active' ? '#166534' : '#991b1b', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{t.status?.toUpperCase()}</span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{t.domain}</div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, marginBottom: 8 }}>
                  <div><strong>{t.agentCount}</strong> <span style={{ color: '#64748b' }}>Agents</span></div>
                  <div><strong>{t.policyCount}</strong> <span style={{ color: '#64748b' }}>Policies</span></div>
                  <div><strong>{t.userCount || 0}</strong> <span style={{ color: '#64748b' }}>Users</span></div>
                </div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Plan: <strong>{t.plan}</strong> | ID: <code style={{ fontSize: 10 }}>{t.id}</code></div>
              </div>
            ))}
            {tenants.length === 0 && <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>No tenants found. Login as admin to view tenants.</div>}
          </div>
        )}
      </div>
    </div>
  )
}
