import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, CopyObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = 'nextguard-downloads'
const DOWNLOAD_PASSWORD = process.env.DOWNLOAD_PASSWORD || ''
const LOG_NPOINT_URL = process.env.NPOINT_LOGS_URL || ''
const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || ''
const STORAGE_WARN_BYTES = 800 * 1024 * 1024 * 1024 // 800GB storage warning threshold
const STORAGE_NOTIFY_EMAIL = 'oscar@next-guard.com'

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
  // Check total R2 bucket storage and notify if over threshold
async function checkStorageAndNotify() {
  try {
    let totalSize = 0
    let continuationToken: string | undefined
    do {
      const list = await S3.send(new ListObjectsV2Command({
        Bucket: BUCKET, ContinuationToken: continuationToken
      }))
      for (const obj of list.Contents || []) {
        totalSize += obj.Size || 0
      }
      continuationToken = list.NextContinuationToken
    } while (continuationToken)
    if (totalSize >= STORAGE_WARN_BYTES) {
      const totalGB = (totalSize / (1024 * 1024 * 1024)).toFixed(2)
      const resendApiKey = process.env.RESEND_API_KEY
      if (!resendApiKey) {
        console.error('Storage warning: ' + totalGB + 'GB used but no RESEND_API_KEY to send notification')
        return
      }
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'NextGuard Website <noreply@next-guard.com>',
          to: [STORAGE_NOTIFY_EMAIL],
          subject: `[NextGuard] R2 Storage Warning: ${totalGB}GB used (threshold: 800GB)`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;"><h2 style="color:#f59e0b;">R2 Storage Warning</h2><p>The NextGuard R2 storage bucket <strong>${BUCKET}</strong> has reached <strong>${totalGB} GB</strong>, exceeding the 800GB warning threshold.</p><p>Please review and clean up unnecessary files to avoid excessive storage costs.</p><p style="margin-top:20px;color:#94a3b8;font-size:12px;">This is an automated notification from NextGuard Website.</p></div>`,
        }),
      })
      await writeLog({ type: 'system', action: 'storage-warning', size: totalSize.toString(), message: totalGB + 'GB used, notification sent to ' + STORAGE_NOTIFY_EMAIL })
    }
  } catch (e) { console.error('Storage check error:', e) }
}

  try {
    const downloadUrl = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 600 })
    const scanRes = await fetch('https://www.virustotal.com/api/v3/urls', {
      method: 'POST',
      headers: { 'x-apikey': VT_API_KEY, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `url=${encodeURIComponent(downloadUrl)}`,
    })
    if (!scanRes.ok) return { safe: true, message: 'VirusTotal scan request failed, allowing upload' }
    const scanData = await scanRes.json()
    const analysisId = scanData?.data?.id
    if (!analysisId) return { safe: true, message: 'No analysis ID returned' }
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
      return NextResponse.json({ error: 'Missing R2_ACCOUNT_ID or CLOUDFLARE_API_TOKEN env var.' }, { status: 500 })
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
        headers: { 'Authorization': `Bearer ${cfApiToken}`, 'Content-Type': 'application/json' },
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

  // Presigned upload URL - admin only (for files < 5GB)
  if (action === 'presign-upload') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const contentType = searchParams.get('contentType') || 'application/octet-stream'
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    try {
      const url = await getSignedUrl(S3, new PutObjectCommand({
        Bucket: BUCKET, Key: key, ContentType: contentType,
      }), { expiresIn: 3600 })
      return NextResponse.json({ url, key })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Multipart upload: create - admin only
  if (action === 'multipart-create') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const contentType = searchParams.get('contentType') || 'application/octet-stream'
    if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    try {
      const result = await S3.send(new CreateMultipartUploadCommand({
        Bucket: BUCKET, Key: key, ContentType: contentType,
      }))
      return NextResponse.json({ uploadId: result.UploadId, key })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Multipart upload: presign a single part - admin only
  if (action === 'multipart-presign') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const uploadId = searchParams.get('uploadId')
    const partNumber = searchParams.get('partNumber')
    if (!key || !uploadId || !partNumber) return NextResponse.json({ error: 'Missing key, uploadId or partNumber' }, { status: 400 })
    try {
      const url = await getSignedUrl(S3, new UploadPartCommand({
        Bucket: BUCKET, Key: key, UploadId: uploadId, PartNumber: parseInt(partNumber),
      }), { expiresIn: 3600 })
      return NextResponse.json({ url })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Multipart upload: complete - admin only
  if (action === 'multipart-complete') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const uploadId = searchParams.get('uploadId')
    const partsParam = searchParams.get('parts')
    if (!key || !uploadId || !partsParam) return NextResponse.json({ error: 'Missing key, uploadId or parts' }, { status: 400 })
    try {
      const parts = JSON.parse(decodeURIComponent(partsParam)) as { ETag: string; PartNumber: number }[]
      await S3.send(new CompleteMultipartUploadCommand({
        Bucket: BUCKET, Key: key, UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }))
      return NextResponse.json({ success: true, key })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Multipart upload: abort - admin only
  if (action === 'multipart-abort') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const key = searchParams.get('key')
    const uploadId = searchParams.get('uploadId')
    if (!key || !uploadId) return NextResponse.json({ error: 'Missing key or uploadId' }, { status: 400 })
    try {
      await S3.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }))
      return NextResponse.json({ success: true })
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
    const scanResult = await scanWithVirusTotal(key)
    if (!scanResult.safe) {
      try { await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key })) } catch {}
      await writeLog({ type: 'file', action: 'upload-blocked', key, size, ip, status: 'virus-detected', reason: scanResult.message })
      return NextResponse.json({ success: false, virus: true, message: scanResult.message }, { status: 400 })
    }
    await writeLog({ type: 'file', action: 'upload', key, size, ip, status: 'success', scan: scanResult.message })
        // checkStorageAndNotify() // TODO: fix function scope storage check
    return NextResponse.json({ success: true, scan: scanResult.message })
  }

    // Rename/Move file - admin only (copy + delete)
  if (action === 'rename') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const oldKey = searchParams.get('oldKey')
    const newKey = searchParams.get('newKey')
    if (!oldKey || !newKey) return NextResponse.json({ error: 'Missing oldKey or newKey' }, { status: 400 })
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    try {
      await S3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `${BUCKET}/${oldKey.split('/').map(s => encodeURIComponent(s)).join('/')}`, Key: newKey }))
      await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }))
      await writeLog({ type: 'file', action: 'rename', key: oldKey, reason: 'renamed to ' + newKey, ip, status: 'success' })
      return NextResponse.json({ success: true, oldKey, newKey })
    } catch (e: any) {
      await writeLog({ type: 'file', action: 'rename', key: oldKey, ip, status: 'failed', reason: e.message })
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // Move folder - admin only (copy all objects + delete originals)
  if (action === 'move-folder') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const oldPrefix = searchParams.get('oldPrefix')
    const newPrefix = searchParams.get('newPrefix')
    if (!oldPrefix || !newPrefix) return NextResponse.json({ error: 'Missing oldPrefix or newPrefix' }, { status: 400 })
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    try {
      let continuationToken: string | undefined
      let moved = 0
      do {
        const list = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: oldPrefix, ContinuationToken: continuationToken }))
        for (const obj of list.Contents || []) {
          if (obj.Key) {
            const newObjKey = newPrefix + obj.Key.slice(oldPrefix.length)
            await S3.send(new CopyObjectCommand({ Bucket: BUCKET, CopySource: `${BUCKET}/${obj.Key!.split('/').map(s => encodeURIComponent(s)).join('/')}`, Key: newObjKey }))
            await S3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: obj.Key }))
            moved++
          }
        }
        continuationToken = list.NextContinuationToken
      } while (continuationToken)
      await writeLog({ type: 'file', action: 'move-folder', key: oldPrefix, reason: 'moved to ' + newPrefix, count: moved.toString(), ip, status: 'success' })
      return NextResponse.json({ success: true, moved })
    } catch (e: any) {
      await writeLog({ type: 'file', action: 'move-folder', key: oldPrefix, ip, status: 'failed', reason: e.message })
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }

  // List all files recursively - admin only (for folder download)
  if (action === 'list-recursive') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    const prefix = searchParams.get('prefix') || ''
    try {
      let continuationToken: string | undefined
      const files: { key: string; url: string; size: number }[] = []
      do {
        const list = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix, ContinuationToken: continuationToken }))
        for (const obj of list.Contents || []) {
          if (obj.Key && !obj.Key.endsWith('.keep')) {
            const url = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }), { expiresIn: 120 })
            files.push({ key: obj.Key, url, size: obj.Size || 0 })
          }
        }
        continuationToken = list.NextContinuationToken
      } while (continuationToken)
      return NextResponse.json({ files })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
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
            // R2 Budget enforcement - block downloads if monthly cost >= $200
      const budgetRes = await fetch(new URL('/api/r2-budget', req.url))
      if (budgetRes.ok) {
        const budget = await budgetRes.json()
        if (budget.budgetExceeded) {
          await writeLog({ type: 'file', action: 'download', key, ip, status: 'blocked', reason: 'R2 monthly budget exceeded ($' + budget.totalCostUSD + ' / $' + budget.budgetLimitUSD + ')' })
          return NextResponse.json({ error: 'Download temporarily unavailable - monthly bandwidth budget exceeded. Please try again next month.', budgetExceeded: true }, { status: 503 })
        }
      }
      const url = await getSignedUrl(S3, new GetObjectCommand({ Bucket: BUCKET, Key: key, ResponseContentDisposition: `attachment; filename="${key.split('/').pop()}"` }), { expiresIn: 120 })
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
      Bucket: BUCKET, Key: key, Body: buffer,
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
        const list = await S3.send(new ListObjectsV2Command({
          Bucket: BUCKET, Prefix: key, ContinuationToken: continuationToken
        }))
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
