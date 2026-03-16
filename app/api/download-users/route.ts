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
  permissions?: { kb?: boolean; download?: boolean; socReview?: boolean; projectAccess?: boolean }
}
async function writeLog(entry: Record<string, any>) {
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
  } catch (e) {
    console.error('Log write error:', e)
  }
}

export async function getUsers(): Promise<DownloadUser[]> {
  if (!USERS_NPOINT_URL) return []
  try {
    const res = await fetch(USERS_NPOINT_URL, { cache: 'no-store' })
    const data = await res.json()
    return data.users || []
  } catch {
    return []
  }
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
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: 'NextGuard Downloads <downloads@next-guard.com>', to: [to], subject, html }),
  })
}

async function notifyAdminNewUser(contactName: string, email: string, company: string, source: string, ip?: string) {
  try {
    await sendEmail(
      'oscar@next-guard.com',
      `New Account Registered - ${company}`,
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1a1a2e">New Account Registration</h2>
        <p>A new account has been registered on NextGuard Downloads.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Name</td><td style="padding:8px;border:1px solid #ddd">${contactName}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Company</td><td style="padding:8px;border:1px solid #ddd">${company}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Source</td><td style="padding:8px;border:1px solid #ddd">${source}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">Time</td><td style="padding:8px;border:1px solid #ddd">${new Date().toISOString()}</td></tr>
          ${ip ? `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:bold">IP</td><td style="padding:8px;border:1px solid #ddd">${ip}</td></tr>` : ''}
        </table>
        <p style="margin-top:16px"><a href="https://www.next-guard.com/admin" style="color:#007bff">View Admin Dashboard</a></p>
      </div>`
    )
  } catch (e) {
    console.error('Admin notification error:', e)
  }
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
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2>NextGuard Downloads</h2>
        <p>Hello ${contactName},</p>
        <p>Your verification code is:</p>
        <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:20px;background:#f4f4f4;border-radius:8px">${verifyCode}</div>
        <p>This code expires in 30 minutes.</p>
        <p>If you did not register, please ignore this email.</p>
      </div>
    `)
    // Notify admin of new registration
    await notifyAdminNewUser(contactName, email, company, 'self-registration', ip)
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
      permissions: u.permissions || { kb: false, download: true, socReview: false, projectAccess: false },
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
  if (!userId && action !== 'admin-create') return NextResponse.json({ error: 'User ID required' }, { status: 400 })
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
      await sendEmail(user.email, 'NextGuard Downloads - Password Reset by Admin', `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2>NextGuard Downloads</h2>
          <p>Hello ${user.contactName},</p>
          <p>Your password has been reset by an administrator.</p>
          <p>Your temporary password is:</p>
          <div style="font-size:24px;font-weight:bold;text-align:center;padding:20px;background:#f4f4f4;border-radius:8px">${tempPassword}</div>
          <p><strong>You must change your password on your next login.</strong></p>
          <p>If you did not expect this, please contact support.</p>
        </div>
      `)
      await writeLog({ type: 'download-user', action: 'admin-reset-password', email: user.email })
      return NextResponse.json({ success: true, message: 'Password reset. Temporary password sent to ' + user.email })
    }
    if (action === 'set-permissions') {
      const user = users.find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      const permissions = req.nextUrl.searchParams.get('permissions')
      if (!permissions) return NextResponse.json({ error: 'Permissions required' }, { status: 400 })
      try {
        user.permissions = JSON.parse(decodeURIComponent(permissions))
      } catch {
        return NextResponse.json({ error: 'Invalid permissions format' }, { status: 400 })
      }
      await saveUsers(users)
      await writeLog({ type: 'download-user', action: 'set-permissions', email: user.email, permissions })
      return NextResponse.json({ success: true, permissions: user.permissions })
    }
    if (action === 'admin-create') {
      const email = req.nextUrl.searchParams.get('email') || ''
      const password = req.nextUrl.searchParams.get('password') || ''
      const company = req.nextUrl.searchParams.get('company') || ''
      const contactName = req.nextUrl.searchParams.get('contactName') || ''
      const permStr = req.nextUrl.searchParams.get('permissions')
      const permissions = permStr ? JSON.parse(decodeURIComponent(permStr)) : undefined
      if (!email || !password || !company || !contactName) {
        return NextResponse.json({ error: 'All fields required' }, { status: 400 })
      }
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
      const newUser: DownloadUser = {
        id: Date.now().toString(),
        email: email.toLowerCase(),
        passwordHash: await hashPassword(password),
        company,
        contactName,
        createdAt: new Date().toISOString(),
        active: true,
        emailVerified: true,
        loginCount: 0,
        permissions: permissions || { kb: false, download: true, socReview: false, projectAccess: false },
      }
      users.push(newUser)
      await saveUsers(users)
      // Notify admin of new account created by admin
      await notifyAdminNewUser(contactName, email, company, 'admin-create')
      await writeLog({ type: 'download-user', action: 'admin-create', email, company })
      return NextResponse.json({ success: true, message: 'Account created successfully' })
    if (action === 'set-password') {
      const targetEmail = req.nextUrl.searchParams.get('email') || ''
      const newPassword = req.nextUrl.searchParams.get('password') || ''
      if (!targetEmail || !newPassword) return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
      const user = users.find(u => u.email.toLowerCase() === targetEmail.toLowerCase())
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
      user.passwordHash = await hashPassword(newPassword)
      user.mustResetPassword = false
      await saveUsers(users)
      await writeLog({ type: 'download-user', action: 'admin-set-password', email: user.email })
      return NextResponse.json({ success: true, message: 'Password updated successfully' })
    }
    }
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
