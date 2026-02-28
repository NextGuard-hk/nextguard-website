import { NextRequest, NextResponse } from 'next/server'
const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''
const DOWNLOAD_PASSWORD = process.env.DOWNLOAD_PASSWORD || ''
const SESSION_SECRET = process.env.DOWNLOAD_USER_SESSION_SECRET || ''
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
// Generate session token from email + secret
async function generateSessionToken(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email + SESSION_SECRET + Date.now().toString())
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
// POST - Verify OTP and create session
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  try {
    const { email, otp } = await req.json()
    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!user.otp || user.otp !== otp) {
      await writeLog({ type: 'download-user', action: 'otp-failed', email, ip, reason: 'wrong-code' })
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }
    if (user.otpExpires && new Date(user.otpExpires) < new Date()) {
      await writeLog({ type: 'download-user', action: 'otp-failed', email, ip, reason: 'expired' })
      return NextResponse.json({ error: 'Verification code expired. Please log in again to get a new code.' }, { status: 410 })
    }
    // OTP verified - clear it and update login info
    delete user.otp
    delete user.otpExpires
    user.lastLogin = new Date().toISOString()
    user.loginCount = (user.loginCount || 0) + 1
    await saveUsers(users)
    // Generate session token
    const sessionToken = await generateSessionToken(email)
    await writeLog({ type: 'download-user', action: 'login-success', email, company: user.company, ip })
    // Set session cookies
    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      company: user.company,
      contactName: user.contactName,
      mustResetPassword: user.mustResetPassword || false,
    })
    // Set download user session cookie (24 hours)
    res.cookies.set('download_user_session', sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    // Set download user email cookie (for session validation)
    res.cookies.set('download_user_email', email.toLowerCase(), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    // Also set the download_session_token for R2 file access compatibility
    res.cookies.set('download_session_token', DOWNLOAD_PASSWORD, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    return res
  } catch (e: any) {
    return NextResponse.json({ error: 'Verification failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
