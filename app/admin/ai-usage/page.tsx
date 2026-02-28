"use client"
import { useState, useEffect } from "react"
import { Shield, DollarSign, Cpu, Clock, TrendingUp, RefreshCw, Settings, ArrowLeft } from "lucide-react"
import Link from "next/link"

const ADMIN_SECRET = "nextguard-cron-2024-secure"

interface UsageRecord {
  id: string
  timestamp: string
  model: string
  inputTokens: number
  outputTokens: number
  costUSD: number
  analysisId: string
  fileName: string
  eventCount: number
}

interface MonthlySummary {
  totalCostUSD: number
  totalInputTokens: number
  totalOutputTokens: number
  requestCount: number
}

interface UsageData {
  monthlyBudgetUSD: number
  usageRecords: UsageRecord[]
  monthlySummary: Record<string, MonthlySummary>
  budgetStatus: { allowed: boolean; currentSpend: number; budget: number; remaining: number }
}

export default function AdminAIUsagePage() {
  const [authed, setAuthed] = useState(false)
  const [pw, setPw] = useState("")
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(false)
  const [newBudget, setNewBudget] = useState("")
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const r = await fetch("/api/syslog-analysis?action=ai-usage")
      if (r.ok) {
        const d = await r.json()
        setData(d)
        setNewBudget(String(d.monthlyBudgetUSD || 10))
      }
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { if (authed) fetchData() }, [authed])

  async function updateBudget() {
    const val = parseFloat(newBudget)
    if (!val || val <= 0) return alert("Invalid budget")
    setSaving(true)
    try {
      await fetch(`/api/syslog-analysis?action=update-budget&budget=${val}`)
      await fetchData()
    } catch {} finally { setSaving(false) }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 w-full max-w-sm">
          <Shield className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white text-center mb-6">AI Usage Admin</h1>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && pw === ADMIN_SECRET && setAuthed(true)} placeholder="Enter password" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white mb-4" />
          <button onClick={() => pw === ADMIN_SECRET ? setAuthed(true) : alert("Wrong password")} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-3 rounded-lg font-medium">Login</button>
        </div>
      </div>
    )
  }

  const currentMonth = new Date().toISOString().slice(0, 7)
  const monthSummary = data?.monthlySummary?.[currentMonth]
  const spent = data?.budgetStatus?.currentSpend || 0
  const budget = data?.budgetStatus?.budget || 10
  const pct = Math.min(100, (spent / budget) * 100)
  const records = [...(data?.usageRecords || [])].reverse().slice(0, 50)
  const months = Object.entries(data?.monthlySummary || {}).sort((a, b) => b[0].localeCompare(a[0]))

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin/tickets" className="text-gray-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></Link>
          <h1 className="text-2xl font-bold">AI Usage & Cost Dashboard</h1>
          <button onClick={fetchData} disabled={loading} className="ml-auto bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>

        {/* Budget Bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2"><DollarSign className="w-5 h-5 text-cyan-400" /> Monthly Budget ({currentMonth})</h2>
            <span className={`text-sm font-bold ${pct > 80 ? "text-red-400" : pct > 50 ? "text-yellow-400" : "text-green-400"}`}>
              ${spent.toFixed(4)} / ${budget.toFixed(2)} ({pct.toFixed(1)}%)
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-4 mb-4">
            <div className={`h-4 rounded-full transition-all ${pct > 80 ? "bg-red-500" : pct > 50 ? "bg-yellow-500" : "bg-green-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-gray-500" />
            <input type="number" value={newBudget} onChange={e => setNewBudget(e.target.value)} step="1" min="1" className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white w-28" />
            <span className="text-sm text-gray-500">USD / month</span>
            <button onClick={updateBudget} disabled={saving} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 px-4 py-2 rounded-lg text-sm">{saving ? "Saving..." : "Update Budget"}</button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "This Month Cost", value: `$${(monthSummary?.totalCostUSD || 0).toFixed(4)}`, icon: DollarSign, color: "text-green-400" },
            { label: "Requests", value: monthSummary?.requestCount || 0, icon: Cpu, color: "text-cyan-400" },
            { label: "Input Tokens", value: (monthSummary?.totalInputTokens || 0).toLocaleString(), icon: TrendingUp, color: "text-blue-400" },
            { label: "Output Tokens", value: (monthSummary?.totalOutputTokens || 0).toLocaleString(), icon: TrendingUp, color: "text-purple-400" },
          ].map((s, i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <s.icon className={`w-6 h-6 ${s.color} mx-auto mb-2`} />
              <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Monthly History */}
        {months.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-cyan-400" /> Monthly History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-gray-500 border-b border-gray-800">
                  <th className="text-left py-2 px-3">Month</th>
                  <th className="text-right py-2 px-3">Cost (USD)</th>
                  <th className="text-right py-2 px-3">Requests</th>
                  <th className="text-right py-2 px-3">Input Tokens</th>
                  <th className="text-right py-2 px-3">Output Tokens</th>
                </tr></thead>
                <tbody>
                  {months.map(([month, s]) => (
                    <tr key={month} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="py-2 px-3 font-medium">{month}</td>
                      <td className="py-2 px-3 text-right text-green-400">${s.totalCostUSD.toFixed(4)}</td>
                      <td className="py-2 px-3 text-right">{s.requestCount}</td>
                      <td className="py-2 px-3 text-right">{s.totalInputTokens.toLocaleString()}</td>
                      <td className="py-2 px-3 text-right">{s.totalOutputTokens.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recent Requests */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Recent AI Requests ({records.length})</h2>
          {records.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No AI usage records yet.</p>
          ) : (
            <div className="space-y-2">
              {records.map(r => (
                <div key={r.id} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 flex flex-wrap items-center gap-3 text-xs">
                  <span className="text-gray-400">{new Date(r.timestamp).toLocaleString()}</span>
                  <span className="bg-cyan-900/40 text-cyan-400 px-2 py-0.5 rounded">{r.model}</span>
                  <span className="text-white font-medium">{r.fileName}</span>
                  <span className="text-gray-400">{r.eventCount} events</span>
                  <span className="text-blue-400">In: {r.inputTokens.toLocaleString()}</span>
                  <span className="text-purple-400">Out: {r.outputTokens.toLocaleString()}</span>
                  <span className="text-green-400 font-bold ml-auto">${r.costUSD.toFixed(6)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
