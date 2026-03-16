// app/dashboard/swg/page.tsx
// SWG Dashboard - Secure Web Gateway Management Console
'use client'
import { useState, useEffect, useCallback } from 'react'

interface SummaryData {
  period: string; totalEvaluations: number; blocked: number;
  warned: number; allowed: number; blockRate: number;
  highRiskLastHour: number; riskDistribution: { risk_level: string; count: number }[];
}
interface RecentEntry {
  domain: string; action: string; category: string;
  risk_level: string; user_id: string | null; evaluated_at: string;
}
interface GroupData {
  id: number; name: string; description: string; priority: number;
  is_active: number; rules: any[]; members: string[];
}

function Badge({ text, variant }: { text: string; variant: 'danger' | 'warning' | 'success' | 'info' | 'neutral' }) {
  const colors = {
    danger: 'bg-red-500/20 text-red-400 border-red-500/30',
    warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    success: 'bg-green-500/20 text-green-400 border-green-500/30',
    info: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    neutral: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  }
  return <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colors[variant]}`}>{text}</span>
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-5 ${color}`}>
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}

export default function SWGDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'recent' | 'groups' | 'test'>('overview')
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const [sumRes, recRes, grpRes] = await Promise.all([
        fetch('/api/v1/url-policy/analytics?type=summary&hours=24'),
        fetch('/api/v1/url-policy/analytics?type=recent&limit=20'),
        fetch('/api/v1/url-policy/groups'),
      ])
      const [sumData, recData, grpData] = await Promise.all([
        sumRes.json(), recRes.json(), grpRes.json(),
      ])
      setSummary(sumData)
      setRecent(recData.recent || [])
      setGroups(grpData.groups || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleTest = async () => {
    if (!testUrl) return
    setTestLoading(true)
    try {
      const res = await fetch(`/api/v1/url-policy/evaluate?url=${encodeURIComponent(testUrl)}`)
      setTestResult(await res.json())
    } catch (e) { setTestResult({ error: String(e) }) }
    setTestLoading(false)
  }

  const actionBadge = (action: string) => {
    if (action === 'Block') return <Badge text="Block" variant="danger" />
    if (action === 'Warn') return <Badge text="Warn" variant="warning" />
    return <Badge text="Allow" variant="success" />
  }
  const riskBadge = (risk: string) => {
    if (risk === 'high' || risk === 'critical') return <Badge text={risk} variant="danger" />
    if (risk === 'medium') return <Badge text={risk} variant="warning" />
    if (risk === 'low') return <Badge text={risk} variant="info" />
    return <Badge text={risk || 'none'} variant="neutral" />
  }

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-xl">Loading SWG Dashboard...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Secure Web Gateway</h1>
            <p className="text-gray-400 mt-1">URL Policy Management & Analytics Dashboard</p>
          </div>
          <button onClick={() => { setLoading(true); fetchData() }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition">
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-900 rounded-lg p-1 w-fit">
          {(['overview', 'recent', 'groups', 'test'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition
              ${tab === t ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
              {t === 'overview' ? 'Overview' : t === 'recent' ? 'Recent Activity' : t === 'groups' ? 'Policy Groups' : 'URL Test'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && summary && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Evaluations" value={summary.totalEvaluations} sub={`Last ${summary.period}`} color="" />
              <StatCard label="Blocked" value={summary.blocked} sub={`${summary.blockRate}% block rate`} color="text-red-400" />
              <StatCard label="Warned" value={summary.warned} sub="Caution alerts" color="text-yellow-400" />
              <StatCard label="High Risk (1h)" value={summary.highRiskLastHour} sub="Last hour threats" color="text-orange-400" />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">Risk Distribution</h3>
              <div className="space-y-3">
                {summary.riskDistribution.map((r, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {riskBadge(r.risk_level)}
                    <div className="flex-1 bg-gray-800 rounded-full h-3">
                      <div className={`h-3 rounded-full ${
                        r.risk_level === 'high' ? 'bg-red-500' :
                        r.risk_level === 'medium' ? 'bg-yellow-500' :
                        r.risk_level === 'low' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} style={{ width: `${Math.min((r.count / summary.totalEvaluations) * 100, 100)}%` }} />
                    </div>
                    <span className="text-sm text-gray-400 w-8">{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Activity Tab */}
        {tab === 'recent' && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800">
              <h3 className="text-lg font-semibold">Recent URL Evaluations</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Domain</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Risk</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((r, i) => (
                    <tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30">
                      <td className="px-4 py-3 font-mono text-blue-400">{r.domain}</td>
                      <td className="px-4 py-3">{actionBadge(r.action)}</td>
                      <td className="px-4 py-3 text-gray-300">{r.category}</td>
                      <td className="px-4 py-3">{riskBadge(r.risk_level)}</td>
                      <td className="px-4 py-3 text-gray-500">{r.evaluated_at}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Policy Groups Tab */}
        {tab === 'groups' && (
          <div className="space-y-4">
            {groups.length === 0 && <div className="text-gray-500 text-center py-12">No policy groups configured</div>}
            {groups.map(g => (
              <div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{g.name}</h3>
                    <Badge text={g.is_active ? 'Active' : 'Inactive'} variant={g.is_active ? 'success' : 'neutral'} />
                    <Badge text={`Priority: ${g.priority}`} variant="info" />
                  </div>
                  <span className="text-sm text-gray-500">{g.members.length} members</span>
                </div>
                {g.description && <p className="text-gray-400 text-sm mb-3">{g.description}</p>}
                {g.rules.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {g.rules.map((r: any, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-gray-800 rounded">
                        {r.category}: {actionBadge(r.action)}
                      </span>
                    ))}
                  </div>
                )}
                {g.members.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {g.members.map((m: string, i: number) => (
                      <span key={i} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">{m}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* URL Test Tab */}
        {tab === 'test' && (
          <div className="max-w-2xl">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">URL Policy Tester</h3>
              <div className="flex gap-3">
                <input type="text" value={testUrl} onChange={e => setTestUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleTest()}
                  placeholder="Enter URL to test (e.g. facebook.com)"
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                <button onClick={handleTest} disabled={testLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition">
                  {testLoading ? 'Testing...' : 'Evaluate'}
                </button>
              </div>
            </div>
            {testResult && (
              <div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-mono text-blue-400">{testResult.domain}</span>
                  {actionBadge(testResult.action)}
                  {riskBadge(testResult.riskLevel)}
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">Categories:</span> <span className="text-gray-300">{testResult.categories?.join(', ')}</span></div>
                  <div><span className="text-gray-500">Source:</span> <span className="text-gray-300">{testResult.categorySource}</span></div>
                  <div><span className="text-gray-500">Confidence:</span> <span className="text-gray-300">{testResult.confidence}%</span></div>
                  <div><span className="text-gray-500">Risk Score:</span> <span className="text-gray-300">{testResult.riskScore}/100</span></div>
                  <div><span className="text-gray-500">DGA:</span> <span className="text-gray-300">{testResult.dga?.isDGA ? 'Yes' : 'No'} (score: {testResult.dga?.score})</span></div>
                  <div><span className="text-gray-500">Eval Time:</span> <span className="text-gray-300">{testResult.evalMs}ms</span></div>
                </div>
                {testResult.riskFactors?.length > 0 && (
                  <div className="mt-3">
                    <span className="text-gray-500 text-sm">Risk Factors:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {testResult.riskFactors.map((f: string, i: number) => (
                        <Badge key={i} text={f} variant="danger" />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
