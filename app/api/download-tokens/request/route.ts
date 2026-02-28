import { NextRequest, NextResponse } from 'next/server'

const REQUESTS_NPOINT = process.env.NPOINT_TOKEN_REQUESTS_URL || ''
const TOKENS_NPOINT = process.env.NPOINT_DOWNLOAD_TOKENS_URL || ''

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get('contact_admin_token')
  return token?.value === sessionSecret
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

async function getRequests() {
  try {
    const res = await fetch(REQUESTS_NPOINT, { cache: 'no-store' })
    if (res.ok) { const data = await res.json(); return data.requests || [] }
  } catch {}
  return []
}

async function saveRequests(requests: any[]) {
  await fetch(REQUESTS_NPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  })
}

async function getTokens() {
  try {
    const res = await fetch(TOKENS_NPOINT, { cache: 'no-store' })
    if (res.ok) { const data = await res.json(); return data.tokens || [] }
  } catch {}
  return []
}

async function saveTokens(tokens: any[]) {
  await fetch(TOKENS_NPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tokens }),
  })
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) return false
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'NextGuard Downloads <noreply@next-guard.com>',
        to: [to],
        subject,
        html,
      }),
    })
    return res.ok
  } catch { return false }
}

// POST: Submit a new access request (public)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { company, contact, email, type, reason } = body
    if (!company || !contact || !email) {
      return NextResponse.json({ error: 'Company, contact name and email are required' }, { status: 400 })
    }
    // Check for duplicate pending request
    const requests = await getRequests()
    const existing = requests.find((r: any) => r.email === email && r.status === 'pending')
    if (existing) {
      return NextResponse.json({ error: 'You already have a pending request. Please wait for approval.' }, { status: 409 })
    }
    const newRequest = {
      id: 'req-' + Date.now(),
      company,
      contact,
      email,
      type: type || 'customer',
      reason: reason || '',
      status: 'pending',
      submittedAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
    }
    requests.push(newRequest)
    await saveRequests(requests)
    // Notify admin
    await sendEmail(
      'sales@next-guard.com',
      'New Download Access Request - ' + company,
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">New Download Access Request</h2>
        <p><strong>Company:</strong> ${company}</p>
        <p><strong>Contact:</strong> ${contact}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Type:</strong> ${type || 'customer'}</p>
        <p><strong>Reason:</strong> ${reason || 'N/A'}</p>
        <p style="margin-top:16px"><a href="https://next-guard.com/admin" style="background:#0891b2;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">Review in Admin Dashboard</a></p>
      </div>`
    )
    return NextResponse.json({ success: true, message: 'Request submitted successfully. You will receive an email once approved.' })
  } catch {
    return NextResponse.json({ error: 'Failed to submit request' }, { status: 500 })
  }
}

// GET: List requests (admin) or approve/reject
export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')

  if (action === 'list') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const requests = await getRequests()
    return NextResponse.json({ requests })
  }

  if (action === 'approve') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const id = req.nextUrl.searchParams.get('id')
    const requests = await getRequests()
    const found = requests.find((r: any) => r.id === id)
    if (!found) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (found.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 })

    // Create token
    const tokenType = found.type || 'customer'
    const defaultExpiry = tokenType === 'poc' ? 90 : 180
    const expiresAt = new Date(Date.now() + defaultExpiry * 24 * 60 * 60 * 1000).toISOString()
    const newToken = {
      id: 'dt-' + Date.now(),
      token: generateToken(),
      company: found.company,
      contact: found.contact,
      email: found.email,
      type: tokenType,
      scope: ['software', 'hotfix', 'manual', 'iso'],
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

    // Update request status
    found.status = 'approved'
    found.reviewedAt = new Date().toISOString()
    found.tokenId = newToken.id
    await saveRequests(requests)

    // Send approval email with token
    await sendEmail(
      found.email,
      'Your NextGuard Download Access Has Been Approved',
      `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Download Access Approved</h2>
        <p>Dear ${found.contact},</p>
        <p>Your download access request for <strong>${found.company}</strong> has been approved.</p>
        <div style="background:#f1f5f9;padding:16px;border-radius:8px;margin:16px 0;text-align:center">
          <p style="color:#64748b;font-size:14px;margin:0 0 8px">Your Download Token</p>
          <p style="font-size:24px;font-weight:bold;letter-spacing:2px;color:#0891b2;margin:0">${newToken.token}</p>
        </div>
        <p><strong>Valid until:</strong> ${new Date(expiresAt).toLocaleDateString()}</p>
        <p><strong>How to use:</strong></p>
        <ol>
          <li>Go to <a href="https://next-guard.com/downloads">https://next-guard.com/downloads</a></li>
          <li>Select the "Token" tab</li>
          <li>Enter your token above</li>
          <li>Accept the disclaimer and start downloading</li>
        </ol>
        <p style="color:#64748b;font-size:13px;margin-top:24px">This token is for authorized use only. Do not share it with unauthorized parties. All downloads are monitored and logged.</p>
        <p style="margin-top:16px">Best regards,<br/>NextGuard Technology</p>
      </div>`
    )

    return NextResponse.json({ success: true, token: newToken.token })
  }

  if (action === 'reject') {
    if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const id = req.nextUrl.searchParams.get('id')
    const reason = req.nextUrl.searchParams.get('reason') || 'Your request does not meet our current access criteria.'
    const requests = await getRequests()
    const found = requests.find((r: any) => r.id === id)
    if (!found) return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    if (found.status !== 'pending') return NextResponse.json({ error: 'Already processed' }, { status: 400 })

    found.status = 'rejected'
    found.reviewedAt = new Date().toISOString()
    found.rejectReason = reason
    await saveRequests(requests)

    // Send rejection email
    await sendEmail(
      found.email,
      'NextGuard Download Access Request Update',
      `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a">Download Access Request Update</h2>
        <p>Dear ${found.contact},</p>
        <p>Thank you for your interest in NextGuard products. After reviewing your request, we are unable to approve download access at this time.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p>If you believe this was an error or would like to discuss further, please contact us at <a href="mailto:sales@next-guard.com">sales@next-guard.com</a>.</p>
        <p style="margin-top:16px">Best regards,<br/>NextGuard Technology</p>
      </div>`
    )

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
