import { NextRequest, NextResponse } from 'next/server'

const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const LOG_NPOINT_URL = process.env.NPOINT_LOGS_URL || ''

// Free email domains blacklist - reject these during registration
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.co.jp', 'yahoo.com.hk', 'yahoo.com.cn', 'yahoo.com.tw',
  'hotmail.com', 'hotmail.co.uk', 'outlook.com', 'outlook.co.uk', 'live.com', 'live.co.uk', 'msn.com',
  '163.com', '126.com', 'yeah.net', 'netease.com',
  'qq.com', 'foxmail.com', 'vip.qq.com',
  'sina.com', 'sina.cn', 'sohu.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com', 'mail.com', 'email.com', 'usa.com',
  'protonmail.com', 'proton.me', 'pm.me', 'tutanota.com', 'tutamail.com',
  'yandex.com', 'yandex.ru', 'mail.ru', 'bk.ru', 'list.ru', 'inbox.ru',
  'zoho.com', 'zohomail.com',
  'gmx.com', 'gmx.net', 'web.de', 'freenet.de', 't-online.de',
  'naver.com', 'daum.net', 'hanmail.net',
  'rediffmail.com', 'fastmail.com', 'hushmail.com',
  'guerrillamail.com', 'tempmail.com', 'throwaway.email', 'mailinator.com', 'sharklasers.com',
  'yopmail.com', 'dispostable.com', 'trashmail.com', 'maildrop.cc',
  'aliyun.com', 'tom.com', '21cn.com', '139.com', '189.cn',
])

export interface DownloadUser {
  id: string
  email: string
  passwordHash: string
  company: string
  contactName: string
  createdAt: string
  active: boolean
  emailVerified: boolean
  verifyCode?: string
  verifyExpires?: string
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

export async function getUsers(): Promise<DownloadUser[]> {
  if (!USERS_NPOINT_URL) return []
  try {
    const res = await fetch(USERS_NPOINT_URL, { cache: 'no-store' })
    const data = await res.json()
    return data.users || []
  } catch { return [] }
}

export async function saveUsers(users: DownloadUser[]) {
  if (!USERS_NPOINT_URL) return
  await fetch(USERS_NPOINT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ users }),
  })
}

// Simple hash function (SHA-256 style using Web Crypto)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function isFreeEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return FREE_EMAIL_DOMAINS.has(domain)
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'NextGuard Downloads <noreply@next-guard.com>', to: [to], subject, html }),
  })
}

// Rate limiting
const registerAttempts = new Map<string, { count: number; lastAttempt: number }>()
function isRegisterRateLimited(ip: string): boolean {
  const now = Date.now()
  const attempts = registerAttempts.get(ip)
  if (!attempts) return false
  if (now - attempts.lastAttempt > 60 * 60 * 1000) { registerAttempts.delete(ip); return false }
  return attempts.count >= 5
}
function recordRegisterAttempt(ip: string) {
  const now = Date.now()
  const attempts = registerAttempts.get(ip)
  if (attempts) { attempts.count++; attempts.lastAttempt = now }
  else { registerAttempts.set(ip, { count: 1, lastAttempt: now }) }
}

