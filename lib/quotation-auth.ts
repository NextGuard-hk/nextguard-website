// lib/quotation-auth.ts
// Authentication & TOTP 2FA for Quotation System (Internal Sales Only)
import { getDB } from './db'
import { generateId, writeQuotationAudit } from './quotation-db'

const QT_JWT_SECRET = process.env.QT_JWT_SECRET || process.env.JWT_SECRET || 'qt-nextguard-secret-2026'
const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 30

export interface QtAdminUser {
  id: string
  email: string
  password_hash: string
  name: string
  role: 'admin' | 'sales'
  totp_secret: string | null
  totp_enabled: number
  is_active: number
  last_login: string | null
  login_attempts: number
  locked_until: string | null
  created_at: string
}

export interface QtJWTPayload {
  userId: string
  email: string
  name: string
  role: 'admin' | 'sales'
  mfaVerified: boolean
  iat: number
  exp: number
}

// --- Password Hashing (SHA-256 + salt, same pattern as existing codebase) ---
export async function hashQtPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = process.env.QT_PASSWORD_SALT || process.env.DOWNLOAD_USER_SESSION_SECRET || 'qt-salt-2026'
  const data = encoder.encode(password + salt)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export async function verifyQtPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashQtPassword(password)
  return computed === hash
}

