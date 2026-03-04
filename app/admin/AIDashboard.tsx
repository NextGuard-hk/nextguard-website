"use client"
import { useState, useEffect } from "react"

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

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
export default function AIDashboard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [status, setStatus] = useState<"loading"|"ok"|"error">("loading")
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState("")
  const [filterEngine, setFilterEngine] = useState("all")
  const [filterResult, setFilterResult] = useState("all")
  const [reportView, setReportView] = useState(false)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let cancelled = false
    setRefreshing(true)
    fetch("/api/ai-usage?t=" + Date.now(), { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setStatus("ok")
          setLastUpdated(new Date().toLocaleTimeString())
        }
      })
      .catch(() => { if (!cancelled) setStatus("error") })
      .finally(() => { if (!cancelled) setRefreshing(false) })
    return () => { cancelled = true }
  }, [tick])

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const refresh = () => {
    if (!refreshing) setTick((t) => t + 1)
  }
  const filteredRecords = (data?.scan_history || []).filter((r) => {
    if (filterEngine !== "all" && r.engine !== filterEngine) return false
    if (filterResult !== "all" && r.result !== filterResult) return false
    return true
  })

  const exportCSV = () => {
    if (!filteredRecords.length) return
    const h = ["Timestamp","Engine","Action","Result","Latency_ms","Policy","Content"]
    const rows = filteredRecords.map((r) => [
      r.timestamp, r.engine, r.action, r.result, String(r.latency_ms), r.policy||"", r.content_snippet
    ])
    const csv = [h,...rows].map((row) => row.map((c) => JSON.stringify(c)).join(",")).join("\n")
    const a = document.createElement("a")
    a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv)
    a.download = "ai-usage-" + new Date().toISOString().slice(0,10) + ".csv"
    a.click()
  }

  const exportJSON = () => {
    if (!filteredRecords.length) return
    const a = document.createElement("a")
    a.href = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredRecords,null,2))
    a.download = "ai-usage-" + new Date().toISOString().slice(0,10) + ".json"
    a.click()
  }

  if (status === "loading" && !data) return (
    <div className="text-white p-8 text-center">Loading AI usage data...</div>
  )
  if (status === "error" && !data) return (
    <div className="text-red-400 p-8 text-center">
      Failed to load data.
      <button onClick={refresh} className="ml-2 underline text-cyan-400">Retry</button>
    </div>
  )
  if (!data) return null
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">AI Usage Dashboard</h3>
          {lastUpdated && <p className="text-xs text-gray-500">Last updated: {lastUpdated}</p>}
        </div>
        <div className="flex items-center gap-3">
          <button onClick={refresh} disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-sm px-4 py-2 rounded font-medium">
            {refreshing ? "Refreshing..." : "Refresh Now"}
          </button>
          <button onClick={() => setReportView(!reportView)}
            className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded font-medium">
            {reportView ? "Dashboard" : "Report"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="Total Scans" value={data.total_scans} />
        <Card label="Today" value={data.today_scans} />
        <Card label="Detection Rate" value={data.detection_rate} />
        <Card label="This Week" value={data.weekly_scans} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">Sonar (Perplexity)</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.sonar}</p>
          <p className="text-xs text-gray-500">Avg Latency</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">Cloudflare AI</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.cloudflare}</p>
          <p className="text-xs text-gray-500">Avg Latency</p>
        </div>
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm text-gray-400">OpenAI / Traditional</h4>
          <p className="text-xl font-bold text-white">{data.avg_latency.openai}</p>
          <p className="text-xs text-gray-500">Avg Latency</p>
        </div>
      </div>

      <div className="bg-gray-800 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Engine Breakdown</h4>
        {(data.engines || []).map((e) => (
          <div key={e.name} className="flex justify-between py-2 border-b border-gray-700 last:border-0">
            <span className="text-white capitalize">{e.name}</span>
            <span className="text-gray-400 text-sm">{e.scans} scans / {e.detections} detected</span>
          </div>
        ))}
      </div>

      {reportView && (
        <div className="bg-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-3">Detailed Scan Report</h4>
          <div className="flex flex-wrap gap-2 mb-4">
            <select value={filterEngine} onChange={(e) => setFilterEngine(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600">
              <option value="all">All Engines</option>
              <option value="sonar">Sonar</option>
              <option value="cloudflare">Cloudflare</option>
              <option value="traditional">Traditional</option>
            </select>
            <select value={filterResult} onChange={(e) => setFilterResult(e.target.value)}
              className="bg-gray-700 text-white text-xs rounded px-2 py-1 border border-gray-600">
              <option value="all">All Results</option>
              <option value="clean">Clean</option>
              <option value="detected">Detected</option>
            </select>
            <span className="text-gray-400 text-xs self-center">{filteredRecords.length} records</span>
            <button onClick={exportCSV} className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded">Export CSV</button>
            <button onClick={exportJSON} className="bg-green-700 hover:bg-green-600 text-white text-xs px-3 py-1 rounded">Export JSON</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700 text-left">
                  <th className="py-2 pr-2">Time</th>
                  <th className="py-2 pr-2">Engine</th>
                  <th className="py-2 pr-2">Action</th>
                  <th className="py-2 pr-2">Result</th>
                  <th className="py-2 pr-2">Latency</th>
                  <th className="py-2 pr-2">Policy</th>
                  <th className="py-2">Content</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.length === 0 && (
                  <tr><td colSpan={7} className="text-center text-gray-500 py-6">No records</td></tr>
                )}
                {filteredRecords.slice(0, 100).map((r) => (
                  <tr key={r.id} className="border-b border-gray-700">
                    <td className="py-1.5 pr-2 text-gray-300">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="py-1.5 pr-2 text-cyan-400">{r.engine}</td>
                    <td className="py-1.5 pr-2 text-gray-300">{r.action}</td>
                    <td className="py-1.5 pr-2">
                      <span className={r.result === "detected" ? "text-red-400" : "text-green-400"}>{r.result}</span>
                    </td>
                    <td className="py-1.5 pr-2 text-gray-300">{r.latency_ms}ms</td>
                    <td className="py-1.5 pr-2 text-gray-400">{r.policy || "-"}</td>
                    <td className="py-1.5 text-gray-400 max-w-xs truncate">{r.content_snippet}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredRecords.length > 100 && (
            <p className="text-xs text-gray-500 mt-3">Showing 100 of {filteredRecords.length} records.</p>
          )}
        </div>
      )}
    </div>
  )
}
