'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'login' | 'otp'

export default function QtLoginPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [token, setToken] = useState('')
  const [otpToken, setOtpToken] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      if (d.requireOtp) {
        setToken(d.preMfaToken)
        setOtpToken(d.otpToken || '')
        setMessage(d.message || 'Verification code sent to your email.')
        setStep('otp')
      }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handleOtp(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-otp', preMfaToken: token, otpToken, otpCode }),
      })
      const d = await res.json()
      if (d.error) { setError(d.error); return }
      if (d.success) { router.replace('/qt') }
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', background: '#111827', border: '1px solid #1f2937', borderRadius: 8, color: '#e0e0e0', fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const btn: React.CSSProperties = { width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e17', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <h1 style={{ color: '#f9fafb', margin: 0, fontSize: 28 }}>NEXT<span style={{ color: '#22c55e' }}>GUARD</span></h1>
        <div style={{ color: '#6b7280', fontSize: 14, marginTop: 6 }}>Quotation System &mdash; Internal Sales Only</div>
      </div>
      <div style={{ background: '#111827', borderRadius: 16, padding: '32px 28px', width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
        {step === 'login' ? (
          <form onSubmit={handleLogin}>
            <h2 style={{ color: '#f9fafb', margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>Sign In</h2>
            {error && <div style={{ background: '#ef4444', color: '#fff', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <div style={{ marginBottom: 16 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inp} placeholder="your@company.com" required />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inp} placeholder="••••••••" required />
            </div>
            <button type="submit" style={btn} disabled={loading}>{loading ? 'Signing in...' : 'Continue'}</button>
          </form>
        ) : (
          <form onSubmit={handleOtp}>
            <h2 style={{ color: '#f9fafb', margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>Verify Email</h2>
            {message && <div style={{ color: '#22c55e', fontSize: 13, marginBottom: 16 }}>{message}</div>}
            {error && <div style={{ background: '#ef4444', color: '#fff', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Verification Code</label>
              <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} style={{ ...inp, fontSize: 24, letterSpacing: 8, textAlign: 'center' }} placeholder="000000" maxLength={6} required autoFocus />
              <div style={{ color: '#6b7280', fontSize: 12, marginTop: 6 }}>Check your email: {email}</div>
            </div>
            <button type="submit" style={btn} disabled={loading}>{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
            <button type="button" onClick={() => { setStep('login'); setError(''); setOtpCode('') }} style={{ ...btn, background: 'transparent', color: '#6b7280', marginTop: 8 }}>Back</button>
          </form>
        )}
      </div>
      <div style={{ color: '#374151', fontSize: 12, marginTop: 24 }}>Internal use only &middot; NextGuard Technology</div>
    </div>
  )
}
