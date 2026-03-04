import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../../download-users/route'

const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

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

async function sendOTPEmail(to: string, name: string, otp: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'NextGuard Projects <noreply@next-guard.com>',
      to: [to],
      subject: 'NextGuard Project Platform - Your 2FA Verification Code',
      html: `<div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0d1117;color:#e6edf3;border-radius:12px;"><h2 style="color:#22d3ee;margin-bottom:8px;">NextGuard DLP</h2><p>Hello ${name},</p><p>Your 2FA verification code for Project Management Platform:</p><div style="text-align:center;margin:24px 0;"><span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#22d3ee;background:#161b22;padding:16px 32px;border-radius:8px;border:1px solid #30363d;">${otp}</span></div><p style="color:#8b949e;font-size:13px;">This code expires in <strong>5 minutes</strong>.</p><p style="color:#8b949e;font-size:13px;">If you did not attempt to sign in, please ignore this email and contact your admin.</p></div>`
    })
  })
}

// POST - Login with 2FA
// Step 1: { email, password } -> validates credentials, sends OTP, returns { requires2FA: true }
// Step 2: { email, otp } -> validates OTP, creates session, returns { success: true, user }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, otp } = body
        const users = await getUsers()

        // Register action
    if (body.action === 'register') {
      const { name, email: regEmail, password: regPwd } = body;
      if (!regEmail || !name || !regPwd) return NextResponse.json({ error: 'All fields required' }, { status: 400 });
      if (regPwd.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
      const existing = users.find((u: any) => u.email.toLowerCase() === regEmail.toLowerCase());
      if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
      const newUser = { id: `user-${Date.now()}`, email: regEmail, contactName: name, company: '', passwordHash: await hashPassword(regPwd), active: true, emailVerified: false, permissions: { projectAccess: false }, department: '', role: 'user', created: new Date().toISOString(), loginCount: 0 };
      users.push(newUser);
      await saveUsers(users);
      try { if (RESEND_API_KEY) { await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: 'NextGuard Projects <noreply@next-guard.com>', to: ['oscar@next-guard.com'], subject: `New User Registration: ${name} (${regEmail})`, html: `<div style="font-family:Arial,sans-serif;padding:24px;background:#0d1117;color:#e6edf3;border-radius:12px;"><h2 style="color:#22d3ee;">New User Registration</h2><p>A new user registered on <strong>NextGuard Project Management Platform</strong>.</p><p><b>Name:</b> ${name}<br/><b>Email:</b> ${regEmail}<br/><b>Time:</b> ${new Date().toLocaleString('en-HK',{timeZone:'Asia/Hong_Kong'})} HKT</p><p style="color:#f59e0b;">⚠️ Grant Project Access permission in Admin → User Management before they can log in.</p></div>` }) }); } } catch {} return NextResponse.json({ success: true, message: 'Registration successful! Please wait for admin to grant Project Access.' });
    }
    // Forgot password action
    if (body.action === 'forgot-password') {
      const fpEmail = body.email;
      if (!fpEmail) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
      const fpUser = users.find((u: any) => u.email.toLowerCase() === fpEmail.toLowerCase());
      if (!fpUser) return NextResponse.json({ success: true, message: 'If the email exists, a temporary password has been sent.' });
      const tempPwd = Math.random().toString(36).slice(-8) + 'A1!';
      fpUser.passwordHash = await hashPassword(tempPwd);
      await saveUsers(users);
      try { await sendOTPEmail(fpEmail, fpUser.contactName, tempPwd); } catch {}
      return NextResponse.json({ success: true, message: 'If the email exists, a temporary password has been sent to your email.' });
    }
if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())

    // Step 2: OTP verification
    if (otp && !password) {
      if (!user) {
        return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
      }
      if (!user.otp || user.otp !== otp) {
        return NextResponse.json({ error: 'Invalid verification code. Please try again.' }, { status: 401 })
      }
      if (user.otpExpires && new Date(user.otpExpires) < new Date()) {
        return NextResponse.json({ error: 'Verification code expired. Please sign in again.' }, { status: 410 })
      }

      // OTP valid - clear it and create session
      delete user.otp
      delete user.otpExpires
      user.loginCount = (user.loginCount || 0) + 1
      user.lastLogin = new Date().toISOString()
      await saveUsers(users)

      const sessionToken = crypto.randomUUID()
      const response = NextResponse.json({
        success: true,
        user: { id: user.id, name: user.contactName, email: user.email, company: user.company }
      })
      response.cookies.set('project-session', JSON.stringify({
        userId: user.id, email: user.email, name: user.contactName, company: user.company,
        token: sessionToken, expires: Date.now() + 8 * 60 * 60 * 1000
      }), { httpOnly: true, secure: true, sameSite: 'strict', maxAge: 8 * 60 * 60, path: '/admin/projects' })
      return response
    }

    // Step 1: Password verification + send OTP
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 })
    }
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const hash = await hashPassword(password)
    if (hash !== user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account is disabled. Contact admin.' }, { status: 403 })
    }
    if (!user.permissions?.projectAccess) {
      return NextResponse.json({ error: 'You do not have Project Access permission. Contact admin.' }, { status: 403 })
    }

    // Generate OTP and send via email
    const newOtp = generateOTP()
    user.otp = newOtp
    user.otpExpires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    await saveUsers(users)

    try {
      await sendOTPEmail(user.email, user.contactName, newOtp)
    } catch (emailErr: any) {
      return NextResponse.json({ error: 'Failed to send verification email. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      requires2FA: true,
      message: `A 6-digit verification code has been sent to ${user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3')}. Please check your inbox.`
    })
  } catch (e: any) {
    return NextResponse.json({ error: 'Login failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}

// GET - Check if session is valid
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }
    const session = JSON.parse(sessionCookie)
    if (!session.expires || Date.now() > session.expires) {
      return NextResponse.json({ authenticated: false, error: 'Session expired' }, { status: 401 })
    }
    const users = await getUsers()
    const user = users.find((u: any) => u.id === session.userId)
    if (!user || !user.active || !user.permissions?.projectAccess) {
      return NextResponse.json({ authenticated: false, error: 'Access revoked' }, { status: 403 })
    }
    return NextResponse.json({
      authenticated: true,
      user: { id: user.id, name: user.contactName, email: user.email, company: user.company, permissions: user.permissions }
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
}

// DELETE - Logout
export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('project-session')
  return response
}
