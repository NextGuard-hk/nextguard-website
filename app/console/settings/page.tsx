'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const DETECTION_MODES = [
  { id: 'traditional', name: 'Traditional', desc: 'Regex + Keyword pattern matching only', icon: '🔍' },
  { id: 'ai', name: 'AI (LLM-based)', desc: 'AI/ML content analysis with NLP', icon: '🤖' },
  { id: 'hybrid', name: 'Hybrid (Traditional + AI)', desc: 'Combined regex/keyword + AI analysis (Recommended)', icon: '⚡' }
]

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')
  const [detectionMode, setDetectionMode] = useState('hybrid')
  const [editingMode, setEditingMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [settings, setSettings] = useState({
    sessionTimeout: '24',
    mfaRequired: false,
    maxLoginAttempts: '5',
    aiConfidence: '0.85',
    emailAlerts: true,
    alertEmail: 'admin@company.com',
    slackWebhook: '',
    syslogServer: '',
    syslogFormat: 'CEF'
  })

  useEffect(() => {
    fetch('/api/v1/agent-config').then(r => r.json()).then(d => {
      setConfig(d)
      if (d.aiConfig?.globalDetectionMode) setDetectionMode(d.aiConfig.globalDetectionMode)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function saveDetectionMode(mode: string) {
    setSaving(true)
    setDetectionMode(mode)
    try {
      await fetch('/api/v1/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ detectionMode: mode })
      })
      setSuccess(`Detection mode changed to: ${DETECTION_MODES.find(m => m.id === mode)?.name}`)
      setTimeout(() => setSuccess(''), 3000)
    } catch {}
    setSaving(false)
    setEditingMode(false)
  }

  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const tabs = ['general', 'detection', 'notifications', 'integrations']
  const input = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, boxSizing: 'border-box' as const }

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto', color: '#f1f5f9' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Configuration</h1>
          <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 14 }}>System and agent configuration settings</p>
        </div>
        <Link href="/console" style={{ background: '#334155', color: 'white', border: 'none', borderRadius: 8, padding: '10px 20px', textDecoration: 'none', fontSize: 14 }}>← Console</Link>
      </div>

      {success && <div style={{ background: '#14532d', padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{success}</div>}

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            background: activeTab === t ? '#3b82f6' : '#1e293b',
            color: activeTab === t ? '#fff' : '#94a3b8',
            border: 'none', borderRadius: 8, padding: '8px 16px',
            cursor: 'pointer', fontSize: 14, textTransform: 'capitalize'
          }}>{t}</button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div>
          <div style={card}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Agent Configuration</h3>
            {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : config ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {[['Config Version', config.configVersion || 'N/A'], ['Last Updated', config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'N/A']].map(([label, val], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                    <span style={{ color: '#94a3b8' }}>{label}</span><span>{val}</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ color: '#ef4444' }}>Unable to load config</p>}
          </div>
          <div style={card}>
            <h3 style={{ fontSize: 16, marginBottom: 16 }}>Session Settings</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {[['Session Timeout', `${settings.sessionTimeout} hours`], ['MFA Required', settings.mfaRequired ? 'Yes' : 'No'], ['Max Login Attempts', settings.maxLoginAttempts], ['Password Policy', 'Minimum 8 chars, mixed case']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span>{String(val)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'detection' && (
        <div>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, margin: 0 }}>Detection Engine</h3>
              <button onClick={() => setEditingMode(!editingMode)} style={{
                background: editingMode ? '#dc2626' : '#2563eb', color: 'white',
                border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 13
              }}>{editingMode ? 'Cancel' : 'Edit Mode'}</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>Current Detection Mode:</label>
              {editingMode ? (
                <div style={{ display: 'grid', gap: 12 }}>
                  {DETECTION_MODES.map(mode => (
                    <div key={mode.id} onClick={() => saveDetectionMode(mode.id)} style={{
                      background: detectionMode === mode.id ? '#1e3a5f' : '#0f172a',
                      border: detectionMode === mode.id ? '2px solid #3b82f6' : '1px solid #334155',
                      borderRadius: 12, padding: 16, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 24 }}>{mode.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 15 }}>{mode.name}</div>
                          <div style={{ color: '#94a3b8', fontSize: 13 }}>{mode.desc}</div>
                        </div>
                        {detectionMode === mode.id && <span style={{ marginLeft: 'auto', color: '#4ade80', fontSize: 18 }}>✓</span>}
                      </div>
                    </div>
                  ))}
                  {saving && <p style={{ color: '#f59e0b', fontSize: 13 }}>Saving...</p>}
                </div>
              ) : (
                <div style={{ background: '#0f172a', borderRadius: 12, padding: 16, border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{DETECTION_MODES.find(m => m.id === detectionMode)?.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{DETECTION_MODES.find(m => m.id === detectionMode)?.name}</div>
                      <div style={{ color: '#94a3b8', fontSize: 13 }}>{DETECTION_MODES.find(m => m.id === detectionMode)?.desc}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: 8 }}>
              {[['AI Engine', 'Active - NextGuard AI v2.0'], ['AI Confidence Threshold', settings.aiConfidence], ['Pattern Matching', 'Regex + Keyword (1700+ classifiers)'], ['Content Inspection', 'Deep content analysis enabled'], ['Document Fingerprinting', 'Enabled'], ['OCR Detection', 'Image text extraction enabled'], ['Exact Data Match', 'Enabled'], ['Machine Learning', 'Classification models active']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div style={card}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>Alert Notifications</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[['Email Alerts', settings.emailAlerts ? `Enabled - ${settings.alertEmail}` : 'Disabled'], ['Slack Integration', settings.slackWebhook || 'Not configured'], ['Webhook URL', 'Not configured'], ['SMS Alerts', 'Disabled'], ['Critical Alert Escalation', 'Immediate notification']].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>{label}</span><span>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div style={card}>
          <h3 style={{ fontSize: 16, marginBottom: 16 }}>SIEM / External Integrations</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {[['Syslog Forwarding', `Enabled (${settings.syslogFormat} format)`], ['SIEM Connector', 'Splunk / QRadar compatible'], ['REST API', 'Active - /api/v1/*'], ['LDAP/AD Sync', 'Not configured'], ['SAML SSO', 'Not configured'], ['Cloud Storage', 'Cloudflare R2 (forensic data)']].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #334155' }}>
                <span style={{ color: '#94a3b8' }}>{label}</span><span>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
