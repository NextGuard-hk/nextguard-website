import { NextRequest, NextResponse } from 'next/server'

const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const LOG_NPOINT_URL = process.env.NPOINT_LOGS_URL || ''

interface DownloadUser {
  id: string
  email: string
  passwordHash: string
  company: string
  contactName: string
  active: boolean
  emailVerified: boolean
  otp?: string
  otpExpires?: string
  lastLogin?: string
  loginCount: number
    mustResetPassword?: boolean
}

async function writeLog(entry: Record<string, string>) {
  try {
    const logEntry = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...entry }
    const getRes = await fetch(LOG_NPOINT_URL, { cache: 'no-store' })
    const current = await getRes.json()
    const logs = current.logs || []
    logs.push(logEntry)
    await fetch(LOG_NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: logs.slice(-500) }),
    })
  } catch (e) { console.error('Log write error:', e) }
}

async function getUsers(): Promise<DownloadUser[]> {
  if (!USERS_NPOINT_URL) return []
  try {
    const res = await fetch(USERS_NPOINT_URL, { cache: 'no-store' })
    const data = await res.json()
    return data.users || []
  } catch { return [] }
}

async function saveUsers(users: DownloadUser[]) {
  if (!USERS_NPOINT_URL) return
  await fetch(USERS_NPOINT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  })
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

// Rate limiting
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)
  if (!attempts) return false
  if (now - attempts.lastAttempt > 15 * 60 * 1000) { loginAttempts.delete(ip); return false }
  return attempts.count >= 5
}
function recordAttempt(ip: string) {
  const now = Date.now()
  const attempts = loginAttempts.get(ip)
  if (attempts) { attempts.count++; attempts.lastAttempt = now }
  else { loginAttempts.set(ip, { count: 1, lastAttempt: now }) }
}

// POST - Login (verify email + password, then send OTP)
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many login attempts. Try again in 15 minutes.' }, { status: 429 })
  }
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      recordAttempt(ip)
      await writeLog({ type: 'download-user', action: 'login-failed', email, ip, reason: 'user-not-found' })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account has been deactivated. Please contact support.' }, { status: 403 })
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Email not verified. Please check your email for the verification code.', needsVerification: true }, { status: 403 })
    }
    // Verify password
    const passwordHash = await hashPassword(password)
    if (passwordHash !== user.passwordHash) {
      recordAttempt(ip)
      await writeLog({ type: 'download-user', action: 'login-failed', email, ip, reason: 'wrong-password' })
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    // Generate OTP and send to email
    const otp = generateOTP()
    user.otp = otp
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
    await saveUsers(users)
    // Send OTP email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NextGuard Downloads <noreply@next-guard.com>',
        to: [user.email],
        subject: 'NextGuard Downloads - Login Verification Code',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px">
            <h2 style="color:#22d3ee">NextGuard Downloads</h2>
            <p>Hello ${user.contactName},</p>
            <p>Your login verification code is:</p>
            <div style="background:#1e293b;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
              <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#22d3ee">${otp}</span>
            </div>
            <p style="color:#94a3b8;font-size:14px">This code expires in 5 minutes.</p>
            <p style="color:#94a3b8;font-size:12px">If you did not attempt to log in, please change your password immediately.</p>
            <p style="color:#64748b;font-size:11px">IP: ${ip}</p>
          </div>
        `,
      }),
    })
    await writeLog({ type: 'download-user', action: 'otp-sent', email, ip })
    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email.',
      company: user.company,
            mustResetPassword: user.mustResetPassword || false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Login failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
