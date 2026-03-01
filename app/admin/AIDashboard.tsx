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

  const { scans, summary, costs } = data

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">AI Usage Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Scans" value={summary?.totalScans ?? 0} />
        <Card label="Detections" value={summary?.detections ?? 0} color="text-red-400" />
        <Card label="Avg Latency" value={`${summary?.avgLatency ?? 0}ms`} />
        <Card label="Detection Rate" value={`${summary?.detectionRate ?? 0}%`} color="text-yellow-400" />
      </div>

      {/* Engine Breakdown */}
      {summary?.byEngine && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(summary.byEngine).map(([engine, s]: any) => (
            <div key={engine} className="bg-gray-800 rounded-lg p-4">
              <h4 className="text-sm text-gray-400 uppercase mb-2">{engine}</h4>
              <p className="text-xl font-bold text-white">{s.count} scans</p>
              <p className="text-sm text-gray-400">{s.detections} detections &middot; {s.avgLatency}ms avg</p>
            </div>
          ))}
        </div>
      )}

      {/* Cost & Usage Tracking */}
      {costs && (
        <>
          <h3 className="text-xl font-semibold text-white mt-4">Usage & Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Perplexity Sonar */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-lg font-semibold text-blue-400 mb-3">Perplexity Sonar API</h4>
              <div className="space-y-2 text-sm">
                <Row label="Input Tokens Used" value={costs.perplexity?.inputTokens?.toLocaleString() ?? '0'} />
                <Row label="Output Tokens Used" value={costs.perplexity?.outputTokens?.toLocaleString() ?? '0'} />
                <Row label="Total Requests" value={costs.perplexity?.requests?.toLocaleString() ?? '0'} />
                <Row label="Input Token Cost" value={`$${costs.perplexity?.inputCost?.toFixed(4) ?? '0.0000'}`} />
                <Row label="Output Token Cost" value={`$${costs.perplexity?.outputCost?.toFixed(4) ?? '0.0000'}`} />
                <Row label="Request Fees" value={`$${costs.perplexity?.requestCost?.toFixed(4) ?? '0.0000'}`} />
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <Row label="Total Spent" value={`$${costs.perplexity?.totalCost?.toFixed(4) ?? '0.0000'}`} bold />
                  <Row label="Monthly Budget" value={`$${costs.perplexity?.monthlyBudget ?? 50}`} />
                  <Row label="Remaining" value={`$${costs.perplexity?.remaining?.toFixed(4) ?? '0.0000'}`} color={costs.perplexity?.remaining < 10 ? 'text-red-400' : 'text-green-400'} bold />
                </div>
              </div>
            </div>

            {/* Cloudflare Workers AI */}
            <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
              <h4 className="text-lg font-semibold text-orange-400 mb-3">Cloudflare Workers AI</h4>
              <div className="space-y-2 text-sm">
                <Row label="Neurons Used" value={costs.cloudflare?.neuronsUsed?.toLocaleString() ?? '0'} />
                <Row label="Free Tier (Daily)" value={`${costs.cloudflare?.freeDailyNeurons?.toLocaleString() ?? '10,000'} neurons`} />
                <Row label="Billable Neurons" value={costs.cloudflare?.billableNeurons?.toLocaleString() ?? '0'} />
                <Row label="Neuron Cost" value={`$${costs.cloudflare?.neuronCost?.toFixed(4) ?? '0.0000'}`} />
                <div className="border-t border-gray-600 pt-2 mt-2">
                  <Row label="Total Spent" value={`$${costs.cloudflare?.totalCost?.toFixed(4) ?? '0.0000'}`} bold />
                  <Row label="Monthly Budget" value={`$${costs.cloudflare?.monthlyBudget ?? 20}`} />
                  <Row label="Remaining" value={`$${costs.cloudflare?.remaining?.toFixed(4) ?? '0.0000'}`} color={costs.cloudflare?.remaining < 5 ? 'text-red-400' : 'text-green-400'} bold />
                </div>
              </div>
            </div>
          </div>

          {/* Total Cost Summary */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg p-5 border border-gray-600">
            <div className="flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-sm text-gray-400">Combined Monthly Spend</p>
                <p className="text-2xl font-bold text-white">${costs.totalSpent?.toFixed(4) ?? '0.0000'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Combined Budget</p>
                <p className="text-2xl font-bold text-white">${costs.totalBudget ?? 70}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Remaining</p>
                <p className={`text-2xl font-bold ${(costs.totalRemaining ?? 0) < 15 ? 'text-red-400' : 'text-green-400'}`}>${costs.totalRemaining?.toFixed(4) ?? '0.0000'}</p>
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
              <th className="py-2 px-3">Detected</th>
              <th className="py-2 px-3">Latency</th>
              <th className="py-2 px-3">Tokens</th>
            </tr>
          </thead>
          <tbody>
            {(scans ?? []).slice(0, 20).map((s: any) => (
              <tr key={s.id} className="border-b border-gray-800 text-gray-300">
                <td className="py-2 px-3">{new Date(s.timestamp).toLocaleString()}</td>
                <td className="py-2 px-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    s.engine === 'perplexity' ? 'bg-blue-900 text-blue-300' :
                    s.engine === 'cloudflare' ? 'bg-orange-900 text-orange-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>{s.engine}</span>
                </td>
                <td className="py-2 px-3">{s.detected ? <span className="text-red-400">Yes</span> : <span className="text-green-400">No</span>}</td>
                <td className="py-2 px-3">{s.latencyMs}ms</td>
                <td className="py-2 px-3">{s.tokensUsed ?? '-'}</td>
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
