import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../../download-users/route'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET - Seed/reset Oscar's password to NextGuard123
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== 'nextguard-cron-2024-secure') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const users = await getUsers()
    const email = req.nextUrl.searchParams.get('email') || 'oscar@next-guard.com'
    const password = req.nextUrl.searchParams.get('password') || 'NextGuard123'
    
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    user.passwordHash = await hashPassword(password)
    user.active = true
    if (!user.permissions) user.permissions = {}
    user.permissions.projectAccess = true
    
    await saveUsers(users)
    return NextResponse.json({ success: true, message: `Password reset for ${email}`, permissions: user.permissions })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
