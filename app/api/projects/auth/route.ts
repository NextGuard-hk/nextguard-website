import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../../download-users/route'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// POST - Login: verify email + password against Account DB, check projectAccess permission
export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const users = await getUsers()
    const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())
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

    // Check projectAccess permission
    if (!user.permissions?.projectAccess) {
      return NextResponse.json({ error: 'You do not have Project Access permission. Contact admin.' }, { status: 403 })
    }

    // Update login stats
    user.loginCount = (user.loginCount || 0) + 1
    user.lastLogin = new Date().toISOString()
    await saveUsers(users)

    // Set session cookie
    const sessionToken = crypto.randomUUID()
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.contactName,
        email: user.email,
        company: user.company,
      }
    })

    response.cookies.set('project-session', JSON.stringify({
      userId: user.id,
      email: user.email,
      name: user.contactName,
      company: user.company,
      token: sessionToken,
      expires: Date.now() + 8 * 60 * 60 * 1000 // 8 hours
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/admin/projects'
    })

    return response
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

    // Verify user still exists and has permission
    const users = await getUsers()
    const user = users.find((u: any) => u.id === session.userId)
    if (!user || !user.active || !user.permissions?.projectAccess) {
      return NextResponse.json({ authenticated: false, error: 'Access revoked' }, { status: 403 })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.contactName,
        email: user.email,
        company: user.company,
      }
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
