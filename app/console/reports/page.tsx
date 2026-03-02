'use client'
import { useState } from 'react'
import Link from 'next/link'

const reportTypes = [
  { id: 'executive', name: 'Executive Summary', desc: 'High-level DLP overview for management', icon: '📊' },
  { id: 'compliance', name: 'Compliance Report', desc: 'GDPR, PDPO, PCI-DSS, HIPAA compliance status', icon: '✅' },
  { id: 'incidents', name: 'Incident Analysis', desc: 'Detailed incident breakdown by severity, channel, policy', icon: '🚨' },
  { id: 'agents', name: 'Agent Health Report', desc: 'Endpoint agent status, versions, connectivity', icon: '🖥️' },
  { id: 'policies', name: 'Policy Effectiveness', desc: 'Policy hit rates, false positives, tuning suggestions', icon: '🛡️' },
  { id: 'data-flow', name: 'Data Flow Analysis', desc: 'Sensitive data movement across channels', icon: '🔄' },
  { id: 'user-risk', name: 'User Risk Assessment', desc: 'Risk scores by user based on DLP events', icon: '👤' },
  { id: 'audit', name: 'Audit Trail', desc: 'Complete audit log of admin and system actions', icon: '📝' },
]

export default function ReportsPage() {
  const [generating, setGenerating] = useState<string | null>(null)
  const [period, setPeriod] = useState('7d')
  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const sel = { background: '#0f172a', color: '#94a3b8', border: '1px solid #334155', borderRadius: 8, padding: '8px 12px', fontSize: 14 }

  function generateReport(id: string) {
    setGenerating(id)
    setTimeout(() => setGenerating(null), 2000)
  }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ color: '#f1f5f9', margin: 0 }}>Reports</h1><p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Generate and download DLP analytics reports</p></div>
        <Link href="/console" style={{ color: '#60a5fa', fontSize: 14, textDecoration: 'none' }}>&larr; Console</Link>
      </div>
      <div style={{ marginBottom: 20 }}>
        <select style={sel} value={period} onChange={e => setPeriod(e.target.value)}>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {reportTypes.map(r => (
          <div key={r.id} style={card}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{r.icon}</div>
            <div style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 16, marginBottom: 4 }}>{r.name}</div>
            <div style={{ color: '#64748b', fontSize: 13, marginBottom: 12 }}>{r.desc}</div>
            <button onClick={() => generateReport(r.id)} disabled={generating === r.id} style={{ background: generating === r.id ? '#334155' : '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13 }}>
              {generating === r.id ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
