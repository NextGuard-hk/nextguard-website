'use client'
import { useState } from 'react'

interface EnterpriseSettingsProps {
  direction: string
  setDirection: (v: any) => void
  senderDomains: string
  setSenderDomains: (v: string) => void
  senderDomainMode: string
  setSenderDomainMode: (v: any) => void
  recipientDomains: string
  setRecipientDomains: (v: string) => void
  recipientDomainMode: string
  setRecipientDomainMode: (v: any) => void
  matchThreshold: number
  setMatchThreshold: (v: number) => void
  messageSizeThreshold: number
  setMessageSizeThreshold: (v: number) => void
  maxAttachments: number
  setMaxAttachments: (v: number) => void
  blockedFileTypes: string
  setBlockedFileTypes: (v: string) => void
  maxAttachmentSize: number
  setMaxAttachmentSize: (v: number) => void
  notifySender: boolean
  setNotifySender: (v: boolean) => void
  notifyAdmin: boolean
  setNotifyAdmin: (v: boolean) => void
  notifyManager: boolean
  setNotifyManager: (v: boolean) => void
  adminEmail: string
  setAdminEmail: (v: string) => void
  userNotificationMsg: string
  setUserNotificationMsg: (v: string) => void
  encryptOnRelease: boolean
  setEncryptOnRelease: (v: boolean) => void
  evaluationMode: string
  setEvaluationMode: (v: any) => void
  quarantineReviewRequired: boolean
  setQuarantineReviewRequired: (v: boolean) => void
  logLevel: string
  setLogLevel: (v: any) => void
  severity: string
  action: string
  // New props for Proofpoint/FortiMail/CheckPoint
  protectionMode: string
  setProtectionMode: (v: any) => void
  misdirectedEmailDetection: boolean
  setMisdirectedEmailDetection: (v: boolean) => void
  smartIdentifiers: boolean
  setSmartIdentifiers: (v: boolean) => void
  policyScope: string
  setPolicyScope: (v: any) => void
  scopeUsers: string
  setScopeUsers: (v: string) => void
  encryptionMode: string
  setEncryptionMode: (v: any) => void
  conditionMatch: string
  setConditionMatch: (v: any) => void
  dlpExceptions: string
  setDlpExceptions: (v: string) => void
  documentFingerprinting: boolean
  setDocumentFingerprinting: (v: boolean) => void
  fingerprintMatchPercent: number
  setFingerprintMatchPercent: (v: number) => void
  fingerprintSensitivity: string
  setFingerprintSensitivity: (v: any) => void
  contentActionOnMatch: string
  setContentActionOnMatch: (v: any) => void
  sensitivityLevel: string
  setSensitivityLevel: (v: any) => void
  sensitivityLabels: boolean
  setSensitivityLabels: (v: boolean) => void
  subjectRegex: string
  setSubjectRegex: (v: string) => void
  subjectRegexEnabled: boolean
  setSubjectRegexEnabled: (v: boolean) => void
  notifyRecipient: boolean
  setNotifyRecipient: (v: boolean) => void
  customSensitivityHitCount: number
  setCustomSensitivityHitCount: (v: number) => void
}