// POST - Register new user
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (isRegisterRateLimited(ip)) {
    return NextResponse.json({ error: 'Too many registration attempts. Try again in 1 hour.' }, { status: 429 })
  }
  try {
    const { email, password, company, contactName } = await req.json()
    // Validation
    if (!email || !password || !company || !contactName) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (isFreeEmail(email)) {
      return NextResponse.json({ error: 'Please use your company email address. Free email services (Gmail, Yahoo, Hotmail, QQ, 163, etc.) are not accepted.' }, { status: 400 })
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    recordRegisterAttempt(ip)
    const users = await getUsers()
    // Check duplicate
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }
    // Create user
    const verifyCode = generateOTP()
    const newUser: DownloadUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      company,
      contactName,
      createdAt: new Date().toISOString(),
      active: true,
      emailVerified: false,
      verifyCode,
      verifyExpires: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      loginCount: 0,
    }
    users.push(newUser)
    await saveUsers(users)
    // Send verification email
    await sendEmail(email, 'NextGuard Downloads - Verify Your Email', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px">
        <h2 style="color:#22d3ee">NextGuard Downloads</h2>
        <p>Hello ${contactName},</p>
        <p>Your verification code is:</p>
        <div style="background:#1e293b;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#22d3ee">${verifyCode}</span>
        </div>
        <p style="color:#94a3b8;font-size:14px">This code expires in 30 minutes.</p>
        <p style="color:#94a3b8;font-size:12px">If you did not register, please ignore this email.</p>
      </div>
    `)
    await writeLog({ type: 'download-user', action: 'register', email, company, ip })
    return NextResponse.json({ success: true, message: 'Registration successful. Please check your email for the verification code.' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Registration failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}

// PATCH - Verify email
export async function PATCH(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
    if (user.emailVerified) return NextResponse.json({ success: true, message: 'Email already verified' })
    if (!user.verifyCode || user.verifyCode !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }
    if (user.verifyExpires && new Date(user.verifyExpires) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired. Please register again.' }, { status: 410 })
    }
    user.emailVerified = true
    delete user.verifyCode
    delete user.verifyExpires
    await saveUsers(users)
    await writeLog({ type: 'download-user', action: 'email-verified', email: user.email })
    return NextResponse.json({ success: true, message: 'Email verified successfully. You can now log in.' })
  } catch {
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
  }

  // GET - Admin list all users
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
    if (secret !== 'nextguard-cron-2024-secure') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const users = await getUsers()
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      company: u.company,
      contactName: u.contactName,
      createdAt: u.createdAt,
      active: u.active,
      emailVerified: u.emailVerified,
      lastLogin: u.lastLogin || null,
      loginCount: u.loginCount || 0,
              mustResetPassword: u.mustResetPassword || false,
    }))
    return NextResponse.json({ users: safeUsers })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

  // PUT - Admin manage user (toggle active, delete)
export async function PUT(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  const action = req.nextUrl.searchParams.get('action')
  const userId = req.nextUrl.searchParams.get('id')
  if (secret !== 'nextguard-cron-2024-secure') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  try {
    let users = await getUsers()
    if (action === 'toggle-active') {
      const user = users.find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      user.active = !user.active
      await saveUsers(users)
      await writeLog({ type: 'download-user', action: user.active ? 'admin-activate' : 'admin-deactivate', email: user.email })
      return NextResponse.json({ success: true, active: user.active })
    }
    if (action === 'delete') {
      const user = users.find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      users = users.filter(u => u.id !== userId)
      await saveUsers(users)
      await writeLog({ type: 'download-user', action: 'admin-delete', email: user.email })
      return NextResponse.json({ success: true })
    }
        if (action === 'reset-password') {
      const user = users.find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const tempPassword = Math.random().toString(36).slice(-10) + Math.floor(Math.random() * 90 + 10)
      const encoder = new TextEncoder()
      const data = encoder.encode(tempPassword + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
      const hashBuffer = await crypto.subtle.digest('SHA-256', data)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      user.passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
      user.mustResetPassword = true
      await saveUsers(users)
      await sendEmail(user.email, 'NextGuard Downloads - Password Reset by Admin', `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:20px">
        <h2 style="color:#06b6d4">NextGuard Downloads</h2>
        <p>Hello ${user.contactName},</p>
        <p>Your password has been reset by an administrator.</p>
        <p>Your temporary password is:</p>
        <p style="font-size:24px;font-weight:bold;letter-spacing:4px;text-align:center;background:#18181b;padding:16px;border-radius:8px;color:#06b6d4">${tempPassword}</p>
        <p><strong>You must change your password on your next login.</strong></p>
        <p>If you did not expect this, please contact support.</p>
      </div>`)
      await writeLog({ type: 'download-user', action: 'admin-reset-password', email: user.email })
      return NextResponse.json({ success: true, message: 'Password reset. Temporary password sent to ' + user.email })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
