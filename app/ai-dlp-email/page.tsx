'use client'
import { useState, useRef, useEffect } from 'react'

const EMAIL_SCENARIOS = [
  {
    name: 'HR Sending Candidate PII',
    from: 'hr@nextguard.com',
    to: 'external-recruiter@headhunt.com',
    subject: 'RE: Candidate Reference Check',
    body: 'Hi Karen,\n\nAs requested, here are the details for the candidate reference:\n\nCandidate: Wong Mei Ling\nHKID: F234567(8)\nDate of Birth: 15 March 1992\nCurrent Salary: HKD 52,000/month\nBank Account: BOC 012-987654-321\nEmergency Contact: Wong Tai Wai, +852 9123 4567\nMedical: Declared mild asthma\n\nPlease keep this strictly confidential.\n\nBest regards,\nSarah Lam\nHR Manager',
    attachmentHint: 'Upload .xlsx/.csv with employee data to test attachment scanning',
  },
  {
    name: 'CFO M&A Confidential',
    from: 'cfo@nextguard.com',
    to: 'legal@external-law-firm.com',
    subject: 'CONFIDENTIAL - Project Phoenix M&A Term Sheet - USD 12.5M Valuation - DO NOT FORWARD',
    body: 'Dear Counsel,\n\nPlease review the attached term sheet at your earliest convenience. We aim to sign by end of March.\n\nRegards,\nRaymond Cheung\nCFO, NextGuard Technology Limited',
    attachmentHint: 'Upload term sheet PDF to test attachment scanning',
  },
  {
    name: 'Accounting - Credit Card in Body',
    from: 'accounting@nextguard.com',
    to: 'vendor-billing@cloudservice.com',
    subject: 'Payment for Invoice #INV-2026-0342',
    body: 'Hi,\n\nPlease process the following payment:\n\nCompany: NextGuard Technology Limited\nAmount: USD 8,500\nCard Number: 4532 8901 2345 6789\nExpiry: 09/28\nCVV: 456\nCardholder: Raymond Cheung\n\nPlease confirm once processed.\n\nThanks,\nAccounting Team',
    attachmentHint: 'Upload invoice PDF to test attachment scanning',
  },
  {
    name: 'Obfuscated Data Exfiltration',
    from: 'suspicious.user@nextguard.com',
    to: 'personal@gmail.com',
    subject: 'Notes from today',
    body: 'Hey,\n\nJust saving some info:\n\nThe W0ng acc0unt - her !D is F-two-three-four-five-six-seven-(eight)\nSalary: fifty-two-k per month\nBank deets: B-O-C zero-one-two dash nine-eight-seven-six-five-four dash three-two-one\n\nDon\'t forget to delete this after.',
    attachmentHint: 'Upload any file with PII to test evasion detection',
  },
  {
    name: 'Clean Business Update',
    from: 'james.wong@nextguard.com',
    to: 'all-staff@nextguard.com',
    subject: 'Q1 2026 Company Update',
    body: 'Dear Team,\n\nQ1 2026 highlights:\n- Revenue grew 18% YoY\n- 15 new enterprise clients across APAC\n- Customer satisfaction: 4.7/5.0\n- 3 major product releases shipped\n\nThank you for your hard work!\n\nBest regards,\nJames Wong\nCEO',
    attachmentHint: 'Upload a clean report to verify no false positives',
  },
  {
    name: 'Board Pack with Financial Data',
    from: 'cfo@nextguard.com',
    to: 'board@nextguard.com',
    subject: 'Board Pack - Q4 2025 Financial Results - STRICTLY CONFIDENTIAL',
    body: 'Dear Board Members,\n\nPlease find attached the Q4 2025 board pack.\nKey highlights: Revenue HKD 12.3M, EBITDA margin 23.4%.\n\nPlease do not forward this email or the attachment.\n\nRegards,\nRaymond Cheung\nCFO',
    attachmentHint: 'Upload financial report (.xlsx/.pdf) to test attachment DLP',
  },
]

