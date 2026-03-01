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
}

export default function EnterpriseSettings(props: EnterpriseSettingsProps) {
  const [activeTab, setActiveTab] = useState<'general'|'sender-recipient'|'attachment'|'action'|'notification'>('general')
  const p = props

  const tabs = [
    { id: 'general', label: 'General', icon: '\u2699' },
    { id: 'sender-recipient', label: 'Sender & Recipient', icon: '\u2709' },
    { id: 'attachment', label: 'Attachment Rules', icon: '\uD83D\uDCCE' },
    { id: 'action', label: 'Action & Response', icon: '\u26A1' },
    { id: 'notification', label: 'Notification', icon: '\uD83D\uDD14' },
  ] as const

  return (
    <div className="bg-zinc-900/80 border border-zinc-700 rounded-lg p-3 sm:p-4 mb-4">
      <h3 className="text-sm font-bold text-cyan-400 mb-3">Enterprise DLP Configuration</h3>
      <div className="flex flex-wrap gap-1 mb-4 border-b border-zinc-700 pb-3">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`px-2 py-1.5 text-xs rounded-t font-medium transition-colors ${activeTab === tab.id ? 'bg-cyan-600/20 text-cyan-400 border-b-2 border-cyan-500' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'}`}>
            <span className="mr-1">{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Email Direction (Forcepoint-style Inbound/Outbound)</label>
            <div className="flex gap-1">
              {['outbound','inbound','both'].map(d => (
                <button key={d} onClick={() => p.setDirection(d)} className={`px-3 py-1 text-xs rounded ${p.direction === d ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{d.charAt(0).toUpperCase()+d.slice(1)}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Rule Evaluation Mode (Zscaler-style)</label>
            <div className="flex gap-1">
              <button onClick={() => p.setEvaluationMode('first-match')} className={`px-3 py-1 text-xs rounded ${p.evaluationMode === 'first-match' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>First Match (Rule Order)</button>
              <button onClick={() => p.setEvaluationMode('most-restrictive')} className={`px-3 py-1 text-xs rounded ${p.evaluationMode === 'most-restrictive' ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Most Restrictive</button>
            </div>
            <p className="text-xs text-zinc-500 mt-1">First Match: stops at first rule hit. Most Restrictive: evaluates all rules, enforces strictest action.</p>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Match Threshold (min violations to trigger policy)</label>
            <input type="number" min={1} max={100} value={p.matchThreshold} onChange={e => p.setMatchThreshold(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-500 ml-2">Minimum number of pattern matches required to trigger the policy</span>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Message Size Threshold (MB)</label>
            <input type="number" min={1} max={100} value={p.messageSizeThreshold} onChange={e => p.setMessageSizeThreshold(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-500 ml-2">Only scan messages above this size</span>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Logging Detail Level</label>
            <div className="flex gap-1">
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
          <div className="border border-zinc-700 rounded p-3">
            <label className="text-xs font-bold text-zinc-300 block mb-2">Sender Domain Filter (Palo Alto / McAfee-style)</label>
            <div className="flex gap-1 mb-2">
              <button onClick={() => p.setSenderDomainMode('include')} className={`px-2 py-1 text-xs rounded ${p.senderDomainMode === 'include' ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Include Only</button>
              <button onClick={() => p.setSenderDomainMode('exclude')} className={`px-2 py-1 text-xs rounded ${p.senderDomainMode === 'exclude' ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Exclude</button>
            </div>
            <input value={p.senderDomains} onChange={e => p.setSenderDomains(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="e.g. nextguard.com, partner.com (comma-separated)" />
            <p className="text-xs text-zinc-500 mt-1">{p.senderDomainMode === 'include' ? 'Only scan emails FROM these domains' : 'Skip scanning emails FROM these domains'}</p>
          </div>
          <div className="border border-zinc-700 rounded p-3">
            <label className="text-xs font-bold text-zinc-300 block mb-2">Recipient Domain Filter (Zscaler / Symantec-style)</label>
            <div className="flex gap-1 mb-2">
              <button onClick={() => p.setRecipientDomainMode('include')} className={`px-2 py-1 text-xs rounded ${p.recipientDomainMode === 'include' ? 'bg-green-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Include Only</button>
              <button onClick={() => p.setRecipientDomainMode('exclude')} className={`px-2 py-1 text-xs rounded ${p.recipientDomainMode === 'exclude' ? 'bg-red-700 text-white' : 'bg-zinc-800 text-zinc-400'}`}>Exclude (Allowlist)</button>
            </div>
            <input value={p.recipientDomains} onChange={e => p.setRecipientDomains(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs" placeholder="e.g. gmail.com, yahoo.com, hotmail.com" />
            <p className="text-xs text-zinc-500 mt-1">{p.recipientDomainMode === 'include' ? 'Only scan emails TO these domains' : 'Allow emails TO these domains (bypass DLP)'}</p>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">\u2139 Tip: Enterprise DLP systems like Forcepoint and Zscaler allow fine-grained sender/recipient filtering. Use \"Exclude\" on recipient domains to create an allowlist for trusted partners.</p>
          </div>
        </div>
      )}

      {/* Attachment Rules Tab */}
      {activeTab === 'attachment' && (
        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Max Number of Attachments (Forcepoint-style)</label>
            <input type="number" min={1} max={100} value={p.maxAttachments} onChange={e => p.setMaxAttachments(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
            <span className="text-xs text-zinc-500 ml-2">Emails with more attachments than this trigger the policy</span>
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Max Attachment Size (MB)</label>
            <input type="number" min={1} max={500} value={p.maxAttachmentSize} onChange={e => p.setMaxAttachmentSize(Number(e.target.value))} className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-zinc-400 block mb-1">Blocked File Extensions (Symantec / McAfee-style)</label>
            <input value={p.blockedFileTypes} onChange={e => p.setBlockedFileTypes(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs font-mono" placeholder=".exe,.bat,.cmd,.ps1" />
            <p className="text-xs text-zinc-500 mt-1">Comma-separated file extensions. Matching attachments will be blocked or stripped per action policy.</p>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">\u2139 Common blocked types: .exe, .bat, .cmd, .ps1, .vbs, .js, .scr, .dll, .msi, .hta, .wsf, .com, .pif</p>
          </div>
        </div>
      )}

      {/* Action & Response Tab */}
      {activeTab === 'action' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Primary Action</label>
              <div className="flex flex-wrap gap-1">
                {['Monitor','Warn','Block','Quarantine','Drop Attachments','Encrypt'].map(a => (
                  <button key={a} onClick={() => {}} className={`px-2 py-1 text-xs rounded ${p.action === a ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{a}</button>
                ))}
              </div>
              <p className="text-xs text-zinc-500 mt-1">Actions based on Forcepoint/Symantec action plan model</p>
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">Severity Override</label>
              <div className="flex flex-wrap gap-1">
                {['Low','Medium','High','Critical'].map(s => (
                  <button key={s} onClick={() => {}} className={`px-2 py-1 text-xs rounded ${p.severity === s ? (s==='Critical'?'bg-red-600':s==='High'?'bg-orange-600':s==='Medium'?'bg-yellow-600 text-black':'bg-blue-600') + ' text-white' : 'bg-zinc-800 text-zinc-400'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="border border-zinc-700 rounded p-3 space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">Quarantine Settings (Symantec/Forcepoint-style)</label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={p.quarantineReviewRequired} onChange={() => p.setQuarantineReviewRequired(!p.quarantineReviewRequired)} />
              <span className="text-zinc-300">Require manual review before release</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={p.encryptOnRelease} onChange={() => p.setEncryptOnRelease(!p.encryptOnRelease)} />
              <span className="text-zinc-300">Encrypt message on release from quarantine</span>
            </label>
          </div>
          <div className="bg-zinc-800/50 rounded p-2">
            <p className="text-xs text-zinc-500">\u2139 Action hierarchy (most to least restrictive): Block &gt; Quarantine &gt; Drop Attachments &gt; Encrypt &gt; Warn &gt; Monitor</p>
          </div>
        </div>
      )}

      {/* Notification Tab */}
      {activeTab === 'notification' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-300 block">Notification Recipients (Zscaler/Forcepoint-style)</label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={p.notifySender} onChange={() => p.setNotifySender(!p.notifySender)} />
              <span className="text-zinc-300">Notify Email Sender</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={p.notifyAdmin} onChange={() => p.setNotifyAdmin(!p.notifyAdmin)} />
              <span className="text-zinc-300">Notify DLP Administrator</span>
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" checked={p.notifyManager} onChange={() => p.setNotifyManager(!p.notifyManager)} />
              <span className="text-zinc-300">Notify Sender's Manager (escalation)</span>
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
            <p className="text-xs text-zinc-500">\u2139 Notification templates support variables: {'{'}sender{'}'}, {'{'}recipient{'}'}, {'{'}policy_name{'}'}, {'{'}severity{'}'}, {'{'}action{'}'}, {'{'}timestamp{'}'}</p>
          </div>
        </div>
      )}

      {/* Active Config Summary */}
      <div className="mt-4 pt-3 border-t border-zinc-700">
        <p className="text-xs text-zinc-500">Active Config: <span className="text-zinc-300">{p.direction.toUpperCase()}</span> | Eval: <span className="text-zinc-300">{p.evaluationMode}</span> | Threshold: <span className="text-zinc-300">{p.matchThreshold} match(es)</span> | Log: <span className="text-zinc-300">{p.logLevel}</span></p>
      </div>
    </div>
  )
}
