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

// Dummy exports for backward compatibility (no longer used but prevents import errors)
export async function hashQtPassword(password: string): Promise<string> { return '' }
export async function verifyQtPassword(password: string, hash: string): Promise<boolean> { return false }
export async function getQtUserByEmail(email: string): Promise<any> { return null }
export async function getQtUserById(id: string): Promise<any> { return null }
export async function recordLoginSuccess(userId: string): Promise<void> {}
export async function recordLoginFailure(userId: string): Promise<void> {}
export function isAccountLocked(user: any): boolean { return false }
export function isLoginRateLimited(ip: string): boolean { return false }
export function recordLoginAttempt(ip: string): void {}
export function clearLoginAttempts(ip: string): void {}
export function generateTotpSecret(): string { return '' }
export async function verifyTotpCode(secret: string, code: string): Promise<boolean> { return false }
export function getTotpUri(secret: string, email: string): string { return '' }
export async function updateUserTotpSecret(userId: string, secret: string, enabled: boolean): Promise<void> {}
export async function createQtAdminUser(email: string, password: string, name: string, role: string): Promise<any> { return {} }
