import { NextRequest, NextResponse } from 'next/server'

const NPOINT_URL = 'https://api.npoint.io/970d8e85c18f2a3aa984'

// Pricing constants
const PERPLEXITY_INPUT_PER_M = 1.00  // $1 per million input tokens
const PERPLEXITY_OUTPUT_PER_M = 1.00 // $1 per million output tokens
const PERPLEXITY_REQUEST_FEE = 0.005 // $0.005 per request
const PERPLEXITY_MONTHLY_BUDGET = 50  // $50/month budget

const CF_NEURONS_FREE_DAILY = 10000   // 10k free neurons/day
const CF_PRICE_PER_1K_NEURONS = 0.011 // $0.011 per 1k neurons
const CF_NEURONS_PER_SCAN = 150       // estimated neurons per DLP scan
const CF_MONTHLY_BUDGET = 20          // $20/month budget

interface ScanEntry {
  id: string
  timestamp: string
  engine: 'traditional' | 'perplexity' | 'cloudflare'
  detected: boolean
  latencyMs: number
  contentLength: number
  source: 'compare' | 'demo' | 'api'
}

export async function GET() {
  try {
    const res = await fetch(NPOINT_URL)
    const data = await res.json()
    const scans: ScanEntry[] = data.scans || []

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const todayScans = scans.filter(s => s.timestamp >= today)
    const weekScans = scans.filter(s => s.timestamp >= weekAgo)
    const monthScans = scans.filter(s => s.timestamp >= monthAgo)

    const byEngine = (list: ScanEntry[]) => ({
      traditional: list.filter(s => s.engine === 'traditional').length,
      perplexity: list.filter(s => s.engine === 'perplexity').length,
      cloudflare: list.filter(s => s.engine === 'cloudflare').length,
    })

    const avgLatency = (list: ScanEntry[], engine: string) => {
      const filtered = list.filter(s => s.engine === engine)
      if (filtered.length === 0) return 0
      return Math.round(filtered.reduce((sum, s) => sum + s.latencyMs, 0) / filtered.length)
    }

    const detectionRate = (list: ScanEntry[]) => {
      if (list.length === 0) return 0
      return Math.round((list.filter(s => s.detected).length / list.length) * 100)
    }

    // Daily breakdown
    const dailyBreakdown = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
      const dayScans = scans.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd)
      dailyBreakdown.push({ date: dayStart.split('T')[0], total: dayScans.length, ...byEngine(dayScans) })
    }

    // === Cost & Usage Calculations ===
    const pxScansMonth = monthScans.filter(s => s.engine === 'perplexity')
    const cfScansMonth = monthScans.filter(s => s.engine === 'cloudflare')
    const pxScansToday = todayScans.filter(s => s.engine === 'perplexity')
    const cfScansToday = todayScans.filter(s => s.engine === 'cloudflare')

    // Perplexity: estimate tokens from contentLength (chars ~ tokens * 4)
    const pxInputTokens = pxScansMonth.reduce((sum, s) => sum + Math.ceil(s.contentLength / 4), 0)
    const pxOutputTokens = pxScansMonth.reduce((sum, s) => sum + Math.ceil(s.contentLength / 8), 0)
    const pxTokenCost = (pxInputTokens / 1000000) * PERPLEXITY_INPUT_PER_M + (pxOutputTokens / 1000000) * PERPLEXITY_OUTPUT_PER_M
    const pxRequestCost = pxScansMonth.length * PERPLEXITY_REQUEST_FEE
    const pxTotalCost = Number((pxTokenCost + pxRequestCost).toFixed(4))

    // Cloudflare: estimate neurons per scan
    const cfTotalNeurons = cfScansMonth.length * CF_NEURONS_PER_SCAN
    const cfDaysInMonth = 30
    const cfFreeNeurons = cfDaysInMonth * CF_NEURONS_FREE_DAILY
    const cfBillableNeurons = Math.max(0, cfTotalNeurons - cfFreeNeurons)
    const cfTotalCost = Number(((cfBillableNeurons / 1000) * CF_PRICE_PER_1K_NEURONS).toFixed(4))

    // Bandwidth (total data processed)
    const pxBandwidth = pxScansMonth.reduce((sum, s) => sum + (s.contentLength || 0), 0)
    const cfBandwidth = cfScansMonth.reduce((sum, s) => sum + (s.contentLength || 0), 0)

    const costs = {
      perplexity: {
        requestsMonth: pxScansMonth.length,
        requestsToday: pxScansToday.length,
        inputTokens: pxInputTokens,
        outputTokens: pxOutputTokens,
        tokenCost: Number(pxTokenCost.toFixed(4)),
        requestCost: Number(pxRequestCost.toFixed(4)),
        totalCost: pxTotalCost,
        budget: PERPLEXITY_MONTHLY_BUDGET,
        remaining: Number((PERPLEXITY_MONTHLY_BUDGET - pxTotalCost).toFixed(2)),
        usagePercent: Number(((pxTotalCost / PERPLEXITY_MONTHLY_BUDGET) * 100).toFixed(1)),
        bandwidth: pxBandwidth,
      },
      cloudflare: {
        requestsMonth: cfScansMonth.length,
        requestsToday: cfScansToday.length,
        totalNeurons: cfTotalNeurons,
        freeNeurons: cfFreeNeurons,
        billableNeurons: cfBillableNeurons,
        neuronCost: cfTotalCost,
        totalCost: cfTotalCost,
        budget: CF_MONTHLY_BUDGET,
        remaining: Number((CF_MONTHLY_BUDGET - cfTotalCost).toFixed(2)),
        usagePercent: Number(((cfTotalCost / CF_MONTHLY_BUDGET) * 100).toFixed(1)),
        freeDaily: CF_NEURONS_FREE_DAILY,
        neuronsPerScan: CF_NEURONS_PER_SCAN,
        bandwidth: cfBandwidth,
      },
    }

    return NextResponse.json({
      total: scans.length,
      today: { total: todayScans.length, ...byEngine(todayScans) },
      week: { total: weekScans.length, ...byEngine(weekScans) },
      month: { total: monthScans.length, ...byEngine(monthScans) },
      avgLatency: {
        traditional: avgLatency(monthScans, 'traditional'),
        perplexity: avgLatency(monthScans, 'perplexity'),
        cloudflare: avgLatency(monthScans, 'cloudflare'),
      },
      detectionRate: detectionRate(monthScans),
      dailyBreakdown,
      recentScans: scans.slice(-20).reverse(),
      costs,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { engine, detected, latencyMs, contentLength, source } = body
    if (!engine) return NextResponse.json({ error: 'engine required' }, { status: 400 })
    const entry: ScanEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      engine,
      detected: !!detected,
      latencyMs: latencyMs || 0,
      contentLength: contentLength || 0,
      source: source || 'api',
    }
    const res = await fetch(NPOINT_URL)
    const data = await res.json()
    const scans = data.scans || []
    scans.push(entry)
    if (scans.length > 500) scans.splice(0, scans.length - 500)
    await fetch(NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scans })
    })
    return NextResponse.json({ ok: true, id: entry.id })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
