'use client'
import { useState, useEffect, useCallback } from 'react'

interface AppDLPEvent {
  id: string; timestamp: string; agentId: string; hostname: string; username: string
  eventType: string; channel: string; severity: string; action: string; policyName: string
  appName?: string; appCategory?: string; fileName?: string; details?: Record<string, string>
}
interface AppEventStats {
  total: number; byChannel: Record<string, number>; bySeverity: Record<string, number>
  byEventType: Record<string, number>; byApp: Record<string, number>
}

export default function AppMonitorPanel() {
  const [events, setEvents] = useState<AppDLPEvent[]>([])
  const [stats, setStats] = useState<AppEventStats | null>(null)
  const [channels, setChannels] = useState<string[]>([])
  const [channelFilter, setChannelFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true)
      const p = new URLSearchParams()
      if (channelFilter !== 'all') p.set('channel', channelFilter)
      if (severityFilter !== 'all') p.set('severity', severityFilter)
      const res = await fetch(`/api/v1/app-events?${p}`)
      if (res.ok) {
        const d = await res.json()
        setEvents(d.events || []); setStats(d.stats || null); setChannels(d.channels || [])
      }
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [channelFilter, severityFilter])

  useEffect(() => { fetchEvents() }, [fetchEvents])
  useEffect(() => { const t = setInterval(fetchEvents, 15000); return () => clearInterval(t) }, [fetchEvents])

  const filtered = events.filter(e => !searchTerm || e.policyName?.toLowerCase().includes(searchTerm.toLowerCase()) || e.appName?.toLowerCase().includes(searchTerm.toLowerCase()) || e.hostname?.toLowerCase().includes(searchTerm.toLowerCase()))
  const sev = (s: string) => ({ critical:'bg-red-500/20 text-red-400 border border-red-500/30', high:'bg-orange-500/20 text-orange-400 border border-orange-500/30', medium:'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', low:'bg-blue-500/20 text-blue-400 border border-blue-500/30' }[s] || 'bg-gray-500/20 text-gray-400')
  const chC = (c: string) => ({ messaging:'bg-indigo-500/20 text-indigo-300', print:'bg-amber-500/20 text-amber-300', airdrop:'bg-cyan-500/20 text-cyan-300', browser:'bg-green-500/20 text-green-300', email:'bg-pink-500/20 text-pink-300', usb:'bg-red-500/20 text-red-300', cloud:'bg-purple-500/20 text-purple-300' }[c] || 'bg-gray-500/20 text-gray-400')

  return (<div className="space-y-4">
    {stats && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-xs text-gray-500">Total Events</p><p className="text-2xl font-bold text-white">{stats.total}</p></div>
      {Object.entries(stats.byChannel).map(([ch, ct]) => <div key={ch} className="bg-gray-800 rounded-xl p-4 border border-gray-700"><p className="text-xs text-gray-500 capitalize">{ch}</p><p className="text-2xl font-bold text-white">{ct}</p><span className={`text-xs px-2 py-0.5 rounded ${chC(ch)}`}>{ch}</span></div>)}
    </div>}
    {stats && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><h4 className="text-sm font-medium text-white mb-3">By Severity</h4>
        {Object.entries(stats.bySeverity).map(([k,v]) => <div key={k} className="flex items-center gap-2 mb-2"><span className={`text-xs px-2 py-0.5 rounded ${sev(k)} w-16 text-center`}>{k}</span><div className="flex-1 bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-cyan-500" style={{width:`${stats.total>0?(v/stats.total*100):0}%`}}/></div><span className="text-xs text-gray-400 w-8 text-right">{v}</span></div>)}
      </div>
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700"><h4 className="text-sm font-medium text-white mb-3">By Application</h4>
        {Object.entries(stats.byApp).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([app,ct]) => <div key={app} className="flex items-center gap-2 mb-2"><span className="text-xs text-gray-300 w-28 truncate">{app}</span><div className="flex-1 bg-gray-700 rounded-full h-2"><div className="h-2 rounded-full bg-indigo-500" style={{width:`${stats.total>0?(ct/stats.total*100):0}%`}}/></div><span className="text-xs text-gray-400 w-8 text-right">{ct}</span></div>)}
      </div>
    </div>}
    <div className="flex flex-wrap gap-2">
      <input value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} placeholder="Search events..." className="flex-1 min-w-48 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-cyan-500"/>
      <select value={channelFilter} onChange={e=>setChannelFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"><option value="all">All Channels</option>{channels.map(c=><option key={c} value={c}>{c}</option>)}</select>
      <select value={severityFilter} onChange={e=>setSeverityFilter(e.target.value)} className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white outline-none"><option value="all">All Severities</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>
      <button onClick={()=>fetchEvents()} className="px-3 py-2 bg-cyan-600/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-600/30">{loading?'Loading...':'Refresh'}</button>
    </div>
    <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-700 text-gray-400"><th className="p-3 text-left">Severity</th><th className="p-3 text-left">Channel</th><th className="p-3 text-left">App</th><th className="p-3 text-left">Event</th><th className="p-3 text-left">Policy</th><th className="p-3 text-left">Action</th><th className="p-3 text-left">Host</th><th className="p-3 text-left">Time</th></tr></thead>
      <tbody>{filtered.slice(0,50).map(evt=><tr key={evt.id} className="border-b border-gray-800/50 hover:bg-gray-700/30"><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${sev(evt.severity)}`}>{evt.severity}</span></td><td className="p-3"><span className={`text-xs px-2 py-0.5 rounded ${chC(evt.channel)}`}>{evt.channel}</span></td><td className="p-3 text-gray-300 text-xs">{evt.appName||'-'}</td><td className="p-3 text-gray-300 text-xs font-mono">{evt.eventType}</td><td className="p-3 text-gray-300 text-xs">{evt.policyName}</td><td className="p-3"><span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">{evt.action}</span></td><td className="p-3 text-gray-400 text-xs">{evt.hostname}</td><td className="p-3 text-gray-500 text-xs whitespace-nowrap">{new Date(evt.timestamp).toLocaleString()}</td></tr>)}</tbody>
    </table>{filtered.length===0&&<p className="p-6 text-center text-gray-500">No events match</p>}<div className="p-3 border-t border-gray-700 text-xs text-gray-500">{filtered.length} events</div></div>
  </div>)
}
