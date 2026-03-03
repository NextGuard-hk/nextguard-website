import { NextRequest, NextResponse } from 'next/server'
import { getUsers, saveUsers } from '../../download-users/route'

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

// GET - List all accounts with projectAccess
export async function GET(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = JSON.parse(sessionCookie)
    if (!session.expires || Date.now() > session.expires) return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    const users = await getUsers()
    const accounts = users.filter((u: any) => u.permissions?.projectAccess).map((u: any) => ({
      id: u.id, name: u.contactName, email: u.email, company: u.company,
      role: u.role || 'User', active: u.active !== false,
      lastLogin: u.lastLogin || null, loginCount: u.loginCount || 0,
      created: u.created || null
    }))
    return NextResponse.json({ accounts })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST - Create new account
export async function POST(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { name, email, password, role } = await req.json()
    if (!name || !email || !password) return NextResponse.json({ error: 'Name, email and password required' }, { status: 400 })
    const users = await getUsers()
    if (users.find((u: any) => u.email.toLowerCase() === email.toLowerCase())) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
    }
    const passwordHash = await hashPassword(password)
    const newUser = {
      id: `proj-${Date.now()}`, contactName: name, email, company: 'NextGuard',
      passwordHash, role: role || 'User', active: true,
      permissions: { projectAccess: true, downloadAccess: false },
      created: new Date().toISOString(), loginCount: 0
    }
    users.push(newUser)
    await saveUsers(users)
    return NextResponse.json({ success: true, account: { id: newUser.id, name, email, role: newUser.role, active: true } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PUT - Update account
export async function PUT(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id, name, email, password, role, active } = await req.json()
    if (!id) return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    const users = await getUsers()
    const idx = users.findIndex((u: any) => u.id === id)
    if (idx === -1) return NextResponse.json({ error: 'Account not found' }, { status: 404 })
    if (name) users[idx].contactName = name
    if (email) users[idx].email = email
    if (password) users[idx].passwordHash = await hashPassword(password)
    if (role) users[idx].role = role
    if (active !== undefined) users[idx].active = active
    await saveUsers(users)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE - Delete account
export async function DELETE(req: NextRequest) {
  try {
    const sessionCookie = req.cookies.get('project-session')?.value
    if (!sessionCookie) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'Account ID required' }, { status: 400 })
    let users = await getUsers()
    users = users.filter((u: any) => u.id !== id)
    await saveUsers(users)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
