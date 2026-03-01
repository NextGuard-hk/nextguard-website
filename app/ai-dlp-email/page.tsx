'use client'
import { useState, useRef, useEffect } from 'react'

const EMAIL_SCENARIOS = [
  {
    name: 'HR Sending Candidate PII',
    from: 'hr@nextguard.com',
    to: 'external-recruiter@headhunt.com',
    subject: 'RE: Candidate Reference Check',
    body: 'Hi Karen,\n\nAs requested, here are the details for the candidate reference check:\n\nFull Name: John Michael Smith\nDate of Birth: 1985-03-15\nHKID: A123456(7)\nPassport: K98765432\nPhone: +852 9876 5432\nEmail: john.smith@personal.com\nAddress: Flat 12B, Tower 3, City Garden, North Point, HK\nSalary: HKD 85,000/month\nBank Account: HSBC 123-456789-001\n\nPlease keep this confidential.\n\nBest regards,\nSarah Wong\nHR Manager',
    attachmentHint: 'Upload .xlsx/.csv with employee data to test attachment scanning',
  },
  {
    name: 'CFO M&A Confidential',
    from: 'cfo@nextguard.com',
    to: 'legal@external-law-firm.com',
    subject: 'CONFIDENTIAL - Project Phoenix M&A Term Sheet - USD 12.5M Valuation',
    body: 'Dear Counsel,\n\nPlease review the attached term sheet at your earliest convenience.\n\nKey terms:\n- Acquisition price: USD 12.5M\n- Structure: 60% cash, 40% stock swap\n- Due diligence period: 45 days\n- Break fee: 3% (USD 375K)\n- Target: TechVault Security Ltd\n- Expected close: Q2 2026\n\nThis is HIGHLY CONFIDENTIAL. Do not share outside your immediate deal team.\n\nRegards,\nDavid Chen\nCFO, NextGuard',
    attachmentHint: 'Upload term sheet PDF to test attachment scanning',
  },
  {
    name: 'Accounting - Credit Card in Body',
    from: 'accounting@nextguard.com',
    to: 'vendor-billing@cloudservice.com',
    subject: 'Payment for Invoice #INV-2026-0342',
    body: 'Hi,\n\nPlease process the following payment:\n\nCompany: NextGuard Technology Ltd\nInvoice: #INV-2026-0342\nAmount: USD 15,750.00\n\nPayment Details:\nCard Type: Visa\nCard Number: 4532-1234-5678-9012\nExpiry: 09/2027\nCVV: 847\nCardholder: David Chen\n\nAlternative wire transfer:\nBank: HSBC Hong Kong\nSWIFT: HSBCHKHH\nAccount: 123-456789-001\n\nPlease confirm once processed.\n\nRegards,\nAccounting Team',
    attachmentHint: 'Upload invoice PDF to test attachment scanning',
  },
  {
    name: 'Engineering - Source Code Leak',
    from: 'dev@nextguard.com',
    to: 'friend@competitor-security.com',
    subject: 'Check out this cool algo',
    body: 'Hey!\n\nCheck out this encryption module I wrote for our DLP engine:\n\n```typescript\n// NextGuard Proprietary - Classification: TOP SECRET\n// DLP Core Engine v3.2.1 - Patent Pending\nclass DLPScanEngine {\n  private apiKey = "ng-prod-sk_live_a1b2c3d4e5f6";\n  private dbConn = "mongodb://admin:Str0ngP@ss@prod-db.nextguard.internal:27017";\n  \n  async scanContent(content: string): Promise<ScanResult> {\n    const patterns = this.loadPatterns();\n    return this.classifyRisk(content, patterns);\n  }\n}\n```\n\nPretty neat right? Let me know what you think!',
    attachmentHint: 'Upload .py/.ts/.js source code file to test code leak detection',
  },
  {
    name: 'Legal - GDPR Data Export',
    from: 'legal@nextguard.com',
    to: 'consultant@external-advisory.com',
    subject: 'Customer Data Export - GDPR Request #GR-2026-089',
    body: 'Hi,\n\nAttached is the customer data export for GDPR compliance request #GR-2026-089.\n\nData includes:\n- Customer: Maria Garcia (EU citizen, Spain)\n- EU Tax ID: ES12345678A\n- Records: 847 data points spanning 2019-2026\n- Categories: Purchase history, support tickets, usage analytics, IP logs\n- Includes health-related app usage data (GDPR Art. 9 special category)\n\nNote: This export includes data from our EU-West-1 cluster.\nDatabase credentials for verification: eu-prod-read:R3adOnly2026!@eu-db.nextguard.com\n\nPlease review for compliance before we send to the data subject.\n\nRegards,\nLegal Team',
    attachmentHint: 'Upload customer data CSV/JSON to test GDPR data detection',
  },
  {
    name: 'Sales - Customer List to Personal Email',
    from: 'sales@nextguard.com',
    to: 'mike.personal@gmail.com',
    subject: 'FW: Q1 Enterprise Pipeline',
    body: 'Sending this to my personal email for the weekend...\n\n--- CONFIDENTIAL - INTERNAL ONLY ---\n\nQ1 2026 Enterprise Pipeline:\n\n1. HSBC Hong Kong - $2.1M - DLP Suite - 85% probability\n   Contact: James.Wong@hsbc.com.hk | +852 2822 1111\n2. Cathay Pacific - $890K - Email Security - 60%\n   Contact: Lisa.Chan@cathaypacific.com | +852 2747 5000\n3. HK Government - $3.5M - Full Stack - 40%\n   Contact: William.Lau@gov.hk | Tender ref: GOV-SEC-2026-112\n4. Bank of China (HK) - $1.8M - Endpoint DLP - 70%\n   Contact: Peter.Zhao@bochk.com | +852 2826 6888\n\nTotal Pipeline: $8.29M\nQuota: $5M | Current: $1.2M closed\n\n--- END CONFIDENTIAL ---',
    attachmentHint: 'Upload sales report Excel to test business data detection',
  },
  {
    name: 'IT Admin - Credentials Sharing',
    from: 'it-admin@nextguard.com',
    to: 'new-contractor@freelance-dev.com',
    subject: 'Access Credentials for Onboarding',
    body: 'Welcome aboard!\n\nHere are your access credentials:\n\nVPN:\n- Server: vpn.nextguard.internal\n- Username: contractor_2026_04\n- Password: Temp!Pass#2026\n- 2FA Secret: JBSWY3DPEHPK3PXP\n\nAWS Console:\n- URL: https://nextguard.signin.aws.amazon.com/console\n- Access Key: AKIAIOSFODNN7EXAMPLE\n- Secret Key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n\nGitHub Enterprise:\n- Token: ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n\nProduction DB (read-only):\n- Host: prod-mysql.nextguard.internal:3306\n- User: readonly_user\n- Pass: Pr0dR3ad!2026\n\nPlease change all passwords on first login.\n\nBest,\nIT Team',
    attachmentHint: 'Upload config/env file to test credential detection',
  },
]

