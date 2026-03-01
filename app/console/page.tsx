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

interface AgentFeature {
  id: string
  name: string
  description: string
  enabled: boolean
  platforms?: string[]
  action?: string
}

interface AgentCategory {
  category: string
  description: string
  features: Record<string, AgentFeature>
}

interface AgentConfigData {
  configVersion: string
  lastUpdated: string
  [key: string]: unknown
}

const API_BASE = '/api/v1'

export default function ConsoleDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'policies' | 'incidents' | 'reports' | 'configuration'>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [policies, setPolicies] = useState<Policy[]>([])
  const [incidentStats, setIncidentStats] = useState<IncidentStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [searchTerm, setSearchTerm] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [globalDetectionMode, setGlobalDetectionMode] = useState<'traditional' | 'ai' | 'hybrid'>('hybrid')
  const [policyCategory, setPolicyCategory] = useState('all')
  const [reportRange, setReportRange] = useState('7d')
  const [agentConfig, setAgentConfig] = useState<AgentConfigData | null>(null)
  const [configSummary, setConfigSummary] = useState<{totalFeatures: number; enabledFeatures: number; disabledFeatures: number; byCategory: Record<string, {total: number; enabled: number}>} | null>(null)
  const [configSearch, setConfigSearch] = useState('')
  const [configCategory, setConfigCategory] = useState('all')

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [agentsRes, incidentsRes, policiesRes, configRes] = await Promise.all([
        fetch(`${API_BASE}/agents`),
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/policies/bundle`),
        fetch(`${API_BASE}/agent-config`)
      ])
      if (agentsRes.ok) { const d = await agentsRes.json(); setAgents(d.agents || []) }
      if (incidentsRes.ok) { const d = await incidentsRes.json(); setIncidents(d.incidents || []); setIncidentStats(d.stats || null) }
      if (policiesRes.ok) { const d = await policiesRes.json(); setPolicies(d.bundle?.policies || []); if (d.aiConfig?.globalDetectionMode) setGlobalDetectionMode(d.aiConfig.globalDetectionMode) }
      if (configRes.ok) { const d = await configRes.json(); setAgentConfig(d.config || null); setConfigSummary(d.summary || null) }
      setLastRefresh(new Date())
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { const t = setInterval(fetchData, 30000); return () => clearInterval(t) }, [fetchData])

  const toggleFeature = async (featureId: string, currentEnabled: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/agent-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ featureId, enabled: !currentEnabled })
      })
      if (res.ok) { fetchData() }
    } catch (e) { console.error(e) }
  }

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

  const getConfigCategories = (): [string, AgentCategory][] => {
    if (!agentConfig) return []
    return Object.entries(agentConfig).filter(([k]) => !['configVersion', 'lastUpdated'].includes(k)).map(([k, v]) => [k, v as AgentCategory])
  }

  const filteredConfigCategories = getConfigCategories().filter(([, cat]) => {
    const matchCat = configCategory === 'all' || cat.category === configCategory
    if (!matchCat) return false
    if (!configSearch) return true
    const features = Object.values(cat.features)
    return features.some(f => f.name.toLowerCase().includes(configSearch.toLowerCase()) || f.description.toLowerCase().includes(configSearch.toLowerCase()))
  })

  const severityColor = (s: string) => ({ critical: 'bg-red-500/20 text-red-400 border border-red-500/30', high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' }[s] || 'bg-gray-500/20 text-gray-400')
  const statusColor = (s: string) => ({ online: 'bg-green-500/20 text-green-400', offline: 'bg-red-500/20 text-red-400', warning: 'bg-yellow-500/20 text-yellow-400', open: 'bg-red-500/20 text-red-400', resolved: 'bg-green-500/20 text-green-400', investigating: 'bg-yellow-500/20 text-yellow-400', escalated: 'bg-orange-500/20 text-orange-400' }[s] || 'bg-gray-500/20 text-gray-400')
  const modeColor = (m: string) => ({ traditional: 'bg-blue-500/20 text-blue-300 border border-blue-500/40', ai: 'bg-purple-500/20 text-purple-300 border border-purple-500/40', hybrid: 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' }[m] || 'bg-gray-500/20 text-gray-400')

  const tabBtn = (tab: typeof activeTab, label: string) => (
    <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}>{label}</button>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-sm">NG</div>
              <div>
                <h1 className="text-xl font-bold">NextGuard DLP Console</h1>
                <p className="text-xs text-gray-400">Enterprise Management Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Detection Mode:</span>
                <select value={globalDetectionMode} onChange={e => setGlobalDetectionMode(e.target.value as 'traditional' | 'ai' | 'hybrid')} className="bg-transparent text-xs font-medium text-cyan-400 outline-none cursor-pointer">
                  <option value="traditional">Traditional</option>
                  <option value="ai">AI Only</option>
                  <option value="hybrid">Hybrid</option>
                </select>
                <span className={`text-xs px-2 py-0.5 rounded ${modeColor(globalDetectionMode)}`}>{globalDetectionMode.toUpperCase()}</span>
              </div>
              <button onClick={fetchData} className="px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/20 border border-cyan-500/20">{loading ? 'Loading...' : 'Refresh'}</button>
              <span className="text-xs text-gray-500">Updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex gap-2 mt-4 flex-wrap">
            {tabBtn('dashboard', 'Dashboard')}
            {tabBtn('agents', `Agents (${agents.length})`)}
            {tabBtn('policies', `Policies (${policies.length})`)}
            {tabBtn('incidents', `Incidents (${incidents.length})`)}
            {tabBtn('reports', 'Reports')}
            {tabBtn('configuration', `Configuration (${configSummary?.totalFeatures || 0})`)}
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 py-6">

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Total Agents</p>
                <p className="text-2xl font-bold">{agents.length}</p>
                <p className="text-xs text-green-400">{onlineAgents} online</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Active Policies</p>
                <p className="text-2xl font-bold">{policies.filter(p => p.enabled).length}</p>
                <p className="text-xs text-gray-400">{policies.length} total</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Open Incidents</p>
                <p className="text-2xl font-bold text-red-400">{openIncidents}</p>
                <p className="text-xs text-red-400">{criticalIncidents} critical</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <p className="text-xs text-gray-500 mb-1">Detection Mode</p>
                <p className="text-2xl font-bold text-cyan-400">{globalDetectionMode}</p>
                <p className="text-xs text-cyan-400">AI Engine Active</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Incidents by Severity</h3>
                {incidentStats ? <div className="space-y-2">{Object.entries(incidentStats.bySeverity).map(([k, v]) => (<div key={k} className="flex items-center gap-2"><span className={`text-xs px-2 py-0.5 rounded ${severityColor(k)}`}>{k}</span><div className="flex-1 bg-gray-800 rounded-full h-2"><div className={`h-2 rounded-full ${k === 'critical' ? 'bg-red-500' : k === 'high' ? 'bg-orange-500' : k === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}`} style={{width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`}} /></div><span className="text-xs text-gray-400">{v}</span></div>))}</div> : <p className="text-gray-500 text-sm">No data</p>}
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Incidents by Channel</h3>
                {incidentStats ? <div className="space-y-2">{Object.entries(incidentStats.byChannel).map(([k, v]) => (<div key={k} className="flex items-center gap-2"><span className="text-xs text-gray-400 w-16">{k}</span><div className="flex-1 bg-gray-800 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-500" style={{width: `${incidentStats.total > 0 ? (v/incidentStats.total*100) : 0}%`}} /></div><span className="text-xs text-gray-400">{v}</span></div>))}</div> : <p className="text-gray-500 text-sm">No data</p>}
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold mb-3">Recent Incidents</h3>
              {incidents.slice(0, 5).map(inc => (<div key={inc.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"><div><span className={`text-xs px-2 py-0.5 rounded mr-2 ${severityColor(inc.severity)}`}>{inc.severity}</span><span className="text-sm">{inc.policyName}</span><span className="text-xs text-gray-500 ml-2">{inc.hostname}</span></div><span className="text-xs text-gray-500">{new Date(inc.timestamp).toLocaleString()}</span></div>))}
              {incidents.length === 0 && <p className="text-gray-500 text-sm">No incidents recorded</p>}
            </div>
          </div>
        )}

        {activeTab === 'agents' && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search agents..." className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
            </div>
            {agents.filter(a => !searchTerm || a.hostname.toLowerCase().includes(searchTerm.toLowerCase()) || a.username.toLowerCase().includes(searchTerm.toLowerCase())).map(agent => (
              <div key={agent.id} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <div className="flex items-center justify-between mb-2"><span className="font-medium">{agent.hostname}</span><span className={`text-xs px-2 py-0.5 rounded ${statusColor(agent.status)}`}>{agent.status}</span></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-400">
                  <div><span className="text-gray-600">User: </span>{agent.username}</div>
                  <div><span className="text-gray-600">OS: </span>{agent.os}</div>
                  <div><span className="text-gray-600">Version: </span>{agent.version}</div>
                  {agent.ip && <div><span className="text-gray-600">IP: </span>{agent.ip}</div>}
                </div>
                <p className="text-xs text-gray-500 mt-2"><span className="text-gray-600">Last seen: </span>{new Date(agent.lastHeartbeat).toLocaleString()}</p>
              </div>
            ))}
            {agents.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No agents registered. Install the NextGuard Endpoint Agent to get started.</p>}
          </div>
        )}

        {activeTab === 'policies' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search policies..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
              <select value={policyCategory} onChange={e => setPolicyCategory(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">All Categories</option>
                {policyCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500"><th className="pb-2">Policy Name</th><th className="pb-2">Category</th><th className="pb-2">Compliance</th><th className="pb-2">Severity</th><th className="pb-2">Detection</th><th className="pb-2">Action</th><th className="pb-2">Status</th></tr></thead>
              <tbody>{filteredPolicies.map(p => (<tr key={p.id} className="border-b border-gray-800/50"><td className="py-2"><div className="font-medium">{p.name}</div><div className="text-xs text-gray-500">{p.description}</div></td><td className="py-2 text-xs">{p.category}</td><td className="py-2 text-xs">{p.complianceFramework}</td><td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${severityColor(p.severity)}`}>{p.severity}</span></td><td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${modeColor(p.detectionMode)}`}>{p.detectionMode}</span></td><td className="py-2 text-xs">{p.action}</td><td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${p.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{p.enabled ? 'Active' : 'Disabled'}</span></td></tr>))}</tbody>
            </table></div>
            {filteredPolicies.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No policies match</p>}
            <p className="text-xs text-gray-500">{filteredPolicies.length} of {policies.length} policies shown</p>
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search incidents..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
              <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr className="border-b border-gray-800 text-left text-xs text-gray-500"><th className="pb-2">Severity</th><th className="pb-2">Policy</th><th className="pb-2">Channel</th><th className="pb-2">Host</th><th className="pb-2">User</th><th className="pb-2">Action</th><th className="pb-2">Status</th><th className="pb-2">Time</th></tr></thead>
              <tbody>{filteredIncidents.map(inc => (<tr key={inc.id} className="border-b border-gray-800/50"><td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${severityColor(inc.severity)}`}>{inc.severity}</span></td><td className="py-2 text-xs">{inc.policyName}</td><td className="py-2 text-xs">{inc.channel}</td><td className="py-2 text-xs">{inc.hostname}</td><td className="py-2 text-xs">{inc.username}</td><td className="py-2 text-xs">{inc.action}</td><td className="py-2"><span className={`text-xs px-2 py-0.5 rounded ${statusColor(inc.status)}`}>{inc.status}</span></td><td className="py-2 text-xs text-gray-500">{new Date(inc.timestamp).toLocaleString()}</td></tr>))}</tbody>
            </table></div>
            {filteredIncidents.length === 0 && <p className="text-gray-500 text-sm text-center py-4">No incidents match</p>}
            <p className="text-xs text-gray-500">{filteredIncidents.length} of {incidents.length} incidents shown</p>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div><h2 className="text-lg font-semibold">DLP Reports & Analytics</h2><p className="text-xs text-gray-400">Comprehensive reporting across all DLP activity</p></div>
              <div className="flex gap-2">
                <select value={reportRange} onChange={e => setReportRange(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                  <option value="24h">Last 24 Hours</option><option value="7d">Last 7 Days</option><option value="30d">Last 30 Days</option><option value="90d">Last 90 Days</option>
                </select>
                <button className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-700">Export CSV</button>
                <button className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white hover:bg-gray-700">Export PDF</button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-xs text-gray-500 mb-1">Total Incidents</p><p className="text-2xl font-bold">{incidents.length}</p><p className="text-xs text-gray-400">All time</p></div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-xs text-gray-500 mb-1">Blocked</p><p className="text-2xl font-bold text-red-400">{incidents.filter(i => i.action === 'block').length}</p><p className="text-xs text-gray-400">Data loss prevented</p></div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-xs text-gray-500 mb-1">Audited</p><p className="text-2xl font-bold text-yellow-400">{incidents.filter(i => i.action === 'audit').length}</p><p className="text-xs text-gray-400">Logged for review</p></div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800"><p className="text-xs text-gray-500 mb-1">Policies Active</p><p className="text-2xl font-bold text-green-400">{policies.filter(p => p.enabled).length}</p><p className="text-xs text-gray-400">of {policies.length} total</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Policy Coverage by Category</h3>
                {policyCategories.map(cat => { const catP = policies.filter(p => p.category === cat); const active = catP.filter(p => p.enabled).length; return (<div key={cat} className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-400 w-32 truncate">{cat}</span><div className="flex-1 bg-gray-800 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-500" style={{width: `${catP.length > 0 ? (active/catP.length*100) : 0}%`}} /></div><span className="text-xs text-gray-400">{active}/{catP.length}</span></div>) })}
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Detection Mode Distribution</h3>
                {(['traditional', 'ai', 'hybrid'] as const).map(mode => { const count = policies.filter(p => p.detectionMode === mode).length; const pct = policies.length > 0 ? Math.round(count/policies.length*100) : 0; return (<div key={mode} className="flex items-center gap-2 mb-2"><span className={`text-xs px-2 py-0.5 rounded ${modeColor(mode)}`}>{mode}</span><span className="text-xs text-gray-400">{count} policies ({pct}%)</span></div>) })}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Top Triggered Policies</h3>
                {(() => { const counts: Record<string, number> = {}; incidents.forEach(i => { counts[i.policyName] = (counts[i.policyName] || 0) + 1 }); return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,5).map(([name, count]) => (<div key={name} className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-400 w-40 truncate">{name}</span><div className="flex-1 bg-gray-800 rounded-full h-2"><div className="h-2 rounded-full bg-orange-500" style={{width: `${incidents.length > 0 ? (count/incidents.length*100) : 0}%`}} /></div><span className="text-xs text-gray-400">{count}</span></div>)) })()}
                {incidents.length === 0 && <p className="text-gray-500 text-sm">No incident data yet</p>}
              </div>
              <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h3 className="text-sm font-semibold mb-3">Agent Status Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center"><p className="text-xs text-gray-500">Online Agents</p><p className="text-xl font-bold text-green-400">{onlineAgents}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-500">Offline Agents</p><p className="text-xl font-bold text-red-400">{offlineAgents}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-500">Warning Agents</p><p className="text-xl font-bold text-yellow-400">{agents.filter(a => a.status === 'warning').length}</p></div>
                  <div className="text-center"><p className="text-xs text-gray-500">Coverage Rate</p><p className="text-xl font-bold text-cyan-400">{agents.length > 0 ? Math.round(onlineAgents/agents.length*100) : 0}%</p></div>
                </div>
              </div>
            </div>
            <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h3 className="text-sm font-semibold mb-3">Compliance Framework Coverage</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {['PCI-DSS','GDPR','HIPAA','PDPO','PIPL','SOX','ISO27001','NIST-800-171'].map(fw => { const fwP = policies.filter(p => p.complianceFramework === fw); return (<div key={fw} className="bg-gray-800 rounded-lg p-3 text-center"><p className="text-xs font-medium text-cyan-400">{fw}</p><p className="text-lg font-bold">{fwP.length}</p><p className="text-xs text-gray-500">policies</p></div>) })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'configuration' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Agent Feature Configuration</h2>
                <p className="text-xs text-gray-400">Enable or disable endpoint agent features across all categories. Config v{agentConfig?.configVersion || '...'}</p>
              </div>
              {configSummary && (
                <div className="flex gap-4 text-center">
                  <div><p className="text-xs text-gray-500">Total</p><p className="text-xl font-bold">{configSummary.totalFeatures}</p></div>
                  <div><p className="text-xs text-gray-500">Enabled</p><p className="text-xl font-bold text-green-400">{configSummary.enabledFeatures}</p></div>
                  <div><p className="text-xs text-gray-500">Disabled</p><p className="text-xl font-bold text-red-400">{configSummary.disabledFeatures}</p></div>
                </div>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <input value={configSearch} onChange={e => setConfigSearch(e.target.value)} placeholder="Search features..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500" />
              <select value={configCategory} onChange={e => setConfigCategory(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
                <option value="all">All Categories</option>
                {getConfigCategories().map(([key, cat]) => <option key={key} value={cat.category}>{cat.category}</option>)}
              </select>
            </div>

            {filteredConfigCategories.map(([key, cat]) => {
              const features = Object.entries(cat.features).filter(([, f]) => !configSearch || f.name.toLowerCase().includes(configSearch.toLowerCase()) || f.description.toLowerCase().includes(configSearch.toLowerCase()))
              const enabledCount = features.filter(([, f]) => f.enabled).length
              return (
                <div key={key} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">{cat.category}</h3>
                      <p className="text-xs text-gray-500">{cat.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-400">{enabledCount} enabled</span>
                      <span className="text-xs text-gray-600">/</span>
                      <span className="text-xs text-gray-400">{features.length} total</span>
                    </div>
                  </div>
                  <div className="divide-y divide-gray-800/50">
                    {features.map(([fKey, feature]) => (
                      <div key={fKey} className="px-4 py-3 flex items-center justify-between hover:bg-gray-800/30">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{feature.name}</span>
                            <span className="text-xs text-gray-600">({feature.id})</span>
                            {feature.platforms && feature.platforms.map(p => (<span key={p} className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">{p}</span>))}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{feature.description}</p>
                        </div>
                        <div className="flex items-center gap-3 ml-4">
                          {feature.action && <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{feature.action}</span>}
                          <div  onClick={() => toggleFeature(feature.id, feature.enabled)}className={`w-10 h-5 rounded-full flex items-center transition-colors cursor-pointer ${feature.enabled ? 'bg-green-500/30 justify-end' : 'bg-gray-700 justify-start'}`}>
                            <div className={`w-4 h-4 rounded-full mx-0.5 ${feature.enabled ? 'bg-green-400' : 'bg-gray-500'}`} />
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded ${feature.enabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{feature.enabled ? 'ON' : 'OFF'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
            {filteredConfigCategories.length === 0 && <p className="text-gray-500 text-sm text-center py-8">No features match your search</p>}
          </div>
        )}

      </div>
    </div>
  )
}
