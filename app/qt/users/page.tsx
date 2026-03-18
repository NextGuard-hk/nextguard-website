'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROLE_OPTIONS = [
  { value: '', label: 'No QT Access' },
  { value: 'admin', label: 'Admin' },
  { value: 'sales', label: 'Sales' },
  { value: 'product_manager', label: 'Product Manager' },
]

const ROLE_COLOR: Record<string, string> = {
  admin: '#ef4444',
  sales: '#3b82f6',
  product_manager: '#8b5cf6',
}

export default function UserManagement() {
  const router = useRouter()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetch('/api/qt-auth').then(r => r.json()).then(d => {
      if (!d.authenticated || d.user?.role !== 'admin') {
        router.replace('/qt'); return
      }
      loadUsers()
    }).catch(() => router.replace('/qt-login'))
  }, [router])

  async function loadUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/qt-users')
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setUsers(d.users || [])
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function setRole(userId: string, qtRole: string) {
    setSaving(userId); setError('')
    try {
      const res = await fetch('/api/qt-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set-role', userId, qtRole })
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      setSuccess(`Role updated for ${d.email}`)
      setTimeout(() => setSuccess(''), 3000)
      await loadUsers()
    } catch (e: any) { setError(e.message) }
    finally { setSaving('') }
  }

  const filtered = users.filter(u => {
    if (!search) return true
    const s = search.toLowerCase()
    return u.email?.toLowerCase().includes(s) ||
      u.contactName?.toLowerCase().includes(s) ||
      u.company?.toLowerCase().includes(s)
  })

  const qtUsers = filtered.filter(u => u.qtRole)
  const otherUsers = filtered.filter(u => !u.qtRole)

  if (loading) return <div style={{minHeight:'100vh',background:'#0a0e17',color:'#e0e0e0',display:'flex',alignItems:'center',justifyContent:'center'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh',background:'#0a0e17',color:'#e0e0e0',fontFamily:'system-ui,sans-serif'}}>
      <div style={{background:'#0d1117',borderBottom:'1px solid #1f2937',padding:'12px 16px',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <button onClick={() => router.push('/qt')} style={{background:'none',border:'none',color:'#9ca3af',fontSize:20,cursor:'pointer',padding:0}}>{"\u2190"}</button>
        <span style={{fontWeight:700,fontSize:15,color:'#fff'}}>User Role Management</span>
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:16}}>
        {error && <div style={{background:'#7f1d1d',border:'1px solid #ef4444',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#fca5a5'}}>{error}</div>}
        {success && <div style={{background:'#064e3b',border:'1px solid #22c55e',borderRadius:8,padding:'12px 16px',marginBottom:16,color:'#86efac'}}>{success}</div>}

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, company..."
          style={{width:'100%',padding:'10px 14px',background:'#111827',border:'1px solid #1f2937',borderRadius:8,color:'#e0e0e0',fontSize:14,marginBottom:16,outline:'none',boxSizing:'border-box'}}
        />

        {qtUsers.length > 0 && (
          <div style={{marginBottom:24}}>
            <h3 style={{color:'#f9fafb',fontSize:16,fontWeight:600,marginBottom:12}}>QT System Users ({qtUsers.length})</h3>
            {qtUsers.map(u => (
              <UserCard key={u.id} user={u} saving={saving} onSetRole={setRole} />
            ))}
          </div>
        )}

        <h3 style={{color:'#f9fafb',fontSize:16,fontWeight:600,marginBottom:12}}>All Registered Users ({otherUsers.length})</h3>
        {otherUsers.map(u => (
          <UserCard key={u.id} user={u} saving={saving} onSetRole={setRole} />
        ))}

        {filtered.length === 0 && <div style={{textAlign:'center',padding:40,color:'#6b7280'}}>No users found</div>}
      </div>
    </div>
  )
}

function UserCard({ user, saving, onSetRole }: { user: any; saving: string; onSetRole: (id: string, role: string) => void }) {
  const u = user
  const roleLabel = ROLE_OPTIONS.find(r => r.value === (u.qtRole || ''))?.label || 'No QT Access'
  const roleColor = ROLE_COLOR[u.qtRole] || '#6b7280'

  return (
    <div style={{background:'#0d1117',border:'1px solid #1f2937',borderRadius:10,padding:14,marginBottom:10}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:8}}>
        <div>
          <div style={{color:'#f9fafb',fontWeight:600,fontSize:14}}>{u.contactName || u.email}</div>
          <div style={{color:'#6b7280',fontSize:12}}>{u.email}</div>
          {u.company && <div style={{color:'#6b7280',fontSize:12}}>{u.company}</div>}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
          {u.qtRole && <span style={{background:roleColor,color:'#fff',padding:'2px 10px',borderRadius:12,fontSize:11,fontWeight:600}}>{roleLabel}</span>}
          {!u.active && <span style={{background:'#374151',color:'#9ca3af',padding:'2px 8px',borderRadius:12,fontSize:11}}>Inactive</span>}
          <select
            value={u.qtRole || ''}
            onChange={e => onSetRole(u.id, e.target.value)}
            disabled={saving === u.id}
            style={{background:'#111827',border:'1px solid #1f2937',borderRadius:6,color:'#e0e0e0',padding:'4px 8px',fontSize:12,cursor:'pointer'}}
          >
            {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>
    </div>
  )
}
