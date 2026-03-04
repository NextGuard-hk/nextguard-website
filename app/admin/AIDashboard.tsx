"use client"
import { useState, useEffect, useCallback } from "react"

interface ScanRecord {
  id: string
  timestamp: string
  engine: string
  action: string
  content_snippet: string
  result: string
  latency_ms: number
  policy?: string
}

interface UsageData {
  total_scans: number
  today_scans: number
  detection_rate: string
  weekly_scans: number
  avg_latency: { sonar: string; cloudflare: string; openai: string }
  scan_history: ScanRecord[]
  engines: { name: string; scans: number; detections: number }[]
}

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}

export default function AIDashboard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filterEngine, setFilterEngine] = useState("all")
  const [filterResult, setFilterResult] = useState("all")
  const [reportView, setReportView] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)

  const fetchUsage = useCallback(async () => {
    try {
      const r = await fetch("/api/ai-usage?t=" + Date.now(), { cache: "no-store" })
      if (r.ok) {
        const d = await r.json()
        setData(d)
        setLastUpdated(new Date())
        setError("")
      } else {
        setError("Failed to load AI usage data")
      }
    } catch {
      setError("Network error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsage()
  }, [fetchUsage])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(fetchUsage, refreshInterval * 1000)
    return () => clearInterval(id)
  }, [autoRefresh, refreshInterval, fetchUsage])

  const filteredRecords = (data?.scan_history || []).filter((r) => {
    if (filterEngine !== "all" && r.engine !== filterEngine) return false
    if (filterResult !== "all" && r.result !== filterResult) return false
    return true
  })

  const exportCSV = () => {
    if (!filteredRecords.length) return
    const headers = ["Timestamp", "Engine", "Action", "Result", "Latency (ms)", "Policy", "Content Snippet"]
    const rows = filteredRecords.map((r) => [
      r.timestamp, r.engine, r.action, r.result, r.latency_ms, r.policy || "", r.content_snippet
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ai-usage-report-" + new Date().toISOString().slice(0, 10) + ".csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    if (!filteredRecords.length) return
    const blob = new Blob([JSON.stringify(filteredRecords, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "ai-usage-report-" + new Date().toISOString().slice(0, 10) + ".json"
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-white p-8">Loading AI usage data...</div>
  if (error) return <div className="text-red-400 p-8">{error} <button onClick={fetchUsage} className="ml-2 underline">Retry</button></div>
  if (!data) return null

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">AI Usage Dashboard</h3>
          {lastUpdated && <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-400">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh
          </label>
          <select value={refreshInterval} onChange={(e) => setRefreshInterval(Number(e.target.value))} className="bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700">
            <option value={15}>15s</option>
            <option value={30}>30s</option>
            <option value={60}>60s</option>
          </select>
          <button onClick={fetchUsage} className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 rounded">Refresh Now</button>
          <button onClick={() => setReportView(!reportView)} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1 rounded">
            {reportView ? "Dashboard" : "Report"}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Scans" value={data.total_scans} />
        <Card label="Today" value={data.today_scans} />
        <Card label="Detection Rate" value={data.detection_rate} />
        <Card label="This Week" value={data.weekly_scans} />
      </div>

      {/* Avg Latency by Engine */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">Sonar (Perplexity)</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.sonar}</p>
          <p className="text-sm text-gray-500">Avg Latency</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">Cloudflare AI</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.cloudflare}</p>
          <p className="text-sm text-gray-500">Avg Latency</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">OpenAI GPT</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.openai}</p>
          <p className="text-sm text-gray-500">Avg Latency</p>
        </div>
      </div>

      {/* Engine Breakdown */}
      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm text-gray-400 mb-3">Engine Breakdown</h4>
        <div className="space-y-2">
          {(data.engines || []).map((e) => (
            <div key={e.name} className="flex items-center justify-between text-sm">
              <span className="text-white">{e.name}</span>
              <div className="flex gap-4">
                <span className="text-gray-400">{e.scans} scans</span>
                <span className="text-red-400">{e.detections} detections</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Report View */}
      {reportView && (
        <div className="bg-gray-800 rounded-xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h4 className="text-sm text-gray-400">Detailed Scan Report</h4>
            <div className="flex items-center gap-2">
              <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)} className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600">
                <option value="all">All Engines</option>
                <option value="sonar">Sonar</option>
                <option value="cloudflare">Cloudflare</option>
                <option value="openai">OpenAI</option>
              </select>
              <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)} className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600">
                <option value="all">All Results</option>
                <option value="clean">Clean</option>
                <option value="detected">Detected</option>
              </select>
              <button onClick={exportCSV} className="bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded">Export CSV</button>
              <button onClick={exportJSON} className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-2 py-1 rounded">Export JSON</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="py-2 px-2">Time</th>
                  <th className="py-2 px-2">Engine</th>
                  <th className="py-2 px-2">Action</th>
                  <th className="py-2 px-2">Result</th>
                  <th className="py-2 px-2">Latency</th>
                  <th className="py-2 px-2">Policy</th>
                  <th className="py-2 px-2">Content</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={7} className="text-gray-500 py-4 text-center">No records found</td></tr>
                )}
                {filteredRecords.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-1.5 px-2 text-gray-300 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="py-1.5 px-2 text-gray-300">{r.engine}</td>
                    <td className="py-1.5 px-2 text-gray-300">{r.action}</td>
                    <td className="py-1.5 px-2">
                      <span className={r.result === "detected" ? "text-red-400" : "text-green-400"}>{r.result}</span>
                    </td>
                    <td className="py-1.5 px-2 text-gray-300">{r.latency_ms}ms</td>
                    <td className="py-1.5 px-2 text-gray-300">{r.policy || "-"}</td>
                    <td className="py-1.5 px-2 text-gray-400 max-w-[200px] truncate">{r.content_snippet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > 100 && (
            <p className="text-xs text-gray-500 mt-2">Showing 100 of {filteredRecords.length} records. Export for full data.</p>
          )}
        </div>
      )}
    </div>
  )
}
