'use client'
import React, { useState } from 'react'

type Step = 'login' | 'totp' | 'setup-scan' | 'setup-confirm'

export default function QtLoginPage() {
  const [step, setStep] = useState<Step>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [token, setToken] = useState('')
  const [setupData, setSetupData] = useState<{ secret: string; otpUri: string; confirmToken: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Login failed'); return }
      if (data.requireTotp) {
        setToken(data.preMfaToken)
        setStep('totp')
      } else if (data.requireTotpSetup) {
        setToken(data.setupToken)
        await initSetup(data.setupToken)
      }
    } catch { setError('Network error. Please try again.') }
    finally { setLoading(false) }
  }

  async function initSetup(setupToken: string) {
    const res = await fetch('/api/qt-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'setup-totp-init', setupToken }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Setup failed'); return }
    setSetupData({ secret: data.secret, otpUri: data.otpUri, confirmToken: data.confirmToken })
    setStep('setup-scan')
  }

  async function handleVerifyTotp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-totp', preMfaToken: token, totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid code'); return }
      window.location.href = '/qt'
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  async function handleSetupConfirm(e: React.FormEvent) {
    e.preventDefault()
    if (!setupData) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-totp-confirm', confirmToken: setupData.confirmToken, totpCode }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Invalid code'); return }
      window.location.href = '/qt'
    } catch { setError('Network error.') }
    finally { setLoading(false) }
  }

  const qrUrl = setupData ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(setupData.otpUri)}` : ''

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', letterSpacing: -1 }}>NEXT<span style={{ color: '#22c55e' }}>GUARD</span></div>
          <div style={{ color: '#888', fontSize: 13, marginTop: 6 }}>Quotation System — Internal Sales Only</div>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 16, padding: 32 }}>
          {/* STEP: Login */}
          {step === 'login' && (
            <form onSubmit={handleLogin}>
              <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, marginBottom: 24, marginTop: 0 }}>Sign In</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Email Address</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="sales@next-guard.com" autoComplete="email" />
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ color: '#9ca3af', fontSize: 13, display: 'block', marginBottom: 6 }}>Password</label>
                <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  placeholder="••••••••" autoComplete="current-password" />
              </div>
              {error && <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '12px', background: loading ? '#374151' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Signing in...' : 'Continue'}
              </button>
            </form>
          )}

          {/* STEP: TOTP Verify */}
          {step === 'totp' && (
            <form onSubmit={handleVerifyTotp}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Two-Factor Authentication</h2>
                <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Enter the 6-digit code from your authenticator app</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <input type="text" required value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 28, fontWeight: 700, textAlign: 'center', outline: 'none', letterSpacing: 12, boxSizing: 'border-box' }}
                  placeholder="000000" maxLength={6} autoComplete="one-time-code" autoFocus />
              </div>
              {error && <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={loading || totpCode.length !== 6}
                style={{ width: '100%', padding: '12px', background: (loading || totpCode.length !== 6) ? '#374151' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: (loading || totpCode.length !== 6) ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Verifying...' : 'Verify & Sign In'}
              </button>
              <button type="button" onClick={() => { setStep('login'); setTotpCode(''); setError('') }}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>← Back</button>
            </form>
          )}

          {/* STEP: Setup Scan */}
          {step === 'setup-scan' && setupData && (
            <div>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📱</div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Set Up 2FA</h2>
                <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Scan this QR code with Google Authenticator or Authy</p>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <img src={qrUrl} alt="QR Code" style={{ width: 200, height: 200, borderRadius: 8, background: '#fff', padding: 8 }} />
              </div>
              <div style={{ background: '#1f2937', borderRadius: 8, padding: '10px 14px', marginBottom: 20 }}>
                <div style={{ color: '#9ca3af', fontSize: 11, marginBottom: 4 }}>MANUAL ENTRY SECRET</div>
                <div style={{ color: '#22c55e', fontSize: 13, fontFamily: 'monospace', wordBreak: 'break-all' }}>{setupData.secret}</div>
              </div>
              <button onClick={() => { setStep('setup-confirm'); setTotpCode('') }}
                style={{ width: '100%', padding: '12px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                I've scanned it →
              </button>
            </div>
          )}

          {/* STEP: Setup Confirm */}
          {step === 'setup-confirm' && (
            <form onSubmit={handleSetupConfirm}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
                <h2 style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>Confirm Setup</h2>
                <p style={{ color: '#9ca3af', fontSize: 13, marginTop: 8 }}>Enter the 6-digit code to confirm setup</p>
              </div>
              <div style={{ marginBottom: 24 }}>
                <input type="text" required value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  style={{ width: '100%', padding: '14px', background: '#1f2937', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 28, fontWeight: 700, textAlign: 'center', outline: 'none', letterSpacing: 12, boxSizing: 'border-box' }}
                  placeholder="000000" maxLength={6} autoFocus />
              </div>
              {error && <div style={{ background: '#7f1d1d', border: '1px solid #dc2626', borderRadius: 8, padding: '10px 14px', color: '#fca5a5', fontSize: 13, marginBottom: 16 }}>{error}</div>}
              <button type="submit" disabled={loading || totpCode.length !== 6}
                style={{ width: '100%', padding: '12px', background: (loading || totpCode.length !== 6) ? '#374151' : '#22c55e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>
                {loading ? 'Confirming...' : 'Activate 2FA & Sign In'}
              </button>
              <button type="button" onClick={() => setStep('setup-scan')}
                style={{ width: '100%', padding: '10px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>← Back to QR Code</button>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#4b5563', fontSize: 12, marginTop: 20 }}>Internal use only · NextGuard Technology</p>
      </div>
    </div>
  )
}
