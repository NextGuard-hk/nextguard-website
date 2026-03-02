import { NextRequest, NextResponse } from 'next/server'
import * as crypto from 'crypto'

const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''

interface DownloadUser {
  id: string
  email: string
  passwordHash: string
  company: string
  contactName: string
  active: boolean
  emailVerified: boolean
  permissions?: { kb?: boolean; download?: boolean; socReview?: boolean; projectAccess?: boolean }
  department?: string
  role?: string
}

async function getUsers(): Promise<DownloadUser[]> {
  if (!USERS_NPOINT_URL) return []
  try {
    const res = await fetch(USERS_NPOINT_URL, { cache: 'no-store' })
    const data = await res.json()
    return data.users || []
  } catch { return [] }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

// POST - Authenticate user for Project access
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }
    const users = await getUsers()
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    if (!user.active) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 })
    }
    if (!user.emailVerified) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }
    const inputHash = hashPassword(password)
    if (inputHash !== user.passwordHash) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }
    // Check projectAccess permission
    const perms = user.permissions || { kb: false, download: true, socReview: false, projectAccess: false }
    if (!perms.projectAccess) {
      return NextResponse.json({ error: 'No Project access permission. Contact admin.' }, { status: 403 })
    }
    // Return user info for the project board
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.contactName,
        email: user.email,
        company: user.company,
        department: user.department || 'General',
        role: user.role || 'Member',
      }
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Server error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
