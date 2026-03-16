// app/api/qt-auth/route.ts
// Quotation System Auth - Uses same account system as /admin (download-users)
import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../download-users/route'
import { initQuotationDB, seedDefaultProducts } from '@/lib/quotation-db'

const QT_JWT_SECRET = process.env.QT_JWT_SECRET || process.env.JWT_SECRET || 'qt-nextguard-secret-2026'
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
// Master admin password - same as Admin Dashboard login
const ADMIN_PASSWORD = process.env.CONTACT_ADMIN_PASSWORD || ''

function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'NextGuard Quotation <noreply@next-guard.com>',
      to: [to], subject, html
    }),
  })
}

// JWT helpers
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function base64urlDecode(str: string): string {
  const padded = str + '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

interface QtJWTPayload {
  userId: string; email: string; name: string; role: string
  mfaVerified: boolean; iat: number; exp: number
}

function signQtToken(payload: Omit<QtJWTPayload, 'iat' | 'exp'>, expiresIn = 28800): string {
  const now = Math.floor(Date.now() / 1000)
  const full: QtJWTPayload = { ...payload, iat: now, exp: now + expiresIn }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(full))
  const sig = base64url(QT_JWT_SECRET + '.qt.' + header + '.' + body)
  return header + '.' + body + '.' + sig
}

function verifyQtToken(token: string): QtJWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const expectedSig = base64url(QT_JWT_SECRET + '.qt.' + parts[0] + '.' + parts[1])
    if (parts[2] !== expectedSig) return null
    const payload = JSON.parse(base64urlDecode(parts[1])) as QtJWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export function authenticateQtRequest(req: NextRequest): QtJWTPayload | null {
  const cookie = req.cookies.get('qt_session')?.value
  if (!cookie) return null
  const payload = verifyQtToken(cookie)
  if (!payload || !payload.mfaVerified) return null
  return payload
}

// Rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
function isRateLimited(ip: string): boolean {
  const a = loginAttempts.get(ip)
  if (!a) return false
  if (Date.now() - a.lastAttempt > 15 * 60 * 1000) { loginAttempts.delete(ip); return false }
  return a.count >= 5
}
function recordAttempt(ip: string) {
  const a = loginAttempts.get(ip)
  if (a) { a.count++; a.lastAttempt = Date.now() }
  else loginAttempts.set(ip, { count: 1, lastAttempt: Date.now() })
}
function clearAttempts(ip: string) { loginAttempts.delete(ip) }

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const body = await req.json().catch(() => ({}))
  const { action } = body

  // Initialize QT DB on first call
  await initQuotationDB().catch(() => {})

  // STEP 1: Email + Password Login
  if (action === 'login') {
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait 15 minutes.' }, { status: 429 })
    }
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }

    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      recordAttempt(ip)
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account is disabled.' }, { status: 403 })
    }

    // Accept EITHER: 1) per-user passwordHash match, OR 2) master admin password
    const hash = await hashPassword(password)
    const passwordValid = (hash === user.passwordHash) || (ADMIN_PASSWORD && password === ADMIN_PASSWORD)
    if (!passwordValid) {
      recordAttempt(ip)
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    clearAttempts(ip)

    // Send OTP email for 2FA
    const otp = generateOTP()
    user.otp = otp
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await saveUsers(users)

    const preMfaToken = signQtToken(
      { userId: user.id, email: user.email, name: user.contactName || user.email, role: 'admin', mfaVerified: false },
      600
    )

    try {
      await sendEmail(email, 'NextGuard Quotation - Login Verification Code',
        `<div style="font-family:sans-serif;max-width:400px;margin:0 auto;padding:20px;background:#0d1117;color:#e0e0e0;border-radius:12px">
        <h2 style="color:#22c55e">NextGuard Quotation System</h2>
        <p>Your login verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#111827;border-radius:8px;color:#22c55e">${otp}</div>
        <p style="color:#9ca3af;font-size:13px">This code expires in 10 minutes.</p>
        </div>`
      )
    } catch (e) {
      return NextResponse.json({ error: 'Failed to send verification email.' }, { status: 500 })
    }

    return NextResponse.json({ requireOtp: true, preMfaToken, message: 'Verification code sent to your email.' })
  }

  // STEP 2: Verify OTP code
  if (action === 'verify-otp') {
    const { preMfaToken, otpCode } = body
    if (!preMfaToken || !otpCode) {
      return NextResponse.json({ error: 'Token and OTP code are required.' }, { status: 400 })
    }
    const rawPayload = verifyQtToken(preMfaToken)
    if (!rawPayload || rawPayload.mfaVerified) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === rawPayload.email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 })
    }
    if (!user.otp || user.otp !== otpCode) {
      recordAttempt(ip)
      return NextResponse.json({ error: 'Invalid verification code.' }, { status: 401 })
    }
    if (user.otpExpires && new Date(user.otpExpires) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired. Please login again.' }, { status: 401 })
    }

    clearAttempts(ip)
    delete user.otp
    delete user.otpExpires
    user.lastLogin = new Date().toISOString()
    user.loginCount = (user.loginCount || 0) + 1
    await saveUsers(users)

    const token = signQtToken({
      userId: user.id, email: user.email,
      name: user.contactName || user.email, role: 'admin', mfaVerified: true
    })

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.contactName || user.email, role: 'admin' },
    })
    response.cookies.set('qt_session', token, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 28800, path: '/'
    })
    return response
  }

  // Logout
  if (action === 'logout') {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('qt_session')
    return response
  }

  // Init DB + seed products (admin only)
  if (action === 'init-db') {
    const auth = authenticateQtRequest(req)
    if (!auth) return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    await initQuotationDB()
    await seedDefaultProducts()
    return NextResponse.json({ success: true, message: 'DB initialized and products seeded.' })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

// GET: verify current session
export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    authenticated: true,
    user: { id: auth.userId, email: auth.email, name: auth.name, role: auth.role },
  })
}
