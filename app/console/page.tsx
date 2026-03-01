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
  framework: string
  severity: string
  action: string
  channels: string[]
  enabled: boolean
  version: number
}

const API_BASE = '/api/v1'

export default function ConsoleDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'agents' | 'policies' | 'incidents'>('dashboard')
  const [agents, setAgents] = useState<Agent[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [stats, setStats] = useState<IncidentStats | null>(null)
  const [policies, setPolicies] = useState<Policy[]>([])
  const [loading, setLoading] = useState(true)
  const [incidentFilter, setIncidentFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')

  const fetchData = useCallback(async () => {
    try {
      const [agentsRes, incidentsRes, policiesRes] = await Promise.all([
        fetch(`${API_BASE}/agents/heartbeat`),
        fetch(`${API_BASE}/incidents`),
        fetch(`${API_BASE}/policies/bundle`),
      ])
      if (agentsRes.ok) {
        const ad = await agentsRes.json()
        setAgents(ad.agents || [])
      }
      if (incidentsRes.ok) {
        const id = await incidentsRes.json()
        setIncidents(id.incidents || [])
        setStats(id.stats || null)
      }
      if (policiesRes.ok) {
        const pd = await policiesRes.json()
        setPolicies(pd.policies || [])
      }
    } catch (e) { console.error('Fetch error:', e) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const onlineAgents = agents.filter(a => a.status === 'online').length
  const offlineAgents = agents.filter(a => a.status === 'offline').length

  const filteredIncidents = incidents.filter(inc => {
    if (incidentFilter !== 'all' && inc.status !== incidentFilter) return false
    if (severityFilter !== 'all' && inc.severity !== severityFilter) return false
    return true
  })

  const severityColor = (s: string) => {
    switch(s) {
      case 'critical': return 'bg-red-600'
      case 'high': return 'bg-orange-500'
      case 'medium': return 'bg-yellow-500'
      case 'low': return 'bg-blue-500'
      default: return 'bg-gray-500'
    }
  }
  const statusColor = (s: string) => {
    switch(s) {
      case 'online': return 'text-green-400'
      case 'offline': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Top Navigation Bar */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">NG</div>
            <h1 className="text-xl font-bold">NextGuard Management Console</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">● {onlineAgents} Online</span>
            <span className="text-red-400">● {offlineAgents} Offline</span>
            <span className="text-gray-400">Auto-refresh: 15s</span>
          </div>
        </div>
        {/* Tab Navigation */}
        <nav className="flex gap-1 mt-4">
          {(['dashboard', 'agents', 'policies', 'incidents'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t-lg text-sm font-medium capitalize transition-colors ${
                activeTab === tab ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`}>{tab}</button>
          ))}
        </nav>
      </header>

      <main className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        ) : activeTab === 'dashboard' ? (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Agents</p>
                <p className="text-3xl font-bold mt-1">{agents.length}</p>
                <p className="text-green-400 text-xs mt-2">{onlineAgents} online</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Total Incidents</p>
                <p className="text-3xl font-bold mt-1">{stats?.total || 0}</p>
                <p className="text-red-400 text-xs mt-2">{stats?.bySeverity.critical || 0} critical</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Open Incidents</p>
                <p className="text-3xl font-bold mt-1">{stats?.byStatus.open || 0}</p>
                <p className="text-orange-400 text-xs mt-2">{stats?.byStatus.escalated || 0} escalated</p>
              </div>
              <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
                <p className="text-gray-400 text-sm">Resolved</p>
                <p className="text-3xl font-bold mt-1">{stats?.byStatus.resolved || 0}</p>
                <p className="text-green-400 text-xs mt-2">All time</p>
              </div>
            </div>
            {/* Channel Breakdown */}
            <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
              <h3 className="text-lg font-semibold mb-4">Incidents by Channel</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {stats && Object.entries(stats.byChannel).map(([ch, count]) => (
                  <div key={ch} className="bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-gray-400 text-xs capitalize mt-1">{ch}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Recent Incidents Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800">
                <h3 className="text-lg font-semibold">Recent Incidents</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Policy</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Channel</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Host</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {incidents.slice(0, 20).map(inc => (
                      <tr key={inc.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono text-xs">{inc.id}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium text-white ${severityColor(inc.severity)}`}>{inc.severity}</span></td>
                        <td className="px-4 py-3">{inc.policyName}</td>
                        <td className="px-4 py-3 capitalize">{inc.channel}</td>
                        <td className="px-4 py-3">{inc.hostname}</td>
                        <td className="px-4 py-3 capitalize">{inc.action}</td>
                        <td className="px-4 py-3 capitalize">{inc.status}</td>
                        <td className="px-4 py-3 text-gray-400">{new Date(inc.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {incidents.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No incidents reported yet. Agents will report incidents when DLP violations are detected.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'agents' ? (
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Registered Agents</h3>
              <span className="text-sm text-gray-400">{agents.length} agent(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-800/50">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Hostname</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">OS</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Agent Version</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Last Heartbeat</th>
                    <th className="text-left px-4 py-3 text-gray-400 font-medium">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {agents.map(agent => (
                    <tr key={agent.id} className="hover:bg-gray-800/30">
                      <td className={`px-4 py-3 font-bold ${statusColor(agent.status)}`}>● {agent.status}</td>
                      <td className="px-4 py-3 font-medium">{agent.hostname}</td>
                      <td className="px-4 py-3">{agent.username}</td>
                      <td className="px-4 py-3">{agent.os}</td>
                      <td className="px-4 py-3 font-mono text-xs">{agent.version}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(agent.lastHeartbeat).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(agent.registeredAt).toLocaleString()}</td>
                    </tr>
                  ))}
                  {agents.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No agents registered yet. Install the NextGuard DLP Agent on endpoints to get started.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : activeTab === 'policies' ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Policy Management</h3>
              <a href="/console/policies" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors">
                Open Full Policy Editor
              </a>
            </div>
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-400">{policies.length} policies configured</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Name</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Framework</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Channels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {policies.map(p => (
                      <tr key={p.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">{p.enabled ? <span className="text-green-400">●</span> : <span className="text-gray-500">●</span>}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{p.name}</div>
                          <div className="text-xs text-gray-500">{p.description}</div>
                        </td>
                        <td className="px-4 py-3 text-xs">{p.framework}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium text-white ${severityColor(p.severity)}`}>{p.severity}</span></td>
                        <td className="px-4 py-3 capitalize">{p.action}</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{p.channels?.join(', ')}</td>
                      </tr>
                    ))}
                    {policies.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">No policies configured. Use the Policy Editor to create DLP policies.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Incidents Tab - Full View */
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h3 className="text-lg font-semibold">Incident Management</h3>
              <div className="flex gap-3">
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="all">All Severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white">
                  <option value="all">All Statuses</option>
                  <option value="open">Open</option>
                  <option value="investigating">Investigating</option>
                  <option value="escalated">Escalated</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>
            {/* Incident Stats Cards */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <p className="text-xs text-gray-400">Critical</p>
                  <p className="text-2xl font-bold text-red-400">{stats.bySeverity.critical}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <p className="text-xs text-gray-400">High</p>
                  <p className="text-2xl font-bold text-orange-400">{stats.bySeverity.high}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <p className="text-xs text-gray-400">Medium</p>
                  <p className="text-2xl font-bold text-yellow-400">{stats.bySeverity.medium}</p>
                </div>
                <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
                  <p className="text-xs text-gray-400">Low</p>
                  <p className="text-2xl font-bold text-blue-400">{stats.bySeverity.low}</p>
                </div>
              </div>
            )}
            {/* Full Incidents Table */}
            <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
                <span className="text-sm text-gray-400">{filteredIncidents.length} incident(s)</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">ID</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Severity</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Policy</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Channel</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Host</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">User</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Action</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="text-left px-4 py-3 text-gray-400 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredIncidents.map(inc => (
                      <tr key={inc.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3 font-mono text-xs">{inc.id}</td>
                        <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium text-white ${severityColor(inc.severity)}`}>{inc.severity}</span></td>
                        <td className="px-4 py-3">{inc.policyName}</td>
                        <td className="px-4 py-3 capitalize">{inc.channel}</td>
                        <td className="px-4 py-3">{inc.hostname}</td>
                        <td className="px-4 py-3">{inc.username}</td>
                        <td className="px-4 py-3 capitalize">{inc.action}</td>
                        <td className="px-4 py-3 capitalize">{inc.status}</td>
                        <td className="px-4 py-3 text-gray-400">{new Date(inc.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {filteredIncidents.length === 0 && (
                      <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">{incidents.length === 0 ? 'No incidents reported yet. Agents will report incidents when DLP violations are detected.' : 'No incidents match the current filters.'}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
