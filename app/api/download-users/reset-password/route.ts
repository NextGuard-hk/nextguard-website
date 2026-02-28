import { NextRequest, NextResponse } from 'next/server'
const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''
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
  mustResetPassword?: boolean
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
// POST - Verify reset OTP and update password in DB, or force-reset for mustResetPassword users
export async function POST(req: NextRequest) {
  try {
    const { email, otp, newPassword, forceReset } = await req.json()
    if (!email || !newPassword) {
      return NextResponse.json({ error: 'Email and new password are required' }, { status: 400 })
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user || !user.active) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
    // Force reset mode (admin-triggered mustResetPassword)
    if (forceReset && user.mustResetPassword) {
      const newHash = await hashPassword(newPassword)
      user.passwordHash = newHash
      user.mustResetPassword = false
      await saveUsers(users)
      return NextResponse.json({ success: true, message: 'Password changed successfully.' })
    }
    // Normal reset mode (forgot-password flow with OTP)
    if (!otp) {
      return NextResponse.json({ error: 'Reset code is required' }, { status: 400 })
    }
    // Verify reset OTP
    if (!user.resetOtp || user.resetOtp !== otp) {
      return NextResponse.json({ error: 'Invalid reset code' }, { status: 400 })
    }
    if (!user.resetOtpExpires || new Date() > new Date(user.resetOtpExpires)) {
      return NextResponse.json({ error: 'Reset code has expired. Please request a new one.' }, { status: 400 })
    }
    // Hash new password and update DB
    const newHash = await hashPassword(newPassword)
    user.passwordHash = newHash
    user.resetOtp = undefined
    user.resetOtpExpires = undefined
    user.mustResetPassword = false
    await saveUsers(users)
    return NextResponse.json({ success: true, message: 'Password reset successfully.' })
  } catch (e: any) {
    return NextResponse.json({ error: 'Password reset failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
