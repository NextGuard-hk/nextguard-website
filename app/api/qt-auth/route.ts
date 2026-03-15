// app/api/qt-auth/route.ts
// Quotation System Auth API - Login, TOTP setup, verify
import { NextRequest, NextResponse } from 'next/server'
import {
  getQtUserByEmail, verifyQtPassword, signQtToken, verifyQtToken,
  recordLoginSuccess, recordLoginFailure, isAccountLocked,
  isLoginRateLimited, recordLoginAttempt, clearLoginAttempts,
  generateTotpSecret, verifyTotpCode, getTotpUri, updateUserTotpSecret,
  getQtUserById, hashQtPassword, authenticateQtRequest,
} from '@/lib/quotation-auth'
import { initQuotationDB, seedDefaultProducts, writeQuotationAudit } from '@/lib/quotation-db'
import { getDB } from '@/lib/db'

// Helper to get client IP
function getClientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const body = await req.json().catch(() => ({}))
  const { action } = body

  // Initialize DB on first call
  await initQuotationDB().catch(() => {})

  // ─── STEP 1: Email + Password Login ───
  if (action === 'login') {
    if (isLoginRateLimited(ip)) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait 15 minutes.' }, { status: 429 })
    }
    const { email, password } = body
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
    }
    const user = await getQtUserByEmail(email).catch(() => null)
    if (!user) {
      recordLoginAttempt(ip)
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    if (isAccountLocked(user)) {
      return NextResponse.json({ error: 'Account is temporarily locked due to too many failed attempts. Please try again later.' }, { status: 403 })
    }
    const valid = await verifyQtPassword(password, user.password_hash)
    if (!valid) {
      await recordLoginFailure(user.id)
      recordLoginAttempt(ip)
      await writeQuotationAudit(user.id, user.email, 'login_failed', 'auth', user.id, { ip })
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }
    clearLoginAttempts(ip)
    // If TOTP is enabled, return partial token (pre-MFA)
    if (user.totp_enabled) {
      const preMfaToken = signQtToken(
        { userId: user.id, email: user.email, name: user.name, role: user.role, mfaVerified: false },
        300 // 5 minutes to complete TOTP
      )
      return NextResponse.json({ requireTotp: true, preMfaToken })
    }
    // TOTP not yet set up - return setup required
    const setupToken = signQtToken(
      { userId: user.id, email: user.email, name: user.name, role: user.role, mfaVerified: false },
      600 // 10 minutes to set up TOTP
    )
    return NextResponse.json({ requireTotpSetup: true, setupToken })
  }

  // ─── STEP 2a: Verify TOTP code ───
  if (action === 'verify-totp') {
    const { preMfaToken, totpCode } = body
    if (!preMfaToken || !totpCode) {
      return NextResponse.json({ error: 'Token and TOTP code are required.' }, { status: 400 })
    }
    // Verify pre-MFA token (mfaVerified=false is ok here)
    const { verifyQtToken: vt } = await import('@/lib/quotation-auth')
    const rawPayload = vt(preMfaToken)
    if (!rawPayload || rawPayload.mfaVerified) {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 })
    }
    const user = await getQtUserById(rawPayload.userId)
    if (!user || !user.totp_secret) {
      return NextResponse.json({ error: 'User not found or TOTP not configured.' }, { status: 401 })
    }
    const valid = await verifyTotpCode(user.totp_secret, totpCode)
    if (!valid) {
      recordLoginAttempt(ip)
      await writeQuotationAudit(user.id, user.email, 'totp_failed', 'auth', user.id, { ip })
      return NextResponse.json({ error: 'Invalid TOTP code. Please try again.' }, { status: 401 })
    }
    clearLoginAttempts(ip)
    await recordLoginSuccess(user.id)
    await writeQuotationAudit(user.id, user.email, 'login_success', 'auth', user.id, { ip })
    const token = signQtToken({ userId: user.id, email: user.email, name: user.name, role: user.role, mfaVerified: true })
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
    })
    response.cookies.set('qt_session', token, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 28800, path: '/'
    })
    return response
  }

  // ─── STEP 2b: Get TOTP setup QR code ───
  if (action === 'setup-totp-init') {
    const { setupToken } = body
    if (!setupToken) return NextResponse.json({ error: 'Setup token required.' }, { status: 400 })
    const { verifyQtToken: vt } = await import('@/lib/quotation-auth')
    const rawPayload = vt(setupToken)
    if (!rawPayload) return NextResponse.json({ error: 'Invalid or expired setup token.' }, { status: 401 })
    const secret = generateTotpSecret()
    const uri = getTotpUri(secret, rawPayload.email)
    // Temporarily store the secret (will be confirmed in setup-totp-confirm)
    // We encode it in a short-lived token
    const confirmToken = signQtToken(
      { userId: rawPayload.userId, email: rawPayload.email, name: rawPayload.name, role: rawPayload.role, mfaVerified: false },
      600
    ) + '.' + Buffer.from(secret).toString('base64url')
    return NextResponse.json({ otpUri: uri, secret, confirmToken })
  }

  // ─── STEP 2c: Confirm TOTP setup with first code ───
  if (action === 'setup-totp-confirm') {
    const { confirmToken, totpCode } = body
    if (!confirmToken || !totpCode) {
      return NextResponse.json({ error: 'Confirm token and TOTP code required.' }, { status: 400 })
    }
    const parts = confirmToken.split('.')
    if (parts.length !== 4) return NextResponse.json({ error: 'Invalid confirm token.' }, { status: 400 })
    const jwtPart = parts.slice(0, 3).join('.')
    const secretB64 = parts[3]
    const { verifyQtToken: vt } = await import('@/lib/quotation-auth')
    const rawPayload = vt(jwtPart)
    if (!rawPayload) return NextResponse.json({ error: 'Invalid or expired confirm token.' }, { status: 401 })
    const secret = Buffer.from(secretB64, 'base64url').toString()
    const valid = await verifyTotpCode(secret, totpCode)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid TOTP code. Please scan the QR code again.' }, { status: 400 })
    }
    await updateUserTotpSecret(rawPayload.userId, secret, true)
    await recordLoginSuccess(rawPayload.userId)
    await writeQuotationAudit(rawPayload.userId, rawPayload.email, 'totp_setup_complete', 'auth', rawPayload.userId, { ip })
    const token = signQtToken({ userId: rawPayload.userId, email: rawPayload.email, name: rawPayload.name, role: rawPayload.role, mfaVerified: true })
    const response = NextResponse.json({
      success: true,
      user: { id: rawPayload.userId, email: rawPayload.email, name: rawPayload.name, role: rawPayload.role },
      token,
    })
    response.cookies.set('qt_session', token, {
      httpOnly: true, secure: true, sameSite: 'strict', maxAge: 28800, path: '/'
    })
    return response
  }

  // ─── Logout ───
  if (action === 'logout') {
    const response = NextResponse.json({ success: true })
    response.cookies.delete('qt_session')
    return response
  }

  // ─── Init DB + seed (Admin only, call once) ───
  if (action === 'init-db') {
    const auth = authenticateQtRequest(req)
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
    }
    await initQuotationDB()
    await seedDefaultProducts()
    return NextResponse.json({ success: true, message: 'DB initialized and products seeded.' })
  }

feat: add Quotation Auth API (api/qt-auth/route.ts)  if (action === 'create-admin') {
    const { setupSecret, email, password, name, role } = body
    const expectedSecret = process.env.QT_SETUP_SECRET
    if (!expectedSecret || setupSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
    }
    const { createQtAdminUser } = await import('@/lib/quotation-auth')
    const user = await createQtAdminUser(email, password, name || email, role || 'admin')
    await writeQuotationAudit(user.id, user.email, 'user_created', 'auth', user.id, { role: user.role })
    return NextResponse.json({ success: true, userId: user.id, email: user.email })
  }

  return NextResponse.json({ error: 'Invalid action.' }, { status: 400 })
}

// GET: verify current session
export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }
  return NextResponse.json({
    authenticated: true,
    user: { id: auth.userId, email: auth.email, name: auth.name, role: auth.role },
  })
}
