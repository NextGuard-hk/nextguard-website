// app/dashboard/swg/page.tsx
// SWG Dashboard - Secure Web Gateway Management Console (P1 Enhanced)
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
interface FirewallRule {
  id: number; name: string; rule_type: string; value: string;
  action: string; priority: number; is_active: number;
  description: string; created_at: string;
}
interface TrendPoint { hour: string; blocked: number; allowed: number; warned: number; }
interface TopDomain { domain: string; count: number; action: string; category: string; }

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
    <div className={`bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5 ${color}`}>
      <div className="text-xs sm:text-sm text-gray-400 mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  )
}
function TrendChart({ data }: { data: TrendPoint[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500 text-center py-8">No trend data available</div>
  const maxVal = Math.max(...data.map(d => d.blocked + d.allowed + d.warned), 1)
  const w = 100, h = 40
  const pts = (key: 'blocked' | 'allowed' | 'warned') =>
    data.map((d, i) => `${(i / Math.max(data.length - 1, 1)) * w},${h - (d[key] / maxVal) * h}`).join(' ')
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4">24h Activity Trend</h3>
      <svg viewBox={`0 0 ${w} ${h + 5}`} className="w-full h-32 sm:h-48" preserveAspectRatio="none">
        <polyline points={pts('allowed')} fill="none" stroke="#22c55e" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <polyline points={pts('blocked')} fill="none" stroke="#ef4444" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
        <polyline points={pts('warned')} fill="none" stroke="#eab308" strokeWidth="0.5" vectorEffect="non-scaling-stroke" strokeDasharray="2,2" />
      </svg>
      <div className="flex gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-500 inline-block" /> Allowed</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-500 inline-block" /> Blocked</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-yellow-500 inline-block" /> Warned</span>
      </div>
    </div>
  )
}
function TopDomainsChart({ data }: { data: TopDomain[] }) {
  if (!data || data.length === 0) return <div className="text-gray-500 text-center py-8">No domain data available</div>
  const maxCount = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
      <h3 className="text-base sm:text-lg font-semibold mb-4">Top Blocked Domains</h3>
      <div className="space-y-2">
        {data.slice(0, 10).map((d, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-gray-500 w-4">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs text-blue-400 truncate">{d.domain}</span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">{d.count}</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full">
                <div className="h-1.5 bg-red-500 rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
export default function SWGDashboard() {
  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [groups, setGroups] = useState<GroupData[]>([])
  const [firewallRules, setFirewallRules] = useState<FirewallRule[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [topDomains, setTopDomains] = useState<TopDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'overview' | 'recent' | 'groups' | 'firewall' | 'test'>('overview')
  const [testUrl, setTestUrl] = useState('')
  const [testResult, setTestResult] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [fwForm, setFwForm] = useState({ name: '', rule_type: 'ip', value: '', action: 'block', priority: 100, description: '' })
  const [fwSaving, setFwSaving] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string>('')
  const fetchData = useCallback(async () => {
    try {
      const [sumRes, recRes, grpRes, fwRes, trendRes, topRes] = await Promise.all([
        fetch('/api/v1/url-policy/analytics?type=summary&hours=24'),
        fetch('/api/v1/url-policy/analytics?type=recent&limit=20'),
        fetch('/api/v1/url-policy/groups'),
        fetch('/api/v1/firewall'),
        fetch('/api/v1/url-policy/analytics?type=trend&hours=24'),
        fetch('/api/v1/url-policy/analytics?type=top-blocked&limit=10'),
      ])
      const [sumData, recData, grpData, fwData, trendData, topData] = await Promise.all([
        sumRes.json(), recRes.json(), grpRes.json(), fwRes.json(), trendRes.json(), topRes.json(),
      ])
      setSummary(sumData)
      setRecent(recData.recent || [])
      setGroups(grpData.groups || [])
      setFirewallRules(fwData.rules || [])
      setTrend(trendData.trend || [])
      setTopDomains(topData.domains || [])
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) { console.error(e) }
    setLoading(false)
  }, [])
  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const iv = setInterval(fetchData, 60000); return () => clearInterval(iv) }, [fetchData])
  const handleTest = async () => {
    if (!testUrl) return; setTestLoading(true)
    try { const r = await fetch(`/api/v1/url-policy/evaluate?url=${encodeURIComponent(testUrl)}`); setTestResult(await r.json()) } catch (e) { setTestResult({ error: String(e) }) }
    setTestLoading(false)
  }
  const handleAddRule = async () => {
    if (!fwForm.name || !fwForm.value) return; setFwSaving(true)
    try { await fetch('/api/v1/firewall', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fwForm) })
      setFwForm({ name: '', rule_type: 'ip', value: '', action: 'block', priority: 100, description: '' }); await fetchData()
    } catch (e) { console.error(e) } setFwSaving(false)
  }
  const handleDeleteRule = async (id: number) => { try { await fetch(`/api/v1/firewall?ruleId=${id}`, { method: 'DELETE' }); await fetchData() } catch (e) { console.error(e) } }
  const handleToggleRule = async (rule: FirewallRule) => { try { await fetch('/api/v1/firewall', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...rule, is_active: rule.is_active ? 0 : 1 }) }); await fetchData() } catch (e) { console.error(e) } }
  const actionBadge = (a: string) => a === 'Block' || a === 'block' ? <Badge text="Block" variant="danger" /> : a === 'Warn' || a === 'warn' ? <Badge text="Warn" variant="warning" /> : <Badge text="Allow" variant="success" />
  const riskBadge = (r: string) => r === 'high' || r === 'critical' ? <Badge text={r} variant="danger" /> : r === 'medium' ? <Badge text={r} variant="warning" /> : r === 'low' ? <Badge text={r} variant="info" /> : <Badge text={r || 'none'} variant="neutral" />
  if (loading) return <div className="min-h-screen bg-black text-white pt-16 lg:pt-20 flex items-center justify-center"><div className="text-xl">Loading SWG Dashboard...</div></div>
  const tabs = [{ key: 'overview', label: 'Overview' }, { key: 'recent', label: 'Activity' }, { key: 'groups', label: 'Groups' }, { key: 'firewall', label: 'Firewall' }, { key: 'test', label: 'URL Test' }] as const
  return (
    <div className="min-h-screen bg-black text-white pt-16 lg:pt-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Secure Web Gateway</h1>
            <p className="text-gray-400 text-sm sm:text-base mt-1">URL Policy Management & Analytics Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && <span className="text-xs text-gray-500">Updated: {lastRefresh}</span>}
            <button onClick={() => { setLoading(true); fetchData() }} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition w-fit">Refresh</button>
          </div>
        </div>
        <div className="mb-4 sm:mb-6 -mx-3 sm:mx-0 px-3 sm:px-0 overflow-x-auto">
          <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit min-w-fit">
            {tabs.map(t => (<button key={t.key} onClick={() => setTab(t.key)} className={`px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${tab === t.key ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>{t.label}</button>))}
          </div>
        </div>
        {tab === 'overview' && summary && (<div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <StatCard label="Total Evaluations" value={summary.totalEvaluations} sub={`Last ${summary.period}`} color="" />
            <StatCard label="Blocked" value={summary.blocked} sub={`${summary.blockRate}% block rate`} color="text-red-400" />
            <StatCard label="Warned" value={summary.warned} sub="Caution alerts" color="text-yellow-400" />
            <StatCard label="High Risk (1h)" value={summary.highRiskLastHour} sub="Last hour threats" color="text-orange-400" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6">
            <TrendChart data={trend} />
            <TopDomainsChart data={topDomains} />
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Risk Distribution</h3>
            <div className="space-y-3">
              {summary.riskDistribution.map((r, i) => (<div key={i} className="flex items-center gap-2 sm:gap-3">{riskBadge(r.risk_level)}<div className="flex-1 bg-gray-800 rounded-full h-3"><div className={`h-3 rounded-full ${r.risk_level === 'high' ? 'bg-red-500' : r.risk_level === 'medium' ? 'bg-yellow-500' : r.risk_level === 'low' ? 'bg-blue-500' : 'bg-gray-500'}`} style={{ width: `${Math.min((r.count / summary.totalEvaluations) * 100, 100)}%` }} /></div><span className="text-sm text-gray-400 w-8">{r.count}</span></div>))}
            </div>
          </div>
        </div>)}
        {tab === 'recent' && (<div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-800"><h3 className="text-base sm:text-lg font-semibold">Recent URL Evaluations</h3></div>
          <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-800/50"><tr><th className="text-left px-4 py-3 text-gray-400 font-medium">Domain</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Category</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Risk</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th></tr></thead><tbody>{recent.map((r, i) => (<tr key={i} className="border-t border-gray-800 hover:bg-gray-800/30"><td className="px-4 py-3 font-mono text-blue-400 text-xs">{r.domain}</td><td className="px-4 py-3">{actionBadge(r.action)}</td><td className="px-4 py-3 text-gray-300">{r.category}</td><td className="px-4 py-3">{riskBadge(r.risk_level)}</td><td className="px-4 py-3 text-gray-500 text-xs">{r.evaluated_at}</td></tr>))}</tbody></table></div>
          <div className="md:hidden divide-y divide-gray-800">{recent.map((r, i) => (<div key={i} className="p-3 space-y-2"><div className="font-mono text-blue-400 text-sm truncate">{r.domain}</div><div className="flex items-center gap-2 flex-wrap">{actionBadge(r.action)} {riskBadge(r.risk_level)}<span className="text-xs text-gray-500">{r.category}</span></div><div className="text-xs text-gray-600">{r.evaluated_at}</div></div>))}</div>
        </div>)}
        {tab === 'groups' && (<div className="space-y-3 sm:space-y-4">
          {groups.length === 0 && <div className="text-gray-500 text-center py-12">No policy groups configured</div>}
          {groups.map(g => (<div key={g.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2"><div className="flex items-center gap-2 flex-wrap"><h3 className="text-base sm:text-lg font-semibold">{g.name}</h3><Badge text={g.is_active ? 'Active' : 'Inactive'} variant={g.is_active ? 'success' : 'neutral'} /><Badge text={`Priority: ${g.priority}`} variant="info" /></div><span className="text-sm text-gray-500">{g.members.length} members</span></div>
            {g.description && <p className="text-gray-400 text-sm mb-3">{g.description}</p>}
            {g.rules.length > 0 && <div className="flex flex-wrap gap-2">{g.rules.map((r: any, i: number) => (<span key={i} className="text-xs px-2 py-1 bg-gray-800 rounded">{r.category}: {actionBadge(r.action)}</span>))}</div>}
            {g.members.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{g.members.map((m: string, i: number) => (<span key={i} className="text-xs px-2 py-1 bg-blue-500/10 text-blue-400 rounded">{m}</span>))}</div>}
          </div>))}
        </div>)}
        {tab === 'firewall' && (<div className="space-y-4 sm:space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">Add Firewall Rule</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <input type="text" placeholder="Rule name" value={fwForm.name} onChange={e => setFwForm({...fwForm, name: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <select value={fwForm.rule_type} onChange={e => setFwForm({...fwForm, rule_type: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"><option value="ip">IP Address</option><option value="cidr">CIDR Range</option><option value="domain">Domain</option><option value="geo">Country</option><option value="port">Port</option></select>
              <input type="text" placeholder="Value (e.g. 192.168.1.0/24)" value={fwForm.value} onChange={e => setFwForm({...fwForm, value: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <select value={fwForm.action} onChange={e => setFwForm({...fwForm, action: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"><option value="block">Block</option><option value="allow">Allow</option><option value="log">Log Only</option></select>
              <input type="number" placeholder="Priority" value={fwForm.priority} onChange={e => setFwForm({...fwForm, priority: parseInt(e.target.value) || 0})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
              <input type="text" placeholder="Description (optional)" value={fwForm.description} onChange={e => setFwForm({...fwForm, description: e.target.value})} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500" />
            </div>
            <button onClick={handleAddRule} disabled={fwSaving || !fwForm.name || !fwForm.value} className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg text-sm font-medium transition">{fwSaving ? 'Saving...' : 'Add Rule'}</button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-800"><h3 className="text-base sm:text-lg font-semibold">Active Rules ({firewallRules.length})</h3></div>
            {firewallRules.length === 0 && <div className="text-gray-500 text-center py-12">No firewall rules configured</div>}
            <div className="hidden md:block overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-800/50"><tr><th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Type</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Value</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th><th className="text-left px-4 py-3 text-gray-400 font-medium">Controls</th></tr></thead><tbody>{firewallRules.map(r => (<tr key={r.id} className="border-t border-gray-800 hover:bg-gray-800/30"><td className="px-4 py-3 font-medium">{r.name}</td><td className="px-4 py-3"><Badge text={r.rule_type} variant="info" /></td><td className="px-4 py-3 font-mono text-xs text-blue-400">{r.value}</td><td className="px-4 py-3">{actionBadge(r.action)}</td><td className="px-4 py-3"><Badge text={r.is_active ? 'Active' : 'Disabled'} variant={r.is_active ? 'success' : 'neutral'} /></td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => handleToggleRule(r)} className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition">{r.is_active ? 'Disable' : 'Enable'}</button><button onClick={() => handleDeleteRule(r.id)} className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition">Delete</button></div></td></tr>))}</tbody></table></div>
            <div className="md:hidden divide-y divide-gray-800">{firewallRules.map(r => (<div key={r.id} className="p-3 space-y-2"><div className="flex items-center justify-between"><span className="font-medium text-sm">{r.name}</span><Badge text={r.is_active ? 'Active' : 'Disabled'} variant={r.is_active ? 'success' : 'neutral'} /></div><div className="flex items-center gap-2 flex-wrap"><Badge text={r.rule_type} variant="info" />{actionBadge(r.action)}<span className="font-mono text-xs text-blue-400">{r.value}</span></div><div className="flex gap-2 pt-1"><button onClick={() => handleToggleRule(r)} className="text-xs px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded transition">{r.is_active ? 'Disable' : 'Enable'}</button><button onClick={() => handleDeleteRule(r.id)} className="text-xs px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition">Delete</button></div></div>))}</div>
          </div>
        </div>)}
        {tab === 'test' && (<div className="max-w-2xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-semibold mb-4">URL Policy Tester</h3>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" value={testUrl} onChange={e => setTestUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleTest()} placeholder="Enter URL to test (e.g. facebook.com)" className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm" />
              <button onClick={handleTest} disabled={testLoading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium transition text-sm">{testLoading ? 'Testing...' : 'Evaluate'}</button>
            </div>
          </div>
          {testResult && (<div className="mt-4 bg-gray-900 border border-gray-800 rounded-xl p-4 sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 flex-wrap"><span className="font-mono text-blue-400 text-sm">{testResult.domain}</span>{actionBadge(testResult.action)}{riskBadge(testResult.riskLevel)}</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
              <div><span className="text-gray-500">Categories:</span> <span className="text-gray-300">{testResult.categories?.join(', ')}</span></div>
              <div><span className="text-gray-500">Source:</span> <span className="text-gray-300">{testResult.categorySource}</span></div>
              <div><span className="text-gray-500">Confidence:</span> <span className="text-gray-300">{testResult.confidence}%</span></div>
              <div><span className="text-gray-500">Risk Score:</span> <span className="text-gray-300">{testResult.riskScore}/100</span></div>
              <div><span className="text-gray-500">DGA:</span> <span className="text-gray-300">{testResult.dga?.isDGA ? 'Yes' : 'No'} (score: {testResult.dga?.score})</span></div>
              <div><span className="text-gray-500">Eval Time:</span> <span className="text-gray-300">{testResult.evalMs}ms</span></div>
            </div>
            {testResult.riskFactors?.length > 0 && (<div className="mt-3"><span className="text-gray-500 text-sm">Risk Factors:</span><div className="flex flex-wrap gap-1 mt-1">{testResult.riskFactors.map((f: string, i: number) => (<Badge key={i} text={f} variant="danger" />))}</div></div>)}
          </div>)}
        </div>)}
      </div>
    </div>
  )
}
