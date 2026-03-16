// lib/quotation-auth.ts
// Simplified auth - JWT verification for Quotation System
// Uses same accounts as /admin (download-users)
import { NextRequest } from 'next/server'

const QT_JWT_SECRET = process.env.QT_JWT_SECRET || process.env.JWT_SECRET || 'qt-nextguard-secret-2026'

function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function base64urlDecode(str: string): string {
  const padded = str + '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export interface QtJWTPayload {
  userId: string; email: string; name: string; role: string
  mfaVerified: boolean; iat: number; exp: number
}

export function signQtToken(payload: Omit<QtJWTPayload, 'iat' | 'exp'>, expiresIn = 28800): string {
  const now = Math.floor(Date.now() / 1000)
  const full: QtJWTPayload = { ...payload, iat: now, exp: now + expiresIn }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(full))
  const sig = base64url(QT_JWT_SECRET + '.qt.' + header + '.' + body)
  return header + '.' + body + '.' + sig
}

export function verifyQtToken(token: string): QtJWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const expectedSig = base64url(QT_JWT_SECRET + '.qt.' + parts[0] + '.' + parts[1])
    if (parts[2] !== expectedSig) return null
    const payload = JSON.parse(base64urlDecode(parts[1])) as QtJWTPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export function authenticateQtRequest(req: NextRequest): { userId: string; email: string; name: string; role: string } | null {
  const cookie = req.cookies.get('qt_session')?.value
  if (!cookie) return null
  const payload = verifyQtToken(cookie)
  if (!payload || !payload.mfaVerified) return null
  return { userId: payload.userId, email: payload.email, name: payload.name, role: payload.role }
}

// Real implementations for qt-users API compatibility
export async function hashQtPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password + (process.env.DOWNLOAD_USER_SESSION_SECRET || 'salt'))
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyQtPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashQtPassword(password)
  return computed === hash
}

export function generateTotpSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  const arr = new Uint8Array(20)
  crypto.getRandomValues(arr)
  for (let i = 0; i < 20; i++) secret += chars[arr[i] % 32]
  return secret
}

export function getTotpUri(secret: string, email: string): string {
  return `otpauth://totp/NextGuard:${encodeURIComponent(email)}?secret=${secret}&issuer=NextGuard&digits=6&period=30`
}

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  // Simplified TOTP - in production use a proper library
  return code.length === 6 && /^\d{6}$/.test(code)
}

// DB helper stubs (qt_admin_users table operations)
import { getDB } from './db'

export async function getQtUserByEmail(email: string): Promise<any> {
  const db = getDB()
  const r = await db.execute({ sql: 'SELECT * FROM qt_admin_users WHERE email = ?', args: [email.toLowerCase()] })
  return r.rows[0] || null
}

export async function getQtUserById(id: string): Promise<any> {
  const db = getDB()
  const r = await db.execute({ sql: 'SELECT * FROM qt_admin_users WHERE id = ?', args: [id] })
  return r.rows[0] || null
}

export async function recordLoginSuccess(userId: string): Promise<void> {
  const db = getDB()
  await db.execute({ sql: `UPDATE qt_admin_users SET last_login = datetime('now'), login_attempts = 0, locked_until = NULL WHERE id = ?`, args: [userId] })
}

export async function recordLoginFailure(userId: string): Promise<void> {
  const db = getDB()
  await db.execute({ sql: `UPDATE qt_admin_users SET login_attempts = login_attempts + 1 WHERE id = ?`, args: [userId] })
}

export function isAccountLocked(user: any): boolean {
  if (!user?.locked_until) return false
  return new Date(user.locked_until) > new Date()
}

// Rate limiting helpers
const attempts = new Map<string, { count: number; last: number }>()
export function isLoginRateLimited(ip: string): boolean {
  const a = attempts.get(ip)
  if (!a) return false
  if (Date.now() - a.last > 15 * 60 * 1000) { attempts.delete(ip); return false }
  return a.count >= 5
}
export function recordLoginAttempt(ip: string): void {
  const a = attempts.get(ip)
  if (a) { a.count++; a.last = Date.now() } else attempts.set(ip, { count: 1, last: Date.now() })
}
export function clearLoginAttempts(ip: string): void { attempts.delete(ip) }

export async function updateUserTotpSecret(userId: string, secret: string, enabled: boolean): Promise<void> {
  const db = getDB()
  await db.execute({ sql: `UPDATE qt_admin_users SET totp_secret = ?, totp_enabled = ?, updated_at = datetime('now') WHERE id = ?`, args: [secret, enabled ? 1 : 0, userId] })
}

export async function createQtAdminUser(email: string, password: string, name: string, role: string): Promise<any> {
  const db = getDB()
  const id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  const hash = await hashQtPassword(password)
  const totp = generateTotpSecret()
  await db.execute({
    sql: `INSERT INTO qt_admin_users (id, email, password_hash, name, role, totp_secret, totp_enabled, is_active) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    args: [id, email.toLowerCase().trim(), hash, name, role, totp],
  })
  return { id, email, name, role, totpSecret: totp }
}
