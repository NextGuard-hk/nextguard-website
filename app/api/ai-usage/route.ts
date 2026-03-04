import { NextResponse } from 'next/server'

const NPOINT_URL = 'https://api.npoint.io/970d8e85c18f2a3aa984'

// Pricing constants
const PERPLEXITY_INPUT_PER_M = 1.00
const PERPLEXITY_OUTPUT_PER_M = 1.00
const PERPLEXITY_REQUEST_FEE = 0.005
const PERPLEXITY_MONTHLY_BUDGET = 50

const CF_NEURONS_FREE_DAILY = 10000
const CF_PRICE_PER_1K_NEURONS = 0.011
const CF_NEURONS_PER_SCAN = 150
const CF_MONTHLY_BUDGET = 20

interface ScanEntry {
  id: string
  timestamp: string
  engine: 'traditional' | 'perplexity' | 'cloudflare'
  detected: boolean
  latencyMs: number
  contentLength: number
  source: 'compare' | 'demo' | 'api'
  action?: string
  content_snippet?: string
  policy?: string
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const res = await fetch(NPOINT_URL, { cache: 'no-store', next: { revalidate: 0 } })
    const data = await res.json()
    const scans: ScanEntry[] = data.scans || []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const totalScans = scans.length
    const todayScans = scans.filter(s => s.timestamp >= today).length
    const weeklyScans = scans.filter(s => s.timestamp >= weekAgo).length
    const monthlyScans = scans.filter(s => s.timestamp >= monthAgo)
    const detected = scans.filter(s => s.detected).length
    const detectionRate = totalScans > 0 ? ((detected / totalScans) * 100).toFixed(1) + '%' : '0%'

    const engineMap: Record<string, { scans: number; detections: number; totalLatency: number }> = {}
    for (const s of scans) {
      const key = s.engine || 'unknown'
      if (!engineMap[key]) engineMap[key] = { scans: 0, detections: 0, totalLatency: 0 }
      engineMap[key].scans++
      if (s.detected) engineMap[key].detections++
      engineMap[key].totalLatency += s.latencyMs || 0
    }

    const engines = Object.entries(engineMap).map(([name, v]) => ({
      name,
      scans: v.scans,
      detections: v.detections,
    }))

    const avgLatency = (engine: string) => {
      const e = engineMap[engine]
      if (!e || e.scans === 0) return 'N/A'
      return Math.round(e.totalLatency / e.scans) + 'ms'
    }

    const monthPerplexity = monthlyScans.filter(s => s.engine === 'perplexity')
    const monthCloudflare = monthlyScans.filter(s => s.engine === 'cloudflare')

    const perplexityCost = monthPerplexity.length * PERPLEXITY_REQUEST_FEE +
      monthPerplexity.reduce((sum, s) => sum + (s.contentLength || 500) * 0.75 / 1000000, 0) * PERPLEXITY_INPUT_PER_M +
      monthPerplexity.reduce((sum, s) => sum + 200 / 1000000, 0) * PERPLEXITY_OUTPUT_PER_M

    const cfNeurons = monthCloudflare.length * CF_NEURONS_PER_SCAN
    const cfDays = 30
    const cfFreeTotal = CF_NEURONS_FREE_DAILY * cfDays
    const cfPaidNeurons = Math.max(0, cfNeurons - cfFreeTotal)
    const cfCost = (cfPaidNeurons / 1000) * CF_PRICE_PER_1K_NEURONS

    const scan_history = scans
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 500)
      .map(s => ({
        id: s.id,
        timestamp: s.timestamp,
        engine: s.engine === 'perplexity' ? 'sonar' : s.engine,
        action: s.action || s.source || 'scan',
        content_snippet: s.content_snippet || (s.contentLength || 0) + ' chars scanned',
        result: s.detected ? 'detected' : 'clean',
        latency_ms: s.latencyMs || 0,
        policy: s.policy || '',
      }))

    return NextResponse.json({
      total_scans: totalScans,
      today_scans: todayScans,
      detection_rate: detectionRate,
      weekly_scans: weeklyScans,
      avg_latency: {
        sonar: avgLatency('perplexity'),
        cloudflare: avgLatency('cloudflare'),
        openai: avgLatency('traditional'),
      },
      engines,
      scan_history,
      cost: {
        perplexity: { used: +perplexityCost.toFixed(4), budget: PERPLEXITY_MONTHLY_BUDGET, unit: 'USD' },
        cloudflare: { used: +cfCost.toFixed(4), budget: CF_MONTHLY_BUDGET, neurons: cfNeurons, unit: 'USD' },
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
