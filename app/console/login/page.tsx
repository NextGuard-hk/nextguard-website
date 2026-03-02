'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ConsolLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password })
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem('ng_token', data.token)
        localStorage.setItem('ng_user', JSON.stringify(data.user))
        router.push('/console')
      } else {
        setError(data.error || 'Login failed')
      }
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#1e293b', borderRadius: 16, padding: 48, width: '100%', maxWidth: 420, boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#00d4ff', letterSpacing: '-1px' }}>NextGuard</div>
          <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>DLP Management Console</div>
        </div>
        {error && (
          <div style={{ background: '#450a0a', border: '1px solid #dc2626', color: '#fca5a5', borderRadius: 8, padding: '12px 16px', marginBottom: 24, fontSize: 14 }}>
            {error}
          </div>
        )}
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Email Address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              placeholder="admin@company.com"
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: '#94a3b8', fontSize: 13, marginBottom: 6, fontWeight: 500 }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '12px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: loading ? '#1e40af' : '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '14px', fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <div style={{ marginTop: 24, padding: '16px', background: '#0f172a', borderRadius: 8, fontSize: 12, color: '#475569' }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#64748b' }}>Demo Accounts:</div>
          <div>super@nextguard.com / super123 (Super Admin)</div>
          <div>admin@alpha-corp.com / alpha123 (Alpha Corp)</div>
          <div>admin@beta-tech.com / beta123 (Beta Tech)</div>
        </div>
      </div>
    </div>
  )
}