// --- JWT (same pattern as existing lib/auth.ts) ---
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
function base64urlDecode(str: string): string {
  const padded = str + '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export function signQtToken(payload: Omit<QtJWTPayload, 'iat' | 'exp'>, expiresIn = 28800): string {
  // 8 hours session
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
    const [header, body, sig] = parts
    const expectedSig = base64url(QT_JWT_SECRET + '.qt.' + header + '.' + body)
    if (sig !== expectedSig) return null
    const payload: QtJWTPayload = JSON.parse(base64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function getQtTokenFromRequest(req: Request): string | null {
  // Check Authorization header first
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  // Fall back to cookie
  const cookie = req.headers.get('cookie')
  if (cookie) {
    const match = cookie.match(/qt_session=([^;]+)/)
    if (match) return decodeURIComponent(match[1])
  }
  return null
}

export function authenticateQtRequest(req: Request): QtJWTPayload | null {
  const token = getQtTokenFromRequest(req)
  if (!token) return null
  const payload = verifyQtToken(token)
  if (!payload) return null
  // Must have completed 2FA
  if (!payload.mfaVerified) return null
  return payload
}

export function requireQtAdmin(auth: QtJWTPayload | null): boolean {
  return auth?.role === 'admin'
}

// --- TOTP (RFC 6238 TOTP - compatible with Google Authenticator) ---
// Pure implementation without external deps (edge runtime compatible)

export function generateTotpSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  const array = new Uint8Array(20)
  crypto.getRandomValues(array)
  for (const byte of array) {
    secret += chars[byte % 32]
  }
  return secret
}

function base32Decode(base32: string): Uint8Array {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const cleanInput = base32.toUpperCase().replace(/=+$/, '')
  let bits = 0
  let value = 0
  let index = 0
  const output = new Uint8Array(Math.floor((cleanInput.length * 5) / 8))
  for (const char of cleanInput) {
    const charIndex = chars.indexOf(char)
    if (charIndex === -1) continue
    value = (value << 5) | charIndex
    bits += 5
    if (bits >= 8) {
      output[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return output
}

async function hmacSha1(keyBytes: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, data)
  return new Uint8Array(sig)
}

export async function generateTotpCode(secret: string, timeStep?: number): Promise<string> {
  const step = timeStep ?? Math.floor(Date.now() / 1000 / 30)
  const keyBytes = base32Decode(secret)
  const stepBytes = new Uint8Array(8)
  let s = step
  for (let i = 7; i >= 0; i--) {
    stepBytes[i] = s & 0xff
    s = Math.floor(s / 256)
  }
  const hmac = await hmacSha1(keyBytes, stepBytes)
  const offset = hmac[hmac.length - 1] & 0xf
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff)
  return String(code % 1000000).padStart(6, '0')
}

export async function verifyTotpCode(secret: string, userCode: string): Promise<boolean> {
  if (!secret || !userCode || userCode.length !== 6) return false
  // Allow ±1 window (30s tolerance)
  const step = Math.floor(Date.now() / 1000 / 30)
  for (const delta of [-1, 0, 1]) {
    const expected = await generateTotpCode(secret, step + delta)
    if (expected === userCode.trim()) return true
  }
  return false
}

export function getTotpUri(secret: string, email: string, issuer = 'NextGuard Quotation'): string {
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
}

// --- DB User Operations ---

export async function getQtUserByEmail(email: string): Promise<QtAdminUser | null> {
  const db = getDB()
  const result = await db.execute({
    sql: `SELECT * FROM qt_admin_users WHERE email = ? AND is_active = 1 LIMIT 1`,
    args: [email.toLowerCase().trim()],
  })
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as QtAdminUser
}

export async function getQtUserById(id: string): Promise<QtAdminUser | null> {
  const db = getDB()
  const result = await db.execute({
    sql: `SELECT * FROM qt_admin_users WHERE id = ? LIMIT 1`,
    args: [id],
  })
  if (result.rows.length === 0) return null
  return result.rows[0] as unknown as QtAdminUser
}

export async function createQtAdminUser(
  email: string, password: string, name: string, role: 'admin' | 'sales' = 'sales'
): Promise<QtAdminUser> {
  const db = getDB()
  const id = generateId('usr')
  const hash = await hashQtPassword(password)
  await db.execute({
    sql: `INSERT INTO qt_admin_users (id, email, password_hash, name, role)
          VALUES (?, ?, ?, ?, ?)`,
    args: [id, email.toLowerCase().trim(), hash, name, role],
  })
  const user = await getQtUserById(id)
  return user!
}

export async function updateUserTotpSecret(
  userId: string, secret: string, enabled: boolean
): Promise<void> {
  const db = getDB()
  await db.execute({
    sql: `UPDATE qt_admin_users SET totp_secret = ?, totp_enabled = ?, updated_at = datetime('now') WHERE id = ?`,
    args: [secret, enabled ? 1 : 0, userId],
  })
}

export async function recordLoginSuccess(userId: string): Promise<void> {
  const db = getDB()
  await db.execute({
    sql: `UPDATE qt_admin_users SET last_login = datetime('now'), login_attempts = 0, locked_until = NULL, updated_at = datetime('now') WHERE id = ?`,
    args: [userId],
  })
}

export async function recordLoginFailure(userId: string): Promise<boolean> {
  const db = getDB()
  const result = await db.execute({
    sql: `SELECT login_attempts FROM qt_admin_users WHERE id = ?`,
    args: [userId],
  })
  if (result.rows.length === 0) return false
  const attempts = ((result.rows[0].login_attempts as number) || 0) + 1
  let lockUntil: string | null = null
  if (attempts >= MAX_LOGIN_ATTEMPTS) {
    const lockTime = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000)
    lockUntil = lockTime.toISOString()
  }
  await db.execute({
    sql: `UPDATE qt_admin_users SET login_attempts = ?, locked_until = ? WHERE id = ?`,
    args: [attempts, lockUntil, userId],
  })
  return attempts >= MAX_LOGIN_ATTEMPTS
}

export function isAccountLocked(user: QtAdminUser): boolean {
  if (!user.locked_until) return false
  return new Date(user.locked_until) > new Date()
}

// --- Rate limiting (in-memory, resets on server restart) ---
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
export function isLoginRateLimited(ip: string): boolean {
  const now = Date.now()
  const a = loginAttempts.get(ip)
  if (!a) return false
  if (now - a.lastAttempt > 15 * 60 * 1000) { loginAttempts.delete(ip); return false }
  return a.count >= 10
}
export function recordLoginAttempt(ip: string) {
  const now = Date.now()
  const a = loginAttempts.get(ip)
  if (a) { a.count++; a.lastAttempt = now }
  else loginAttempts.set(ip, { count: 1, lastAttempt: now })
}
export function clearLoginAttempts(ip: string) {
  loginAttempts.delete(ip)
}
