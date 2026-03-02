import { NextResponse } from 'next/server'
import { loginUser, registerTenant } from '../../../../lib/auth'

// POST /api/v1/auth
// body: { action: 'login'|'register', ...fields }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'login') {
      const { email, password } = body
      if (!email || !password) {
        return NextResponse.json({ success: false, error: 'Email and password required' }, { status: 400 })
      }
      const result = loginUser(email, password)
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 401 })
      }
      return NextResponse.json({ success: true, data: result })
    }

    if (action === 'register') {
      const { tenantName, domain, adminEmail, adminPassword, adminName, plan } = body
      if (!tenantName || !adminEmail || !adminPassword || !adminName) {
        return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
      }
      const result = registerTenant({ tenantName, domain: domain || '', adminEmail, adminPassword, adminName, plan })
      if (!result.success) {
        return NextResponse.json({ success: false, error: result.error }, { status: 409 })
      }
      return NextResponse.json({ success: true, data: result }, { status: 201 })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
