'use client'
import { useState } from 'react'

const POLICY_GROUPS = [
  { id: 'pii', label: 'PII Protection', icon: '\ud83d\udd12', desc: 'Personal Identifiable Information' },
  { id: 'financial', label: 'Financial Data', icon: '\ud83d\udcb3', desc: 'Credit cards, bank accounts' },
  { id: 'credentials', label: 'Credentials & Secrets', icon: '\ud83d\udd11', desc: 'API keys, passwords, tokens' },
  { id: 'compliance', label: 'Regulatory Compliance', icon: '\ud83d\udccb', desc: 'GDPR, PDPO, PCI-DSS, HIPAA' },
  { id: 'ip', label: 'Intellectual Property', icon: '\ud83d\udca1', desc: 'Source code, trade secrets' },
  { id: 'custom', label: 'Custom Rules', icon: '\u2699\ufe0f', desc: 'Organization-specific patterns' },
]

const RESPONSE_ACTIONS = ['BLOCK', 'QUARANTINE', 'ENCRYPT', 'COACH_USER', 'REDIRECT', 'AUDIT', 'LOG_ONLY']
const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info']
const CONFIDENCES = ['exact', 'high', 'medium', 'low']
const DIRECTIONS = ['outbound', 'inbound', 'both', 'internal']
const SCHEDULES = ['always', 'business_hours', 'off_hours', 'weekends', 'custom']
const NOTIFICATION_TEMPLATES = [
  { id: 'block_notify', label: 'Block & Notify Admin' },
  { id: 'coach_user', label: 'User Coaching Popup' },
  { id: 'manager_escalate', label: 'Escalate to Manager' },
  { id: 'encrypt_send', label: 'Auto-Encrypt & Send' },
  { id: 'quarantine_review', label: 'Quarantine for Review' },
  { id: 'silent_log', label: 'Silent Audit Log' },
]
const CLASSIFICATION_LABELS = [
  { id: 'top_secret', label: 'Top Secret', color: 'bg-red-900 text-red-300' },
  { id: 'confidential', label: 'Confidential', color: 'bg-orange-900 text-orange-300' },
  { id: 'internal', label: 'Internal Only', color: 'bg-yellow-900 text-yellow-300' },
  { id: 'public', label: 'Public', color: 'bg-green-900 text-green-300' },
]
const INCIDENT_WORKFLOWS = [
  { id: 'auto_resolve', label: 'Auto-Resolve (Low Risk)' },
  { id: 'analyst_review', label: 'Security Analyst Review' },
  { id: 'manager_approval', label: 'Manager Approval Required' },
  { id: 'legal_escalation', label: 'Legal Team Escalation' },
  { id: 'ciso_alert', label: 'CISO Direct Alert' },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EnterprisePolicyConfig({ policy, setPolicy, resetPolicy }: any) {
  const [activeGroup, setActiveGroup] = useState('pii')
  const [activeTab, setActiveTab] = useState<'rules' | 'response' | 'classification' | 'incidents' | 'advanced'>('rules')
  const POLICY_LABELS: Record<string, string> = {
    credit_card: 'Credit Card Number', phone_hk: 'Phone Number (HK/Intl)',
    hkid: 'Hong Kong ID (HKID)', email_addr: 'Email Address',
    iban: 'IBAN / Bank Account', passport: 'Passport Number',
    sensitive_keywords: 'Sensitive Keywords', api_keys: 'API Keys / Secrets',
    url_exfil: 'URL Data Exfiltration', file_type: 'Sensitive File Reference',
  }
  const ACTIONS = ['BLOCK', 'QUARANTINE', 'AUDIT']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updatePolicy(key: string, field: string, value: any) {
    setPolicy((prev: any) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-lg">Enterprise Policy Configuration</h3>
          <p className="text-xs text-zinc-500">Forcepoint + Symantec + Zscaler + Palo Alto Grade</p>
        </div>
        <button onClick={resetPolicy} className="text-xs text-cyan-400 hover:text-cyan-300 border border-cyan-700 px-3 py-1 rounded">Reset All</button>
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        {POLICY_GROUPS.map(g => (
          <button key={g.id} onClick={() => setActiveGroup(g.id)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeGroup === g.id ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
            {g.icon} {g.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-zinc-500 mb-3">{POLICY_GROUPS.find(g => g.id === activeGroup)?.desc}</p>
      <div className="flex gap-1 mb-4 border-b border-zinc-700 pb-2">
        {(['rules', 'response', 'classification', 'incidents', 'advanced'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1 rounded-t text-xs font-medium ${activeTab === tab ? 'bg-zinc-700 text-cyan-400 border-b-2 border-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tab === 'rules' ? 'Rules' : tab === 'response' ? 'Response' : tab === 'classification' ? 'Classification' : tab === 'incidents' ? 'Incidents' : 'Advanced'}
          </button>
        ))}
      </div>
      {activeTab === 'rules' && (
        <div className="overflow-x-auto"><table className="w-full text-sm min-w-[1100px]">
          <thead><tr className="text-zinc-500 text-xs">
            <th className="text-left py-1">On</th><th className="text-left">Rule</th><th className="text-left">Action</th><th className="text-left">Severity</th>
            <th className="text-left">Count</th><th className="text-left">Confidence</th><th className="text-left">Proximity</th>
            <th className="text-left">Direction</th><th className="text-left">Schedule</th><th className="text-left">Notify</th><th className="text-left">Log</th>
          </tr></thead>
          <tbody>
            {Object.keys(policy).map((key: string) => (
              <tr key={key} className="border-t border-zinc-800">
                <td className="py-1"><input type="checkbox" checked={policy[key].enabled} onChange={e => updatePolicy(key, 'enabled', e.target.checked)} className="accent-cyan-500" /></td>
                <td className="text-zinc-300 text-xs">{POLICY_LABELS[key] || key}</td>
                <td><select value={policy[key].action} onChange={e => updatePolicy(key, 'action', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{ACTIONS.map(a => <option key={a}>{a}</option>)}</select></td>
                <td><select value={policy[key].severity} onChange={e => updatePolicy(key, 'severity', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{SEVERITIES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td><input type="number" min={1} max={100} value={policy[key].matchCount || 1} onChange={e => updatePolicy(key, 'matchCount', parseInt(e.target.value) || 1)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white w-12" /></td>
                <td><select value={policy[key].confidence || 'high'} onChange={e => updatePolicy(key, 'confidence', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{CONFIDENCES.map(c => <option key={c}>{c}</option>)}</select></td>
                <td><input type="number" min={0} max={1000} step={50} value={policy[key].proximity || 0} onChange={e => updatePolicy(key, 'proximity', parseInt(e.target.value) || 0)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white w-14" /></td>
                <td><select value={policy[key].direction || 'outbound'} onChange={e => updatePolicy(key, 'direction', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{DIRECTIONS.map(d => <option key={d}>{d}</option>)}</select></td>
                <td><select value={policy[key].schedule || 'always'} onChange={e => updatePolicy(key, 'schedule', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{SCHEDULES.map(s => <option key={s}>{s}</option>)}</select></td>
                <td className="text-center"><input type="checkbox" checked={policy[key].notifyAdmin} onChange={e => updatePolicy(key, 'notifyAdmin', e.target.checked)} className="accent-cyan-500" /></td>
                <td className="text-center"><input type="checkbox" checked={policy[key].logContent} onChange={e => updatePolicy(key, 'logContent', e.target.checked)} className="accent-cyan-500" /></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      )}
      {activeTab === 'response' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-3">Response Actions (Forcepoint Style)</h4>
              {RESPONSE_ACTIONS.map(a => (<label key={a} className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked={['BLOCK','QUARANTINE','AUDIT'].includes(a)} className="accent-cyan-500" />{a.replace('_',' ')}</label>))}
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-bold text-purple-400 mb-3">Notification Templates (Symantec Style)</h4>
              {NOTIFICATION_TEMPLATES.map(t => (<label key={t.id} className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked={['block_notify','coach_user'].includes(t.id)} className="accent-purple-500" />{t.label}</label>))}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-amber-400 mb-2">User Coaching Message (Zscaler Style)</h4>
            <textarea defaultValue="This action was blocked by your organization DLP policy. The content contains sensitive data. Please remove it and try again." className="w-full h-20 bg-zinc-900 border border-zinc-600 rounded p-2 text-xs text-zinc-300" />
          </div>
        </div>
      )}
      {activeTab === 'classification' && (
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-400 mb-3">Data Classification Labels (Palo Alto Style)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CLASSIFICATION_LABELS.map(cl => (<div key={cl.id} className={`${cl.color} rounded-lg p-3 text-center cursor-pointer hover:opacity-80`}><div className="text-sm font-bold">{cl.label}</div><div className="text-xs mt-1 opacity-70">Click to assign</div></div>))}
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-cyan-400 mb-3">Fingerprinting & Exact Data Match (Symantec EDM)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-zinc-900 rounded p-3">
                <div className="text-xs text-zinc-400 mb-1">Document Fingerprinting</div>
                <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Structured fingerprinting</label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 mt-1"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Unstructured fingerprinting</label>
              </div>
              <div className="bg-zinc-900 rounded p-3">
                <div className="text-xs text-zinc-400 mb-1">Exact Data Match (EDM)</div>
                <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Customer database matching</label>
                <label className="flex items-center gap-2 text-xs text-zinc-300 mt-1"><input type="checkbox" className="accent-cyan-500" /> Employee records matching</label>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'incidents' && (
        <div className="space-y-4">
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-red-400 mb-3">Incident Workflow (Forcepoint + Palo Alto)</h4>
            {INCIDENT_WORKFLOWS.map(w => (<label key={w.id} className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="radio" name="workflow" defaultChecked={w.id === 'analyst_review'} className="accent-red-500" />{w.label}</label>))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs font-bold text-amber-400 mb-2">Auto-Escalation</div>
              <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" defaultChecked className="accent-amber-500" /> Escalate after 24h</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mt-1"><input type="checkbox" className="accent-amber-500" /> Critical to CISO</label>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs font-bold text-green-400 mb-2">Evidence Collection</div>
              <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" defaultChecked className="accent-green-500" /> Capture screenshot</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mt-1"><input type="checkbox" defaultChecked className="accent-green-500" /> Log full content</label>
            </div>
            <div className="bg-zinc-800 rounded-lg p-3">
              <div className="text-xs font-bold text-purple-400 mb-2">Reporting</div>
              <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" defaultChecked className="accent-purple-500" /> Daily summary email</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mt-1"><input type="checkbox" className="accent-purple-500" /> Real-time SIEM export</label>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-bold text-cyan-400 mb-3">Endpoint Integration (Forcepoint ONE)</h4>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Browser extension enforcement</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Clipboard monitoring</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" className="accent-cyan-500" /> Screen capture prevention</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" className="accent-cyan-500" /> USB/removable media block</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-cyan-500" /> Print monitoring</label>
            </div>
            <div className="bg-zinc-800 rounded-lg p-4">
              <h4 className="text-sm font-bold text-amber-400 mb-3">Cloud App Control (Zscaler CASB)</h4>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-amber-500" /> Shadow IT detection</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-amber-500" /> Unsanctioned app blocking</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" className="accent-amber-500" /> Tenant restrictions</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" defaultChecked className="accent-amber-500" /> GenAI prompt inspection</label>
              <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2"><input type="checkbox" className="accent-amber-500" /> File sandboxing</label>
            </div>
          </div>
          <div className="bg-zinc-800 rounded-lg p-4">
            <h4 className="text-sm font-bold text-green-400 mb-3">Custom Pattern (RegEx)</h4>
            <input type="text" placeholder="Enter custom regex pattern" className="w-full bg-zinc-900 border border-zinc-600 rounded px-3 py-2 text-xs text-zinc-300 font-mono" />
          </div>
        </div>
      )}
    </div>
  )
}
