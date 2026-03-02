'use client'
import { EnterprisePolicyConfig } from '@/components/web-dlp-policy-config'
import WebProxySWGConfig from '@/components/web-proxy-swg-config'
import SWGLiveTest from '@/components/swg-live-test'
import { useState, useRef, useEffect } from 'react'

// Web DLP Scenarios - Web Forms, Cloud Upload, GenAI, Social Media, SaaS, Webmail
const WEB_SCENARIOS = [
  {
    category: 'Web Form Submission',
    icon: '\ud83d\udcdd',
    description: 'Data exfiltration via web forms, contact pages, and online portals',
    samples: [
      {
        name: 'Standard Form PII',
        channel: 'web-form',
        destination: 'external-portal.com',
        content: 'Contact Form Submission:\nFull Name: Chan Wing Kei\nHKID: A123456(7)\nPhone: +852 6789 0000\nCredit Card: 5407 1234 5678 9012\nEmail: john.chan@nextguard.com\nMessage: Please process my refund to the above card.'
      },
      {
        name: 'Obfuscated Form Data',
        channel: 'web-form',
        destination: 'survey-site.com',
        content: 'Survey Response:\nNa.me: Ch&&an Wi&&ng K&&ei\nID Nu&&mber: A1&&23&&456(7)\nPho&&ne: +85&&2 67&&89 00&&00\nCa&&rd: 54&&07 12&&34 56&&78 90&&12\nThis is a feedback form - nothing sensitive here.'
      },
      {
        name: 'Multi-field Form Exfil',
        channel: 'web-form',
        destination: 'job-application.com',
        content: 'Job Application Form:\nApplicant: Wong Mei Ling\nHKID: F234567(8)\nDOB: 15/03/1992\nCurrent Salary: HKD 52,000/month\nBank Account: BOC 012-987654-321\nExpected Salary: HKD 65,000/month\nEmergency Contact: Wong Tai Wai, +852 9123 4567\nMedical: Mild asthma, no other conditions'
      },
    ]
  },
  {
    category: 'Cloud Storage Upload',
    icon: '\u2601\ufe0f',
    description: 'Sensitive data uploaded to cloud storage (Google Drive, Dropbox, OneDrive)',
    samples: [
      {
        name: 'Cloud Upload - Customer DB',
        channel: 'cloud-upload',
        destination: 'drive.google.com',
        content: 'Uploading file: NextGuard_Customer_Database_Feb2026.xlsx\n\nFile Contents Preview:\nCustomer ID, Name, HKID, Phone, Credit Card, Contract Value\nCUST-001, Chan Tai Man, E567890(1), +852 9876 5432, 4532 8901 2345 6789, HKD 480,000\nCUST-002, Wong Mei Ling, F234567(8), +852 6543 2109, 5407 1234 5678 9012, HKD 720,000\nCUST-003, Lee Ka Fai, G345678(9), +852 8765 4321, 4111 1111 1111 1111, HKD 350,000'
      },
      {
        name: 'Cloud Upload - Source Code',
        channel: 'cloud-upload',
        destination: 'dropbox.com',
        content: '// config.prod.js - uploading to personal Dropbox\nconst config = {\n  database: { host: "db.internal.nextguard.com", password: "Ng@Pr0d#2026!Secure" },\n  stripe: { secretKey: "sk_live_EXAMPLE_NOT_REAL_KEY_demo_only_000000000000000000000000000000" },\n  aws: { accessKeyId: "AKIAIOSFODNN7EXAMPLE", secretAccessKey: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" }\n}'
      },
      {
        name: 'Cloud Upload - HR Payroll',
        channel: 'cloud-upload',
        destination: 'onedrive.live.com',
        content: 'Monthly Payroll - February 2026 (RESTRICTED)\n\nEMP-101, Chan Tai Man, HKID: E567890(1), Basic: HKD 45,000, Bank: HSBC 400-123456-001\nEMP-102, Wong Mei Ling, HKID: F234567(8), Basic: HKD 52,000, Bank: BOC 012-987654-321\nEMP-103, Lee Ka Fai, HKID: G345678(9), Basic: HKD 38,000, Bank: SCB 123-456789-012'
      },
    ]
  },
  {
    category: 'GenAI Prompt Leak',
    icon: '\ud83e\udd16',
    description: 'Sensitive data pasted into ChatGPT, Copilot, Gemini, Claude prompts',
    samples: [
      {
        name: 'ChatGPT - PII in Prompt',
        channel: 'genai-prompt',
        destination: 'chat.openai.com',
        content: 'ChatGPT prompt:\n"Help me write a cover letter. My details: Li Wei, HKID H456789(0), graduated HKU 2020. Phone 852-6543-2100. Current salary HKD 55,000/month at HSBC account 583-123456-838. My manager David Chen (HKID K789012(3)) at david.chen@hsbc.com.hk"'
      },
      {
        name: 'Copilot - Code with Secrets',
        channel: 'genai-prompt',
        destination: 'copilot.microsoft.com',
        content: 'GitHub Copilot prompt:\n"Fix this config file:\nDATABASE_URL=postgresql://ngadmin:Pr0d_P@ss_2026@10.0.1.5:5432/nextguard_prod\nREDIS_URL=redis://:RedisS3cr3t@10.0.1.6:6379\nSENDGRID_API_KEY=SG.abcdefghijklmnop.QRSTUVWXYZ1234567890abcdefghijklmnop\nAWS_ACCESS_KEY=AKIAIOSFODNN7EXAMPLE"'
      },
      {
        name: 'Gemini - Financial Data',
        channel: 'genai-prompt',
        destination: 'gemini.google.com',
        content: 'Gemini prompt:\n"Summarize this board report:\nRevenue: HKD 12.3M, EBITDA margin: 23.4%\nHSBC Operating Account 612-345678-901 balance HKD 4.25M\nDBS Reserve 003-456789-012 balance HKD 8.1M\nAIA receivable HKD 875K contact Grace Chu grace.chu@aia.com\nCFO Raymond Cheung HKID P567890(1)"'
      },
      {
        name: 'Claude - Medical Records',
        channel: 'genai-prompt',
        destination: 'claude.ai',
        content: 'Claude prompt:\n"Translate this patient record to Chinese:\nPatient: WONG Siu Ming (M, 67), HKID: D876543(2)\nDiagnosis: Acute Myocardial Infarction (STEMI)\nMedications: Aspirin 80mg, Clopidogrel 75mg, Atorvastatin 40mg\nInsurance: AIA Policy# AIA-HK-9988776\nNext of kin: Wong Mei Ling +852 6543 2109"'
      },
    ]
  },
  {
    category: 'Social Media Post',
    icon: '\ud83d\udce2',
    description: 'Accidental or intentional data leak via social media platforms',
    samples: [
      {
        name: 'LinkedIn Post - M&A Leak',
        channel: 'social-media',
        destination: 'linkedin.com',
        content: 'LinkedIn post draft:\n"Excited to announce our acquisition of DataShield Asia for USD 12.5M! Deal structure: 70% cash + 30% equity. Bank escrow at HSBC Account 412-567890-123 with HKD 3.75M deposit. #MandA #Cybersecurity #Confidential"'
      },
      {
        name: 'Twitter - Customer Data',
        channel: 'social-media',
        destination: 'x.com',
        content: 'Tweet draft:\n"Just helped our biggest client Chan Tai Man (CUST-001) resolve his issue! His account ending in 6789 is now fully active. Great service from our team @NextGuard! Contact us at +852 9876 5432 #CustomerService"'
      },
      {
        name: 'Facebook - Internal Metrics',
        channel: 'social-media',
        destination: 'facebook.com',
        content: 'Facebook post:\n"Our Q4 results are AMAZING! Revenue HKD 12.3M (target was only 10M). EBITDA 23.4%. Our HSBC account 612-345678-901 just received the milestone payment. CEO James Wong is thrilled! CONFIDENTIAL but I had to share!"'
      },
    ]
  },
  {
    category: 'SaaS Collaboration',
    icon: '\ud83d\udcac',
    description: 'Data leaked via Slack, Teams, Notion, Confluence, Jira',
    samples: [
      {
        name: 'Slack - Credentials Shared',
        channel: 'saas-collab',
        destination: 'slack.com',
        content: '[Slack #engineering-private]\n[14:23] sarah.lam: Hey team, prod DB password needs updating. Current one is Ng@Pr0d#2026! - please update your local configs\n[14:25] dev.chan: Got it. Also the AWS key AKIAIOSFODNN7EXAMPLE is still in the old repo\n[14:28] dev.chan: Also re: the Wong account (HKID D876543(2)) - their CC details are 5407 1234 5678 9012 exp 03/27'
      },
      {
        name: 'Notion - Customer List',
        channel: 'saas-collab',
        destination: 'notion.so',
        content: 'Notion Page: Customer Contact List (shared externally)\n\n| Customer | HKID | Phone | Credit Card | Contract |\n|----------|------|-------|-------------|----------|\n| Chan Tai Man | E567890(1) | +852 9876 5432 | 4532 8901 2345 6789 | HKD 480K |\n| Wong Mei Ling | F234567(8) | +852 6543 2109 | 5407 1234 5678 9012 | HKD 720K |'
      },
      {
        name: 'Teams - M&A Discussion',
        channel: 'saas-collab',
        destination: 'teams.microsoft.com',
        content: 'Microsoft Teams - Board Strategy Session CLASSIFIED\n\n[10:05] James Wong: The acquisition target is DataShield Asia. Valuation USD 12.5M.\n[10:15] Raymond Cheung: Funding from DBS account 003-456789-0. CFO guarantee on HKID P567890(1).\n[10:45] James Wong: STRICTLY CONFIDENTIAL - do not share outside this channel.'
      },
    ]
  },
  {
    category: 'Webmail / Personal Email',
    icon: '\ud83d\udce7',
    description: 'Sensitive corporate data sent to personal webmail accounts',
    samples: [
      {
        name: 'Gmail - Employee Data Exfil',
        channel: 'webmail',
        destination: 'mail.google.com',
        content: 'To: personal.backup@gmail.com\nFrom: employee@nextguard.com\nSubject: Notes from today\n\nJust saving some work info:\nThe Wong account - her ID is F234567(8)\nSalary: HKD 52,000/month\nBank: BOC 012-987654-321\nCard: 4532 8901 2345 6789 exp 09/28\nDon\'t forget to delete this after.'
      },
      {
        name: 'Yahoo - Financial Report',
        channel: 'webmail',
        destination: 'mail.yahoo.com',
        content: 'To: mybackup@yahoo.com\nSubject: Board Pack - Q4 2025\n\nSTRICTLY CONFIDENTIAL\nRevenue: HKD 12.3M\nEBITDA: HKD 2.87M (margin 23.4%)\nBank Balances:\n- HSBC Operating: 612-345678-901 - HKD 4,250,000\n- DBS Reserve: 003-456789-012 - HKD 8,100,000\nCFO: Raymond Cheung, HKID P567890(1)'
      },
      {
        name: 'Outlook Web - Clean Email',
        channel: 'webmail',
        destination: 'outlook.live.com',
        content: 'To: partner@skyguard.com\nSubject: Q1 2026 Company Update\n\nDear Partner,\n\nI am pleased to share our Q1 highlights:\n- Revenue grew 18% YoY\n- 15 new enterprise clients across APAC\n- Customer satisfaction 4.7/5.0\n- Team expanded to 45 members\n\nBest regards,\nJames Wong\nCEO, NextGuard Technology'
      },
    ]
  },
  {
    category: 'URL Data Exfiltration',
    icon: '\ud83d\udd17',
    description: 'Data hidden in URL parameters, paste sites, and encoded links',
    samples: [
      {
        name: 'Pastebin Upload',
        channel: 'url-exfil',
        destination: 'pastebin.com',
        content: 'Posting to pastebin.com/raw/abc123:\n\nNextGuard Internal Credentials:\nDB: postgresql://ngadmin:Pr0d_P@ss_2026@10.0.1.5:5432/nextguard_prod\nAWS: AKIAIOSFODNN7EXAMPLE / wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\nStripe: sk_live_EXAMPLE_NOT_REAL_KEY_demo_only_000000000000000000000000000000\n\nCustomer data: Chan Tai Man HKID E567890(1) CC 4532-8901-2345-6789'
      },
      {
        name: 'URL Parameter Leak',
        channel: 'url-exfil',
        destination: 'external-crm.com',
        content: 'Browser navigating to:\nhttps://external-crm.com/import?hkid=A123456(7)&credit_card=5407123456789012&password=Admin123!&token=sk_live_abc123\n\nQuery string contains sensitive PII and credentials embedded in URL parameters visible in logs and referrer headers.'
      },
      {
        name: 'Base64 Encoded Exfil',
        channel: 'url-exfil',
        destination: 'webhook.site',
        content: 'POST to webhook.site/unique-id\n\nPayload (base64):\nQ2hhbiBXaW5nIEtlaSwgSEtJRDogQTEyMzQ1Nig3KSwgQ0M6IDU0MDctMTIzNC01Njc4LTkwMTI=\n\nDecoded: Chan Wing Kei, HKID: A123456(7), CC: 5407-1234-5678-9012\n\nTraditional DLP cannot decode base64 to detect hidden PII.'
      },
    ]
  },
]
const DEFAULT_WEB_POLICY = {
  credit_card: { enabled: true, action: 'BLOCK', severity: 'critical', matchCount: 1, confidence: 'high', proximity: 300, direction: 'outbound', notifyAdmin: true, logContent: false, customPattern: '', schedule: 'always' },
  phone_hk: { enabled: true, action: 'AUDIT', severity: 'medium' },
  hkid: { enabled: true, action: 'BLOCK', severity: 'critical' },
  email_addr: { enabled: true, action: 'AUDIT', severity: 'low' },
  iban: { enabled: true, action: 'BLOCK', severity: 'high' },
  passport: { enabled: true, action: 'BLOCK', severity: 'high', matchCount: 1, confidence: 'high', proximity: 300, direction: 'outbound', notifyAdmin: true, logContent: false, customPattern: '', schedule: 'always' },
  sensitive_keywords: { enabled: true, action: 'QUARANTINE', severity: 'high', matchCount: 2, confidence: 'medium', proximity: 500, direction: 'both', notifyAdmin: true, logContent: true, customPattern: '', schedule: 'business_hours' },
  api_keys: { enabled: true, action: 'BLOCK', severity: 'critical', matchCount: 1, confidence: 'high', proximity: 0, direction: 'outbound', notifyAdmin: true, logContent: false, customPattern: '', schedule: 'always' },
  url_exfil: { enabled: true, action: 'BLOCK', severity: 'critical', matchCount: 1, confidence: 'high', proximity: 0, direction: 'outbound', notifyAdmin: true, logContent: true, customPattern: '', schedule: 'always' },
  file_type: { enabled: true, action: 'AUDIT', severity: 'medium', matchCount: 1, confidence: 'medium', proximity: 0, direction: 'outbound', notifyAdmin: false, logContent: true, customPattern: '', schedule: 'always' },
}

