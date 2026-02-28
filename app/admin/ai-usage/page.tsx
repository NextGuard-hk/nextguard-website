"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { Shield, DollarSign, Cpu, Clock, TrendingUp, RefreshCw, Settings, ArrowLeft, Activity } from "lucide-react"
import Link from "next/link"
const ADMIN_SECRET = "nextguard-cron-2024-secure"
interface UsageRecord { id: string; timestamp: string; model: string; inputTokens: number; outputTokens: number; costUSD: number; endpoint: string }
interface MonthlySummary { totalCostUSD: number; totalInputTokens: number; totalOutputTokens: number; totalRequests: number }
interface UsageData { monthlyBudgetUSD: number; usageRecords: UsageRecord[]; monthlySummary: MonthlySummary }
export default function AdminAIUsagePage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [newBudget, setNewBudget] = useState("")
  const [saving, setSaving] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [refreshInterval, setRefreshInterval] = useState(10)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const r = await fetch("/api/syslog-analysis?action=ai-usage")
      if (r.ok) { const d = await r.json(); setData(d); setNewBudget(String(d.monthlyBudgetUSD)); setLastUpdate(new Date()) }
    } catch {} finally { if (!silent) setLoading(false) }
  }, [])
  useEffect(() => { if (authed) fetchData() }, [authed, fetchData])
  useEffect(() => {
    if (authed && autoRefresh) {
      intervalRef.current = setInterval(() => fetchData(true), refreshInterval * 1000)
      return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    } else { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [authed, autoRefresh, refreshInterval, fetchData])
  const saveBudget = async () => {
    setSaving(true)
    try {
      await fetch("/api/syslog-analysis?action=update-budget", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ secret: ADMIN_SECRET, monthlyBudgetUSD: parseFloat(newBudget) }) })
      fetchData()
    } catch {} finally { setSaving(false) }
  }
  if (!authed) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 pt-24">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6"><Shield className="w-8 h-8 text-cyan-400" /><h1 className="text-xl sm:text-2xl font-bold text-white">AI Usage Admin</h1></div>
        <input type="password" placeholder="Enter admin password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && pw === ADMIN_SECRET) setAuthed(true) }} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white mb-4" />
        <button onClick={() => { if (pw === ADMIN_SECRET) setAuthed(true) }} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-semibold">Login</button>
      </div>
    </div>
  )
  const summary = data?.monthlySummary
  const budget = data?.monthlyBudgetUSD || 0
  const spent = summary?.totalCostUSD || 0
  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0
  const barColor = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-yellow-500" : "bg-cyan-500"
  return (
    <div className="min-h-screen bg-gray-950 text-white p-4 pt-24 md:p-8 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Link href="/admin" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
            <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-cyan-400" />
            <h1 className="text-lg sm:text-2xl font-bold">AI Usage Dashboard</h1>
            {autoRefresh && <span className="flex items-center gap-1 text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded-full"><Activity className="w-3 h-3 animate-pulse" />LIVE</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-1 sm:gap-2 bg-gray-900 border border-gray-800 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2">
              <span className="text-xs text-gray-400 hidden sm:inline">Refresh:</span>
              {[5,10,30,60].map(s => (<button key={s} onClick={() => setRefreshInterval(s)} className={`text-xs px-1.5 sm:px-2 py-1 rounded ${refreshInterval === s ? "bg-cyan-600 text-white" : "text-gray-400 hover:text-white"}`}>{s}s</button>))}
            </div>
            <button onClick={() => setAutoRefresh(!autoRefresh)} className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm ${autoRefresh ? "bg-green-900/50 text-green-400 border border-green-800" : "bg-gray-900 text-gray-400 border border-gray-800"}`}>
              <RefreshCw className={`w-3 h-3 sm:w-4 sm:h-4 ${autoRefresh ? "animate-spin" : ""}`} style={autoRefresh ? {animationDuration:"3s"} : {}} />{autoRefresh ? "Auto ON" : "Auto OFF"}
            </button>
            <button onClick={() => fetchData()} className="flex items-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-gray-900 border border-gray-800 rounded-lg text-xs sm:text-sm text-gray-400 hover:text-white"><RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />Refresh</button>
            {lastUpdate && <span className="text-xs text-gray-500">Updated: {lastUpdate.toLocaleTimeString()}</span>}
          </div>
        </div>
        {loading && !data ? <div className="text-center py-20 text-gray-400">Loading...</div> : data && (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2"><DollarSign className="w-5 h-5 text-cyan-400" />Monthly Budget</h2>
                <div className="flex items-center gap-2">
                  <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} className="w-20 sm:w-24 px-2 sm:px-3 py-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm" step="0.5" />
                  <button onClick={saveBudget} disabled={saving} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-sm disabled:opacity-50"><Settings className="w-4 h-4 inline mr-1" />{saving ? "..." : "Set"}</button>
                </div>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-3 sm:h-4 mb-2"><div className={`h-3 sm:h-4 rounded-full ${barColor} transition-all duration-500`} style={{width:`${pct}%`}} /></div>
              <div className="flex justify-between text-xs sm:text-sm"><span className="text-gray-400">${spent.toFixed(4)} used</span><span className="text-gray-400">${budget.toFixed(2)} budget</span></div>
              <div className="text-right text-xs mt-1">{pct > 90 ? <span className="text-red-400">⚠️ Budget almost exhausted!</span> : <span className="text-gray-500">{pct.toFixed(1)}% used</span>}</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-4 sm:mb-6">
              {[{icon: Cpu, label: "Total Requests", value: summary?.totalRequests || 0, color: "text-cyan-400"},
                {icon: TrendingUp, label: "Input Tokens", value: (summary?.totalInputTokens || 0).toLocaleString(), color: "text-blue-400"},
                {icon: TrendingUp, label: "Output Tokens", value: (summary?.totalOutputTokens || 0).toLocaleString(), color: "text-purple-400"},
                {icon: DollarSign, label: "Total Cost", value: `$${(summary?.totalCostUSD || 0).toFixed(4)}`, color: "text-green-400"}
              ].map((s, i) => (
                <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
                  <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2"><s.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${s.color}`} /><span className="text-xs sm:text-sm text-gray-400">{s.label}</span></div>
                  <div className="text-lg sm:text-2xl font-bold">{s.value}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-400" />Recent Requests</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead><tr className="text-gray-400 border-b border-gray-800"><th className="text-left py-2 px-2 sm:px-3">Time</th><th className="text-left py-2 px-2 sm:px-3">Model</th><th className="text-right py-2 px-2 sm:px-3">Input</th><th className="text-right py-2 px-2 sm:px-3">Output</th><th className="text-right py-2 px-2 sm:px-3">Cost</th></tr></thead>
                  <tbody>
                    {data.usageRecords.slice().reverse().slice(0, 50).map((r, i) => (
                      <tr key={i} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                        <td className="py-2 px-2 sm:px-3 text-gray-300 whitespace-nowrap">{new Date(r.timestamp).toLocaleString()}</td>
                        <td className="py-2 px-2 sm:px-3"><span className="bg-cyan-900/30 text-cyan-400 px-1.5 sm:px-2 py-0.5 rounded text-xs">{r.model}</span></td>
                        <td className="py-2 px-2 sm:px-3 text-right text-gray-300">{r.inputTokens.toLocaleString()}</td>
                        <td className="py-2 px-2 sm:px-3 text-right text-gray-300">{r.outputTokens.toLocaleString()}</td>
                        <td className="py-2 px-2 sm:px-3 text-right text-green-400">${r.costUSD.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.usageRecords.length === 0 && <div className="text-center py-8 text-gray-500">No usage records yet</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