const DLP_POLICIES = [
  { id: 'pii_names', label: 'Personal Names', category: 'PII', defaultOn: true },
  { id: 'pii_id_numbers', label: 'ID Numbers (HKID/Passport/SSN)', category: 'PII', defaultOn: true },
  { id: 'pii_contact', label: 'Phone/Email/Address', category: 'PII', defaultOn: true },
  { id: 'financial_cc', label: 'Credit Card Numbers', category: 'Financial', defaultOn: true },
  { id: 'financial_bank', label: 'Bank Account/SWIFT', category: 'Financial', defaultOn: true },
  { id: 'financial_salary', label: 'Salary/Compensation Data', category: 'Financial', defaultOn: true },
  { id: 'confidential_ma', label: 'M&A / Deal Information', category: 'Confidential', defaultOn: true },
  { id: 'confidential_legal', label: 'Legal Privileged Content', category: 'Confidential', defaultOn: true },
  { id: 'confidential_internal', label: 'Internal Only / Restricted', category: 'Confidential', defaultOn: true },
  { id: 'credentials_passwords', label: 'Passwords & Secrets', category: 'Credentials', defaultOn: true },
  { id: 'credentials_api', label: 'API Keys & Tokens', category: 'Credentials', defaultOn: true },
  { id: 'credentials_db', label: 'Database Connection Strings', category: 'Credentials', defaultOn: true },
  { id: 'code_source', label: 'Source Code / Algorithms', category: 'IP & Code', defaultOn: true },
  { id: 'code_proprietary', label: 'Proprietary / Patent Content', category: 'IP & Code', defaultOn: true },
  { id: 'code_config', label: 'Config / Environment Files', category: 'IP & Code', defaultOn: true },
  { id: 'compliance_gdpr', label: 'GDPR Personal Data', category: 'Compliance', defaultOn: true },
  { id: 'compliance_hipaa', label: 'Health / Medical Data', category: 'Compliance', defaultOn: true },
  { id: 'compliance_pci', label: 'PCI-DSS Cardholder Data', category: 'Compliance', defaultOn: true },
  { id: 'business_pipeline', label: 'Sales Pipeline / Revenue', category: 'Business', defaultOn: true },
]

const POLICY_CATEGORIES = ['PII', 'Financial', 'Confidential', 'Credentials', 'IP & Code', 'Compliance', 'Business']

