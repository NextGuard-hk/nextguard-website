import { NextRequest, NextResponse } from 'next/server'

const USERS_NPOINT_URL = process.env.NPOINT_DOWNLOAD_USERS_URL || ''

interface DownloadUser {
  id: string
  email: string
  active: boolean
  emailVerified: boolean
  permissions?: { kb?: boolean; download?: boolean; socReview?: boolean }
}

async function getUsers(): Promise<DownloadUser[]> {
  if (!USERS_NPOINT_URL) return []
  try {
    const res = await fetch(USERS_NPOINT_URL, { cache: 'no-store' })
    const data = await res.json()
    return data.users || []
  } catch { return [] }
}

// GET - Check if a logged-in user has permission for a specific page
export async function GET(req: NextRequest) {
  const email = req.cookies.get('download_user_email')?.value
  if (!email) {
    return NextResponse.json({ error: 'Not logged in' }, { status: 401 })
  }

  const page = req.nextUrl.searchParams.get('page')
  if (!page || !['kb', 'download', 'socReview'].includes(page)) {
    return NextResponse.json({ error: 'Invalid page parameter' }, { status: 400 })
  }

  const users = await getUsers()
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase())

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (!user.active) {
    return NextResponse.json({ error: 'Account deactivated' }, { status: 403 })
  }

  const permissions = user.permissions || { kb: false, download: true, socReview: false }
  const hasPermission = permissions[page as keyof typeof permissions] === true

  return NextResponse.json({
    hasPermission,
    email: user.email,
    permissions,
  })
}