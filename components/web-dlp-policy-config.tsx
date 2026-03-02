'use client'
import { useState } from 'react'

// Enterprise Policy Sets - Forcepoint/Zscaler/Palo Alto Grade
const DEFAULT_POLICY_SETS = [
  { id: 'ps-1', name: 'PCI-DSS Compliance', enabled: true, priority: 1, mode: 'block', description: 'Block all PCI data exfiltration across web channels', scope: { users: ['All'], departments: ['Finance'], locations: [], excludeUsers: ['VIP-Executives'], riskLevel: 'all', deviceTags: [] }, channels: ['web-form','cloud-upload','genai-prompt','webmail'], dataProfiles: ['credit_card','iban'], ruleEvaluation: 'most_restrictive', schedule: 'always', notificationTemplate: 'default-block', icapForward: false, userCoaching: false, incidentWorkflow: 'auto-ticket' },
  { id: 'ps-2', name: 'PII Protection - APAC', enabled: true, priority: 2, mode: 'block', description: 'Protect PII for APAC region (PDPO/PIPL)', scope: { users: ['All'], departments: [], locations: ['Hong Kong','Singapore','Japan'], excludeUsers: [], riskLevel: 'all', deviceTags: [] }, channels: ['web-form','social-media','genai-prompt','saas-collab'], dataProfiles: ['hkid','passport','phone_hk'], ruleEvaluation: 'first_match', schedule: 'always', notificationTemplate: 'default-block', icapForward: false, userCoaching: false, incidentWorkflow: 'auto-ticket' },
  { id: 'ps-3', name: 'Source Code & Secrets', enabled: true, priority: 3, mode: 'block', description: 'Prevent code and API secrets leakage to GenAI & cloud', scope: { users: ['All'], departments: ['R&D'], locations: [], excludeUsers: [], riskLevel: 'all', deviceTags: ['developer-laptop'] }, channels: ['genai-prompt','cloud-upload','web-form','saas-collab'], dataProfiles: ['api_keys','url_exfil','file_type'], ruleEvaluation: 'most_restrictive', schedule: 'always', notificationTemplate: 'security-team', icapForward: true, userCoaching: false, incidentWorkflow: 'auto-ticket' },
  { id: 'ps-4', name: 'GenAI Data Coaching', enabled: true, priority: 4, mode: 'coach', description: 'Just-in-time coaching before submitting sensitive data to AI', scope: { users: ['All'], departments: [], locations: [], excludeUsers: [], riskLevel: 'all', deviceTags: [] }, channels: ['genai-prompt'], dataProfiles: ['sensitive_keywords','email_addr'], ruleEvaluation: 'first_match', schedule: 'always', notificationTemplate: 'coaching-prompt', icapForward: false, userCoaching: true, incidentWorkflow: 'none' },
  { id: 'ps-5', name: 'High-Risk User Monitoring', enabled: true, priority: 5, mode: 'monitor', description: 'Enhanced monitoring for UEBA high-risk users', scope: { users: [], departments: [], locations: [], excludeUsers: [], riskLevel: 'high', deviceTags: [] }, channels: ['web-form','cloud-upload','genai-prompt','social-media','webmail','saas-collab','url-exfil'], dataProfiles: ['credit_card','hkid','passport','iban','api_keys','sensitive_keywords'], ruleEvaluation: 'most_restrictive', schedule: 'always', notificationTemplate: 'security-team', icapForward: true, userCoaching: false, incidentWorkflow: 'siem-forward' },
]

const NOTIF_TEMPLATES = [
  { id: 'default-block', name: 'Default Block', subject: 'DLP Violation: ${RULE_NAME}' },
  { id: 'security-team', name: 'Security Team Alert', subject: '[CRITICAL] Data Leak - ${CHANNEL}' },
  { id: 'coaching-prompt', name: 'User Coaching', subject: 'Sensitive Data Detected' },
  { id: 'manager-escalation', name: 'Manager Escalation', subject: 'DLP Review Required - ${USER}' },
]

const DATA_PROFILES_LIST = [
  { id: 'pci-high', name: 'PCI-DSS High Risk', type: 'predefined', patterns: ['credit_card','iban'], fileTypes: ['xlsx','csv','pdf'], matchLogic: 'AND' },
  { id: 'pii-apac', name: 'PII - APAC', type: 'predefined', patterns: ['hkid','passport','phone_hk'], fileTypes: ['all'], matchLogic: 'OR' },
  { id: 'secrets', name: 'Secrets & Code', type: 'custom', patterns: ['api_keys','url_exfil'], fileTypes: ['js','ts','py','env','yaml'], matchLogic: 'OR' },
  { id: 'genai-safe', name: 'GenAI Safety', type: 'custom', patterns: ['sensitive_keywords','email_addr','credit_card','hkid'], fileTypes: ['all'], matchLogic: 'OR' },
]

