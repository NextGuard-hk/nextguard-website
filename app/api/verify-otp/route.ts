import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../download-users/route'

export async function POST(req: NextRequest) {
  try {
    const { email, code } = await req.json()
    if (!email || !code) {
      return NextResponse.json({ error: 'Email and code are required' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (!user.otp || user.otp !== code) {
      return NextResponse.json({ error: 'Invalid verification code' }, { status: 401 })
    }
    if (user.otpExpires && new Date(user.otpExpires) < new Date()) {
      return NextResponse.json({ error: 'Verification code expired. Please login again.' }, { status: 410 })
    }
    // Clear OTP and update login stats
    delete user.otp
    delete user.otpExpires
    user.lastLogin = new Date().toISOString()
    user.loginCount = (user.loginCount || 0) + 1
    await saveUsers(users)
    // Generate simple session token
    const sessionToken = btoa(JSON.stringify({ email: user.email, ts: Date.now() }))
    return NextResponse.json({ success: true, sessionToken })
  } catch (e: any) {
    return NextResponse.json({ error: 'Verification failed: ' + (e.message || 'Unknown error') }, { status: 500 })
  }
}
