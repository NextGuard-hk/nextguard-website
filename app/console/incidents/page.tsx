'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const severityColors: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e', info: '#3b82f6' }
const statusColors: Record<string, string> = { open: '#ef4444', investigating: '#f97316', resolved: '#22c55e', false_positive: '#6b7280', escalated: '#a855f7' }

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: 'all', status: 'all' })
  const [selected, setSelected] = useState<any>(null)

  useEffect(() => {
    fetch('/api/v1/incidents').then(r => r.json()).then(d => {
      if (d.success) setIncidents(d.incidents || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filtered = incidents.filter(i => {
    if (filter.severity !== 'all' && i.severity !== filter.severity) return false
    if (filter.status !== 'all' && i.status !== filter.status) return false
    return true
  })

  const stats = { total: incidents.length, open: incidents.filter(i => i.status === 'open').length, critical: incidents.filter(i => i.severity === 'critical').length, resolved: incidents.filter(i => i.status === 'resolved').length }
  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const sel = { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 }

  if (selected) {
    return (
      <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
        <button onClick={() => setSelected(null)} style={{ color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', marginBottom: 16 }}>&larr; Back</button>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ color: '#f1f5f9', margin: 0 }}>{selected.policyName}</h2>
            <span style={{ background: severityColors[selected.severity], color: '#fff', padding: '4px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const }}>{selected.severity}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['Status', selected.status, statusColors[selected.status]], ['Channel', selected.channel], ['Action', selected.action], ['Host', selected.hostname], ['User', selected.username], ['Time', new Date(selected.reportedAt).toLocaleString()]].map(([label, val, color], i) => (
              <div key={i}><span style={{ color: '#64748b', fontSize: 12 }}>{label}</span><br/><span style={{ color: (color as string) || '#e2e8f0', fontWeight: color ? 600 : 400 }}>{val}</span></div>
            ))}
          </div>
        </div>
        {selected.details && (
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Forensic Details</h3>
            {selected.details.filePath && <div style={{ marginBottom: 8 }}><span style={{ color: '#64748b', fontSize: 12 }}>File Path</span><br/><code style={{ color: '#e2e8f0', fontSize: 13 }}>{selected.details.filePath}</code></div>}
            {selected.details.fileName && <div style={{ marginBottom: 8 }}><span style={{ color: '#64748b', fontSize: 12 }}>File</span><br/><span style={{ color: '#e2e8f0' }}>{selected.details.fileName}</span></div>}
            {selected.details.contentSnippet && <div style={{ marginBottom: 8 }}><span style={{ color: '#64748b', fontSize: 12 }}>Content</span><br/><div style={{ background: '#0f172a', padding: 12, borderRadius: 8, color: '#fbbf24', fontFamily: 'monospace', fontSize: 12 }}>{selected.details.contentSnippet}</div></div>}
            {selected.details.matchedPatterns?.length > 0 && <div><span style={{ color: '#64748b', fontSize: 12 }}>Patterns</span><br/>{selected.details.matchedPatterns.map((p: string, i: number) => <span key={i} style={{ background: '#7c3aed33', color: '#a78bfa', padding: '2px 8px', borderRadius: 4, fontSize: 12, marginRight: 6 }}>{p}</span>)}</div>}
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ color: '#f1f5f9', margin: 0 }}>DLP Incidents</h1><p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Security incidents from endpoint agents</p></div>
        <Link href="/console" style={{ color: '#60a5fa', fontSize: 14, textDecoration: 'none' }}>&larr; Console</Link>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[['Total', stats.total, '#f1f5f9'], ['Open', stats.open, '#ef4444'], ['Critical', stats.critical, '#f97316'], ['Resolved', stats.resolved, '#22c55e']].map(([label, val, color], i) => (
          <div key={i} style={card}><div style={{ color: '#64748b', fontSize: 12 }}>{label}</div><div style={{ color: color as string, fontSize: 28, fontWeight: 700 }}>{val as number}</div></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <select style={sel} value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })}>
          <option value="all">All Severities</option>
          {['critical','high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select style={sel} value={filter.status} onChange={e => setFilter({ ...filter, status: e.target.value })}>
          <option value="all">All Statuses</option>
          {['open','investigating','resolved','escalated'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: 40 }}><p style={{ color: '#64748b' }}>No incidents found.</p><p style={{ color: '#475569', fontSize: 13 }}>Incidents appear when agents detect policy violations.</p></div>
      ) : filtered.map(inc => (
        <div key={inc.id} onClick={() => setSelected(inc)} style={{ ...card, cursor: 'pointer', borderLeft: `4px solid ${severityColors[inc.severity]}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div><div style={{ color: '#f1f5f9', fontWeight: 600 }}>{inc.policyName}</div><div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{inc.channel} &bull; {inc.hostname} &bull; {inc.username}</div></div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ background: severityColors[inc.severity] + '22', color: severityColors[inc.severity], padding: '3px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const }}>{inc.severity}</span>
              <div style={{ color: statusColors[inc.status], fontSize: 12, marginTop: 4 }}>{inc.status.replace('_', ' ')}</div>
            </div>
          </div>
          <div style={{ color: '#475569', fontSize: 12, marginTop: 8 }}>{new Date(inc.reportedAt).toLocaleString()} &bull; Action: {inc.action}</div>
        </div>
      ))}
    </div>
  )
}
