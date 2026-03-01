import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const CF_API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN || ''
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct'

// Warmup endpoint - sends a minimal request to Cloudflare Workers AI
// to keep the model loaded and avoid cold starts during demos
export async function GET() {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    return NextResponse.json({ status: 'skipped', reason: 'Cloudflare AI not configured' })
  }

  const startTime = Date.now()

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: 'Respond with OK.' },
            { role: 'user', content: 'ping' }
          ],
          max_tokens: 5,
          temperature: 0,
        }),
      }
    )

    const latencyMs = Date.now() - startTime

    if (res.ok) {
      return NextResponse.json({
        status: 'warm',
        latency_ms: latencyMs,
        model: CF_MODEL,
        timestamp: new Date().toISOString(),
      })
    } else {
      const errText = await res.text()
      return NextResponse.json({
        status: 'error',
        latency_ms: latencyMs,
        error: `CF API ${res.status}: ${errText.slice(0, 200)}`,
      }, { status: 502 })
    }
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      latency_ms: Date.now() - startTime,
      error: err.message,
    }, { status: 500 })
  }
}
