// NextGuard Auth Utilities
// JWT-based auth for multi-tenant console

import { getStore, TenantUser, verifyHash, generateId, simpleHash } from './multi-tenant-store'

const JWT_SECRET = process.env.JWT_SECRET || 'nextguard-dlp-secret-2026'
const AGENT_SECRET = process.env.AGENT_SECRET || 'nextguard-agent-secret-2026'

export interface JWTPayload {
  userId: string
  tenantId: string
  email: string
  role: string
  type: 'user' | 'agent'
  iat: number
  exp: number
}

// Simple base64url JWT (no external deps for edge runtime)
function base64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): string {
  const padded = str + '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>, expiresIn = 86400): string {
  const now = Math.floor(Date.now() / 1000)
  const full: JWTPayload = { ...payload, iat: now, exp: now + expiresIn }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(full))
  const sig = base64url(JWT_SECRET + '.' + header + '.' + body)
  return header + '.' + body + '.' + sig
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = base64url(JWT_SECRET + '.' + header + '.' + body)
    if (sig !== expectedSig) return null
    const payload: JWTPayload = JSON.parse(base64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function signAgentToken(agentId: string, tenantId: string): string {
  const now = Math.floor(Date.now() / 1000)
  const payload = { agentId, tenantId, type: 'agent', iat: now, exp: now + 86400 * 30 }
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = base64url(JSON.stringify(payload))
  const sig = base64url(AGENT_SECRET + '.' + header + '.' + body)
  return header + '.' + body + '.' + sig
}

export function verifyAgentToken(token: string): { agentId: string; tenantId: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = base64url(AGENT_SECRET + '.' + header + '.' + body)
    if (sig !== expectedSig) return null
    const payload = JSON.parse(base64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return { agentId: payload.agentId, tenantId: payload.tenantId }
  } catch {
    return null
  }
}

export function getTokenFromRequest(req: Request): string | null {
  const auth = req.headers.get('authorization')
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

export function authenticateRequest(req: Request): JWTPayload | null {
  const token = getTokenFromRequest(req)
  if (!token) return null
  return verifyToken(token)
}

export function authenticateAgent(req: Request): { agentId: string; tenantId: string } | null {
  const token = getTokenFromRequest(req)
  if (!token) return null
  return verifyAgentToken(token)
}

export function requireTenantAccess(auth: JWTPayload | null, tenantId: string): boolean {
  if (!auth) return false
  return auth.tenantId === tenantId
}

export interface LoginResult {
  success: boolean
  token?: string
  user?: Partial<TenantUser>
  tenantId?: string
  tenantName?: string
  error?: string
}

export function loginUser(email: string, password: string): LoginResult {
  const store = getStore()
  const user = Array.from(store.users.values()).find(u => u.email === email)
  if (!user || !user.isActive) {
    return { success: false, error: 'Invalid credentials' }
  }
  if (!verifyHash(password, user.passwordHash)) {
    return { success: false, error: 'Invalid credentials' }
  }
  const tenant = store.tenants.get(user.tenantId)
  if (!tenant || !tenant.isActive) {
    return { success: false, error: 'Tenant account is inactive' }
  }
  // Update last login
  user.lastLogin = new Date().toISOString()
  store.users.set(user.id, user)

  const token = signToken({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
    role: user.role,
    type: 'user'
  })

  return {
    success: true,
    token,
    tenantId: user.tenantId,
    tenantName: tenant.name,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId
    }
  }
}

export interface RegisterTenantInput {
  tenantName: string
  domain: string
  adminEmail: string
  adminPassword: string
  adminName: string
  plan?: 'starter' | 'professional' | 'enterprise'
}

export function registerTenant(input: RegisterTenantInput): LoginResult {
  const store = getStore()

  // Check duplicate email
  const existing = Array.from(store.users.values()).find(u => u.email === input.adminEmail)
  if (existing) return { success: false, error: 'Email already registered' }

  const tenantId = generateId('tenant')
  const userId = generateId('user')

  const tenant = {
    id: tenantId,
    name: input.tenantName,
    domain: input.domain,
    plan: input.plan || 'starter' as const,
    maxAgents: input.plan === 'enterprise' ? 9999 : input.plan === 'professional' ? 500 : 50,
    createdAt: new Date().toISOString(),
    isActive: true,
    settings: { mfaRequired: false, sessionTimeout: 86400, allowedIPs: [] }
  }
  const user: TenantUser = {
    id: userId,
    tenantId,
    email: input.adminEmail,
    passwordHash: simpleHash(input.adminPassword),
    name: input.adminName,
    role: 'admin',
    createdAt: new Date().toISOString(),
    isActive: true
  }

  store.tenants.set(tenantId, tenant)
  store.users.set(userId, user)

  const token = signToken({ userId, tenantId, email: user.email, role: 'admin', type: 'user' })

  return {
    success: true,
    token,
    tenantId,
    tenantName: tenant.name,
    user: { id: userId, email: user.email, name: user.name, role: 'admin', tenantId }
  }
}
