// app/api/qt-users/route.ts
// Quotation System - User Role Management (Admin only)
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getUsers, saveUsers } from '../download-users/route'

export const maxDuration = 25

const VALID_QT_ROLES = ['', 'admin', 'sales', 'product_manager']

// GET - List all users with their qtRole (admin only)
export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const users = await getUsers()
  const safeUsers = users.map(u => ({
    id: u.id,
    email: u.email,
    contactName: u.contactName,
    company: u.company,
    active: u.active,
    qtRole: u.qtRole || '',
    lastLogin: u.lastLogin || null,
  }))

  return NextResponse.json({ users: safeUsers })
}

// POST - Update user qtRole (admin only)
export async function POST(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  try {
    const { action, userId, qtRole } = await req.json()

    if (action === 'set-role') {
      if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
      if (!VALID_QT_ROLES.includes(qtRole)) {
        return NextResponse.json({ error: 'Invalid role. Valid: ' + VALID_QT_ROLES.join(', ') }, { status: 400 })
      }

      const users = await getUsers()
      const user = users.find(u => u.id === userId)
      if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

      // Prevent removing own admin role
      if (user.email === auth.email && qtRole !== 'admin') {
        return NextResponse.json({ error: 'Cannot remove your own admin role' }, { status: 400 })
      }

      user.qtRole = qtRole
      await saveUsers(users)

      return NextResponse.json({ success: true, email: user.email, qtRole })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed' }, { status: 500 })
  }
}
