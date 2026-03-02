'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const levelColors: Record<string, string> = { emergency: '#dc2626', alert: '#ef4444', critical: '#f97316', error: '#fb923c', warning: '#eab308', notice: '#22c55e', info: '#3b82f6', debug: '#6b7280' }

export default function SyslogPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('all')
  const [facilityFilter, setFacilityFilter] = useState('all')
  const [autoRefresh, setAutoRefresh] = useState(false)

  async function loadLogs() {
    try {
      const params = new URLSearchParams()
      if (levelFilter !== 'all') params.set('level', levelFilter)
      if (facilityFilter !== 'all') params.set('facility', facilityFilter)
      params.set('limit', '200')
      const res = await fetch(`/api/v1/syslog?${params}`)
      const data = await res.json()
      if (data.success) setLogs(data.logs || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [levelFilter, facilityFilter])
  useEffect(() => {
    if (!autoRefresh) return
    const iv = setInterval(loadLogs, 5000)
    return () => clearInterval(iv)
  }, [autoRefresh, levelFilter, facilityFilter])

  const card = { background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8 }
  const sel = { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 }

  const facilities = [...new Set(logs.map(l => l.facility))].sort()

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ color: '#f1f5f9', margin: 0 }}>System Log</h1><p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Centralized syslog from agents and console</p></div>
        <Link href="/console" style={{ color: '#60a5fa', fontSize: 14, textDecoration: 'none' }}>&larr; Console</Link>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={sel} value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
          <option value="all">All Levels</option>
          {['emergency','alert','critical','error','warning','notice','info','debug'].map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select style={sel} value={facilityFilter} onChange={e => setFacilityFilter(e.target.value)}>
          <option value="all">All Facilities</option>
          {facilities.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <button onClick={() => setAutoRefresh(!autoRefresh)} style={{ ...sel, cursor: 'pointer', background: autoRefresh ? '#22c55e22' : '#0f172a', color: autoRefresh ? '#22c55e' : '#94a3b8' }}>
          {autoRefresh ? '● Live' : '○ Auto-refresh'}
        </button>
        <button onClick={loadLogs} style={{ ...sel, cursor: 'pointer', color: '#60a5fa' }}>Refresh</button>
        <span style={{ color: '#475569', fontSize: 13, marginLeft: 'auto' }}>{logs.length} entries</span>
      </div>
      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : logs.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}><p style={{ color: '#64748b' }}>No syslog entries.</p></div>
      ) : (
        <div style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {logs.map((log, i) => (
            <div key={log.id || i} style={{ ...card, display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 16px' }}>
              <span style={{ color: '#475569', fontSize: 11, whiteSpace: 'nowrap', minWidth: 140 }}>{new Date(log.timestamp).toLocaleString()}</span>
              <span style={{ color: levelColors[log.level] || '#94a3b8', fontWeight: 600, minWidth: 70, textTransform: 'uppercase', fontSize: 11 }}>{log.level}</span>
              <span style={{ color: '#60a5fa', minWidth: 100, fontSize: 12 }}>{log.facility}</span>
              <span style={{ color: '#94a3b8', minWidth: 100, fontSize: 12 }}>{log.hostname}</span>
              <span style={{ color: '#e2e8f0', flex: 1, wordBreak: 'break-all' as const }}>{log.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