const CH_LABELS: Record<string,string> = { 'web-form':'Web Form','cloud-upload':'Cloud Storage','genai-prompt':'GenAI','social-media':'Social Media','saas-collab':'SaaS','webmail':'Webmail','url-exfil':'URL Exfil' }
const CH_ICONS: Record<string,string> = { 'web-form':'\ud83d\udcdd','cloud-upload':'\u2601\ufe0f','genai-prompt':'\ud83e\udd16','social-media':'\ud83d\udce2','saas-collab':'\ud83d\udcac','webmail':'\ud83d\udce7','url-exfil':'\ud83d\udd17' }
const MODE_COLORS: Record<string,string> = { block:'bg-red-900/40 text-red-300 border-red-700/50', quarantine:'bg-amber-900/40 text-amber-300 border-amber-700/50', monitor:'bg-blue-900/40 text-blue-300 border-blue-700/50', coach:'bg-purple-900/40 text-purple-300 border-purple-700/50' }
const WORKFLOW_LABELS: Record<string,string> = { 'auto-ticket':'Auto Ticket (ServiceNow/Jira)', 'siem-forward':'SIEM Forward (Webhook)', 'manager-approval':'Manager Approval', 'none':'None' }

export const POLICY_LABELS: Record<string,string> = { credit_card:'Credit Card Number', phone_hk:'Phone Number (HK/Intl)', hkid:'Hong Kong ID (HKID)', email_addr:'Email Address', iban:'IBAN / Bank Account', passport:'Passport Number', sensitive_keywords:'Sensitive Keywords', api_keys:'API Keys / Secrets', url_exfil:'URL Data Exfiltration', file_type:'Sensitive File Reference' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EnterprisePolicyConfig({ policy, setPolicy, resetPolicy }: any) {
  const [policySets] = useState(DEFAULT_POLICY_SETS)
  const [expandedPs, setExpandedPs] = useState<string|null>('ps-1')
  const [activeTab, setActiveTab] = useState<'policies'|'rules'|'profiles'|'notifications'>('policies')
  const ACTIONS = ['BLOCK','QUARANTINE','AUDIT']
  const SEVERITIES = ['critical','high','medium','low']
  const CONFIDENCES = ['high','medium','low']
  const DIRECTIONS = ['outbound','inbound','both']
  const SCHEDULES = ['always','business_hours','off_hours','custom']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updatePolicy(key: string, field: string, value: any) { setPolicy((prev: any) => ({...prev, [key]: {...prev[key], [field]: value}})) }
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-4 mb-6">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-base">Enterprise Web DLP Policy Configuration</h3>
        <div className="flex gap-2 items-center">
          <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">Forcepoint + Zscaler + Palo Alto Grade</span>
          <button onClick={resetPolicy} className="text-xs text-cyan-400 hover:text-cyan-300">Reset to Default</button>
        </div>
      </div>
      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 border-b border-zinc-800 pb-2">
        {(['policies','rules','profiles','notifications'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-t text-xs font-medium transition-colors ${activeTab === tab ? 'bg-cyan-900/50 text-cyan-300 border-b-2 border-cyan-400' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {tab === 'policies' ? '\ud83d\udee1\ufe0f Policy Sets' : tab === 'rules' ? '\ud83d\udccb Detection Rules' : tab === 'profiles' ? '\ud83d\uddc2\ufe0f Data Profiles' : '\ud83d\udd14 Notifications'}
          </button>
        ))}
      </div>
      {/* ====== TAB 1: POLICY SETS ====== */}
      {activeTab === 'policies' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-400">Policy evaluation: Rules evaluated by priority order. Action from highest-priority match applies.</span>
            <select className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">
              <option value="most_restrictive">Most Restrictive Action Wins</option>
              <option value="first_match">First Match Stops</option>
            </select>
          </div>
          {policySets.map(ps => (
            <div key={ps.id} className={`border rounded-lg ${ps.enabled ? 'border-zinc-700' : 'border-zinc-800 opacity-60'} bg-zinc-800/30`}>
              <div className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-zinc-800/50" onClick={() => setExpandedPs(expandedPs === ps.id ? null : ps.id)}>
                <span className="text-zinc-600 cursor-grab">\u2630</span>
                <span className="text-[10px] text-zinc-500 font-mono w-4">#{ps.priority}</span>
                <input type="checkbox" checked={ps.enabled} readOnly className="accent-cyan-500" />
                <span className="text-xs">{expandedPs === ps.id ? '\u25bc' : '\u25b6'}</span>
                <span className="text-sm font-medium text-zinc-200 flex-1">{ps.name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${MODE_COLORS[ps.mode]}`}>{ps.mode.toUpperCase()}</span>
                <span className="text-[10px] text-zinc-500">{ps.channels.length} channels</span>
              </div>
              {expandedPs === ps.id && (
                <div className="px-3 pb-3 space-y-2 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 italic pt-2">{ps.description}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Scope */}
                    <div className="bg-zinc-900/50 rounded p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Scope (Users / Departments / Locations)</div>
                      <div className="flex flex-wrap gap-1">
                        {ps.scope.users.map(u => <span key={u} className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">{u}</span>)}
                        {ps.scope.departments.filter(Boolean).map(d => <span key={d} className="text-[10px] bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded">{d}</span>)}
                        {ps.scope.locations.map(l => <span key={l} className="text-[10px] bg-amber-900/40 text-amber-300 px-1.5 py-0.5 rounded">{l}</span>)}
                        {ps.scope.deviceTags.map(t => <span key={t} className="text-[10px] bg-purple-900/40 text-purple-300 px-1.5 py-0.5 rounded">\ud83d\udda5 {t}</span>)}
                        {ps.scope.riskLevel !== 'all' && <span className="text-[10px] bg-orange-900/40 text-orange-300 px-1.5 py-0.5 rounded border border-orange-700/50">Risk: {ps.scope.riskLevel}</span>}
                      </div>
                      {ps.scope.excludeUsers.length > 0 && <div className="mt-1"><span className="text-[10px] text-red-400">Exclude: </span>{ps.scope.excludeUsers.map(u => <span key={u} className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded ml-1">{u}</span>)}</div>}
                    </div>
                    {/* Channels + Profiles */}
                    <div className="bg-zinc-900/50 rounded p-2">
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-semibold">Channels & Data Profiles</div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {ps.channels.map(ch => <span key={ch} className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">{CH_ICONS[ch]} {CH_LABELS[ch]}</span>)}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {ps.dataProfiles.map(dp => <span key={dp} className="text-[10px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">{POLICY_LABELS[dp] || dp}</span>)}
                      </div>
                    </div>
                  </div>
                  {/* Action & Workflow Row */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    <div><div className="text-[10px] text-zinc-500 mb-1">Action</div><select className="w-full bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white" defaultValue={ps.mode}><option value="block">Block</option><option value="quarantine">Quarantine</option><option value="monitor">Monitor/Audit</option><option value="coach">Coach (Just-in-Time)</option></select></div>
                    <div><div className="text-[10px] text-zinc-500 mb-1">Schedule</div><select className="w-full bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white" defaultValue={ps.schedule}><option value="always">Always</option><option value="business_hours">Business Hours</option><option value="off_hours">Off Hours</option><option value="custom">Custom</option></select></div>
                    <div><div className="text-[10px] text-zinc-500 mb-1">Notification</div><select className="w-full bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white" defaultValue={ps.notificationTemplate}>{NOTIF_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
                    <div><div className="text-[10px] text-zinc-500 mb-1">Incident Workflow</div><select className="w-full bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white" defaultValue={ps.incidentWorkflow}>{Object.entries(WORKFLOW_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                    <div className="flex flex-col gap-1"><div className="text-[10px] text-zinc-500 mb-1">Options</div><label className="flex items-center gap-1 text-[10px] text-zinc-400"><input type="checkbox" checked={ps.icapForward} readOnly className="accent-cyan-500" /> ICAP Forward</label><label className="flex items-center gap-1 text-[10px] text-zinc-400"><input type="checkbox" checked={ps.userCoaching} readOnly className="accent-cyan-500" /> User Coaching</label></div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button className="w-full border border-dashed border-zinc-700 rounded-lg py-2 text-xs text-zinc-500 hover:text-cyan-400 hover:border-cyan-700 transition-colors">+ Add Policy Set</button>
        </div>
      )}
      {/* ====== TAB 2: DETECTION RULES (Enhanced existing table) ====== */}
      {activeTab === 'rules' && (
        <div className="overflow-x-auto">
          <div className="text-xs text-zinc-500 mb-2">Per-rule detection settings. Attach rules to Policy Sets above for enterprise-grade enforcement.</div>
          <table className="w-full text-sm min-w-[900px]">
            <thead><tr className="text-zinc-500 text-xs"><th className="text-left py-1">Enabled</th><th className="text-left">Rule</th><th className="text-left">Action</th><th className="text-left">Severity</th><th className="text-left">Count</th><th className="text-left">Confidence</th><th className="text-left">Proximity</th><th className="text-left">Direction</th><th className="text-left">Schedule</th><th className="text-left">Notify</th><th className="text-left">Log</th></tr></thead>
            <tbody>
              {(Object.keys(policy) as string[]).map(key => (
                <tr key={key} className="border-t border-zinc-800">
                  <td className="py-1"><input type="checkbox" checked={policy[key].enabled} onChange={e => updatePolicy(key, 'enabled', e.target.checked)} className="accent-cyan-500" /></td>
                  <td className="text-zinc-300 text-xs">{POLICY_LABELS[key]}</td>
                  <td><select value={policy[key].action} onChange={e => updatePolicy(key, 'action', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">{ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                  <td><select value={policy[key].severity} onChange={e => updatePolicy(key, 'severity', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td><input type="number" min={1} max={100} value={policy[key].matchCount} onChange={e => updatePolicy(key, 'matchCount', parseInt(e.target.value) || 1)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white w-12" /></td>
                  <td><select value={policy[key].confidence} onChange={e => updatePolicy(key, 'confidence', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{CONFIDENCES.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
                  <td><input type="number" min={0} max={1000} step={50} value={policy[key].proximity} onChange={e => updatePolicy(key, 'proximity', parseInt(e.target.value) || 0)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white w-14" /></td>
                  <td><select value={policy[key].direction} onChange={e => updatePolicy(key, 'direction', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}</select></td>
                  <td><select value={policy[key].schedule} onChange={e => updatePolicy(key, 'schedule', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-1 py-1 text-xs text-white">{SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="text-center"><input type="checkbox" checked={policy[key].notifyAdmin} onChange={e => updatePolicy(key, 'notifyAdmin', e.target.checked)} className="accent-cyan-500" /></td>
                  <td className="text-center"><input type="checkbox" checked={policy[key].logContent} onChange={e => updatePolicy(key, 'logContent', e.target.checked)} className="accent-cyan-500" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* ====== TAB 3: DATA PROFILES (Palo Alto Granular style) ====== */}
      {activeTab === 'profiles' && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 mb-2">Granular Data Profiles group detection patterns with file type filters. Attach profiles to Policy Sets for differentiated enforcement.</div>
          {DATA_PROFILES_LIST.map(dp => (
            <div key={dp.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-zinc-200">{dp.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${dp.type === 'predefined' ? 'bg-green-900/40 text-green-400 border border-green-800/50' : 'bg-blue-900/40 text-blue-400 border border-blue-800/50'}`}>{dp.type}</span>
                  <span className="text-[10px] bg-zinc-700 text-zinc-400 px-1.5 py-0.5 rounded">Logic: {dp.matchLogic}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Detection Patterns</div>
                  <div className="flex flex-wrap gap-1">{dp.patterns.map(p => <span key={p} className="text-[10px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded">{POLICY_LABELS[p] || p}</span>)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">File Types (Include)</div>
                  <div className="flex flex-wrap gap-1">{dp.fileTypes.map(f => <span key={f} className="text-[10px] bg-zinc-700 text-zinc-300 px-1.5 py-0.5 rounded">.{f}</span>)}</div>
                </div>
              </div>
            </div>
          ))}
          <button className="w-full border border-dashed border-zinc-700 rounded-lg py-2 text-xs text-zinc-500 hover:text-cyan-400 hover:border-cyan-700 transition-colors">+ Create Custom Data Profile</button>
        </div>
      )}
      {/* ====== TAB 4: NOTIFICATION TEMPLATES (Zscaler ZIA style) ====== */}
      {activeTab === 'notifications' && (
        <div className="space-y-3">
          <div className="text-xs text-zinc-500 mb-2">Reusable notification templates for DLP violations. Supports TLS, content attachment, and variable substitution.</div>
          {NOTIF_TEMPLATES.map(t => (
            <div key={t.id} className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-200">{t.name}</span>
                <span className="text-[10px] text-zinc-500">ID: {t.id}</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">Subject: <span className="text-cyan-400 font-mono">{t.subject}</span></div>
            </div>
          ))}
          {/* Incident Workflow Summary */}
          <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-lg p-3 mt-4">
            <div className="text-sm font-medium text-zinc-200 mb-2">Incident Response Workflows</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-zinc-900/50 rounded p-2"><span className="text-cyan-400">Auto Ticket</span><span className="text-zinc-500"> - ServiceNow / Jira via Webhook</span></div>
              <div className="bg-zinc-900/50 rounded p-2"><span className="text-cyan-400">SIEM Forward</span><span className="text-zinc-500"> - Splunk / QRadar / Sentinel</span></div>
              <div className="bg-zinc-900/50 rounded p-2"><span className="text-cyan-400">Manager Approval</span><span className="text-zinc-500"> - Require justification before release</span></div>
              <div className="bg-zinc-900/50 rounded p-2"><span className="text-cyan-400">ICAP Forward</span><span className="text-zinc-500"> - 3rd-party DLP integration (Symantec/Trellix)</span></div>
            </div>
          </div>
          <button className="w-full border border-dashed border-zinc-700 rounded-lg py-2 text-xs text-zinc-500 hover:text-cyan-400 hover:border-cyan-700 transition-colors">+ Add Notification Template</button>
        </div>
      )}
    </div>
  )
}