type PolicyKey = keyof typeof DEFAULT_WEB_POLICY

const POLICY_LABELS: Record<PolicyKey, string> = {
  credit_card: 'Credit Card Number',
  phone_hk: 'Phone Number (HK/Intl)',
  hkid: 'Hong Kong ID (HKID)',
  email_addr: 'Email Address',
  iban: 'IBAN / Bank Account',
  passport: 'Passport Number',
  sensitive_keywords: 'Sensitive Keywords',
  api_keys: 'API Keys / Secrets',
  url_exfil: 'URL Data Exfiltration',
  file_type: 'Sensitive File Reference',
}

const ACTIONS = ['BLOCK', 'QUARANTINE', 'AUDIT']
const SEVERITIES = ['critical', 'high', 'medium', 'low']; const CONFIDENCES = ['high', 'medium', 'low']; const DIRECTIONS = ['outbound', 'inbound', 'both']; const SCHEDULES = ['always', 'business_hours', 'off_hours', 'custom']

const CHANNEL_COLORS: Record<string, string> = {
  'web-form': 'bg-blue-900/50 text-blue-300',
  'cloud-upload': 'bg-purple-900/50 text-purple-300',
  'genai-prompt': 'bg-amber-900/50 text-amber-300',
  'social-media': 'bg-pink-900/50 text-pink-300',
  'saas-collab': 'bg-green-900/50 text-green-300',
  'webmail': 'bg-red-900/50 text-red-300',
  'url-exfil': 'bg-orange-900/50 text-orange-300',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TradResultCard({ result, loading, error, latency }: any) {
  return (
    <div className="bg-zinc-900 border border-green-700/50 rounded-xl p-5">
      <h3 className="text-lg font-bold mb-2 text-green-400">Traditional Web DLP</h3>
      <p className="text-xs text-zinc-500 mb-3">Forcepoint / Symantec / McAfee / Zscaler Style</p>
      {latency !== null && (
        <div className="text-xs text-zinc-400 mb-2">{latency < 1 ? '<1' : latency}ms <span className="text-green-500">(instant)</span></div>
      )}
      {loading && <div className="text-zinc-400 animate-pulse">Scanning...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold mb-2 ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          {result.verdict && <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${result.verdict === 'BLOCKED' ? 'bg-red-900 text-red-300' : result.verdict === 'FLAGGED' ? 'bg-yellow-900 text-yellow-300' : 'bg-green-900 text-green-300'}`}>{result.verdict}</div>}
          <div className="text-xs text-zinc-400">Method: {result.method}</div>
          {result.channel && <div className="text-xs text-zinc-500">Channel: {result.channel} | Dest: {result.destination}</div>}
          {result.totalMatches !== undefined && <div className="text-sm mt-1">Total Matches: {result.totalMatches}</div>}
          {result.findings && result.findings.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold">Findings ({result.findings.length}):</div>
              {result.findings.map((f: any, i: number) => (
                <div key={i} className="bg-zinc-800 rounded p-2 text-xs">
                  <span className="text-green-300">{f.rule}</span>
                  <span className={`ml-2 px-1 rounded ${f.action === 'BLOCK' ? 'bg-red-900 text-red-300' : f.action === 'QUARANTINE' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{f.action}</span>
                  <span className="ml-1 text-zinc-500">({f.severity})</span>
                  <div className="text-zinc-400 mt-1">Matches: {f.matches?.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
          {!result.detected && <div className="text-zinc-500 text-sm mt-2">No pattern matches found.</div>}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AIResultCard({ title, subtitle, color, result, loading, error, latency }: any) {
  return (
    <div className={`bg-zinc-900 border ${color} rounded-xl p-5`}>
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      {subtitle && <p className="text-xs text-zinc-500 mb-3">{subtitle}</p>}
      {latency !== null && (
        <div className="text-xs text-zinc-400 mb-2">{latency < 1000 ? latency + 'ms' : (latency / 1000).toFixed(2) + 's'}</div>
      )}
      {loading && <div className="text-zinc-400 animate-pulse">Analyzing with AI...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold mb-2 ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          {result.risk_level && <div className="text-sm mb-1">Risk: <span className="font-bold">{result.risk_level}</span></div>}
          {result.summary && <div className="text-sm text-zinc-300 mb-2 bg-zinc-800 rounded p-2">{result.summary}</div>}
          {result.findings && result.findings.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-sm font-semibold">Findings ({result.findings.length}):</div>
              {result.findings.map((f: any, i: number) => (
                <div key={i} className="bg-zinc-800 rounded p-2 text-xs">
                  <span className="text-cyan-300">{f.type}</span>
                  {f.confidence && <span className="ml-1 text-zinc-500">({f.confidence}%)</span>}
                  {f.evasion_technique && f.evasion_technique !== 'none' && (
                    <div className="text-amber-400 text-xs">Evasion: {f.evasion_technique}</div>
                  )}
                </div>
              ))}
            </div>
          )}
          {!result.detected && <div className="text-zinc-500 text-sm mt-2">No issues detected.</div>}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

export default function WebDLPComparePage() {
  const [text, setText] = useState('')
  const [channel, setChannel] = useState('web-form')
  const [destination, setDestination] = useState('')
  const [tradResult, setTradResult] = useState<any>(null)
  const [tradLoading, setTradLoading] = useState(false)
  const [tradError, setTradError] = useState('')
  const [tradLatency, setTradLatency] = useState<number | null>(null)
  const [pplxResult, setPplxResult] = useState<any>(null)
  const [pplxLoading, setPplxLoading] = useState(false)
  const [pplxError, setPplxError] = useState('')
  const [pplxLatency, setPplxLatency] = useState<number | null>(null)
  const [cfResult, setCfResult] = useState<any>(null)
  const [cfLoading, setCfLoading] = useState(false)
  const [cfError, setCfError] = useState('')
  const [cfLatency, setCfLatency] = useState<number | null>(null)
  const [activeCategory, setActiveCategory] = useState(0)
  const [selectedSample, setSelectedSample] = useState('')
  const [showPolicy, setShowPolicy] = useState(false)
  const [policy, setPolicy] = useState(JSON.parse(JSON.stringify(DEFAULT_WEB_POLICY)))
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/warmup-cloudflare').catch(() => {})
  }, [])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updatePolicy(key: PolicyKey, field: string, value: any) {
    setPolicy((prev: any) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }

  function resetPolicy() {
    setPolicy(JSON.parse(JSON.stringify(DEFAULT_WEB_POLICY)))
  }

  const runCompare = async () => {
    if (!text.trim()) return
    setTradResult(null); setTradError(''); setTradLatency(null); setTradLoading(true)
    setPplxResult(null); setPplxError(''); setPplxLatency(null); setPplxLoading(true)
    setCfResult(null); setCfError(''); setCfLatency(null); setCfLoading(true)

    // Traditional Web DLP
    const tradPromise = (async () => {
      const t0 = performance.now()
      try {
        const res = await fetch('/api/web-dlp-scan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: text, channel, destination, policy })
        })
        const data = await res.json()
        setTradLatency(Math.round(performance.now() - t0))
        setTradResult(data)
      } catch { setTradError('Traditional Web DLP scan failed') }
      setTradLoading(false)
    })()

    // AI Web DLP (Perplexity Sonar)
    const pplxPromise = (async () => {
      const t1 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `[Web DLP - Channel: ${channel}, Destination: ${destination}]\n${text}`, mode: 'ai', policy })
        })
        const data = await res.json()
        setPplxLatency(Math.round(performance.now() - t1))
        setPplxResult(data)
      } catch { setPplxError('Perplexity API error') }
      setPplxLoading(false)
    })()

    // Edge AI (Cloudflare Workers)
    const cfPromise = (async () => {
      const t2 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp-cloudflare', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: `[Web DLP - Channel: ${channel}, Destination: ${destination}]\n${text}`, policy })
        })
        const data = await res.json()
        setCfLatency(Math.round(performance.now() - t2))
        setCfResult(data)
      } catch { setCfError('Cloudflare AI error') }
      setCfLoading(false)
    })()

    await Promise.all([tradPromise, pplxPromise, cfPromise])
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold mb-2">NextGuard Web DLP Engine Comparison</h1>
        <p className="text-zinc-400 mb-6">Compare Traditional Web DLP (Forcepoint/Symantec/Zscaler) vs AI Web DLP (Perplexity Sonar) vs Edge AI (Cloudflare Workers)</p>

        {/* Policy Settings */}
        <button onClick={() => setShowPolicy(!showPolicy)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium mb-4 flex items-center gap-2">
          Web DLP Policy Settings {showPolicy ? '\u25b2' : '\u25bc'}
        </button>
        {showPolicy && <EnterprisePolicyConfig policy={policy} setPolicy={setPolicy} resetPolicy={resetPolicy} />}

        {/* Scenario Categories */}
        <div className="flex flex-wrap gap-2 mb-4">
          {WEB_SCENARIOS.map((cat, ci) => (
            <button key={ci} onClick={() => setActiveCategory(ci)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === ci ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>
              {cat.icon} {cat.category}
            </button>
          ))}
        </div>
        <p className="text-sm text-zinc-500 mb-3">{WEB_SCENARIOS[activeCategory].description}</p>

        {/* Sample Buttons */}
        <div className="flex flex-wrap gap-2 mb-4">
          {WEB_SCENARIOS[activeCategory].samples.map((s, si) => (
            <button key={si} onClick={() => {
              setText(s.content)
              setChannel(s.channel)
              setDestination(s.destination)
              setSelectedSample(s.name)
              setTradResult(null); setPplxResult(null); setCfResult(null)
            }} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSample === s.name ? 'bg-cyan-700 text-white ring-2 ring-cyan-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>
              {s.name}
            </button>
          ))}
        </div>

        {/* Channel & Destination Info */}
        {channel && (
          <div className="flex gap-3 mb-4 text-xs">
            <span className={`px-2 py-1 rounded ${CHANNEL_COLORS[channel] || 'bg-zinc-800 text-zinc-400'}`}>Channel: {channel}</span>
            {destination && <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">Destination: {destination}</span>}
          </div>
        )}

        {/* Textarea */}
        <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Select a web scenario above or paste content to scan..." className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-cyan-500 font-mono text-sm" />

        <button onClick={runCompare} disabled={!text.trim() || (tradLoading && pplxLoading && cfLoading)} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl mb-6 transition">
          {(tradLoading || pplxLoading || cfLoading) ? 'Comparing...' : 'Compare All 3 Engines'}
        </button>

        {/* 3-Column Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TradResultCard result={tradResult} loading={tradLoading} error={tradError} latency={tradLatency} />
          <AIResultCard title="Perplexity Sonar (Cloud AI)" subtitle="AI Web DLP - Deep context understanding" color="border-cyan-600" result={pplxResult} loading={pplxLoading} error={pplxError} latency={pplxLatency} />
          <AIResultCard title="Cloudflare Workers AI (Edge)" subtitle="Hybrid - AI at the edge, data stays local" color="border-purple-600" result={cfResult} loading={cfLoading} error={cfError} latency={cfLatency} />
        </div>

        {/* Performance Summary */}
        {tradLatency !== null && pplxLatency !== null && cfLatency !== null && (
          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Performance Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-mono font-bold text-green-400">{tradLatency < 1 ? '<1' : tradLatency}ms</div>
                <div className="text-sm text-zinc-400">Traditional Web DLP</div>
                <div className="text-xs text-orange-400 mt-1">Regex only - misses obfuscated & context-based data</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-cyan-400">{(pplxLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Perplexity Sonar (Cloud AI)</div>
                <div className="text-xs text-cyan-400 mt-1">Understands context, intent & evasion techniques</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-purple-400">{(cfLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Cloudflare Workers AI (Edge)</div>
                <div className="text-xs text-purple-400 mt-1">Edge AI - data never leaves the region</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-zinc-500 text-center">
              Traditional Web DLP (Forcepoint/Symantec/Zscaler style) is fastest but only matches known patterns. AI Web DLP catches obfuscated data, context leaks, and evasion techniques. Edge AI keeps sensitive data within compliance boundaries.
            </div>
          </div>
        )}

              {/* Web Proxy SWG Configuration */}
      <WebProxySWGConfig />

      {/* SWG Live Testing Console */}
      <SWGLiveTest />
      </div>
    </div>
  )
}
