'use client'
import { useState, useRef, useEffect } from 'react'

const SAMPLE_CATEGORIES = [
  {
    category: 'PII Detection',
    icon: '\ud83d\udd10',
    description: 'Personal Identifiable Information detection scenarios',
    samples: [
      { name: 'Standard PII (Baseline)', content: 'Customer Record:\nName: John Chan Wing Kei\nHKID: A123456(7)\nPhone: +852 6789 0000\nCredit Card: 5407 1234 5678 9012\nEmail: john.chan@example.com\nAddress: Flat 12A, Tower 3, Taikoo Shing, Hong Kong' },
      { name: 'Obfuscated PII (Evasion)', content: 'Jo&&@hn Ch&&@an W&&@ing K&&@ei\nHK&&@ID: A1&&@23&&@456(7)\n+85&&@2 678&&@9 00&&@00\n54&&@07 12&&@34 56&&@78 90&&@12\njo&&@hn.ch&&@an@exa&&@mple.com' },
      { name: 'Spaced Character Evasion', content: 'N a m e: J o h n C h a n\nH K I D: A 1 2 3 4 5 6 (7)\nP h o n e: + 8 5 2 6 7 8 9 0 0 0 0\nC r e d i t C a r d: 5 4 0 7 1 2 3 4 5 6 7 8 9 0 1 2' },
      { name: 'Homoglyph Attack', content: 'Name: J\u043ehn Ch\u0430n (using Cyrillic o and a)\nHKID: \u0410123456(7) (Cyrillic A)\nPhone: +852 \u0431789 0000\nCC: 54O7 l234 5678 90l2 (O=zero, l=one)' },
      { name: 'Mixed Language PII', content: '\u59d3\u540d: \u9673\u5927\u6587 (Chan Tai Man)\nHKID: B987654(3)\n\u96fb\u8a71: +852-9876-5432\n\u4fe1\u7528\u5361: 4532-8901-2345-6789\n\u5730\u5740: \u9999\u6e2f\u4e2d\u74b0\u7687\u540e\u5927\u9053\u4e2d18\u865f' },
      { name: 'PII in Code/JSON Format', content: '{"user": {"firstName": "Wing", "lastName": "Chan", "id_number": "C234567(8)", "mobile": "85291234567", "payment": {"card": "4111111111111111", "exp": "12/27", "cvv": "123"}}}' },
    ]
  },
  {
    category: 'GDPR Compliance',
    icon: '\ud83c\uddea\ud83c\uddfa',
    description: 'EU General Data Protection Regulation scenarios',
    samples: [
      { name: 'EU Citizen Data (Standard)', content: 'GDPR Subject Data:\nName: Hans M\u00fcller\nNationality: German\nPassport: C01X00T47\nIBAN: DE89 3704 0044 0532 0130 00\nEmail: hans.mueller@beispiel.de\nDOB: 15/03/1985\nHealth: Type 2 Diabetes, prescribed Metformin 500mg' },
      { name: 'GDPR Evasion (Obfuscated)', content: 'Ha&&@ns Mu&&@ller\nPassp&&@ort: C0&&@1X0&&@0T47\nIB&&@AN: DE&&@89 37&&@04 00&&@44 05&&@32 01&&@30 00\nDO&&@B: 15/0&&@3/19&&@85\nHea&&@lth: Ty&&@pe 2 Dia&&@betes' },
      { name: 'Multi-Country GDPR PII', content: 'EU Customer Database Export:\n1. Marie Dubois (France) - SSN: 2 85 01 75 108 042 36 - IBAN: FR76 3000 6000 0112 3456 7890 189\n2. Giuseppe Rossi (Italy) - CF: RSSGPP85M15H501Z - IBAN: IT60 X054 2811 1010 0000 0123 456\n3. Ana Silva (Portugal) - NIF: 123456789 - IBAN: PT50 0002 0123 1234 5678 9015 4' },
      { name: 'GDPR Special Category Data', content: 'Patient Transfer Note (Confidential):\nPatient: Sofia Andersen, DOB: 22/06/1990\nDanish CPR: 220690-1234\nDiagnosis: Bipolar Disorder Type II\nMedication: Lithium 900mg daily\nReligion: Muslim (dietary requirements noted)\nTrade Union: Member of 3F since 2015\nBiometric: Fingerprint ID enrolled for ward access' },
      { name: 'GDPR Data in Spreadsheet Format', content: 'employee_id,full_name,email,national_id,salary_eur,health_condition\nEMP001,Klaus Weber,k.weber@firma.de,DE-1234567890,85000,Asthma\nEMP002,Elena Popov,e.popov@firma.de,BG-9901011234,62000,None\nEMP003,Pierre Martin,p.martin@firma.de,FR-185017510804236,91000,Hypertension' },
    ]
  },
  {
    category: 'Advanced Evasion',
    icon: '\ud83d\udee1\ufe0f',
    description: 'Techniques that bypass traditional Regex/Pattern DLP',
    samples: [
      { name: 'Base64 Encoded PII', content: 'Please process this customer record:\nData: Sm9obiBDaGFuLCBIS0lEOiBBMTIzNDU2KDcpLCBDQzogNTQwNy0xMjM0LTU2NzgtOTAxMg==\n(This is base64 encoded PII that pattern-based DLP cannot read)' },
      { name: 'Reverse Text Evasion', content: 'Customer info (read backwards):\n2109-8765-4321-7045 :draC tiderC\n0000 9876 258+ :enohP\n)7(654321A :DIKH\nnaK gniW nahC nhoJ :emaN' },
      { name: 'Leetspeak/Symbol Substitution', content: 'Cu5t0m3r: J0hn_Ch4n\nHK!D: @123456(7)\nPh0n3: +852.6789.0000\nCr3d!t_C4rd: five-four-zero-seven 1234 5678 9012\n3m4!l: john[dot]chan[at]example[dot]com' },
      { name: 'Contextual PII (No Direct Pattern)', content: 'Meeting notes: Discussed the Wong account. The client born in the year of the dragon, 1988, March 15th. His government ID ends with the lucky number 8, full sequence A-one-two-three-four-five-six-eight. Prefers contact on his HK mobile starting with nine-one-two, then three-four-five-six-seven-eight-nine.' },
      { name: 'Steganographic Text', content: 'The Joyful Orchestra Harmonized Naturally. Creating Harmonious Art Naturally.\nHis Kingdom Identity Document: Alpha 1 2 3 4 5 6 (7)\nPlease Have One Nice Experience: +Eight Five Two, 6789-0000\nCool Card: 5407_1234_5678_9012\n(First letters of first sentence spell JOHN CHAN)' },
      { name: 'Multilingual Evasion', content: 'Kundendaten (\u5ba2\u6237\u6570\u636e):\nName/\u540d\u524d: \u30e8\u30cf\u30cd\u30b9 M\u00fcller (Johannes)\nReisepass/\u62a4\u7167: C01X00T47\nBankverbindung: D-E-8-9 3704 0044 0532 0130 00\nGesundheit/\u5065\u5eb7: \u7cd6\u5c3f\u75c5 (Diabetes mellitus Typ 2)' },
    ]
  },
  {
    category: 'Industry Scenarios',
    icon: '\ud83c\udfe2',
    description: 'Real-world DLP scenarios from financial, healthcare, HR',
    samples: [
      { name: 'Financial Data Leak', content: 'URGENT - Wire Transfer Details:\nBeneficiary: Chan Wing Kei Holdings Ltd\nAccount: 012-345-678901-234\nSWIFT: HSBCHKHH\nAmount: HKD 2,500,000\nPurpose: Q4 Dividend Payment\nAuthorized by: CFO James Wong (Staff ID: FIN-0042)\nApproval Code: WTX-2026-0228-HK' },
      { name: 'Healthcare Record Leak', content: 'CONFIDENTIAL - Patient Discharge Summary\nPatient: WONG Siu Ming (M, 67)\nHKID: D876543(2)\nAdmission: 15-Feb-2026, Queen Mary Hospital\nDiagnosis: Acute Myocardial Infarction (STEMI)\nProcedure: PCI with DES to LAD\nMedications: Aspirin 80mg, Clopidogrel 75mg, Atorvastatin 40mg\nFollow-up: Cardiology OPD 2 weeks\nInsurance: Policy# AIA-HK-9988776' },
      { name: 'HR Payroll Data', content: 'Monthly Payroll - February 2026 (RESTRICTED)\n\nEMP-101, Chan Tai Man, HKID: E567890(1), Basic: HKD 45,000, MPF: HKD 1,500, Net: HKD 43,500, HSBC 400-123456-001\nEMP-102, Wong Mei Ling, HKID: F234567(8), Basic: HKD 52,000, MPF: HKD 1,500, Net: HKD 50,500, BOC 012-987654-321\nEMP-103, Lee Ka Fai, HKID: G345678(9), Basic: HKD 38,000, MPF: HKD 1,500, Net: HKD 36,500, SCB 123-456789-012' },
      { name: 'GenAI Prompt Leak', content: 'ChatGPT prompt from user:\n"Help me write a cover letter. My details: Li Wei, HKID H456789(0), I graduated from HKU in 2020. My phone is 852-6543-2100. I currently earn HKD 55,000/month at HSBC account 583-123456-838. My manager Mr. David Chen (HKID K789012(3)) can be contacted at david.chen@hsbc.com.hk"' },
      { name: 'Clean Business Report', content: 'Q4 2025 Performance Summary:\nRevenue grew 15.3% YoY to HKD 127M driven by APAC expansion.\nNew enterprise clients: 23 (target: 20)\nCustomer retention: 94.2%\nR&D investment increased to 18% of revenue.\nHeadcount: 342 FTE across 5 offices.\nNo material compliance incidents reported.' },
    ]
  },
  {
    category: 'Policy Keywords',
    icon: '\ud83d\udcdd',
    description: 'Test sensitive keyword and classification detection',
    samples: [
      { name: 'Single Keyword: confidential', content: 'confidential' },
      { name: 'Single Keyword: secret', content: 'secret' },
      { name: 'Classification in Context', content: 'This document is classified as CONFIDENTIAL and should not be shared externally.' },
      { name: 'Password in Text', content: 'Please use password: Admin123! to access the internal portal.' },
      { name: 'Mixed Keywords', content: 'INTERNAL ONLY - Do not distribute\nThis secret project codenamed Phoenix is classified.\nAll documents marked confidential must be encrypted.' },
    ]
  },
  {
    category: 'Contract & Legal',
    icon: '📄',
    description: 'Simulate DLP scanning contract text, NDA clauses, M&A terms',
    samples: [
      { name: 'NDA Agreement Excerpt', content: 'NON-DISCLOSURE AGREEMENT\n\nThis Agreement is entered into as of 15 February 2026 between NextGuard Technology Limited ("Disclosing Party") and Skyguard Holdings Co. Ltd. ("Receiving Party").\n\n1. CONFIDENTIAL INFORMATION\nThe Receiving Party agrees to keep strictly confidential all proprietary information including but not limited to: source code, customer lists, financial projections, product roadmaps, and pricing structures disclosed by the Disclosing Party.\n\n2. RESTRICTED PERSONNEL\nAccess shall be limited to: James Wong (CEO, HKID: K234567(8), james.wong@nextguard.com), Sarah Lam (CTO, HKID: L345678(9), sarah.lam@nextguard.com).\n\n3. PENALTY\nBreach of this agreement shall result in liquidated damages of HKD 5,000,000.' },
      { name: 'M&A Term Sheet', content: 'STRICTLY CONFIDENTIAL - PROJECT PHOENIX\nMERGER & ACQUISITION TERM SHEET\n\nTarget Company: DataShield Asia Pte Ltd\nAcquirer: NextGuard Technology Limited\nProposed Valuation: USD 12,500,000 (pre-money)\nDeal Structure: 70% cash + 30% equity swap\n\nKey Personnel Retained:\n- Dr. Chan Ming Fai (Founder, HKID: M456789(0)) - 24 month earnout\n- Ms. Wong Pui Yi (VP Engineering) - 18 month retention package HKD 1,800,000\n\nBank Escrow: HSBC Account 412-567890-123 (HKD 3,750,000 deposit)\n\nDO NOT CIRCULATE - Attorney-Client Privileged' },
      { name: 'Vendor Contract PII', content: 'SERVICE AGREEMENT - SCHEDULE A\nVendor: TechPro Solutions Ltd\nClient Contact: Mr. Raymond Cheung, HKID P567890(1), +852 9123 4567, raymond.cheung@techpro.com.hk\n\nPayment Terms:\n- Monthly retainer: HKD 85,000\n- Bank: Bank of China, Account: 01287654321, Branch: Central\n- Authorised signatory: Raymond Cheung\n\nINTERNAL ONLY - Procurement reference: PROC-2026-0089\nDo not distribute outside Finance and Legal departments.' },
      { name: 'Employment Contract', content: 'EMPLOYMENT CONTRACT (CONFIDENTIAL)\n\nEmployee: Chan Siu Kwan\nHKID: Q678901(2)\nDate of Birth: 12 March 1990\nBank Account (Salary): Hang Seng Bank 218-123456-001\n\nPosition: Senior Security Engineer\nMonthly Salary: HKD 65,000\nAnnual Bonus Target: 15% of annual salary\nStock Options: 50,000 shares vesting over 4 years\n\nMedical History Declaration: No pre-existing conditions\nEmergency Contact: Chan Wai Man, +852 6543 2109 (Mother)\n\nCLASSIFIED - HR USE ONLY' },
    ],
  },
  {
    category: 'Source Code & Credentials',
    icon: '\ud83d\udcbb',
    description: 'Detect API keys, database credentials, hardcoded secrets',
    samples: [
      { name: 'Hardcoded API Keys in Code', content: '// config.js - DO NOT COMMIT TO PUBLIC REPO\nconst config = {\n  database: {\n    host: \'db.internal.nextguard.com\',\n    user: \'admin\',\n    password: \'Ng@Pr0d#2026!Secure\',\n    port: 5432\n  },\n  stripe: {\n    secretKey: \'sk_live_EXAMPLE_NOT_REAL_KEY_demo_only_000000000000000000000000000000\',\n    webhookSecret: \'whsec_EXAMPLE_NOT_REAL_WEBHOOK_SECRET\'\n  },\n  aws: {\n    accessKeyId: \'AKIAIOSFODNN7EXAMPLE\',\n    secretAccessKey: \'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\',\n    region: \'ap-east-1\'\n  },\n  jwt: { secret: \'mySuperSecretJWTKey_NextGuard_2026_DoNotShare\' }\n}' },
      { name: 'Database Schema with PII', content: '-- INTERNAL: Production DB Schema Dump\n-- Server: prod-db-01.nextguard.internal\n\nCREATE TABLE customers (\n  id SERIAL PRIMARY KEY,\n  full_name VARCHAR(100),\n  hkid CHAR(10),\n  email VARCHAR(200),\n  credit_card_hash VARCHAR(64),\n  salary DECIMAL(12,2)\n);\n\nINSERT INTO customers VALUES (1, \'Wong Siu Ming\', \'D876543(2)\', \'wong@test.com\', \'5407123456789012\', 85000.00);\nINSERT INTO customers VALUES (2, \'Lee Ka Fai\', \'E234567(8)\', \'lee@example.hk\', \'4111111111111111\', 62000.00);' },
      { name: 'DevOps Config with Secrets', content: '# docker-compose.prod.yml - RESTRICTED\nservices:\n  api:\n    environment:\n      - DATABASE_URL=postgresql://ngadmin:Pr0d_P@ss_2026@10.0.1.5:5432/nextguard_prod\n      - REDIS_URL=redis://:RedisS3cr3t@10.0.1.6:6379\n      - SENDGRID_API_KEY=SG.abcdefghijklmnop.QRSTUVWXYZ1234567890abcdefghijklmnop\n      - INTERNAL_ADMIN_PASSWORD=Admin@NextGuard2026!' },
    ],
  },
  {
    category: 'Email & Collaboration',
    icon: '\ud83d\udce7',
    description: 'Intercept sensitive data shared via email threads, Slack messages',
    samples: [
      { name: 'Email with Sensitive Attachment', content: 'From: james.wong@nextguard.com\nTo: partner@skyguard.com\nSubject: RE: Q1 2026 Financial Results - CONFIDENTIAL\n\nPlease find attached the Q1 board pack. Key highlights:\n- Revenue: HKD 12.3M (target: HKD 10M)\n- EBITDA margin: 23.4%\n\nOur HSBC operating account (612-345678-901) received the milestone payment of HKD 875,000 from AIA on 25 Feb.\n\nCustomer contact at AIA: Ms. Grace Chu (grace.chu@aia.com, +852 3919 3919).\n\nThis email and attachments are STRICTLY CONFIDENTIAL. Do not forward.' },
      { name: 'Slack Message Data Leak', content: '[Slack Export - #engineering-private]\n[2026-02-28 14:23] sarah.lam: Hey team, prod DB password needs updating. Current one is Ng@Pr0d#2026! - please update your local configs\n[2026-02-28 14:25] dev.chan: Got it. Also the AWS key AKIAIOSFODNN7EXAMPLE is still in the old repo right?\n[2026-02-28 14:28] dev.chan: Also re: the Wong account (HKID D876543(2)) - their contract is up for renewal, CC details are 5407 1234 5678 9012 exp 03/27' },
      { name: 'Teams Meeting Transcript', content: 'Microsoft Teams - Meeting Transcript\nMeeting: Board Strategy Session - PROJECT CLASSIFIED\nDate: 28 Feb 2026\nParticipants: James Wong (CEO), Sarah Lam (CTO), Raymond Cheung (CFO)\n\n[10:05] James Wong: The acquisition target is DataShield Asia. Valuation agreed at USD 12.5M.\n[10:15] Raymond Cheung: Funding confirmed from our DBS account 003-456789-0. CFO personal guarantee on HKID P567890(1).\n[10:45] James Wong: This transcript is STRICTLY CONFIDENTIAL.' },
      { name: 'Cloud Storage Shared Link', content: 'Shared Google Drive Link: https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view\nFile: NextGuard_Customer_Database_Feb2026.xlsx\nShared by: raymond.cheung@nextguard.com\nShared with: external-auditor@pwc.com.hk\n\nFile Contents Preview:\nCustomer ID, Name, HKID, Phone, Credit Card, Contract Value\nCUST-001, Chan Tai Man, E567890(1), +852 9876 5432, 4532 8901 2345 6789, HKD 480,000\nCUST-002, Wong Mei Ling, F234567(8), +852 6543 2109, 5407 1234 5678 9012, HKD 720,000\n\nWARNING: File marked RESTRICTED - sharing with external parties requires CISO approval' },
    ],
  },
]

