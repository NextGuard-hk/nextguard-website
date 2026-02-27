import { NextRequest, NextResponse } from 'next/server'

const TOKEN_NPOINT = process.env.NPOINT_DOWNLOAD_TOKENS_URL || ''

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get('contact_admin_token')
  return token?.value === sessionSecret
}

export interface DownloadToken {
  id: string
  token: string
  company: string
  contact: string
  email: string
  type: 'customer' | 'partner' | 'poc'
  scope: ('software' | 'hotfix' | 'manual' | 'iso')[]
  createdAt: string
  expiresAt: string
  active: boolean
  maxDownloadsPerHour: number
  maxDownloadsPerDay: number
  maxBytesPerDay: number
  downloads: { timestamp: string; file: string; size: number; ip: string }[]
  disclaimerAccepted?: boolean
  disclaimerAcceptedAt?: string
}

async function getTokens(): Promise<DownloadToken[]> {
  try {
    const res = await fetch(TOKEN_NPOINT, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return data.tokens || []
    }
  } catch {}
  return []
}

async function saveTokens(tokens: DownloadToken[]) {
  await fetch(TOKEN_NPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens }),
  })
}

function generateToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'NG-'
  for (let i = 0; i < 4; i++) {
    if (i > 0) result += '-'
    for (let j = 0; j < 4; j++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
  }
  return result
}

// GET: validate token or list tokens (admin)
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const tokenValue = req.nextUrl.searchParams.get('token')

  if (action === 'validate' && tokenValue) {
    const tokens = await getTokens()
    const found = tokens.find(t => t.token === tokenValue.toUpperCase() && t.active)
    if (!found) return NextResponse.json({ valid: false, error: 'Invalid or inactive token' }, { status: 401 })
    if (new Date(found.expiresAt) < new Date()) {
      return NextResponse.json({ valid: false, error: 'Token has expired. Please contact sales@next-guard.com for renewal.' }, { status: 401 })
    }
    // Check rate limits
    const now = new Date()
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000)
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const hourlyDownloads = found.downloads.filter(d => new Date(d.timestamp) > hourAgo)
    const dailyDownloads = found.downloads.filter(d => new Date(d.timestamp) > dayStart)
    const dailyBytes = dailyDownloads.reduce((sum, d) => sum + (d.size || 0), 0)
    return NextResponse.json({
      valid: true,
      token: {
        id: found.id,
        company: found.company,
        contact: found.contact,
        type: found.type,
        scope: found.scope,
        expiresAt: found.expiresAt,
        disclaimerAccepted: found.disclaimerAccepted || false,
      },
      rateLimit: {
        hourly: { used: hourlyDownloads.length, max: found.maxDownloadsPerHour },
        daily: { used: dailyDownloads.length, max: found.maxDownloadsPerDay },
        bandwidth: { used: dailyBytes, max: found.maxBytesPerDay },
      },
    })
  }

  if (action === 'list') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const tokens = await getTokens()
    return NextResponse.json({ tokens })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// POST: create token (admin) or accept disclaimer (token user)
export async function POST(req: NextRequest) {
  const body = await req.json()

  if (body.action === 'accept-disclaimer') {
    const tokens = await getTokens()
    const found = tokens.find(t => t.token === body.token?.toUpperCase() && t.active)
    if (!found) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    found.disclaimerAccepted = true
    found.disclaimerAcceptedAt = new Date().toISOString()
    await saveTokens(tokens)
    return NextResponse.json({ success: true })
  }

  if (body.action === 'record-download') {
    const tokens = await getTokens()
    const found = tokens.find(t => t.token === body.token?.toUpperCase() && t.active)
    if (!found) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    found.downloads.push({
      timestamp: new Date().toISOString(),
      file: body.file || 'unknown',
      size: body.size || 0,
      ip: body.ip || 'unknown',
    })
    // Keep only last 200 download records per token
    if (found.downloads.length > 200) found.downloads = found.downloads.slice(-200)
    await saveTokens(tokens)
    return NextResponse.json({ success: true })
  }

  // Create new token - admin only
  if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const { company, contact, email, type, scope, expiresInDays } = body
  if (!company || !contact || !email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }
  const tokenType = type || 'customer'
  const defaultExpiry = tokenType === 'poc' ? 90 : 180
  const expDays = expiresInDays || defaultExpiry
  const expiresAt = new Date(Date.now() + expDays * 24 * 60 * 60 * 1000).toISOString()

  const newToken: DownloadToken = {
    id: 'dt-' + Date.now(),
    token: generateToken(),
    company,
    contact,
    email,
    type: tokenType,
    scope: scope || ['software', 'hotfix', 'manual', 'iso'],
    createdAt: new Date().toISOString(),
    expiresAt,
    active: true,
    maxDownloadsPerHour: 8,
    maxDownloadsPerDay: 15,
    maxBytesPerDay: 15 * 1024 * 1024 * 1024,
    downloads: [],
    disclaimerAccepted: false,
  }

  const tokens = await getTokens()
  tokens.push(newToken)
  await saveTokens(tokens)
  return NextResponse.json({ success: true, token: newToken })
}

// DELETE: deactivate token - admin only
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const body = await req.json()
  const tokens = await getTokens()
  const found = tokens.find(t => t.id === body.tokenId)
  if (!found) return NextResponse.json({ error: 'Token not found' }, { status: 404 })
  found.active = false
  await saveTokens(tokens)
  return NextResponse.json({ success: true })
}
