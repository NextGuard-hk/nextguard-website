'use client'
import { useState, useEffect } from 'react'

const severityColors: Record<string, string> = {
  critical: '#dc2626', high: '#f97316', medium: '#f59e0b', low: '#22c55e', info: '#3b82f6'
}

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({ severity: '', eventType: '' })
  const [selectedLog, setSelectedLog] = useState<any>(null)

  function getAuth() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ng_token') : null
    const user = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('ng_user') || '{}') : {}
    return { token, user }
  }

  async function loadLogs() {
    const { token, user } = getAuth()
    if (!token) { setLoading(false); return }
    const tenantId = user.tenantId || 'tenant_alpha'
    let url = `/api/v1/logs?tenantId=${tenantId}&limit=200`
    if (filter.severity) url += `&severity=${filter.severity}`
    if (filter.eventType) url += `&eventType=${filter.eventType}`
    try {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setLogs(data.logs || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { loadLogs() }, [filter])

  const cardStyle = { background: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 8, cursor: 'pointer' }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#f1f5f9', padding: 32 }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px' }}>DLP Event Logs & Forensics</h1>
        <p style={{ color: '#64748b', margin: '0 0 24px' }}>Real-time DLP events uploaded from endpoint agents</p>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <select value={filter.severity} onChange={e => setFilter(f => ({ ...f, severity: e.target.value }))} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', color: '#f1f5f9', fontSize: 13 }}>
            <option value="">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
            <option value="info">Info</option>
          </select>
          <select value={filter.eventType} onChange={e => setFilter(f => ({ ...f, eventType: e.target.value }))} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, padding: '8px 14px', color: '#f1f5f9', fontSize: 13 }}>
            <option value="">All Event Types</option>
            <option value="usb_block">USB Block</option>
            <option value="airdrop_block">AirDrop Block</option>
            <option value="print_block">Print Block</option>
            <option value="clipboard_copy">Clipboard Copy</option>
            <option value="file_upload">File Upload</option>
            <option value="sensitive_file">Sensitive File</option>
          </select>
          <button onClick={loadLogs} style={{ background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Refresh</button>
        </div>
        <div style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>{logs.length} events</div>
        {loading ? <div style={{ textAlign: 'center', color: '#64748b', padding: 48 }}>Loading logs...</div> : (
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1 }}>
              {logs.length === 0 && <div style={{ textAlign: 'center', color: '#475569', padding: 48 }}>No logs yet. Logs appear when agents upload DLP events.</div>}
              {logs.map(log => (
                <div key={log.id} onClick={() => setSelectedLog(log)} style={{ ...cardStyle, borderLeft: `3px solid ${severityColors[log.severity] || '#64748b'}`, background: selectedLog?.id === log.id ? '#2d3a50' : '#1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ background: severityColors[log.severity] || '#64748b', borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const }}>{log.severity}</span>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{log.eventType}</span>
                    </div>
                    <span style={{ color: '#64748b', fontSize: 11 }}>{new Date(log.timestamp).toLocaleString()}</span>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>{log.description}</div>
                  <div style={{ color: '#475569', fontSize: 11, marginTop: 4 }}>
                    Agent: {log.agentId} | Action: {log.action} | Host: {log.hostname}
                  </div>
                </div>
              ))}
            </div>
            {selectedLog && (
              <div style={{ width: 400, background: '#1e293b', borderRadius: 12, padding: 24, position: 'sticky' as const, top: 32, alignSelf: 'flex-start' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ margin: 0, color: '#00d4ff' }}>Forensic Details</h3>
                  <button onClick={() => setSelectedLog(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 18 }}>X</button>
                </div>
                <div style={{ fontSize: 13 }}>
                  <div style={{ marginBottom: 8 }}><strong>Event ID:</strong> {selectedLog.id}</div>
                  <div style={{ marginBottom: 8 }}><strong>Type:</strong> {selectedLog.eventType}</div>
                  <div style={{ marginBottom: 8 }}><strong>Severity:</strong> <span style={{ color: severityColors[selectedLog.severity] }}>{selectedLog.severity}</span></div>
                  <div style={{ marginBottom: 8 }}><strong>Action Taken:</strong> {selectedLog.action}</div>
                  <div style={{ marginBottom: 8 }}><strong>Policy:</strong> {selectedLog.policyName || selectedLog.policyId || 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Agent:</strong> {selectedLog.agentId}</div>
                  <div style={{ marginBottom: 8 }}><strong>Host:</strong> {selectedLog.hostname}</div>
                  <div style={{ marginBottom: 8 }}><strong>User:</strong> {selectedLog.username || 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>File:</strong> {selectedLog.filePath || 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Process:</strong> {selectedLog.processName || 'N/A'}</div>
                  <div style={{ marginBottom: 8 }}><strong>Time:</strong> {new Date(selectedLog.timestamp).toLocaleString()}</div>
                  {selectedLog.forensicData && (
                    <div style={{ marginTop: 12 }}>
                      <strong>Forensic Data:</strong>
                      <pre style={{ background: '#0f172a', borderRadius: 8, padding: 12, marginTop: 4, fontSize: 11, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' as const }}>
                        {JSON.stringify(selectedLog.forensicData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