const DEFAULT_POLICY = {
  credit_card: { enabled: true, action: 'BLOCK', severity: 'critical' },
  phone_hk: { enabled: true, action: 'AUDIT', severity: 'medium' },
  hkid: { enabled: true, action: 'BLOCK', severity: 'critical' },
  email: { enabled: true, action: 'AUDIT', severity: 'low' },
  name_phrases: { enabled: true, action: 'AUDIT', severity: 'low' },
  sensitive_keywords: { enabled: true, action: 'QUARANTINE', severity: 'high' },
}
type PolicyKey = keyof typeof DEFAULT_POLICY
const POLICY_LABELS: Record<PolicyKey, string> = {
  credit_card: 'Credit Card Number',
  phone_hk: 'Hong Kong Phone Number',
  hkid: 'Hong Kong ID (HKID)',
  email: 'Email Address',
  name_phrases: 'Common Name Patterns',
  sensitive_keywords: 'Sensitive Keywords',
}
const ACTIONS = ['BLOCK', 'QUARANTINE', 'AUDIT']
const SEVERITIES = ['critical', 'high', 'medium', 'low']

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TradResultCard({ result, loading, error, latency }: any) {
  return (
    <div className="bg-zinc-900 border border-orange-600 rounded-xl p-6">
      <h3 className="text-lg font-bold text-white mb-1">Traditional DLP (Regex + Dictionary)</h3>
      {latency !== null && (
        <div className="text-2xl font-mono font-bold mb-3 text-green-400">
          {latency < 1 ? '<1' : latency}ms
          <span className="text-sm font-normal text-zinc-400 ml-2">(instant)</span>
        </div>
      )}
      {loading && <div className="text-cyan-400 animate-pulse">Scanning...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          <div className="text-sm text-zinc-400 mt-1">Method: {result.method}</div>
          {result.totalMatches !== undefined && <div className="text-sm text-zinc-400">Total Matches: {result.totalMatches}</div>}
          {result.findings && result.findings.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-zinc-500 mb-1">Findings ({result.findings.length}):</div>
              {result.findings.map((f: any, i: number) => (
                <div key={i} className="bg-zinc-800 rounded p-3 mb-1 max-h-40 overflow-y-auto">
                  <span className="text-orange-400 font-bold">{f.rule}</span>
                  &nbsp;&nbsp;<span className="text-zinc-400">{f.action}</span>
                  &nbsp;&nbsp;<span className="text-zinc-500">({f.severity})</span>
                  <div className="text-xs text-zinc-400 mt-1">Matches: {f.matches?.join(', ')}</div>
                </div>
              ))}
            </div>
          )}
          {!result.detected && <div className="text-sm text-zinc-500 mt-2">No pattern matches found.</div>}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AIResultCard({ title, color, result, loading, error, latency }: any) {
  return (
    <div className={`bg-zinc-900 border ${color} rounded-xl p-6`}>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      {latency !== null && (
        <div className="text-2xl font-mono font-bold mb-3 text-cyan-400">
          {latency < 1000 ? latency + 'ms' : (latency / 1000).toFixed(2) + 's'}
        </div>
      )}
      {loading && <div className="text-cyan-400 animate-pulse">Analyzing with AI...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {result && !loading && (
        <div>
          <div className={`text-lg font-bold ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
            {result.detected ? '\u26a0\ufe0f VIOLATION DETECTED' : '\u2705 CLEAN'}
          </div>
          {result.risk_level && <div className="text-sm text-zinc-400 mt-1">Risk: {result.risk_level}</div>}
          {result.summary && (
            <div className="text-sm text-zinc-400 mt-2 bg-zinc-800 rounded p-3 max-h-40 overflow-y-auto">{result.summary}</div>
          )}
          {result.findings && result.findings.length > 0 && (
            <div className="mt-2">
              <div className="text-xs text-zinc-500 mb-1">Findings ({result.findings.length}):</div>
              {result.findings.map((f: any, i: number) => (
                <div key={i} className="bg-zinc-800 rounded p-2 mb-1 text-xs">
                  <span className="text-orange-400">{f.type}</span>
                  {f.decoded_value && <span className="text-zinc-400 ml-2">= {f.decoded_value}</span>}
                  {f.confidence && <span className="text-zinc-500 ml-2">({f.confidence}%)</span>}
                  {f.evasion_technique && f.evasion_technique !== 'none' && <div className="text-yellow-500 mt-1">Evasion: {f.evasion_technique}</div>}
                </div>
              ))}
            </div>
          )}
          {!result.detected && <div className="text-sm text-zinc-500 mt-2">No issues detected.</div>}
        </div>
      )}
      {!result && !loading && !error && <div className="text-zinc-600">Click Compare to start</div>}
    </div>
  )
}

export default function ComparePage() {
  const [text, setText] = useState('')
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
  const [policy, setPolicy] = useState(JSON.parse(JSON.stringify(DEFAULT_POLICY)))
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileRawText, setFileRawText] = useState('')
  const [fileOcrText, setFileOcrText] = useState('')
  const [isScannedFile, setIsScannedFile] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [virusScanning, setVirusScanning] = useState(false)
  const [virusScanResult, setVirusScanResult] = useState<{safe: boolean; message: string; skipped?: boolean} | null>(null)
  const BINARY_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.jpg', '.jpeg', '.png']

    // Pre-warm Cloudflare Workers AI on page load to avoid cold start
  useEffect(() => {
    const warmup = async () => {
      try {
        await fetch('/api/warmup-cloudflare')
        console.log('Cloudflare AI pre-warmed successfully')
      } catch (e) {
        console.warn('Cloudflare AI warmup failed:', e)
      }
    }
    warmup()
  }, [])
  const MAX_FILE_SIZE = 5 * 1024 * 1024

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function updatePolicy(key: PolicyKey, field: string, value: any) {
    setPolicy((prev: any) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
  }
  function resetPolicy() { setPolicy(JSON.parse(JSON.stringify(DEFAULT_POLICY))) }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large! Maximum size is 5MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploadedFileName(file.name)
    setVirusScanResult(null)
    setVirusScanning(true)
    try {
      const vsForm = new FormData()
      vsForm.append('file', file)
      const vsRes = await fetch('/api/virus-scan', { method: 'POST', body: vsForm })
      const vsData = await vsRes.json()
      setVirusScanResult(vsData)
      if (!vsData.safe) {
        setVirusScanning(false)
        setText(`\u26a0\ufe0f THREAT DETECTED: ${vsData.message}\n\nThis file has been blocked for security reasons.`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
    } catch {
      setVirusScanResult({ safe: true, skipped: true, message: 'Virus scan unavailable' })
    } finally { setVirusScanning(false) }
    setTradResult(null); setPplxResult(null); setCfResult(null)
    const isBinary = BINARY_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (isBinary) {
      setExtracting(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.error) { setText(`[Error] ${data.error}`) }
        else {
          setText(data.isScanned ? `[Scanned file: ${file.name} - OCR text extracted for DLP analysis]` : data.text)
          setFileRawText(data.rawText || ''); setFileOcrText(data.ocrText || ''); setIsScannedFile(data.isScanned || false)
        }
      } catch (err: any) { setText(`[Error extracting text: ${err.message}]`) }
      finally { setExtracting(false) }
    } else {
      try { const t = await file.text(); setText(t) } catch { setText(`[Error reading file: ${file.name}]`) }
    }
    setSelectedSample('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const runCompare = async () => {
    if (!text.trim()) return
    const scanContent = isScannedFile ? (fileOcrText || fileRawText || text) : text
    setTradResult(null); setTradError(''); setTradLatency(null); setTradLoading(true)
    setPplxResult(null); setPplxError(''); setPplxLatency(null); setPplxLoading(true)
    setCfResult(null); setCfError(''); setCfLatency(null); setCfLoading(true)
    const tradPromise = (async () => {
      const t0 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp-traditional', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: scanContent, policy }) })
        const data = await res.json()
        setTradLatency(Math.round(performance.now() - t0))
        setTradResult(data)
      } catch { setTradError('Traditional DLP scan failed') }
      setTradLoading(false)
    })()
    const pplxPromise = (async () => {
      const t1 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: scanContent, mode: 'ai', policy }) })
        const data = await res.json()
        setPplxLatency(Math.round(performance.now() - t1))
        setPplxResult(data)
      } catch { setPplxError('Perplexity API error') }
      setPplxLoading(false)
    })()
    const cfPromise = (async () => {
      const t2 = performance.now()
      try {
        const res = await fetch('/api/ai-dlp-cloudflare', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: scanContent, policy }) })
        const data = await res.json()
        setCfLatency(Math.round(performance.now() - t2))
        setCfResult(data)
      } catch { setCfError('Cloudflare AI error') }
      setCfLoading(false)
    })()
    await Promise.all([tradPromise, pplxPromise, cfPromise])
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 px-4 pb-12">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-cyan-400 mb-2 text-center">NextGuard DLP Engine Comparison</h1>
        <p className="text-zinc-400 mb-6 text-center">Compare Traditional DLP vs Perplexity Sonar (Cloud AI) vs Cloudflare Workers AI (Edge AI)</p>

        {/* Policy Settings Toggle */}
        <div className="mb-4">
          <button onClick={() => setShowPolicy(!showPolicy)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            ⚙️ DLP Policy Settings {showPolicy ? '\u25b2' : '\u25bc'}
          </button>
          {showPolicy && (
            <div className="mt-3 bg-zinc-900 border border-zinc-700 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-white">⚙️ DLP Policy Configuration</h3>
                <button onClick={resetPolicy} className="text-xs text-cyan-400 hover:text-cyan-300">Reset to Default</button>
              </div>
              <p className="text-xs text-zinc-500 mb-3">Configure detection rules, actions, and severity levels.</p>
              <table className="w-full text-xs">
                <thead><tr className="text-zinc-500"><th className="text-left py-1">Enabled</th><th className="text-left">Rule</th><th className="text-left">Action</th><th className="text-left">Severity</th></tr></thead>
                <tbody>
                  {(Object.keys(policy) as PolicyKey[]).map(key => (
                    <tr key={key} className="border-t border-zinc-800">
                      <td className="py-2"><input type="checkbox" checked={policy[key].enabled} onChange={e => updatePolicy(key, 'enabled', e.target.checked)} className="accent-cyan-500" /></td>
                      <td className="text-zinc-300">{POLICY_LABELS[key]}</td>
                      <td><select value={policy[key].action} onChange={e => updatePolicy(key, 'action', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">{ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}</select></td>
                      <td><select value={policy[key].severity} onChange={e => updatePolicy(key, 'severity', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">{SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sample Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-4">
          <div className="flex flex-wrap gap-2 mb-3">
            {SAMPLE_CATEGORIES.map((cat, ci) => (
              <button key={ci} onClick={() => setActiveCategory(ci)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === ci ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>{cat.icon} {cat.category}</button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mb-2">{SAMPLE_CATEGORIES[activeCategory].description}</p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CATEGORIES[activeCategory].samples.map((s, si) => (
              <button key={si} onClick={() => { setText(s.content); setSelectedSample(s.name); setUploadedFileName(''); setFileRawText(''); setFileOcrText(''); setIsScannedFile(false); setVirusScanResult(null); setTradResult(null); setPplxResult(null); setCfResult(null) }} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSample === s.name ? 'bg-cyan-700 text-white ring-2 ring-cyan-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>{s.name}</button>
            ))}
          </div>

          {/* File Upload */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.json,.xml,.log,.md,.html,.js,.ts,.py,.sql,.yml,.yaml,.env,.cfg,.conf,.ini,.pdf,.docx,.xlsx,.xls,.pptx,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">📂 Upload File</button>
            {uploadedFileName && <span className="text-xs text-cyan-400">📄 {uploadedFileName}</span>}
            {virusScanning && <span className="text-xs text-yellow-400 animate-pulse">🔒 Scanning for viruses...</span>}
            {extracting && <span className="text-xs text-cyan-400 animate-pulse">Extracting text from file...</span>}
            {virusScanResult && !virusScanning && <span className="text-xs text-zinc-400">{virusScanResult.safe ? '\u2705' : '\u26a0\ufe0f'} {virusScanResult.message}</span>}
            <span className="text-xs text-zinc-600">Supports: .pdf, .docx, .xlsx, .pptx, .jpg, .txt, .csv, .json, .xml and more (max 5MB per file)</span>
          </div>
        </div>

        {/* Textarea */}
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Select a sample above, upload a file, or paste content to scan..." className="w-full h-40 bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white mb-4 focus:outline-none focus:border-cyan-500 font-mono text-sm" />
        <button onClick={runCompare} disabled={!text.trim() || (tradLoading && pplxLoading && cfLoading) || extracting || virusScanning} className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-700 text-white font-bold py-3 px-8 rounded-xl mb-6 transition">
          {virusScanning ? 'Virus Scanning...' : extracting ? 'Extracting text...' : (tradLoading || pplxLoading || cfLoading) ? 'Comparing...' : 'Compare All 3 Engines'}
        </button>

        {/* 3-Column Results */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <TradResultCard result={tradResult} loading={tradLoading} error={tradError} latency={tradLatency} />
          <AIResultCard title="Perplexity Sonar (Cloud AI)" color="border-cyan-600" result={pplxResult} loading={pplxLoading} error={pplxError} latency={pplxLatency} />
          <AIResultCard title="Cloudflare Workers AI (Edge)" color="border-purple-600" result={cfResult} loading={cfLoading} error={cfError} latency={cfLatency} />
        </div>

        {/* Performance Summary */}
        {tradLatency !== null && pplxLatency !== null && cfLatency !== null && (
          <div className="mt-8 bg-zinc-900 border border-zinc-700 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-4">Performance Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-mono font-bold text-green-400">{tradLatency < 1 ? '<1' : tradLatency}ms</div>
                <div className="text-sm text-zinc-400">Traditional DLP</div>
                <div className="text-xs text-orange-400 mt-1">Regex only - misses obfuscated data</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-cyan-400">{(pplxLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Perplexity Sonar</div>
                <div className="text-xs text-cyan-400 mt-1">Cloud AI - high accuracy</div>
              </div>
              <div>
                <div className="text-2xl font-mono font-bold text-purple-400">{(cfLatency / 1000).toFixed(2)}s</div>
                <div className="text-sm text-zinc-400">Cloudflare Workers AI</div>
                <div className="text-xs text-purple-400 mt-1">Edge AI - faster inference</div>
              </div>
            </div>
            <div className="mt-4 text-xs text-zinc-500 text-center">
              Traditional DLP is fastest but cannot detect obfuscated, encoded, or context-based violations. AI DLP catches what regex misses.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
