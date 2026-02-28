import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || ''
const VT_FILES_URL = 'https://www.virustotal.com/api/v3/files'

// Vercel Pro: up to 60s, Hobby: 10s
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    if (!VT_API_KEY) {
      return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan skipped (API key not configured)' })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Step 1: Compute SHA-256 hash
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex')

    // Step 2: Check if file already scanned (instant lookup)
    const hashRes = await fetch(`${VT_FILES_URL}/${sha256}`, {
      headers: { 'x-apikey': VT_API_KEY },
    })

    if (hashRes.ok) {
      // File is known - return cached results immediately
      const hashData = await hashRes.json()
      const stats = hashData?.data?.attributes?.last_analysis_stats || {}
      return buildResponse(stats, sha256, 'hash-lookup')
    }

    // Step 3: File unknown - upload and poll (with short timeout)
    const vtForm = new FormData()
    const blob = new Blob([buffer])
    vtForm.append('file', blob, file.name)

    const uploadRes = await fetch(VT_FILES_URL, {
      method: 'POST',
      headers: { 'x-apikey': VT_API_KEY },
      body: vtForm,
    })

    if (!uploadRes.ok) {
      return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan unavailable' })
    }

    const uploadData = await uploadRes.json()
    const analysisUrl = uploadData?.data?.links?.self
    if (!analysisUrl) {
      return NextResponse.json({ safe: true, skipped: true, message: 'No analysis URL' })
    }

    // Poll with short timeout (max 8 attempts x 2s = 16s)
    for (let i = 0; i < 8; i++) {
      await new Promise(r => setTimeout(r, 2000))
      const aRes = await fetch(analysisUrl, { headers: { 'x-apikey': VT_API_KEY } })
      if (!aRes.ok) continue
      const aData = await aRes.json()
      if (aData?.data?.attributes?.status === 'completed') {
        const stats = aData?.data?.attributes?.stats || {}
        return buildResponse(stats, sha256, 'upload-scan')
      }
    }

    // If scan still pending, check hash one more time
    const retryRes = await fetch(`${VT_FILES_URL}/${sha256}`, {
      headers: { 'x-apikey': VT_API_KEY },
    })
    if (retryRes.ok) {
      const retryData = await retryRes.json()
      const stats = retryData?.data?.attributes?.last_analysis_stats || {}
      return buildResponse(stats, sha256, 'hash-retry')
    }

    return NextResponse.json({ safe: true, skipped: true, sha256, message: 'Scan still processing - file allowed with caution' })

  } catch (err: unknown) {
    console.error('Virus scan error:', err)
    return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan error' })
  }
}

function buildResponse(stats: Record<string, number>, sha256: string, method: string) {
  const malicious = stats.malicious || 0
  const suspicious = stats.suspicious || 0
  const undetected = stats.undetected || 0
  const harmless = stats.harmless || 0
  const totalEngines = malicious + suspicious + undetected + harmless
  const isSafe = malicious === 0 && suspicious === 0

  return NextResponse.json({
    safe: isSafe,
    skipped: false,
    malicious,
    suspicious,
    undetected,
    harmless,
    totalEngines,
    sha256,
    method,
    message: isSafe
      ? `File is clean (${totalEngines} engines, ${method})`
      : `THREAT DETECTED: ${malicious} engine(s) flagged malicious, ${suspicious} suspicious`,
  })
}