export default function EnterpriseSettings(props: EnterpriseSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general'|'sender-recipient'|'attachment'|'action'|'notification'|'advanced'>('general')
  const p = props
  const tabs = [
    { id: 'general', label: 'General', icon: '⚙' },
    { id: 'sender-recipient', label: 'Sender & Recipient', icon: '✉' },
    { id: 'attachment', label: 'Attachment Rules', icon: '📎' },
    { id: 'action', label: 'Action & Response', icon: '⚡' },
    { id: 'notification', label: 'Notification', icon: '🔔' },
    { id: 'advanced', label: 'Advanced', icon: '🔒' },
  ] as const

  return (
    <div className="mt-4 border border-zinc-700 rounded-lg p-3 sm:p-4 bg-zinc-900/50">
      <h3 className="text-sm font-bold text-cyan-400 mb-3">Enterprise DLP Configuration</h3>
      <div className="flex flex-wrap gap-1 mb-3 border-b border-zinc-700 pb-2">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-2 py-1.5 text-xs rounded-t font-medium transition-colors ${activeTab === tab.id ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* General Tab - Enhanced with Proofpoint/CheckPoint/FortiMail */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Email Direction (Forcepoint / Proofpoint-style)</label>
            <div className="flex flex-wrap gap-1">
              {['outbound','inbound','both'].map(d => (
                <button key={d} onClick={() => p.setDirection(d)} className={`px-3 py-1 text-xs rounded ${p.direction === d ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Protection Mode (CheckPoint Harmony-style)</label>
            <div className="flex flex-wrap gap-1">
              {['monitor-only','prevent-inline','warn-proceed'].map(m => (
                <button key={m} onClick={() => p.setProtectionMode(m)} className={`px-3 py-1 text-xs rounded ${p.protectionMode === m ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {m === 'monitor-only' ? 'Monitor Only' : m === 'prevent-inline' ? 'Prevent (Inline)' : 'Warn & Proceed'}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-1">Monitor: log only. Prevent: block emails. Warn: prompt user before sending.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Rule Evaluation Mode (Zscaler / FortiMail-style)</label>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => p.setEvaluationMode('first-match')} className={`px-3 py-1 text-xs rounded ${p.evaluationMode === 'first-match' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>First Match (Rule Order)</button>
              <button onClick={() => p.setEvaluationMode('most-restrictive')} className={`px-3 py-1 text-xs rounded ${p.evaluationMode === 'most-restrictive' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Most Restrictive</button>
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">DLP Condition Logic (FortiMail-style)</label>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => p.setConditionMatch('all')} className={`px-3 py-1 text-xs rounded ${p.conditionMatch === 'all' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Match ALL Conditions</button>
              <button onClick={() => p.setConditionMatch('any')} className={`px-3 py-1 text-xs rounded ${p.conditionMatch === 'any' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Match ANY Condition</button>
            </div>
            <p className="text-xs text-zinc-600 mt-1">FortiMail: single rule can have multiple conditions with all/any logic.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Policy Scope (Proofpoint / CheckPoint Harmony-style)</label>
            <div className="flex flex-wrap gap-1">
              {['company-wide','group','specific-users'].map(s => (
                <button key={s} onClick={() => p.setPolicyScope(s)} className={`px-3 py-1 text-xs rounded ${p.policyScope === s ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {s === 'company-wide' ? 'Company-Wide' : s === 'group' ? 'Group' : 'Specific Users'}
                </button>
              ))}
            </div>
            {p.policyScope === 'specific-users' && (
              <input value={p.scopeUsers} onChange={e => p.setScopeUsers(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs mt-1" placeholder="user1@company.com, group:engineering (comma-separated)" />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Match Threshold</label>
              <input type="number" min={1} max={100} value={p.matchThreshold} onChange={e => p.setMatchThreshold(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Message Size (MB)</label>
              <input type="number" min={1} max={100} value={p.messageSizeThreshold} onChange={e => p.setMessageSizeThreshold(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Logging Detail Level</label>
            <div className="flex flex-wrap gap-1">
              {['basic','detailed','full-capture'].map(l => (
                <button key={l} onClick={() => p.setLogLevel(l)} className={`px-3 py-1 text-xs rounded ${p.logLevel === l ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{l.charAt(0).toUpperCase()+l.slice(1)}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sender & Recipient Tab */}
      {activeTab === 'sender-recipient' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-bold">Sender Domain Filter (Palo Alto / McAfee-style)</label>
            <div className="flex gap-1 mb-1">
              <button onClick={() => p.setSenderDomainMode('include')} className={`px-2 py-1 text-xs rounded ${p.senderDomainMode === 'include' ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Include Only</button>
              <button onClick={() => p.setSenderDomainMode('exclude')} className={`px-2 py-1 text-xs rounded ${p.senderDomainMode === 'exclude' ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Exclude</button>
            </div>
            <input value={p.senderDomains} onChange={e => p.setSenderDomains(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="e.g. nextguard.com, partner.com (comma-separated)" />
            <p className="text-xs text-zinc-600 mt-1">{p.senderDomainMode === 'include' ? 'Only scan emails FROM these domains' : 'Skip scanning emails FROM these domains'}</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-bold">Recipient Domain Filter (Zscaler / Symantec-style)</label>
            <div className="flex gap-1 mb-1">
              <button onClick={() => p.setRecipientDomainMode('include')} className={`px-2 py-1 text-xs rounded ${p.recipientDomainMode === 'include' ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Include Only</button>
              <button onClick={() => p.setRecipientDomainMode('exclude')} className={`px-2 py-1 text-xs rounded ${p.recipientDomainMode === 'exclude' ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Exclude (Allowlist)</button>
            </div>
            <input value={p.recipientDomains} onChange={e => p.setRecipientDomains(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="e.g. gmail.com, yahoo.com, hotmail.com" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1 font-bold">DLP Exceptions (FortiMail-style)</label>
            <textarea value={p.dlpExceptions} onChange={e => p.setDlpExceptions(e.target.value)} rows={2} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono" placeholder="ceo@company.com, vip@partner.com (emails matching exceptions skip DLP scan)" />
            <p className="text-xs text-zinc-600 mt-1">FortiMail: emails matching exceptions will not be scanned by DLP rules.</p>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">Tip: Proofpoint and CheckPoint Harmony allow per-user/group DLP scope. Use Policy Scope in General tab to target specific users. FortiMail supports exception lists for VIP bypasses.</p>
          </div>
        </div>
      )}

      {/* Attachment Rules Tab - Enhanced with FortiMail fingerprinting */}
      {activeTab === 'attachment' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Max Attachments (Forcepoint)</label>
              <input type="number" min={1} max={100} value={p.maxAttachments} onChange={e => p.setMaxAttachments(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Max Size (MB)</label>
              <input type="number" min={1} max={500} value={p.maxAttachmentSize} onChange={e => p.setMaxAttachmentSize(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Blocked File Extensions (Symantec / McAfee)</label>
            <input value={p.blockedFileTypes} onChange={e => p.setBlockedFileTypes(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono" placeholder=".exe,.bat,.cmd,.ps1" />
            <p className="text-xs text-zinc-600 mt-1">Common: .exe, .bat, .cmd, .ps1, .vbs, .js, .scr, .dll, .msi, .hta, .wsf</p>
          </div>
          <div className="border border-zinc-700 rounded p-3">
            <label className="text-xs text-cyan-400 block mb-2 font-bold">Document Fingerprinting (FortiMail IDM / Fortinet-style)</label>
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={p.documentFingerprinting} onChange={() => p.setDocumentFingerprinting(!p.documentFingerprinting)} />
              <span className="text-xs text-zinc-300">Enable Document Fingerprint Matching (IDM)</span>
            </div>
            {p.documentFingerprinting && (
              <div className="space-y-2 pl-4 border-l border-zinc-700">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Fingerprint Match % (FortiGate/FortiMail)</label>
                  <input type="number" min={1} max={100} value={p.fingerprintMatchPercent} onChange={e => p.setFingerprintMatchPercent(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
                  <span className="text-xs text-zinc-500 ml-2">% checksum match required</span>
                </div>
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Fingerprint Sensitivity</label>
                  <div className="flex gap-1">
                    {['Critical','Private','Warning'].map(s => (
                      <button key={s} onClick={() => p.setFingerprintSensitivity(s)} className={`px-2 py-1 text-xs rounded ${p.fingerprintSensitivity === s ? (s==='Critical'?'bg-red-600':s==='Private'?'bg-orange-600':'bg-yellow-600 text-black')+' text-white' : 'bg-zinc-800 text-zinc-400'}`}>{s}</button>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-zinc-600">FortiMail generates checksums for uploaded documents and compares against email attachments.</p>
              </div>
            )}
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Content Action on Match (FortiMail)</label>
            <div className="flex flex-wrap gap-1">
              {['default','strip-attachment','relay-alternate-host','reject','archive'].map(a => (
                <button key={a} onClick={() => p.setContentActionOnMatch(a)} className={`px-2 py-1 text-xs rounded ${p.contentActionOnMatch === a ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {a === 'strip-attachment' ? 'Strip Attachment' : a === 'relay-alternate-host' ? 'Relay to Alt Host' : a.charAt(0).toUpperCase()+a.slice(1)}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-1">FortiMail: content profile actions applied when DLP rule matches attachment.</p>
          </div>
        </div>
      )}

      {/* Action & Response Tab - Enhanced with Proofpoint/CheckPoint */}
      {activeTab === 'action' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Primary Action (Forcepoint / Proofpoint / Symantec)</label>
            <div className="flex flex-wrap gap-1">
              {['Monitor','Warn','Block','Quarantine','Drop Attachments','Encrypt'].map(a => (
                <button key={a} onClick={() => {}} className={`px-2 py-1 text-xs rounded ${p.action === a ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{a}</button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-1">Proofpoint: Block + Notify | Encrypt + Log | Allow + Monitor recommended combos.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Severity Override</label>
            <div className="flex flex-wrap gap-1">
              {['Low','Medium','High','Critical'].map(s => (
                <button key={s} onClick={() => {}} className={`px-2 py-1 text-xs rounded ${p.severity === s ? (s==='Critical'?'bg-red-600':s==='High'?'bg-orange-600':s==='Medium'?'bg-yellow-600 text-black':'bg-blue-600') + ' text-white' : 'bg-zinc-800 text-zinc-400'}`}>{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Encryption Mode (Proofpoint-style)</label>
            <div className="flex flex-wrap gap-1">
              {['none','policy-based','portal-pickup','tls-enforced','s-mime'].map(e => (
                <button key={e} onClick={() => p.setEncryptionMode(e)} className={`px-2 py-1 text-xs rounded ${p.encryptionMode === e ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {e === 'policy-based' ? 'Policy-Based' : e === 'portal-pickup' ? 'Portal Pickup' : e === 'tls-enforced' ? 'TLS Enforced' : e === 's-mime' ? 'S/MIME' : 'None'}
                </button>
              ))}
            </div>
            <p className="text-xs text-zinc-600 mt-1">Proofpoint: Policy-Based Encryption auto-encrypts when DLP triggers. Portal Pickup sends secure notification to recipient.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">DLP Sensitivity Level (CheckPoint Harmony)</label>
            <div className="flex flex-wrap gap-1">
              {['very-high','high','medium','low','very-low','custom'].map(l => (
                <button key={l} onClick={() => p.setSensitivityLevel(l)} className={`px-2 py-1 text-xs rounded ${p.sensitivityLevel === l ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>
                  {l === 'very-high' ? 'Very High (>0)' : l === 'high' ? 'High (>2)' : l === 'medium' ? 'Medium (>5)' : l === 'low' ? 'Low (>10)' : l === 'very-low' ? 'Very Low (>20)' : 'Custom'}
                </button>
              ))}
            </div>
            {p.sensitivityLevel === 'custom' && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-zinc-400">Custom hit count &gt;</span>
                <input type="number" min={0} max={1000} value={p.customSensitivityHitCount} onChange={e => p.setCustomSensitivityHitCount(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
              </div>
            )}
            <p className="text-xs text-zinc-600 mt-1">CheckPoint: minimum data type match count required to trigger DLP workflow.</p>
          </div>
          <div className="border border-zinc-700 rounded p-3">
            <label className="text-xs text-zinc-400 block mb-2 font-bold">Quarantine Settings (Symantec / Forcepoint)</label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-1">
              <input type="checkbox" checked={p.quarantineReviewRequired} onChange={() => p.setQuarantineReviewRequired(!p.quarantineReviewRequired)} /> Require manual review before release
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={p.encryptOnRelease} onChange={() => p.setEncryptOnRelease(!p.encryptOnRelease)} /> Encrypt message on release from quarantine
            </label>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">Action hierarchy (most to least restrictive): Block &gt; Quarantine &gt; Drop Attachments &gt; Encrypt &gt; Warn &gt; Monitor</p>
          </div>
        </div>
      )}

      {/* Notification Tab - Enhanced with Proofpoint/CheckPoint */}
      {activeTab === 'notification' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-2 font-bold">Notification Recipients (Zscaler / Proofpoint / CheckPoint)</label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-1">
              <input type="checkbox" checked={p.notifySender} onChange={() => p.setNotifySender(!p.notifySender)} /> Notify Email Sender
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-1">
              <input type="checkbox" checked={p.notifyRecipient} onChange={() => p.setNotifyRecipient(!p.notifyRecipient)} /> Notify Email Recipient (Proofpoint secure notification)
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-1">
              <input type="checkbox" checked={p.notifyAdmin} onChange={() => p.setNotifyAdmin(!p.notifyAdmin)} /> Notify DLP Administrator
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={p.notifyManager} onChange={() => p.setNotifyManager(!p.notifyManager)} /> Notify Sender's Manager (escalation)
            </label>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Admin Notification Email</label>
            <input value={p.adminEmail} onChange={e => p.setAdminEmail(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="dlp-admin@company.com" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">User Notification Message (shown when email is blocked)</label>
            <textarea value={p.userNotificationMsg} onChange={e => p.setUserNotificationMsg(e.target.value)} rows={3} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" />
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">Proofpoint Adaptive DLP: contextual warnings empower users to correct mistakes. CheckPoint Harmony: separate notification settings for inbound/outbound. Template variables: {'{'}sender{'}'}, {'{'}recipient{'}'}, {'{'}policy_name{'}'}, {'{'}severity{'}'}, {'{'}action{'}'}, {'{'}timestamp{'}'}</p>
          </div>
        </div>
      )}

      {/* Advanced Tab - Proofpoint Adaptive / CheckPoint Labels / FortiMail */}
      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="border border-cyan-800/50 rounded p-3 bg-cyan-950/20">
            <label className="text-xs text-cyan-400 block mb-2 font-bold">Proofpoint Adaptive Email DLP</label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2">
              <input type="checkbox" checked={p.misdirectedEmailDetection} onChange={() => p.setMisdirectedEmailDetection(!p.misdirectedEmailDetection)} /> Misdirected Email Detection (Behavioral AI)
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2">
              <input type="checkbox" checked={p.smartIdentifiers} onChange={() => p.setSmartIdentifiers(!p.smartIdentifiers)} /> Smart Identifiers (Relationship Graph Analysis)
            </label>
            <p className="text-xs text-zinc-600">Proofpoint Adaptive DLP uses ML to analyze normal email behavior patterns, flag wrong recipients, detect unauthorized data sharing, and prompt users before sending. Goes beyond rule-based DLP.</p>
          </div>
          <div className="border border-purple-800/50 rounded p-3 bg-purple-950/20">
            <label className="text-xs text-purple-400 block mb-2 font-bold">CheckPoint Harmony Sensitivity Labels</label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2">
              <input type="checkbox" checked={p.sensitivityLabels} onChange={() => p.setSensitivityLabels(!p.sensitivityLabels)} /> Enable Sensitivity Label-Based DLP Rules
            </label>
            {p.sensitivityLabels && (
              <div className="space-y-1 pl-4 border-l border-purple-800/50">
                <p className="text-xs text-zinc-400">Label-to-action mapping (CheckPoint Harmony):</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-400 w-32">Highly Confidential</span>
                  <span className="text-zinc-500">→ Quarantine for review</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-orange-400 w-32">Confidential</span>
                  <span className="text-zinc-500">→ Block external sharing</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-yellow-400 w-32">Internal Only</span>
                  <span className="text-zinc-500">→ Alert on external recipients</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-400 w-32">Public</span>
                  <span className="text-zinc-500">→ Allow (no action)</span>
                </div>
              </div>
            )}
          </div>
          <div className="border border-zinc-700 rounded p-3">
            <label className="text-xs text-zinc-400 block mb-2 font-bold">Subject Regex Matching (CheckPoint Harmony)</label>
            <label className="flex items-center gap-2 text-xs text-zinc-300 mb-2">
              <input type="checkbox" checked={p.subjectRegexEnabled} onChange={() => p.setSubjectRegexEnabled(!p.subjectRegexEnabled)} /> Enable matching based on subject regular expression
            </label>
            {p.subjectRegexEnabled && (
              <div>
                <input value={p.subjectRegex} onChange={e => p.setSubjectRegex(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono" placeholder="(?i)(confidential|secret|internal.only|restricted)" />
                <p className="text-xs text-zinc-600 mt-1">CheckPoint: match email subjects against regex patterns as additional DLP criteria.</p>
              </div>
            )}
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500 mb-1">Vendor Feature Reference:</p>
            <p className="text-xs text-zinc-600">Proofpoint: Adaptive behavioral AI, misdirected email detection, relationship graph, smart identifiers</p>
            <p className="text-xs text-zinc-600">FortiMail: Document fingerprinting (IDM), match-all/any conditions, content action profiles, exception lists</p>
            <p className="text-xs text-zinc-600">CheckPoint Harmony: Sensitivity labels, 6-level sensitivity (Very High to Custom), subject regex, per-category tuning</p>
            <p className="text-xs text-zinc-600">Forcepoint: Direction control, sender/recipient filtering, quarantine review</p>
            <p className="text-xs text-zinc-600">Symantec: Blocked file types, content action hierarchy, encryption on release</p>
            <p className="text-xs text-zinc-600">Zscaler: First-match/most-restrictive evaluation, recipient allowlists</p>
            <p className="text-xs text-zinc-600">McAfee: Sender domain include/exclude, blocked extensions, policy scope</p>
          </div>
        </div>
      )}

      {/* Active Config Summary */}
      <div className="mt-4 pt-3 border-t border-zinc-700">
        <p className="text-xs text-zinc-500">Active Config: <span className="text-zinc-300">{p.direction.toUpperCase()}</span> | Mode: <span className="text-zinc-300">{p.protectionMode}</span> | Eval: <span className="text-zinc-300">{p.evaluationMode}</span> | Threshold: <span className="text-zinc-300">{p.matchThreshold} match(es)</span> | Sensitivity: <span className="text-zinc-300">{p.sensitivityLevel}</span> | Log: <span className="text-zinc-300">{p.logLevel}</span></p>
      </div>
    </div>
  )
}
