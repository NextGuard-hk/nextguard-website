import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = 'nextguard-downloads'
const DOWNLOAD_PASSWORD = process.env.DOWNLOAD_PASSWORD || 'NextGuard123'
const LOG_NPOINT_URL = 'https://api.npoint.io/141c14f9077701d99bc1'
const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || ''

// Prefix constants
const PUBLIC_PREFIX = 'public/'
const INTERNAL_PREFIX = 'internal/'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get('contact_admin_token')
  return token?.value === sessionSecret
}

async function writeLog(entry: Record<string, string>) {
  try {
    const logEntry = { id: Date.now().toString(), timestamp: new Date().toISOString(), ...entry };
    const getRes = await fetch(LOG_NPOINT_URL, { cache: 'no-store' });
    const current = await getRes.json();
    const logs = current.logs || [];
    logs.push(logEntry);
    await fetch(LOG_NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ logs: logs.slice(-500) }),
    });
  } catch (e) { console.error('Log write error:', e); }
}

// Scan file with VirusTotal by URL (for R2 presigned download URL)
async function scanWithVirusTotal(key: string): Promise<{ safe: boolean; message: string }> {
  if (!VT_API_KEY) return { safe: true, message: 'Virus scanning not configured (no API key)' }
  try {
    // Generate a temporary download URL for VirusTotal to fetch
    const downloadUrl = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 600 })
    // Submit URL to VirusTotal for scanning
    const scanRes = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: { 'x-apikey': VT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(downloadUrl)}`,
    })
    if (!scanRes.ok) return { safe: true, message: 'VirusTotal scan request failed, allowing upload' }
    const scanData = await scanRes.json()
    const analysisId = scanData?.data?.id
    if (!analysisId) return { safe: true, message: 'No analysis ID returned' }
    // Poll for results (wait up to 60s)
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const resultRes = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': VT_API_KEY },
      })
      if (!resultRes.ok) continue
      const result = await resultRes.json()
      const status = result?.data?.attributes?.status
      if (status === 'completed') {
        const stats = result?.data?.attributes?.stats || {}
        const malicious = stats.malicious || 0
        const suspicious = stats.suspicious || 0
        if (malicious > 0 || suspicious > 0) {
          return { safe: false, message: `Threat detected: ${malicious} malicious, ${suspicious} suspicious` }
        }
        return { safe: true, message: 'Scan clean' }
      }
    }
    return { safe: true, message: 'Scan timeout, allowing upload' }
  } catch (e: any) {
    return { safe: true, message: `Scan error: ${e.message}` }
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const action = searchParams.get('action')
  const pw = searchParams.get('pw')
  const admin = isAdmin(req)

  // Setup CORS for R2 bucket via Cloudflare REST API - admin only
  if (action === 'setup-cors') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const accountId = process.env.R2_ACCOUNT_ID
    const cfApiToken = process.env.CLOUDFLARE_API_TOKEN
    if (!accountId || !cfApiToken) {
      return NextResponse.json({ error: 'Missing R2_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env var. Please add CLOUDFLARE_API_TOKEN (with R2 edit permissions) in Vercel Environment Variables.' }, { status: 500 })
    }
    try {
      const corsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${BUCKET}/cors`
      const corsPolicy = {
        rules: [{
          allowed: {
            origins: ['*'],
            methods: ['GET', 'PUT', 'POST', 'HEAD'],
            headers: ['*'],
          },
          exposeHeaders: ['ETag'],
          maxAgeSeconds: 86400,
        }],
      }
      const res = await fetch(corsUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cfApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(corsPolicy),
      })
      const data = await res.json()
      if (data.success) {
        return NextResponse.json({ success: true, message: 'CORS configured for R2 bucket' })
      } else {
        return NextResponse.json({ error: data.errors?.[0]?.message || 'Cloudflare API error', details: data.errors }, { status: 500 })
      }
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Presigned upload URL - admin only
  if (action === 'presign-upload') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const contentType = searchParams.get('contentType') || 'application/octet-stream'
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    try {
      const url = await getSignedUrl(S3, new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        ContentType: contentType,
      }), { expiresIn: 3600 })
      return NextResponse.json({ url, key })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Confirm upload completed + virus scan - admin only
  if (action === 'confirm-upload') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key') || 'unknown'
    const size = searchParams.get('size') || '0'
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    // Run virus scan
    const scanResult = await scanWithVirusTotal(key)
    if (!scanResult.safe) {
      // Delete the infected file from R2
      try { await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })) } catch {}
      await writeLog({ type: 'file', action: 'upload-blocked', key, size, ip, status: 'virus-detected', reason: scanResult.message })
      return NextResponse.json({ success: false, virus: true, message: scanResult.message }, { status: 400 })
    }
    await writeLog({ type: 'file', action: 'upload', key, size, ip, status: 'success', scan: scanResult.message })
    return NextResponse.json({ success: true, scan: scanResult.message })
  }

  if (!action || action === 'list') {
    if (pw !== DOWNLOAD_PASSWORD && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
      let prefix = searchParams.get('prefix') || ''
      if (!admin) {
        prefix = PUBLIC_PREFIX + prefix.replace(/^public\//, '')
      }
      const data = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, Delimiter: '/' }))
      const folders = (data.CommonPrefixes || []).map(p => ({
        name: p.Prefix?.replace(prefix, '').replace(/\/$/, '') || '',
        path: p.Prefix || '',
        type: 'folder' as const,
      }))
      const files = (data.Contents || []).filter(f => f.Key !== prefix).map(f => ({
        name: f.Key?.replace(prefix, '') || '',
        path: f.Key || '',
        size: f.Size || 0,
        lastModified: f.LastModified?.toISOString() || '',
        type: 'file' as const,
      }))
      return NextResponse.json({ items: [...folders, ...files] })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  if (action === 'download') {
    if (pw !== DOWNLOAD_PASSWORD && !admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    const key = searchParams.get('key') || 'unknown'
    try {
      if (key === 'unknown') return NextResponse.json({ error: 'Missing key' }, { status: 400 })
      if (!admin && !key.startsWith(PUBLIC_PREFIX)) {
        await writeLog({ type: 'file', action: 'download', key, ip, status: 'failed', reason: 'Access denied - not a public file' })
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
      const url = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 })
      await writeLog({ type: 'file', action: 'download', key, ip, status: 'success' })
      return NextResponse.json({ url })
    } catch (e: any) {
      await writeLog({ type: 'file', action: 'download', key, ip, status: 'failed', reason: e.message })
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  let key = 'unknown'
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    key = (formData.get('key') as string | null) || 'unknown'
    if (!file || key === 'unknown') {
      return NextResponse.json({ error: 'Missing file or key' }, { status: 400 })
    }
    const buffer = Buffer.from(await file.arrayBuffer())
    await S3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: file.type || 'application/octet-stream',
    }))
    await writeLog({ type: 'file', action: 'upload', key, size: file.size.toString(), ip, status: 'success' })
    return NextResponse.json({ success: true, key })
  } catch (e: any) {
    await writeLog({ type: 'file', action: 'upload', key, ip, status: 'failed', reason: e.message })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  let key = 'unknown'
  try {
    const body = await req.json()
    key = body.key || 'unknown'
    if (key === 'unknown') return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    if (key.endsWith('/')) {
      let continuationToken: string | undefined
      let deleted = 0
      do {
        const list = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: key, ContinuationToken: continuationToken }))
        const objects = list.Contents || []
        for (const obj of objects) {
          if (obj.Key) { await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key })); deleted++ }
        }
        continuationToken = list.NextContinuationToken
      } while (continuationToken)
      await writeLog({ type: 'file', action: 'delete_folder', key, count: deleted.toString(), ip, status: 'success' })
      return NextResponse.json({ success: true, deleted })
    }
    await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    await writeLog({ type: 'file', action: 'delete', key, ip, status: 'success' })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    await writeLog({ type: 'file', action: 'delete', key, ip, status: 'failed', reason: e.message })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
