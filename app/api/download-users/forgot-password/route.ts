import { NextRequest, NextResponse } from 'next/server'

const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''

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
  resetOtp?: string
  resetOtpExpires?: string
  lastLogin?: string
  loginCount: number
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

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST - Send password reset OTP
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

    // Always return success to prevent email enumeration
    if (!user || !user.active) {
      return NextResponse.json({ success: true, message: 'If that email exists, a reset code has been sent.' })
    }

    const otp = generateOTP()
    user.resetOtp = otp
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes

    await saveUsers(users)

    // Send reset email
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'NextGuard Downloads <downloads@next-guard.com>',
        to: [user.email],
        subject: 'NextGuard Downloads - Password Reset Code',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0a0a0a;padding:32px;border-radius:12px">
            <h2 style="color:#fff;margin-bottom:8px">Password Reset</h2>
            <p style="color:#aaa">Hello ${user.contactName},</p>
            <p style="color:#aaa">Your password reset code is:</p>
            <div style="background:#1a1a1a;border-radius:8px;padding:20px;text-align:center;margin:20px 0">
              <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#4ea1f5">${otp}</span>
            </div>
            <p style="color:#aaa">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color:#666;font-size:12px">If you did not request a password reset, please ignore this email.</p>
          </div>
        `
      })
    })

    return NextResponse.json({ success: true, message: 'If that email exists, a reset code has been sent.' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Failed to send reset code: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