async function scanPart(content: string, engine: string, policyContext?: string) {
  const res = await fetch(`/api/ai-dlp-${engine === 'traditional' ? 'traditional' : engine === 'pplx' ? 'cloudflare' : 'cloudflare'}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, policyContext }),
  })
  if (!res.ok) throw new Error('Scan failed')
  return res.json()
}

export default function EmailDLPPage() {
  const [emailFrom, setEmailFrom] = useState('')
  const [emailTo, setEmailTo] = useState('')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentText, setAttachmentText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [selectedScenario, setSelectedScenario] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [results, setResults] = useState<any>(null)
  const [latencies, setLatencies] = useState<any>(null)
  // Policy settings
  const [policyEnabled, setPolicyEnabled] = useState<Record<string, boolean>>(
    () => Object.fromEntries(DLP_POLICIES.map(p => [p.id, p.defaultOn]))
  )
  const [severity, setSeverity] = useState<string>('High')
  const [action, setAction] = useState<string>('Block')
  const [showPolicyPanel, setShowPolicyPanel] = useState(false)
  const [scanScope, setScanScope] = useState({ subject: true, body: true, attachment: true })

  const enabledPolicySummary = DLP_POLICIES.filter(p => policyEnabled[p.id]).map(p => p.label)

  useEffect(() => {
    fetch('/api/warmup-cloudflare').catch(() => {})
  }, [])

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAttachmentName(file.name)
    setExtracting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/ai-dlp/extract', { method: 'POST', body: formData })
      const data = await res.json()
      setAttachmentText(data.text || '')
    } catch {
      setAttachmentText('[Extraction failed]')
    }
    setExtracting(false)
  }

  const loadScenario = (idx: number) => {
    const s = EMAIL_SCENARIOS[idx]
    if (!s) return
    setSelectedScenario(String(idx))
    setEmailFrom(s.from)
    setEmailTo(s.to)
    setEmailSubject(s.subject)
    setEmailBody(s.body)
    setAttachmentName('')
    setAttachmentText('')
    setResults(null)
    setLatencies(null)
  }

  const toggleCategory = (cat: string) => {
    const ids = DLP_POLICIES.filter(p => p.category === cat).map(p => p.id)
    const allOn = ids.every(id => policyEnabled[id])
    setPolicyEnabled(prev => {
      const next = { ...prev }
      ids.forEach(id => { next[id] = !allOn })
      return next
    })
  }

  const hasContent = emailSubject.trim() || emailBody.trim() || attachmentText.trim()

  const handleScan = async () => {
    setScanning(true)
    setResults(null)
    setLatencies(null)
    const policyContext = `Enabled DLP Policies: ${enabledPolicySummary.join(', ')}\nSeverity: ${severity}\nAction: ${action}`
    const engines = ['traditional', 'pplx', 'cloudflare'] as const
    const parts = [
      ...(scanScope.subject ? [{ key: 'subject', content: emailSubject }] : []),
      ...(scanScope.body ? [{ key: 'body', content: emailBody }] : []),
      ...(scanScope.attachment ? [{ key: 'attachment', content: attachmentText }] : []),
    ]
    const res: any = {}
    const lat: any = {}
    await Promise.all(engines.map(async (eng) => {
      res[eng] = {}
      const t0 = performance.now()
      await Promise.all(parts.map(async (p) => {
        try {
          res[eng][p.key] = await scanPart(p.content, eng, policyContext)
        } catch {
          res[eng][p.key] = { detected: false, error: true, summary: 'Scan failed' }
        }
      }))
      lat[eng] = Math.round(performance.now() - t0)
    }))
    setResults(res)
    setLatencies(lat)
    setScanning(false)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-1">Email DLP Scanning Demo</h1>
        <p className="text-zinc-400 text-sm mb-6">Test AI-powered Data Loss Prevention across 3 engines: Traditional (Perplexity Sonar), PPLX (Perplexity Sonar Pro), and Cloudflare Workers AI</p>

        {/* Scenario Selector */}
        <div className="mb-4">
          <label className="text-xs text-zinc-400 block mb-1">Load Test Scenario</label>
          <select value={selectedScenario} onChange={e => loadScenario(Number(e.target.value))} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm">
            <option value="">-- Select a scenario --</option>
            {EMAIL_SCENARIOS.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
          </select>
        </div>

        {/* Policy Settings Toggle */}
        <div className="mb-4">
          <button onClick={() => setShowPolicyPanel(!showPolicyPanel)} className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300">
            <span>{showPolicyPanel ? '\u25BC' : '\u25B6'}</span>
            <span>DLP Policy Settings</span>
            <span className="text-xs text-zinc-500">({enabledPolicySummary.length}/{DLP_POLICIES.length} policies active)</span>
          </button>
        </div>

        {/* Policy Panel */}
        {showPolicyPanel && (
          <div className="mb-6 bg-zinc-900 border border-zinc-700 rounded-lg p-4">
            <div className="flex flex-wrap gap-4 mb-4">
              <div>
                <span className="text-xs text-zinc-400 block mb-1">Severity Level</span>
                <div className="flex gap-1">
                  {['Low','Medium','High','Critical'].map(s => (
                    <button key={s} onClick={() => setSeverity(s)} className={`px-2 py-1 text-xs rounded ${severity === s ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block mb-1">Action</span>
                <div className="flex gap-1">
                  {['Monitor','Warn','Block','Quarantine'].map(a => (
                    <button key={a} onClick={() => setAction(a)} className={`px-2 py-1 text-xs rounded ${action === a ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-xs text-zinc-400 block mb-1">Scan Scope</span>
                <div className="flex gap-2">
                  {(['subject','body','attachment'] as const).map(s => (
                    <label key={s} className="flex items-center gap-1 text-xs cursor-pointer">
                      <input type="checkbox" checked={scanScope[s]} onChange={() => setScanScope(prev => ({ ...prev, [s]: !prev[s] }))} />
                      <span className="text-zinc-300 capitalize">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Policy Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {POLICY_CATEGORIES.map(cat => {
                const policies = DLP_POLICIES.filter(p => p.category === cat)
                const enabledCount = policies.filter(p => policyEnabled[p.id]).length
                return (
                  <div key={cat} className="bg-zinc-800 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-zinc-300">{cat}</span>
                      <button onClick={() => toggleCategory(cat)} className="text-xs text-cyan-400 hover:text-cyan-300">
                        {enabledCount === policies.length ? 'Disable All' : 'Enable All'}
                      </button>
                    </div>
                    {policies.map(p => (
                      <label key={p.id} className="flex items-center gap-2 py-0.5 cursor-pointer">
                        <input type="checkbox" checked={policyEnabled[p.id]} onChange={() => setPolicyEnabled(prev => ({ ...prev, [p.id]: !prev[p.id] }))} />
                        <span className={`text-xs ${policyEnabled[p.id] ? 'text-zinc-200' : 'text-zinc-600'}`}>{p.label}</span>
                      </label>
                    ))}
                    <div className="text-xs text-zinc-600 mt-1">{enabledCount}/{policies.length} active</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Email Form */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-zinc-400 block mb-1">From</label>
              <input value={emailFrom} onChange={e => setEmailFrom(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" placeholder="sender@company.com" />
            </div>
            <div>
              <label className="text-xs text-zinc-400 block mb-1">To</label>
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" placeholder="recipient@external.com" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-400 block mb-1">Subject</label>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm" placeholder="Email subject" />
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-400 block mb-1">Body</label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} rows={8} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono" placeholder="Email body content..." />
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-400 block mb-1">Attachment</label>
            <div className="flex items-center gap-2">
              <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm hover:bg-zinc-700">
                {extracting ? 'Extracting...' : 'Upload File'}
              </button>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileUpload} accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.json,.py,.ts,.js,.env" />
              {attachmentName && <span className="text-xs text-zinc-400">{attachmentName}</span>}
            </div>
            {attachmentText && (
              <textarea value={attachmentText} onChange={e => setAttachmentText(e.target.value)} rows={4} className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm font-mono mt-2" />
            )}
          </div>
          <button onClick={handleScan} disabled={scanning || !hasContent} className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 disabled:text-zinc-500 rounded text-sm font-bold">
            {scanning ? 'Scanning with 3 AI Engines...' : 'Scan Email for DLP Violations'}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div>
            <h2 className="text-lg font-bold mb-3">Scan Results</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['traditional', 'pplx', 'cloudflare'] as const).map(eng => (
                <div key={eng} className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm capitalize">{eng === 'pplx' ? 'Perplexity Sonar Pro' : eng === 'traditional' ? 'Perplexity Sonar' : 'Cloudflare Workers AI'}</h3>
                    {latencies?.[eng] && <span className="text-xs text-zinc-500">{latencies[eng]}ms</span>}
                  </div>
                  {['subject', 'body', 'attachment'].map(part => {
                    const result = results[eng]?.[part]
                    if (!result) return null
                    return (
                      <div key={part} className="mb-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-zinc-400 uppercase">{part}</span>
                          {result.detected ? (
                            <span className="text-xs px-1.5 py-0.5 bg-red-900/50 text-red-400 rounded">VIOLATION</span>
                          ) : (
                            <span className="text-xs px-1.5 py-0.5 bg-green-900/50 text-green-400 rounded">CLEAN</span>
                          )}
                        </div>
                        {result.detected && result.summary && (
                          <div className="text-xs text-zinc-500 mt-1 ml-2">{result.summary}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
