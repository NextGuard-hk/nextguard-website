'use client'
import React, { useState } from 'react'
import { useRouter } from 'next/navigation'

type Step = 'login' | 'otp'

const CSS = `
  * { box-sizing: border-box; }
  .ql-root { min-height:100vh; background:#0a0f1a; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; font-family:system-ui,sans-serif; }
  .ql-logo { font-size:28px; font-weight:800; color:#fff; letter-spacing:2px; text-align:center; margin-bottom:4px; }
  .ql-logo span { color:#22c55e; }
  .ql-subtitle { color:#6b7280; font-size:13px; text-align:center; margin-bottom:32px; }
  .ql-card { background:#0d1117; border:1px solid #1f2937; border-radius:16px; padding:32px; width:100%; max-width:420px; }
  .ql-card-title { font-size:20px; font-weight:700; color:#f9fafb; margin-bottom:20px; }
  .ql-field { margin-bottom:16px; }
  .ql-label { color:#9ca3af; font-size:13px; margin-bottom:6px; display:block; }
  .ql-input { width:100%; padding:12px 14px; background:#111827; border:1px solid #1f2937; border-radius:8px; color:#e0e0e0; font-size:15px; outline:none; }
  .ql-input:focus { border-color:#374151; }
  .ql-otp-input { text-align:center; font-size:28px; letter-spacing:10px; }
  .ql-btn { width:100%; padding:13px; background:#22c55e; color:#fff; border:none; border-radius:8px; font-size:15px; font-weight:600; cursor:pointer; margin-top:4px; }
  .ql-btn:disabled { opacity:0.7; cursor:not-allowed; }
  .ql-btn-ghost { background:transparent; color:#6b7280; }
  .ql-error { background:#1f1212; border:1px solid #ef4444; color:#ef4444; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:16px; }
  .ql-message { background:#0d1f12; border:1px solid #22c55e; color:#22c55e; border-radius:8px; padding:10px 14px; font-size:13px; margin-bottom:16px; }
  .ql-hint { font-size:12px; color:#6b7280; text-align:center; margin-top:8px; }
  .ql-footer { color:#4b5563; font-size:12px; text-align:center; margin-top:24px; }
  @media (max-width:480px) {
    .ql-card { padding:20px 16px; border-radius:12px; }
    .ql-logo { font-size:24px; }
  }
`

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

  return (
    <div className="ql-root">
      <style>{CSS}</style>
      <div className="ql-logo"><span>NEXT</span>GUARD</div>
      <div className="ql-subtitle">Quotation System — Internal Sales Only</div>
      <div className="ql-card">
        {step === 'login' ? (
          <form onSubmit={handleLogin}>
            <div className="ql-card-title">Sign In</div>
            {error && <div className="ql-error">{error}</div>}
            <div className="ql-field">
              <label className="ql-label">Email Address</label>
              <input type="email" className="ql-input" value={email}
                onChange={e=>setEmail(e.target.value)}
                placeholder="your@company.com" required />
            </div>
            <div className="ql-field">
              <label className="ql-label">Password</label>
              <input type="password" className="ql-input" value={password}
                onChange={e=>setPassword(e.target.value)}
                placeholder="••••••••" required />
            </div>
            <button type="submit" className="ql-btn" disabled={loading}>
              {loading ? 'Signing in...' : 'Continue'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp}>
            <div className="ql-card-title">Verify Email</div>
            {message && <div className="ql-message">{message}</div>}
            {error && <div className="ql-error">{error}</div>}
            <div className="ql-field">
              <label className="ql-label">Verification Code</label>
              <input type="text" className="ql-input ql-otp-input" value={otpCode}
                onChange={e=>setOtpCode(e.target.value)}
                placeholder="000000" maxLength={6} required autoFocus />
            </div>
            <div className="ql-hint">Check your email: {email}</div>
            <button type="submit" className="ql-btn" disabled={loading} style={{marginTop:16}}>
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>
            <button type="button" className="ql-btn ql-btn-ghost"
              onClick={()=>{ setStep('login'); setError(''); setOtpCode('') }}
              style={{marginTop:8}}>
              Back
            </button>
          </form>
        )}
      </div>
      <div className="ql-footer">Internal use only · NextGuard Technology</div>
    </div>
  )
}
