import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../download-users/route'

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

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured')
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'NextGuard Downloads <noreply@next-guard.com>', to: [to], subject, html }),
  })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    const hash = await hashPassword(password)
    if (hash !== user.passwordHash) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 })
    }
    const otp = generateOTP()
    user.otp = otp
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    await saveUsers(users)
    await sendEmail(email, 'NextGuard Downloads - Login Verification Code', `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111;color:#fff;border-radius:12px">
        <h2 style="color:#22d3ee">NextGuard Downloads</h2>
        <p>Your login verification code is:</p>
        <div style="background:#1e293b;padding:16px;border-radius:8px;text-align:center;margin:16px 0">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#22d3ee">${otp}</span>
        </div>
        <p style="color:#94a3b8;font-size:14px">This code expires in 10 minutes.</p>
      </div>
    `)
    return NextResponse.json({ success: true, message: 'Verification code sent to your email' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Login failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
