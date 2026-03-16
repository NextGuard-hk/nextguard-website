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
        body: JSON.stringify({ action: 'verify-otp', preMfaToken: token, otpCode }),
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

      <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 32, width: 380, maxWidth: '90vw' }}>
        {step === 'login' && (
          <form onSubmit={handleLogin}>
            <h2 style={{ color: '#f9fafb', margin: '0 0 20px', fontSize: 20 }}>Sign In</h2>
            {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 14 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 4 }}>Email Address</label>
              <input type='email' value={email} onChange={e => setEmail(e.target.value)} required placeholder='your@company.com' style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 4 }}>Password</label>
              <input type='password' value={password} onChange={e => setPassword(e.target.value)} required style={inp} />
            </div>
            <button type='submit' disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>{loading ? 'Signing in...' : 'Continue'}</button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleOtp}>
            <h2 style={{ color: '#f9fafb', margin: '0 0 8px', fontSize: 20 }}>Verify Your Identity</h2>
            <p style={{ color: '#9ca3af', fontSize: 13, marginBottom: 20 }}>{message}</p>
            {error && <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13 }}>{error}</div>}
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 4 }}>Verification Code</label>
              <input type='text' value={otpCode} onChange={e => setOtpCode(e.target.value)} required placeholder='Enter 6-digit code' maxLength={6} style={{ ...inp, textAlign: 'center', fontSize: 24, letterSpacing: 8 }} autoFocus />
            </div>
            <button type='submit' disabled={loading} style={{ ...btn, opacity: loading ? 0.7 : 1 }}>{loading ? 'Verifying...' : 'Verify & Sign In'}</button>
            <button type='button' onClick={() => { setStep('login'); setError(''); setOtpCode('') }} style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#6b7280', fontSize: 13, cursor: 'pointer', marginTop: 12 }}>Back to login</button>
          </form>
        )}
      </div>
      <div style={{ color: '#374151', fontSize: 12, marginTop: 24 }}>Internal use only &middot; NextGuard Technology</div>
    </div>
  )
}
