import { NextRequest, NextResponse } from 'next/server'

const NPOINT_URL = 'https://api.npoint.io/970d8e85c18f2a3aa984'

interface ScanEntry {
  id: string
  timestamp: string
  engine: 'traditional' | 'perplexity' | 'cloudflare'
  detected: boolean
  latencyMs: number
  contentLength: number
  source: 'compare' | 'demo' | 'api'
}

// GET - retrieve usage stats
export async function GET() {
  try {
    const res = await fetch(NPOINT_URL)
    const data = await res.json()
    const scans: ScanEntry[] = data.scans || []

    // Calculate stats
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

    // Daily breakdown for chart (last 7 days)
    const dailyBreakdown = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString()
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString()
      const dayScans = scans.filter(s => s.timestamp >= dayStart && s.timestamp < dayEnd)
      dailyBreakdown.push({
        date: dayStart.split('T')[0],
        total: dayScans.length,
        ...byEngine(dayScans)
      })
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
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST - log a new scan
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

    // Fetch current data
    const res = await fetch(NPOINT_URL)
    const data = await res.json()
    const scans = data.scans || []

    // Keep last 500 entries to avoid npoint limits
    scans.push(entry)
    if (scans.length > 500) scans.splice(0, scans.length - 500)

    // Save back
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
