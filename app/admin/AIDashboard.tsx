"use client"
import { useState, useEffect } from "react"

export default function AIDashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function fetchUsage() {
    setLoading(true)
    setError("")
    try {
      const r = await fetch("/api/ai-usage")
      if (r.ok) {
        const d = await r.json()
        setData(d)
      } else {
        setError("Failed to load AI usage data")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsage() }, [])

  if (loading) return <div className="p-8 text-center text-gray-400">Loading AI usage data...</div>
  if (error) return <div className="p-8 text-center text-red-400">{error}</div>
  if (!data) return <div className="p-8 text-center text-gray-400">No data</div>

  const scans = data.recentScans ?? []
  const costs = data.costs
  const total = data.total ?? 0
  const detectionRate = data.detectionRate ?? 0
  const avgLat = data.avgLatency ?? {}

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">AI Usage Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Scans" value={total} />
        <Card label="Today" value={data.today?.total ?? 0} color="text-cyan-400" />
        <Card label="Detection Rate" value={`${detectionRate}%`} color="text-yellow-400" />
        <Card label="This Week" value={data.week?.total ?? 0} color="text-blue-400" />
      </div>

      {/* Avg Latency by Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 uppercase mb-2">Traditional</h4>
          <p className="text-xl font-bold text-white">{avgLat.traditional ?? 0}ms avg</p>
          <p className="text-sm text-gray-400">{data.today?.traditional ?? 0} today &middot; {data.week?.traditional ?? 0} this week</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 uppercase mb-2">Perplexity Sonar</h4>
          <p className="text-xl font-bold text-blue-400">{avgLat.perplexity ?? 0}ms avg</p>
          <p className="text-sm text-gray-400">{data.today?.perplexity ?? 0} today &middot; {data.week?.perplexity ?? 0} this week</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <h4 className="text-sm text-gray-400 uppercase mb-2">Cloudflare Workers AI</h4>
          <p className="text-xl font-bold text-orange-400">{avgLat.cloudflare ?? 0}ms avg</p>
          <p className="text-sm text-gray-400">{data.today?.cloudflare ?? 0} today &middot; {data.week?.cloudflare ?? 0} this week</p>
        </div>
      </div>

      {/* Cost & Usage Tracking */}
      {costs && (
        <>
          <h3 className="text-xl font-semibold text-white mt-4">Usage & Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Perplexity Sonar */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-lg font-semibold text-blue-400 mb-3">Perplexity Sonar API</h4>
              <div className="space-y-2 text-sm">
                <Row label="Requests (Month)" value={String(costs.perplexity?.requestsMonth ?? 0)} />
                <Row label="Requests (Today)" value={String(costs.perplexity?.requestsToday ?? 0)} />
                <Row label="Input Tokens" value={(costs.perplexity?.inputTokens ?? 0).toLocaleString()} />
                <Row label="Output Tokens" value={(costs.perplexity?.outputTokens ?? 0).toLocaleString()} />
                <Row label="Bandwidth" value={`${((costs.perplexity?.bandwidth ?? 0) / 1024).toFixed(1)} KB`} />
                <Row label="Token Cost" value={`$${(costs.perplexity?.tokenCost ?? 0).toFixed(4)}`} />
                <Row label="Request Fees" value={`$${(costs.perplexity?.requestCost ?? 0).toFixed(4)}`} />
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <Row label="Total Spent" value={`$${(costs.perplexity?.totalCost ?? 0).toFixed(4)}`} bold />
                  <Row label="Monthly Budget" value={`$${costs.perplexity?.budget ?? 50}`} />
                  <Row label="Remaining" value={`$${(costs.perplexity?.remaining ?? 0).toFixed(2)}`} color={(costs.perplexity?.remaining ?? 50) < 10 ? 'text-red-400' : 'text-green-400'} bold />
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{width: `${Math.min(costs.perplexity?.usagePercent ?? 0, 100)}%`}} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{(costs.perplexity?.usagePercent ?? 0).toFixed(1)}% of budget used</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Cloudflare Workers AI */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-lg font-semibold text-orange-400 mb-3">Cloudflare Workers AI</h4>
              <div className="space-y-2 text-sm">
                <Row label="Requests (Month)" value={String(costs.cloudflare?.requestsMonth ?? 0)} />
                <Row label="Requests (Today)" value={String(costs.cloudflare?.requestsToday ?? 0)} />
                <Row label="Total Neurons" value={(costs.cloudflare?.totalNeurons ?? 0).toLocaleString()} />
                <Row label="Free Tier (Daily)" value={`${(costs.cloudflare?.freeDaily ?? 10000).toLocaleString()} neurons`} />
                <Row label="Neurons/Scan" value={String(costs.cloudflare?.neuronsPerScan ?? 150)} />
                <Row label="Billable Neurons" value={(costs.cloudflare?.billableNeurons ?? 0).toLocaleString()} />
                <Row label="Bandwidth" value={`${((costs.cloudflare?.bandwidth ?? 0) / 1024).toFixed(1)} KB`} />
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <Row label="Neuron Cost" value={`$${(costs.cloudflare?.neuronCost ?? 0).toFixed(4)}`} />
                  <Row label="Total Spent" value={`$${(costs.cloudflare?.totalCost ?? 0).toFixed(4)}`} bold />
                  <Row label="Monthly Budget" value={`$${costs.cloudflare?.budget ?? 20}`} />
                  <Row label="Remaining" value={`$${(costs.cloudflare?.remaining ?? 0).toFixed(2)}`} color={(costs.cloudflare?.remaining ?? 20) < 5 ? 'text-red-400' : 'text-green-400'} bold />
                  <div className="mt-2">
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div className="bg-orange-500 h-2 rounded-full" style={{width: `${Math.min(costs.cloudflare?.usagePercent ?? 0, 100)}%`}} />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{(costs.cloudflare?.usagePercent ?? 0).toFixed(1)}% of budget used</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Total Cost Summary */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-5 border border-gray-600">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-400">Combined Monthly Spend</p>
                <p className="text-2xl font-bold text-white">${((costs.perplexity?.totalCost ?? 0) + (costs.cloudflare?.totalCost ?? 0)).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Combined Budget</p>
                <p className="text-2xl font-bold text-white">${(costs.perplexity?.budget ?? 50) + (costs.cloudflare?.budget ?? 20)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Remaining</p>
                {(() => { const rem = (costs.perplexity?.remaining ?? 50) + (costs.cloudflare?.remaining ?? 20); return <p className={`text-2xl font-bold ${rem < 15 ? 'text-red-400' : 'text-green-400'}`}>${rem.toFixed(2)}</p> })()}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Recent Scans Table */}
      <h3 className="text-xl font-semibold text-white">Recent Scans</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-gray-400 border-b border-gray-700">
            <tr>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3">Engine</th>
              <th className="py-2 px-3">Source</th>
              <th className="py-2 px-3">Detected</th>
              <th className="py-2 px-3">Latency</th>
              <th className="py-2 px-3">Content</th>
            </tr>
          </thead>
          <tbody>
            {scans.slice(0, 20).map((s: any) => (
              <tr key={s.id} className="border-b border-gray-800 text-gray-300">
                <td className="py-2 px-3 whitespace-nowrap">{new Date(s.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.engine === 'perplexity' ? 'bg-blue-900 text-blue-300' :
                    s.engine === 'cloudflare' ? 'bg-orange-900 text-orange-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>{s.engine}</span>
                </td>
                <td className="py-2 px-3">{s.source}</td>
                <td className="py-2 px-3">{s.detected ? <span className="text-red-400">Yes</span> : <span className="text-green-400">No</span>}</td>
                <td className="py-2 px-3">{s.latencyMs}ms</td>
                <td className="py-2 px-3">{((s.contentLength ?? 0) / 1024).toFixed(1)} KB</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Card({ label, value, color = 'text-white' }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  )
}

function Row({ label, value, color = 'text-gray-200', bold = false }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={`${color} ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
  )
}
