'use client'
import { useState, useEffect, useCallback } from 'react'

interface Agent {
  id: string
  hostname: string
  username: string
  os: string
  version: string
  status: 'online' | 'offline' | 'warning'
  lastHeartbeat: string
  registeredAt: string
  ip?: string
}

interface IncidentStats {
  total: number
  bySeverity: { critical: number; high: number; medium: number; low: number }
  byStatus: { open: number; investigating: number; escalated: number; resolved: number }
  byChannel: { file: number; clipboard: number; email: number; browser: number; usb: number; network: number }
}

interface Incident {
  id: string
  agentId: string
  hostname: string
  username: string
  policyName: string
  severity: string
  action: string
  channel: string
  status: string
  timestamp: string
  details: Record<string, unknown>
}

interface Policy {
  id: string
  name: string
  description: string
  category: string
  complianceFramework: string
  severity: string
  action: string
  channels: string[]
  enabled: boolean
  detectionMode: string
  version: number
}

const API_BASE = '/api/v1'

export default function ConsoleDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'policies' | 'incidents' | 'reports'>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [incidentStats, setIncidentStats] = useState<IncidentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [globalDetectionMode, setGlobalDetectionMode] = useState<'traditional' | 'ai' | 'hybrid'>('hybrid')
  const [policyCategory, setPolicyCategory] = useState('all')
  const [reportRange, setReportRange] = useState('7d')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [agentsRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/agents`),
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/policies/bundle`)
      ])
      if (agentsRes.ok) { const d = await agentsRes.json(); setAgents(d.agents || []) }
      if (incidentsRes.ok) { const d = await incidentsRes.json(); setIncidents(d.incidents || []); setIncidentStats(d.stats || null) }
      if (policiesRes.ok) { const d = await policiesRes.json(); setPolicies(d.bundle?.policies || []); if (d.aiConfig?.globalDetectionMode) setGlobalDetectionMode(d.aiConfig.globalDetectionMode) }
      setLastRefresh(new Date())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t) }, [fetchData])

  const onlineAgents = agents.filter(a => a.status === 'online').length
  const offlineAgents = agents.filter(a => a.status === 'offline').length
  const criticalIncidents = incidents.filter(i => i.severity === 'critical').length
  const openIncidents = incidents.filter(i => i.status === 'open').length

  const filteredIncidents = incidents.filter(inc => {
    const matchSearch = !searchTerm || inc.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || inc.policyName.toLowerCase().includes(searchTerm.toLowerCase()) || inc.username.toLowerCase().includes(searchTerm.toLowerCase())
    const matchSeverity = severityFilter === 'all' || inc.severity === severityFilter
    return matchSearch && matchSeverity
  })

  const filteredPolicies = policies.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCat = policyCategory === 'all' || p.category === policyCategory
    return matchSearch && matchCat
  })

  const policyCategories = [...new Set(policies.map(p => p.category))]

  const severityColor = (s: string) => ({ critical: 'bg-red-500/20 text-red-400 border border-red-500/30', high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' }[s] || 'bg-gray-500/20 text-gray-400')
  const statusColor = (s: string) => ({ online: 'bg-green-500/20 text-green-400', offline: 'bg-red-500/20 text-red-400', warning: 'bg-yellow-500/20 text-yellow-400', open: 'bg-red-500/20 text-red-400', resolved: 'bg-green-500/20 text-green-400', investigating: 'bg-yellow-500/20 text-yellow-400', escalated: 'bg-orange-500/20 text-orange-400' }[s] || 'bg-gray-500/20 text-gray-400')
  const modeColor = (m: string) => ({ traditional: 'bg-blue-500/20 text-blue-300 border border-blue-500/40', ai: 'bg-purple-500/20 text-purple-300 border border-purple-500/40', hybrid: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' }[m] || 'bg-gray-500/20 text-gray-400')

  const tabBtn = (tab: typeof activeTab, label: string) => (
    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${ activeTab === tab ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-700/50' }`}>{label}</button>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-black font-bold text-sm">NG</div>
            <div>
              <h1 className="text-base font-semibold text-white">NextGuard DLP Console</h1>
              <p className="text-xs text-gray-400">Enterprise Management Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5">
              <span className="text-xs text-gray-400">Detection Mode:</span>
              <select value={globalDetectionMode} onChange={e => setGlobalDetectionMode(e.target.value as 'traditional' | 'ai' | 'hybrid')} className="bg-transparent text-xs font-medium text-cyan-400 outline-none cursor-pointer">
                <option value="traditional">Traditional</option>
                <option value="ai">AI Only</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${modeColor(globalDetectionMode)}`}>{globalDetectionMode.toUpperCase()}</span>
            </div>
            <button onClick={fetchData} disabled={loading} className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs hover:bg-cyan-500/30 transition-colors disabled:opacity-50">{loading ? 'Loading...' : 'Refresh'}</button>
            <span className="text-xs text-gray-500">Updated: {lastRefresh.toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex gap-2 mb-6 border-b border-gray-800 pb-3">
          {tabBtn('dashboard', 'Dashboard')}
          {tabBtn('agents', `Agents (${agents.length})`)}
          {tabBtn('policies', `Policies (${policies.length})`)}
          {tabBtn('incidents', `Incidents (${incidents.length})`)}
          {tabBtn('reports', 'Reports')}
        </div>

        {activeTab === 'dashboard' && (
          <main>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total Agents</p>
                <p className="text-2xl font-bold text-white">{agents.length}</p>
                <p className="text-xs text-green-400 mt-1">{onlineAgents} online</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Active Policies</p>
                <p className="text-2xl font-bold text-white">{policies.filter(p => p.enabled).length}</p>
                <p className="text-xs text-gray-400 mt-1">{policies.length} total</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Open Incidents</p>
                <p className="text-2xl font-bold text-red-400">{openIncidents}</p>
                <p className="text-xs text-orange-400 mt-1">{criticalIncidents} critical</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Detection Mode</p>
                <p className="text-lg font-bold text-cyan-400 capitalize">{globalDetectionMode}</p>
                <p className="text-xs text-gray-400 mt-1">AI Engine Active</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Incidents by Severity</h3>
                {incidentStats ? (
                  <div className="space-y-2">
                    {Object.entries(incidentStats.bySeverity).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor(k)}`}>{k}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 bg-cyan-500 rounded-full" style={{width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`}}></div></div>
                          <span className="text-sm font-medium w-8 text-right">{v}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-500">No data</p>}
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Incidents by Channel</h3>
                {incidentStats ? (
                  <div className="space-y-2">
                    {Object.entries(incidentStats.byChannel).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-xs text-gray-400 capitalize">{k}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 bg-purple-500 rounded-full" style={{width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`}}></div></div>
                          <span className="text-sm font-medium w-8 text-right">{v}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-xs text-gray-500">No data</p>}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Recent Incidents</h3>
              <div className="space-y-2">
                {incidents.slice(0, 5).map(inc => (
                  <div key={inc.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs ${severityColor(inc.severity)}`}>{inc.severity}</span>
                      <span className="text-sm">{inc.policyName}</span>
                      <span className="text-xs text-gray-400">{inc.hostname}</span>
                    </div>
                    <span className="text-xs text-gray-500">{new Date(inc.timestamp).toLocaleString()}</span>
                  </div>
                ))}
                {incidents.length === 0 && <p className="text-xs text-gray-500 text-center py-4">No incidents recorded</p>}
              </div>
            </div>
          </main>
        )}

        {activeTab === 'agents' && (
          <main>
            <div className="mb-4 flex gap-3">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search agents..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {agents.filter(a => !searchTerm || a.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || a.username.toLowerCase().includes(searchTerm.toLowerCase())).map(agent => (
                <div key={agent.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{agent.hostname}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColor(agent.status)}`}>{agent.status}</span>
                  </div>
                  <div className="space-y-1 text-xs text-gray-400">
                    <div className="flex justify-between"><span>User:</span><span className="text-white">{agent.username}</span></div>
                    <div className="flex justify-between"><span>OS:</span><span className="text-white">{agent.os}</span></div>
                    <div className="flex justify-between"><span>Version:</span><span className="text-cyan-400">{agent.version}</span></div>
                    {agent.ip && <div className="flex justify-between"><span>IP:</span><span className="text-white font-mono">{agent.ip}</span></div>}
                    <div className="flex justify-between"><span>Last seen:</span><span className="text-white">{new Date(agent.lastHeartbeat).toLocaleString()}</span></div>
                  </div>
                </div>
              ))}
              {agents.length === 0 && <div className="col-span-3 text-center py-12 text-gray-500 text-sm">No agents registered. Install the NextGuard Endpoint Agent to get started.</div>}
            </div>
          </main>
        )}

        {activeTab === 'policies' && (
          <main>
            <div className="mb-4 flex gap-3 flex-wrap">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search policies..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
              <select value={policyCategory} onChange={e => setPolicyCategory(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">All Categories</option>
                {policyCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Policy Name</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Category</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Compliance</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Detection</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredPolicies.map(p => (
                    <tr key={p.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-gray-500 truncate max-w-xs">{p.description}</div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-300">{p.category}</td>
                      <td className="px-4 py-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300">{p.complianceFramework}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${severityColor(p.severity)}`}>{p.severity}</span></td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${modeColor(p.detectionMode)}`}>{p.detectionMode}</span></td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-300">{p.action}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${p.enabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'}`}>{p.enabled ? 'Active' : 'Disabled'}</span></td>
                    </tr>
                  ))}
                  {filteredPolicies.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500 text-sm">No policies found</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">{filteredPolicies.length} of {policies.length} policies shown</p>
          </main>
        )}

        {activeTab === 'incidents' && (
          <main>
            <div className="mb-4 flex gap-3 flex-wrap">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search incidents..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="border-b border-gray-800">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Severity</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Policy</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Channel</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Host</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Action</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-xs text-gray-400 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredIncidents.map(inc => (
                    <tr key={inc.id} className="hover:bg-gray-800/30">
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${severityColor(inc.severity)}`}>{inc.severity}</span></td>
                      <td className="px-4 py-3 text-sm">{inc.policyName}</td>
                      <td className="px-4 py-3 text-xs capitalize text-gray-300">{inc.channel}</td>
                      <td className="px-4 py-3 text-xs">{inc.hostname}</td>
                      <td className="px-4 py-3 text-xs">{inc.username}</td>
                      <td className="px-4 py-3 text-xs capitalize">{inc.action}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(inc.status)}`}>{inc.status}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(inc.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                  {filteredIncidents.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">{incidents.length === 0 ? 'No incidents recorded' : 'No incidents match filters'}</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">{filteredIncidents.length} of {incidents.length} incidents shown</p>
          </main>
        )}

        {activeTab === 'reports' && (
          <main>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">DLP Reports & Analytics</h2>
                <p className="text-xs text-gray-400 mt-0.5">Comprehensive reporting across all DLP activity</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={reportRange} onChange={e => setReportRange(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
                <button className="px-3 py-2 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs hover:bg-cyan-500/30 transition-colors">Export CSV</button>
                <button className="px-3 py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-xs hover:bg-purple-500/30 transition-colors">Export PDF</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Total Incidents</p>
                <p className="text-2xl font-bold text-white">{incidents.length}</p>
                <p className="text-xs text-gray-500 mt-1">All time</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Blocked</p>
                <p className="text-2xl font-bold text-red-400">{incidents.filter(i => i.action === 'block').length}</p>
                <p className="text-xs text-gray-500 mt-1">Data loss prevented</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Audited</p>
                <p className="text-2xl font-bold text-yellow-400">{incidents.filter(i => i.action === 'audit').length}</p>
                <p className="text-xs text-gray-500 mt-1">Logged for review</p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">Policies Active</p>
                <p className="text-2xl font-bold text-green-400">{policies.filter(p => p.enabled).length}</p>
                <p className="text-xs text-gray-500 mt-1">of {policies.length} total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Policy Coverage by Category</h3>
                <div className="space-y-2">
                  {policyCategories.map(cat => {
                    const catPolicies = policies.filter(p => p.category === cat)
                    const active = catPolicies.filter(p => p.enabled).length
                    return (
                      <div key={cat} className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 w-32 truncate">{cat}</span>
                        <div className="flex items-center gap-2 flex-1 ml-2">
                          <div className="flex-1 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 bg-cyan-500 rounded-full" style={{width: `${catPolicies.length > 0 ? (active/catPolicies.length*100) : 0}%`}}></div></div>
                          <span className="text-xs text-gray-400 w-12 text-right">{active}/{catPolicies.length}</span>
                        </div>
                      </div>
                    )
                  })}
                  {policyCategories.length === 0 && <p className="text-xs text-gray-500">Loading policy data...</p>}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Detection Mode Distribution</h3>
                <div className="space-y-3">
                  {(['traditional', 'ai', 'hybrid'] as const).map(mode => {
                    const count = policies.filter(p => p.detectionMode === mode).length
                    const pct = policies.length > 0 ? Math.round(count/policies.length*100) : 0
                    return (
                      <div key={mode} className="space-y-1">
                        <div className="flex justify-between">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${modeColor(mode)}`}>{mode}</span>
                          <span className="text-xs text-gray-400">{count} policies ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full"><div className={`h-1.5 rounded-full ${mode === 'traditional' ? 'bg-blue-500' : mode === 'ai' ? 'bg-purple-500' : 'bg-cyan-500'}`} style={{width: `${pct}%`}}></div></div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Top Triggered Policies</h3>
                <div className="space-y-2">
                  {(() => {
                    const counts: Record<string, number> = {}
                    incidents.forEach(i => { counts[i.policyName] = (counts[i.policyName] || 0) + 1 })
                    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => (
                      <div key={name} className="flex items-center justify-between">
                        <span className="text-xs text-gray-300 truncate flex-1">{name}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full"><div className="h-1.5 bg-orange-500 rounded-full" style={{width: `${incidents.length > 0 ? (count/incidents.length*100) : 0}%`}}></div></div>
                          <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                        </div>
                      </div>
                    ))
                  })()}
                  {incidents.length === 0 && <p className="text-xs text-gray-500">No incident data yet</p>}
                </div>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-semibold mb-3">Agent Status Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Online Agents</span>
                    <span className="text-sm font-medium text-green-400">{onlineAgents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Offline Agents</span>
                    <span className="text-sm font-medium text-red-400">{offlineAgents}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Warning Agents</span>
                    <span className="text-sm font-medium text-yellow-400">{agents.filter(a => a.status === 'warning').length}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-xs text-gray-400">Coverage Rate</span>
                    <span className="text-sm font-medium text-cyan-400">{agents.length > 0 ? Math.round(onlineAgents/agents.length*100) : 0}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-3">Compliance Framework Coverage</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['PCI-DSS','GDPR','HIPAA','PDPO','PIPL','SOX','ISO27001','NIST-800-171'].map(fw => {
                  const fwPolicies = policies.filter(p => p.complianceFramework === fw)
                  return (
                    <div key={fw} className="bg-gray-800 rounded-lg p-3">
                      <p className="text-xs font-semibold text-white">{fw}</p>
                      <p className="text-lg font-bold text-cyan-400 mt-1">{fwPolicies.length}</p>
                      <p className="text-xs text-gray-500">policies</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </main>
        )}

      </div>
    </div>
  )
}
