'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Step = 'credentials' | 'totp' | 'totp-setup';

export default function QuotationLogin() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totp, setTotp] = useState('');
  const [preMfaToken, setPreMfaToken] = useState('');
  const [setupToken, setSetupToken] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [setupUri, setSetupUri] = useState('');
  const [confirmToken, setConfirmToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function saveAndRedirect(token: string) {
    localStorage.setItem('qt_token', token);
    router.push('/quotation-admin');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      if (data.requireTotp) {
        setPreMfaToken(data.preMfaToken);
        setStep('totp');
      } else if (data.requireTotpSetup) {
        // First time - need to set up TOTP
        setSetupToken(data.setupToken);
        await initTotpSetup(data.setupToken);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function initTotpSetup(token: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-totp-init', setupToken: token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup failed');
      setSetupSecret(data.secret);
      setSetupUri(data.otpUri);
      setConfirmToken(data.confirmToken);
      setStep('totp-setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify-totp', preMfaToken, totpCode: totp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '2FA failed');
      saveAndRedirect(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleTotpSetupConfirm(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/qt-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'setup-totp-confirm', confirmToken, totpCode: totp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Setup confirmation failed');
      saveAndRedirect(data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">NextGuard</h1>
          <p className="text-gray-400 mt-1">Quotation System — Internal Only</p>
        </div>

        {step === 'credentials' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {step === 'totp' && (
          <form onSubmit={handleTotp} className="space-y-4">
            <p className="text-gray-300 text-sm text-center">Enter the 6-digit code from your authenticator app.</p>
            <input
              type="text"
              value={totp}
              onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              required
              autoFocus
              placeholder="000000"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || totp.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
            <button type="button" onClick={() => { setStep('credentials'); setError(''); setTotp(''); }} className="w-full text-gray-500 text-sm hover:text-gray-300">
              Back
            </button>
          </form>
        )}

        {step === 'totp-setup' && (
          <div className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 text-sm text-blue-200">
              <p className="font-semibold mb-2">First-time 2FA Setup Required</p>
              <p>Scan the QR code or enter the secret manually in Google Authenticator or Authy, then enter the code below.</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 break-all text-xs text-gray-300 font-mono">
              <p className="text-gray-500 text-xs mb-1">Secret key (manual entry):</p>
              <p className="select-all">{setupSecret}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 break-all text-xs text-gray-400">
              <p className="text-gray-500 text-xs mb-1">OTP URI (convert to QR at qr-code-generator.com):</p>
              <p className="select-all text-blue-400">{setupUri}</p>
            </div>
            <form onSubmit={handleTotpSetupConfirm} className="space-y-3">
              <label className="block text-sm text-gray-400">Enter the 6-digit code from your app to confirm setup:</label>
              <input
                type="text"
                value={totp}
                onChange={e => setTotp(e.target.value.replace(/\D/g, ''))}
                maxLength={6}
                required
                autoFocus
                placeholder="000000"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-widest focus:outline-none focus:border-blue-500"
              />
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading || totp.length !== 6}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition"
              >
                {loading ? 'Confirming...' : 'Confirm & Login'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
