'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    fetch('/api/v1/agent-config').then(r => r.json()).then(d => {
      setConfig(d)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const card = { background: '#1e293b', borderRadius: 12, padding: 20, marginBottom: 16 }
  const tabs = ['general', 'detection', 'notifications', 'integrations']

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div><h1 style={{ color: '#f1f5f9', margin: 0 }}>Configuration</h1><p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>System and agent configuration settings</p></div>
        <Link href="/console" style={{ color: '#60a5fa', fontSize: 14, textDecoration: 'none' }}>&larr; Console</Link>
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{ background: activeTab === t ? '#3b82f6' : '#1e293b', color: activeTab === t ? '#fff' : '#94a3b8', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontSize: 14, textTransform: 'capitalize' }}>{t}</button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div>
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 16px' }}>Agent Configuration</h3>
            {loading ? <p style={{ color: '#64748b' }}>Loading...</p> : config ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><span style={{ color: '#64748b', fontSize: 12 }}>Config Version</span><br/><span style={{ color: '#e2e8f0' }}>{config.configVersion || 'N/A'}</span></div>
                <div><span style={{ color: '#64748b', fontSize: 12 }}>Last Updated</span><br/><span style={{ color: '#e2e8f0' }}>{config.lastUpdated ? new Date(config.lastUpdated).toLocaleString() : 'N/A'}</span></div>
              </div>
            ) : <p style={{ color: '#64748b' }}>Unable to load config</p>}
          </div>
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Session Settings</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Session Timeout', '24 hours'], ['MFA Required', 'No'], ['Max Login Attempts', '5'], ['Password Policy', 'Minimum 8 chars, mixed case']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span style={{ color: '#e2e8f0' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'detection' && (
        <div>
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Detection Engine</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Detection Mode', 'Hybrid (Traditional + AI)'], ['AI Engine', 'Active'], ['Pattern Matching', 'Regex + Keyword'], ['Content Inspection', 'Deep content analysis enabled'], ['Fingerprinting', 'Document fingerprint matching'], ['OCR Detection', 'Image text extraction enabled']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span style={{ color: '#22c55e' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div>
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>Alert Notifications</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Email Alerts', 'Enabled - admin@company.com'], ['Slack Integration', 'Not configured'], ['Webhook URL', 'Not configured'], ['SMS Alerts', 'Disabled'], ['Critical Alert Escalation', 'Immediate notification']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span style={{ color: val.includes('Not') || val.includes('Disabled') ? '#64748b' : '#22c55e' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <div>
          <div style={card}>
            <h3 style={{ color: '#f1f5f9', margin: '0 0 12px' }}>SIEM / External Integrations</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              {[['Syslog Forwarding', 'Enabled (CEF format)'], ['SIEM Connector', 'Splunk / QRadar compatible'], ['REST API', 'Active - /api/v1/*'], ['LDAP/AD Sync', 'Not configured'], ['SAML SSO', 'Not configured'], ['Cloud Storage', 'Cloudflare R2 (forensic data)']].map(([label, val], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: 8 }}>
                  <span style={{ color: '#94a3b8' }}>{label}</span><span style={{ color: val.includes('Not') ? '#64748b' : '#22c55e' }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
