import { NextRequest, NextResponse } from 'next/server'

const VT_API_KEY = process.env.VIRUSTOTAL_API_KEY || ''
const VT_UPLOAD_URL = 'https://www.virustotal.com/api/v3/files'
const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 2000

export async function POST(req: NextRequest) {
  try {
    if (!VT_API_KEY) {
      return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan skipped: API key not configured' })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Step 1: Upload file to VirusTotal
    const vtForm = new FormData()
    const buffer = Buffer.from(await file.arrayBuffer())
    const blob = new Blob([buffer])
    vtForm.append('file', blob, file.name)

    const uploadRes = await fetch(VT_UPLOAD_URL, {
      method: 'POST',
      headers: { 'x-apikey': VT_API_KEY },
      body: vtForm,
    })

    if (!uploadRes.ok) {
      const errText = await uploadRes.text()
      console.error('VirusTotal upload error:', uploadRes.status, errText)
      return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan unavailable, proceeding with caution' })
    }

    const uploadData = await uploadRes.json()
    const analysisUrl = uploadData?.data?.links?.self
    if (!analysisUrl) {
      return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan: no analysis URL returned' })
    }

    // Step 2: Poll for analysis results
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

      const analysisRes = await fetch(analysisUrl, {
        headers: { 'x-apikey': VT_API_KEY },
      })

      if (!analysisRes.ok) continue

      const analysisData = await analysisRes.json()
      const status = analysisData?.data?.attributes?.status

      if (status === 'completed') {
        const stats = analysisData?.data?.attributes?.stats || {}
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
          message: isSafe
            ? `File is clean (scanned by ${totalEngines} engines)`
            : `THREAT DETECTED: ${malicious} engine(s) flagged as malicious, ${suspicious} as suspicious`,
        })
      }
    }

    // Timeout - scan took too long
    return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan timed out, proceeding with caution' })

  } catch (err: unknown) {
    console.error('Virus scan error:', err)
    return NextResponse.json({ safe: true, skipped: true, message: 'Virus scan error, proceeding with caution' })
  }
}

export const config = {
  api: { bodyParser: false },
}