const BINARY_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.jpg', '.jpeg', '.png']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ScanResultBadge({ label, result }: { label: string; result: any }) {
  if (!result) return <span className="text-xs text-zinc-600">{label}: -</span>
  return (
    <div className="mb-2">
      <div className={`text-xs font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
        {label}: {result.detected ? '⚠️ VIOLATION' : '✅ CLEAN'}
      </div>
      {result.detected && result.findings && result.findings.length > 0 && (
        <div className="ml-2 mt-1">
          {result.findings.slice(0, 5).map((f: any, i: number) => (
            <div key={i} className="text-xs text-zinc-400">
              • <span className="text-orange-400">{f.rule || f.type}</span>
              {f.matches && <span className="text-zinc-500"> ({f.matches.slice(0, 3).join(', ')})</span>}
              {f.confidence && <span className="text-zinc-500"> {f.confidence}%</span>}
            </div>
          ))}
        </div>
      )}
      {result.detected && result.summary && (
        <div className="text-xs text-zinc-500 mt-1 ml-2">{result.summary}</div>
      )}
    </div>
  )
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
  // Results: each engine has { subject, body, attachment } sub-results
  const [results, setResults] = useState<any>(null)
  const [latencies, setLatencies] = useState<any>(null)

  useEffect(() => {
    fetch('/api/warmup-cloudflare').catch(() => {})
  }, [])

  const loadScenario = (s: typeof EMAIL_SCENARIOS[0]) => {
    setEmailFrom(s.from)
    setEmailTo(s.to)
    setEmailSubject(s.subject)
    setEmailBody(s.body)
    setSelectedScenario(s.name)
    setAttachmentName('')
    setAttachmentText('')
    setResults(null)
    setLatencies(null)
  }

  const handleAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5MB)'); return }
    setAttachmentName(file.name)
    setAttachmentText('')
    setExtracting(true)
    const isBinary = BINARY_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (isBinary) {
      try {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body: fd })
        const data = await res.json()
        setAttachmentText(data.ocrText || data.text || data.rawText || '')
      } catch { setAttachmentText('[Error extracting text]') }
    } else {
      try { setAttachmentText(await file.text()) } catch { setAttachmentText('[Error reading file]') }
    }
    setExtracting(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const scanPart = async (content: string, engine: string) => {
    if (!content.trim()) return { detected: false, findings: [], summary: 'No content to scan' }
    const url = engine === 'traditional' ? '/api/ai-dlp-traditional' : engine === 'pplx' ? '/api/ai-dlp' : '/api/ai-dlp-cloudflare'
    const body = engine === 'pplx' ? { content, mode: 'ai' } : { content }
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return res.json()
  }

  const runEmailScan = async () => {
    setScanning(true)
    setResults(null)
    setLatencies(null)
    const engines = ['traditional', 'pplx', 'cloudflare'] as const
    const parts = [
      { key: 'subject', content: emailSubject },
      { key: 'body', content: emailBody },
      { key: 'attachment', content: attachmentText },
    ]
    const res: any = {}
    const lat: any = {}
    await Promise.all(engines.map(async (eng) => {
      res[eng] = {}
      const t0 = performance.now()
      await Promise.all(parts.map(async (p) => {
        try {
          res[eng][p.key] = await scanPart(p.content, eng)
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

  const hasContent = emailSubject.trim() || emailBody.trim() || attachmentText.trim()

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2 text-center">📧 Email DLP Simulation</h1>
        <p className="text-zinc-400 mb-6 text-center">Simulate sending an email with Subject, Body & Attachment — DLP scans each part separately</p>

        {/* Scenario Selector */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="text-xs text-zinc-500 mb-2">Load a pre-built email scenario:</div>
          <div className="flex flex-wrap gap-2">
            {EMAIL_SCENARIOS.map((s, i) => (
              <button key={i} onClick={() => loadScenario(s)} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedScenario === s.name ? 'bg-cyan-700 text-white ring-2 ring-cyan-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>{s.name}</button>
            ))}
          </div>
        </div>

        {/* Email Compose Form */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 mb-4">
          <div className="text-lg font-bold text-white mb-4">✉️ Compose Email</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs text-zinc-500">From:</label>
              <input value={emailFrom} onChange={e => setEmailFrom(e.target.value)} placeholder="sender@company.com" className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white mt-1" />
            </div>
            <div>
              <label className="text-xs text-zinc-500">To:</label>
              <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="recipient@external.com" className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-sm text-white mt-1" />
            </div>
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-500">Subject: <span className="text-yellow-500">(DLP scans this)</span></label>
            <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Email subject line..." className="w-full bg-zinc-800 border border-yellow-700 rounded px-3 py-2 text-sm text-white mt-1" />
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-500">Body: <span className="text-yellow-500">(DLP scans this)</span></label>
            <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)} placeholder="Email body content..." className="w-full h-32 bg-zinc-800 border border-yellow-700 rounded px-3 py-2 text-sm text-white mt-1 font-mono" />
          </div>
          <div className="mb-3">
            <label className="text-xs text-zinc-500">📎 Attachment: <span className="text-yellow-500">(DLP extracts & scans file content)</span></label>
            <div className="flex items-center gap-3 mt-1">
              <input ref={fileInputRef} type="file" accept=".txt,.csv,.json,.xml,.pdf,.docx,.xlsx,.xls,.pptx,.jpg,.jpeg,.png" onChange={handleAttachment} className="hidden" />
              <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors">📂 Attach File</button>
              {attachmentName && <span className="text-xs text-cyan-400">📄 {attachmentName}</span>}
              {extracting && <span className="text-xs text-yellow-400 animate-pulse">Extracting text...</span>}
              {attachmentText && !extracting && <span className="text-xs text-green-400">✅ {attachmentText.length} chars extracted</span>}
            </div>
            {selectedScenario && !attachmentName && (
              <div className="text-xs text-zinc-600 mt-1">💡 {EMAIL_SCENARIOS.find(s => s.name === selectedScenario)?.attachmentHint}</div>
            )}
          </div>
          <button onClick={runEmailScan} disabled={!hasContent || scanning || extracting} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl transition">
            {scanning ? '🔍 Scanning Email...' : '🔍 Scan Email Before Sending'}
          </button>
        </div>

        {/* Results */}
        {scanning && <div className="text-cyan-400 animate-pulse text-center py-8 text-lg">🔍 Scanning Subject, Body & Attachment across all 3 engines...</div>}
        {results && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Traditional DLP */}
            <div className="bg-zinc-900 border border-orange-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-1">Traditional DLP</h3>
              <div className="text-xs text-zinc-500 mb-1">Regex + Dictionary</div>
              {latencies?.traditional && <div className="text-xl font-mono font-bold text-green-400 mb-3">{latencies.traditional}ms</div>}
              <ScanResultBadge label="📌 Subject" result={results.traditional?.subject} />
              <ScanResultBadge label="📝 Body" result={results.traditional?.body} />
              <ScanResultBadge label="📎 Attachment" result={results.traditional?.attachment} />
            </div>
            {/* Perplexity Sonar */}
            <div className="bg-zinc-900 border border-cyan-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-1">Perplexity Sonar</h3>
              <div className="text-xs text-zinc-500 mb-1">Cloud AI - high accuracy</div>
              {latencies?.pplx && <div className="text-xl font-mono font-bold text-cyan-400 mb-3">{(latencies.pplx / 1000).toFixed(2)}s</div>}
              <ScanResultBadge label="📌 Subject" result={results.pplx?.subject} />
              <ScanResultBadge label="📝 Body" result={results.pplx?.body} />
              <ScanResultBadge label="📎 Attachment" result={results.pplx?.attachment} />
            </div>
            {/* Cloudflare Workers AI */}
            <div className="bg-zinc-900 border border-purple-600 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-1">Cloudflare Workers AI</h3>
              <div className="text-xs text-zinc-500 mb-1">Edge AI - data stays local</div>
              {latencies?.cloudflare && <div className="text-xl font-mono font-bold text-purple-400 mb-3">{(latencies.cloudflare / 1000).toFixed(2)}s</div>}
              <ScanResultBadge label="📌 Subject" result={results.cloudflare?.subject} />
              <ScanResultBadge label="📝 Body" result={results.cloudflare?.body} />
              <ScanResultBadge label="📎 Attachment" result={results.cloudflare?.attachment} />
            </div>
          </div>
        )}

        {/* Summary */}
        {results && latencies && (
          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">📊 Email DLP Performance Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-2xl font-mono font-bold text-green-400">{latencies.traditional}ms</div>
                <div className="text-sm text-zinc-400">Traditional DLP</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-cyan-400">{(latencies.pplx / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Perplexity Sonar</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-purple-400">{(latencies.cloudflare / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Cloudflare Workers AI</div>
              </div>
            </div>
            <div className="text-xs text-zinc-500 text-center">
              Each engine scanned Subject, Body & Attachment independently. Traditional DLP uses regex only. AI engines detect obfuscated and context-based violations.
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-6 text-center">
          <a href="/ai-dlp-compare" className="text-cyan-400 hover:text-cyan-300 text-sm">← Back to DLP Engine Comparison (Text Mode)</a>
        </div>
      </div>
    </div>
  )
}
