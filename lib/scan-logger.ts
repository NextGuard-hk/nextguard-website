// lib/scan-logger.ts
// Shared utility to log AI scan events to nPoint for the AI Usage Dashboard

const NPOINT_URL = 'https://api.npoint.io/970d8e85c18f2a3aa984'

export interface ScanLogEntry {
  id: string
  timestamp: string
  engine: 'traditional' | 'perplexity' | 'cloudflare'
  detected: boolean
  latencyMs: number
  contentLength: number
  source: 'compare' | 'demo' | 'api' | 'syslog'
  inputTokens?: number
  outputTokens?: number
  neurons?: number
  costUSD?: number
  model?: string
  fileName?: string
}

export async function logScanToNPoint(entry: Omit<ScanLogEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const record: ScanLogEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
      ...entry,
    }
    const res = await fetch(NPOINT_URL, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const scans: ScanLogEntry[] = data.scans || []
    scans.push(record)
    // Keep max 1000 records
    if (scans.length > 1000) scans.splice(0, scans.length - 1000)
    await fetch(NPOINT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, scans })
    })
  } catch {
    // Non-blocking: don't let logging failures affect scan results
  }
}

// Helper: estimate Perplexity Sonar token costs
export function estimatePerplexityCost(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000000) * 1.0 + (outputTokens / 1000000) * 1.0
}

// Helper: estimate Cloudflare Workers AI neuron costs
export function estimateCloudflareCost(neurons: number): number {
  const FREE_DAILY = 10000
  const PRICE_PER_1K = 0.011
  const billable = Math.max(0, neurons - FREE_DAILY)
  return (billable / 1000) * PRICE_PER_1K
}
