'use client'
import { useState, useEffect } from 'react'

interface AppEvent {
  id: string
  timestamp: string
  agentId: string
  hostname: string
  channel: string
  appName: string
  action: string
  severity: string
  status: string
  user: string
  details: string
  policyId?: string
  fileInfo?: { name: string; size: number; type: string }
}

interface EventSummary {
  total: number
  blocked: number
  flagged: number
  allowed: number
  bySeverity: Record<string, number>
  byChannel: Record<string, number>
}

export default function AppMonitorPage() {
  const [events, setEvents] = useState<AppEvent[]>([])
  const [summary, setSummary] = useState<EventSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [channelFilter, setChannelFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await fetch('/api/v1/app-events')
        if (res.ok) {
          const d = await res.json()
          setEvents(d.data?.events || [])
          setSummary(d.data?.summary || null)
        }
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    fetchEvents()
    const t = setInterval(fetchEvents, 15000)
    return () => clearInterval(t)
  }, [])

  const filtered = events.filter(e => {
    const mc = channelFilter === 'all' || e.channel === channelFilter
    const ms = severityFilter === 'all' || e.severity === severityFilter
    return mc && ms
  })

  const sevColor = (s: string) => ({
    critical: 'bg-red-500/20 text-red-400 border border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
    low: 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
  }[s] || 'bg-gray-500/20 text-gray-400')

  const statusColor = (s: string) => ({
    blocked: 'bg-red-500/20 text-red-400',
    flagged: 'bg-yellow-500/20 text-yellow-400',
    allowed: 'bg-green-500/20 text-green-400'
  }[s] || 'bg-gray-500/20 text-gray-400')

  const channelIcon = (c: string) => ({
    messaging: '💬', print: '🖨️', airdrop: '📡',
    email: '📧', clipboard: '📋', browser: '🌐'
  }[c] || '📦')

  const fmtSize = (b: number) => b > 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${(b/1e3).toFixed(0)} KB`

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-cyan-400 text-lg">Loading App Monitor...</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">App DLP Monitor</h1>
                        <p className="text-yellow-400/80 text-xs mt-2 bg-yellow-900/20 border border-yellow-700/30 rounded px-3 py-1 inline-block">Config: Monitoring rules are defined in <a href="/console/policies" className="text-blue-400 underline">Policy Management</a> | Detection engine mode is set in <a href="/console/settings" className="text-blue-400 underline">Settings &gt; Detection</a></p>
            <p className="text-gray-400 text-sm mt-1">Real-time application-level data loss prevention events</p>             <p className="text-yellow-400/80 text-xs mt-1">&#x26A0; Monitoring rules are configured in <a href="/console/policies" className="text-blue-400 underline">Policy Management</a>. Detection engine is set in <a href="/console/settings" className="text-blue-400 underline">Settings</a>.</p>
          </div>
          <a href="/console" className="text-cyan-400 hover:text-cyan-300 text-sm">← Back to Console</a>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-gray-400 text-xs">Total Events</div>
              <div className="text-2xl font-bold mt-1">{summary.total}</div>
            </div>
            <div className="bg-gray-900 border border-red-500/20 rounded-xl p-4">
              <div className="text-gray-400 text-xs">Blocked</div>
              <div className="text-2xl font-bold text-red-400 mt-1">{summary.blocked}</div>
            </div>
            <div className="bg-gray-900 border border-yellow-500/20 rounded-xl p-4">
              <div className="text-gray-400 text-xs">Flagged</div>
              <div className="text-2xl font-bold text-yellow-400 mt-1">{summary.flagged}</div>
            </div>
            <div className="bg-gray-900 border border-green-500/20 rounded-xl p-4">
              <div className="text-gray-400 text-xs">Allowed</div>
              <div className="text-2xl font-bold text-green-400 mt-1">{summary.allowed}</div>
            </div>
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">By Severity</h3>
              {Object.entries(summary.bySeverity).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1">
                  <span className={`text-xs px-2 py-0.5 rounded ${sevColor(k)}`}>{k}</span>
                  <span className="text-sm text-gray-300">{v}</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">By Channel</h3>
              {Object.entries(summary.byChannel).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-1">
                  <span className="text-xs text-gray-400">{channelIcon(k)} {k}</span>
                  <span className="text-sm text-gray-300">{v}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-4 flex-wrap">
          <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="all">All Channels</option>
            <option value="messaging">Messaging</option>
            <option value="print">Print</option>
            <option value="airdrop">AirDrop</option>
            <option value="email">Email</option>
            <option value="clipboard">Clipboard</option>
          </select>
          <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-gray-800 text-gray-400 text-xs">
              <th className="text-left p-3">Time</th>
              <th className="text-left p-3">Channel</th>
              <th className="text-left p-3">App</th>
              <th className="text-left p-3">Severity</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">User</th>
              <th className="text-left p-3">Details</th>
            </tr></thead>
            <tbody>
              {filtered.map(evt => (
                <tr key={evt.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-3 text-gray-400 whitespace-nowrap">{new Date(evt.timestamp).toLocaleString()}</td>
                  <td className="p-3">{channelIcon(evt.channel)} {evt.channel}</td>
                  <td className="p-3 text-cyan-400">{evt.appName}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${sevColor(evt.severity)}`}>{evt.severity}</span></td>
                  <td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${statusColor(evt.status)}`}>{evt.status}</span></td>
                  <td className="p-3 text-gray-300">{evt.user}</td>
                  <td className="p-3 text-gray-400 max-w-xs truncate">
                    {evt.details}
                    {evt.fileInfo && <span className="ml-2 text-xs text-gray-500">({evt.fileInfo.name} - {fmtSize(evt.fileInfo.size)})</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-gray-500">No events match filters</td></tr>}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-xs text-gray-500 text-center">
          Showing {filtered.length} of {events.length} events • Auto-refreshes every 15s
        </div>
      </div>
    </div>
  )
}
