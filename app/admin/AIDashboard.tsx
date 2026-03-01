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

  if (loading && !data) return <div className="text-zinc-400 text-center py-12">Loading AI Dashboard...</div>
  if (error && !data) return <div className="text-red-400 text-center py-12">{error}</div>
  if (!data) return null

  const maxBar = Math.max(...data.dailyBreakdown.map((d: any) => d.total), 1)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">AI Dashboard</h2>
        <button onClick={fetchUsage} className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg text-sm">
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-3xl font-bold text-cyan-400">{data.total}</div>
          <div className="text-sm text-zinc-400">Total Scans</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-3xl font-bold text-green-400">{data.today.total}</div>
          <div className="text-sm text-zinc-400">Today</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-3xl font-bold text-purple-400">{data.week.total}</div>
          <div className="text-sm text-zinc-400">This Week</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-3xl font-bold text-orange-400">{data.detectionRate}%</div>
          <div className="text-sm text-zinc-400">Detection Rate</div>
        </div>
      </div>

      {/* Engine Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-zinc-900 border border-orange-600/30 rounded-xl p-4">
          <h3 className="text-sm font-bold text-orange-400 mb-2">Traditional DLP</h3>
          <div className="text-2xl font-bold text-white">{data.month.traditional}</div>
          <div className="text-xs text-zinc-500">scans this month</div>
          <div className="text-xs text-zinc-400 mt-2">Avg latency: <span className="text-green-400 font-mono">{data.avgLatency.traditional}ms</span></div>
        </div>
        <div className="bg-zinc-900 border border-cyan-600/30 rounded-xl p-4">
          <h3 className="text-sm font-bold text-cyan-400 mb-2">Perplexity Sonar</h3>
          <div className="text-2xl font-bold text-white">{data.month.perplexity}</div>
          <div className="text-xs text-zinc-500">scans this month</div>
          <div className="text-xs text-zinc-400 mt-2">Avg latency: <span className="text-cyan-400 font-mono">{data.avgLatency.perplexity > 1000 ? (data.avgLatency.perplexity / 1000).toFixed(2) + 's' : data.avgLatency.perplexity + 'ms'}</span></div>
        </div>
        <div className="bg-zinc-900 border border-purple-600/30 rounded-xl p-4">
          <h3 className="text-sm font-bold text-purple-400 mb-2">Cloudflare Workers AI</h3>
          <div className="text-2xl font-bold text-white">{data.month.cloudflare}</div>
          <div className="text-xs text-zinc-500">scans this month</div>
          <div className="text-xs text-zinc-400 mt-2">Avg latency: <span className="text-purple-400 font-mono">{data.avgLatency.cloudflare > 1000 ? (data.avgLatency.cloudflare / 1000).toFixed(2) + 's' : data.avgLatency.cloudflare + 'ms'}</span></div>
        </div>
      </div>

      {/* Daily Chart (last 7 days) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <h3 className="text-sm font-bold text-white mb-4">Last 7 Days</h3>
        <div className="flex items-end gap-2 h-40">
          {data.dailyBreakdown.map((day: any, i: number) => (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className="w-full flex flex-col-reverse" style={{ height: '120px' }}>
                {day.total > 0 && (
                  <div className="w-full rounded-t" style={{ height: Math.max(4, (day.total / maxBar) * 120) + 'px', background: 'linear-gradient(to top, #06b6d4, #8b5cf6)' }} />
                )}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{day.date.slice(5)}</div>
              <div className="text-xs text-zinc-400 font-mono">{day.total}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Scans */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <h3 className="text-sm font-bold text-white mb-3">Recent Scans ({data.recentScans.length})</h3>
        {data.recentScans.length === 0 ? (
          <div className="text-zinc-500 text-sm">No scans recorded yet. Use the AI DLP Compare page to generate scan data.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Engine</th>
                  <th className="pb-2 pr-4">Result</th>
                  <th className="pb-2 pr-4">Latency</th>
                  <th className="pb-2">Source</th>
                </tr>
              </thead>
              <tbody>
                {data.recentScans.map((s: any) => (
                  <tr key={s.id} className="border-b border-zinc-800/50">
                    <td className="py-2 pr-4 text-zinc-400">{new Date(s.timestamp).toLocaleString()}</td>
                    <td className="py-2 pr-4">
                      <span className={s.engine === 'traditional' ? 'text-orange-400' : s.engine === 'perplexity' ? 'text-cyan-400' : 'text-purple-400'}>
                        {s.engine === 'traditional' ? 'Traditional' : s.engine === 'perplexity' ? 'Perplexity' : 'Cloudflare'}
                      </span>
                    </td>
                    <td className="py-2 pr-4">
                      <span className={s.detected ? 'text-red-400' : 'text-green-400'}>
                        {s.detected ? 'DETECTED' : 'CLEAN'}
                      </span>
                    </td>
                    <td className="py-2 pr-4 font-mono text-zinc-300">
                      {s.latencyMs > 1000 ? (s.latencyMs / 1000).toFixed(2) + 's' : s.latencyMs + 'ms'}
                    </td>
                    <td className="py-2 text-zinc-500">{s.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
