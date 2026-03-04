import { NextRequest, NextResponse } from 'next/server'
import { logScanToNPoint } from '@/lib/scan-logger'

export const dynamic = 'force-dynamic'

// POST /api/log-scan - Log a scan result for the AI Usage Dashboard
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { engine, detected, latencyMs, contentLength, source, inputTokens, outputTokens, neurons, costUSD, model, fileName } = body
    if (!engine) return NextResponse.json({ error: 'engine required' }, { status: 400 })
    await logScanToNPoint({
      engine: engine as any,
      detected: !!detected,
      latencyMs: latencyMs || 0,
      contentLength: contentLength || 0,
      source: source || 'api',
      inputTokens,
      outputTokens,
      neurons,
      costUSD,
      model,
      fileName,
    })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
