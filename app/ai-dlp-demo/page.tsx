'use client'
import { useState, useRef } from 'react'

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
    description: 'Simulate DLP scanning contract text, NDA clauses, M&A terms extracted from real business documents',
    samples: [
      { name: 'NDA Agreement Excerpt', content: 'NON-DISCLOSURE AGREEMENT\n\nThis Agreement is entered into as of 15 February 2026 between NextGuard Technology Limited ("Disclosing Party") and Skyguard Holdings Co. Ltd. ("Receiving Party").\n\n1. CONFIDENTIAL INFORMATION\nThe Receiving Party agrees to keep strictly confidential all proprietary information including but not limited to: source code, customer lists, financial projections, product roadmaps, and pricing structures disclosed by the Disclosing Party.\n\n2. RESTRICTED PERSONNEL\nAccess shall be limited to: James Wong (CEO, HKID: K234567(8), james.wong@nextguard.com), Sarah Lam (CTO, HKID: L345678(9), sarah.lam@nextguard.com).\n\n3. PENALTY\nBreach of this agreement shall result in liquidated damages of HKD 5,000,000.' },
      { name: 'M&A Term Sheet', content: 'STRICTLY CONFIDENTIAL - PROJECT PHOENIX\nMERGER & ACQUISITION TERM SHEET\n\nTarget Company: DataShield Asia Pte Ltd\nAcquirer: NextGuard Technology Limited\nProposed Valuation: USD 12,500,000 (pre-money)\nDeal Structure: 70% cash + 30% equity swap\n\nKey Personnel Retained:\n- Dr. Chan Ming Fai (Founder, HKID: M456789(0)) - 24 month earnout\n- Ms. Wong Pui Yi (VP Engineering) - 18 month retention package HKD 1,800,000\n\nBank Escrow: HSBC Account 412-567890-123 (HKD 3,750,000 deposit)\n\nDO NOT CIRCULATE - Attorney-Client Privileged' },
      { name: 'Vendor Contract PII', content: 'SERVICE AGREEMENT - SCHEDULE A\nVendor: TechPro Solutions Ltd\nClient Contact: Mr. Raymond Cheung, HKID P567890(1), +852 9123 4567, raymond.cheung@techpro.com.hk\n\nPayment Terms:\n- Monthly retainer: HKD 85,000\n- Bank: Bank of China, Account: 01287654321, Branch: Central\n- Authorised signatory: Raymond Cheung\n\nINTERNAL ONLY - Procurement reference: PROC-2026-0089\nDo not distribute outside Finance and Legal departments.' },
      { name: 'Employment Contract', content: 'EMPLOYMENT CONTRACT (CONFIDENTIAL)\n\nEmployee: Chan Siu Kwan\nHKID: Q678901(2)\nDate of Birth: 12 March 1990\nBank Account (Salary): Hang Seng Bank 218-123456-001\n\nPosition: Senior Security Engineer\nMonthly Salary: HKD 65,000\nAnnual Bonus Target: 15% of annual salary\nStock Options: 50,000 shares vesting over 4 years\n\nMedical History Declaration: No pre-existing conditions\nEmergency Contact: Chan Wai Man, +852 6543 2109 (Mother)\n\nCLASSIFIED - HR USE ONLY' },
      { name: 'Legal Dispute Settlement', content: 'WITHOUT PREJUDICE - SETTLEMENT AGREEMENT\n\nPlaintiff: Wong Tai Shing (HKID: R789012(3))\nDefendant: Alpha Corp Ltd\nCase Number: HCA 2025/1234\n\nSettlement Amount: HKD 2,200,000\nPayment to: DBS Bank Account 003-123456-7, Wong Tai Shing\n\nTerms:\n1. Plaintiff withdraws all claims with prejudice\n2. Both parties agree to strict confidentiality\n3. No admission of liability by either party\n\nSigned: David Liu (Solicitor, PC: 12345), Liu & Partners, Central, Hong Kong\nContact: david.liu@liupartners.com.hk, +852 2345 6789' },
    ],
  },
  {
    category: 'Source Code & Credentials',
    icon: '\ud83d\udcbb',
    description: 'Detect API keys, database credentials, hardcoded secrets and proprietary algorithms in code files',
    samples: [
      { name: 'Hardcoded API Keys in Code', content: '// config.js - DO NOT COMMIT TO PUBLIC REPO\nconst config = {\n  database: {\n    host: \'db.internal.nextguard.com\',\n    user: \'admin\',\n    password: \'Ng@Pr0d#2026!Secure\',\n    port: 5432\n  },\n  stripe: {\n    secretKey: \'sk_live_51AbcDEfGhIjKlMnOpQrStUvWx12345678901234567890123456789012\',\n    webhookSecret: \'whsec_abcdef1234567890abcdef1234567890\'\n  },\n  aws: {\n    accessKeyId: \'AKIAIOSFODNN7EXAMPLE\',\n    secretAccessKey: \'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\',\n    region: \'ap-east-1\'\n  },\n  jwt: { secret: \'mySuperSecretJWTKey_NextGuard_2026_DoNotShare\' }\n}' },
      { name: 'Database Schema with PII', content: '-- INTERNAL: Production DB Schema Dump\n-- Server: prod-db-01.nextguard.internal\n-- Generated: 2026-02-28 03:00:00 UTC\n\nCREATE TABLE customers (\n  id SERIAL PRIMARY KEY,\n  full_name VARCHAR(100), -- e.g. \'Chan Tai Man\'\n  hkid CHAR(10), -- e.g. \'A123456(7)\'\n  email VARCHAR(200), -- e.g. \'chan@example.com\'\n  credit_card_hash VARCHAR(64),\n  salary DECIMAL(12,2) -- Confidential\n);\n\n-- Sample data (RESTRICTED - do not export):\nINSERT INTO customers VALUES (1, \'Wong Siu Ming\', \'D876543(2)\', \'wong@test.com\', \'5407123456789012\', 85000.00);\nINSERT INTO customers VALUES (2, \'Lee Ka Fai\', \'E234567(8)\', \'lee@example.hk\', \'4111111111111111\', 62000.00);' },
      { name: 'DevOps Config with Secrets', content: '# docker-compose.prod.yml - RESTRICTED\n# Author: sarah.lam@nextguard.com\n\nservices:\n  api:\n    environment:\n      - DATABASE_URL=postgresql://ngadmin:Pr0d_P@ss_2026@10.0.1.5:5432/nextguard_prod\n      - REDIS_URL=redis://:RedisS3cr3t@10.0.1.6:6379\n      - SENDGRID_API_KEY=SG.abcdefghijklmnop.QRSTUVWXYZ1234567890abcdefghijklmnop\n      - TWILIO_AUTH_TOKEN=a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4\n      - INTERNAL_ADMIN_PASSWORD=Admin@NextGuard2026!\n      - ENC_KEY=base64:dGhpcyBpcyBhIHNlY3JldCBrZXkgZm9yIE5leHRHdWFyZA==' },
      { name: 'Source Code IP Leak', content: '// NextGuard Core DLP Engine - PROPRIETARY ALGORITHM\n// Copyright 2026 NextGuard Technology Limited\n// TRADE SECRET - Classification: STRICTLY CONFIDENTIAL\n// Unauthorised copying or distribution is prohibited\n\nexport function ngDLPScore(content: string, customerId: string): RiskScore {\n  // Proprietary risk scoring algorithm v3.2\n  // Licensed to: Skyguard Holdings (License #NG-2026-SKY-001)\n  // Licensee contact: cto@skyguard.com, +86-10-8888-9999\n  const WEIGHTS = { pii: 0.45, context: 0.30, evasion: 0.25 }\n  // ... [2840 lines of proprietary code redacted]\n}' },
    ],
  },
  {
    category: 'Email & Collaboration',
    icon: '\ud83d\udce7',
    description: 'Intercept sensitive data shared via email threads, Slack messages, and collaboration tools',
    samples: [
      { name: 'Email with Sensitive Attachment', content: 'From: james.wong@nextguard.com\nTo: partner@skyguard.com\nCC: sarah.lam@nextguard.com\nSubject: RE: Q1 2026 Financial Results - CONFIDENTIAL\nDate: 28 Feb 2026\n\nHi David,\n\nPlease find attached the Q1 board pack. Key highlights:\n- Revenue: HKD 12.3M (target: HKD 10M)\n- EBITDA margin: 23.4% (improving from 18.1%)\n- New enterprise logos: Cathay Pacific, BOC HK, AIA\n\nOur HSBC operating account (612-345678-901) received the milestone payment of HKD 875,000 from AIA on 25 Feb.\n\nCustomer contact at AIA: Ms. Grace Chu (grace.chu@aia.com, +852 3919 3919, Staff ID AIA-HK-009876).\n\nThis email and attachments are STRICTLY CONFIDENTIAL. Do not forward.' },
      { name: 'Slack Message Data Leak', content: '[Slack Export - #engineering-private]\n[2026-02-28 14:23] sarah.lam: Hey team, prod DB password needs updating. Current one is Ng@Pr0d#2026! - please update your local configs\n[2026-02-28 14:25] dev.chan: Got it. Also the AWS key AKIAIOSFODNN7EXAMPLE is still in the old repo right?\n[2026-02-28 14:26] sarah.lam: Yes, rotate it ASAP. New key will be sent to james.wong@nextguard.com\n[2026-02-28 14:28] dev.chan: Also re: the Wong account (HKID D876543(2)) - their contract is up for renewal, CC details are 5407 1234 5678 9012 exp 03/27\n[2026-02-28 14:30] sarah.lam: Mark this channel as INTERNAL ONLY please' },
      { name: 'Teams Meeting Transcript', content: 'Microsoft Teams - Meeting Transcript\nMeeting: Board Strategy Session - PROJECT CLASSIFIED\nDate: 28 Feb 2026, 10:00-11:30 HKT\nParticipants: James Wong (CEO), Sarah Lam (CTO), Raymond Cheung (CFO)\n\n[10:05] James Wong: The acquisition target is DataShield Asia. Valuation agreed at USD 12.5M. Our banker at Goldman (contact: michael.ng@gs.com, +852 2978 1000) is coordinating escrow.\n[10:15] Raymond Cheung: Funding confirmed from our DBS account 003-456789-0. CFO personal guarantee on HKID P567890(1).\n[10:28] Sarah Lam: Engineering team of 12, including 3 on H1-B visas. Passport numbers have been shared with legal - DO NOT CIRCULATE.\n[10:45] James Wong: This transcript is STRICTLY CONFIDENTIAL - attorney-client privilege applies.' },
      { name: 'Cloud Storage Shared Link', content: 'Shared Google Drive Link: https://drive.google.com/file/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/view\nFile: NextGuard_Customer_Database_Feb2026.xlsx\nShared by: raymond.cheung@nextguard.com\nShared with: external-auditor@pwc.com.hk\n\nFile Contents Preview:\nCustomer ID, Name, HKID, Phone, Credit Card, Contract Value\nCUST-001, Chan Tai Man, E567890(1), +852 9876 5432, 4532 8901 2345 6789, HKD 480,000\nCUST-002, Wong Mei Ling, F234567(8), +852 6543 2109, 5407 1234 5678 9012, HKD 720,000\nCUST-003, Lee Ka Fai, G345678(9), +852 9012 3456, 371449635398431, HKD 360,000\n\nWARNING: File marked RESTRICTED - sharing with external parties requires CISO approval' },
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
function ResultPanel({ title, result, loading, error, color }: { title: string; result: any; loading: boolean; error: string; color: string }) {
  if (loading) return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{color}}>{title}</h3>
      <div className="animate-pulse text-zinc-400">Analyzing...</div>
    </div>
  )
  if (error) return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{color}}>{title}</h3>
      <div className="text-red-400">{error}</div>
    </div>
  )
  if (!result) return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{color}}>{title}</h3>
      <div className="text-zinc-500">Select a sample and click Scan</div>
    </div>
  )
  const isHybrid = title.includes('Hybrid')
  const isTraditional = title.includes('Traditional')
  return (
    <div>
      <h3 className="text-lg font-bold mb-3" style={{color}}>{title}</h3>
      <div className={`text-lg font-bold mb-2 ${result.detected ? 'text-red-400' : 'text-green-400'}`}>
        {result.detected ? '⚠️' : '✅'}&nbsp;&nbsp;{result.verdict || (result.detected ? 'DETECTED' : 'CLEAN')}
      </div>
      {result.method && <p className="text-xs text-zinc-500 mb-2">Method: {result.method}</p>}
      {result.recommended_action && result.detected && (
        <p className="text-sm mb-1">Action: <span className="font-bold text-yellow-400">{result.recommended_action}</span></p>
      )}
      {result.risk_level && (
        <p className="text-sm mb-1">Risk Level: <span className="font-bold text-orange-400">{result.risk_level?.toUpperCase()}</span></p>
      )}
      {result.evasion_detected && <p className="text-sm text-red-400 font-bold mb-1">Evasion Technique Detected!</p>}
      {result.summary && <p className="text-sm text-zinc-300 mb-2">{result.summary}</p>}
      {isHybrid && result.pattern_engine && (
        <p className="text-xs text-zinc-500 mb-1">Pattern Engine: {result.pattern_engine.detected ? `${result.pattern_engine.findingCount} finding(s), ${result.pattern_engine.totalMatches} match(es)` : 'Clean'} | AI Engine: {result.ai_engine?.detected ? `${result.ai_engine.findingCount} finding(s)` : 'Clean'}</p>
      )}
      {isHybrid && result.ai_engine?.summary && <p className="text-xs text-zinc-400 mb-2">AI: {result.ai_engine.summary}</p>}
      {isTraditional && !result.detected && <p className="text-sm text-zinc-500">No pattern matches found.</p>}
      {isTraditional && result.totalMatches !== undefined && <p className="text-sm text-zinc-400 mb-2">Total Matches: {result.totalMatches}</p>}
      {result.findings && result.findings.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-bold text-zinc-300">Findings ({result.findings.length}):</p>
          {result.findings.map((f: any, i: number) => (
            <div key={i} className="bg-zinc-800 rounded-lg p-3 text-sm">
              {(isTraditional || (isHybrid && f.source === 'pattern')) ? (<>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-cyan-400 font-bold">{f.rule || f.type}</span>
                  {f.source && <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded">{f.source.toUpperCase()}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${f.action === 'BLOCK' ? 'bg-red-900 text-red-300' : f.action === 'QUARANTINE' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{f.action}</span>
                </div>
                {f.severity && <p className="text-xs text-zinc-500">Severity: {f.severity}</p>}
                <p className="text-zinc-400">Matches: {f.matches?.join(', ')}</p>
              </>) : (<>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-cyan-400 font-bold">{f.type}</span>
                  {f.source && <span className="text-xs bg-zinc-700 px-1.5 py-0.5 rounded">{f.source.toUpperCase()}</span>}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${f.action === 'BLOCK' ? 'bg-red-900 text-red-300' : f.action === 'QUARANTINE' ? 'bg-yellow-900 text-yellow-300' : 'bg-blue-900 text-blue-300'}`}>{f.action}</span>
                </div>
                {f.original_text && <p className="text-zinc-400">Found: <code className="text-green-400">{f.original_text}</code></p>}
                {f.decoded_value && <p className="text-zinc-400">Decoded: <code className="text-green-400">{f.decoded_value}</code></p>}
                {f.confidence !== undefined && <p className="text-zinc-500">Confidence: {f.confidence}%</p>}
                {f.evasion_technique && f.evasion_technique !== 'none' && <p className="text-yellow-400">Evasion: {f.evasion_technique}</p>}
              </>)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AIDLPDemo() {
  const [content, setContent] = useState('')
  const [tradResult, setTradResult] = useState<any>(null)
  const [aiResult, setAiResult] = useState<any>(null)
  const [hybridResult, setHybridResult] = useState<any>(null)
  const [tradLoading, setTradLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [hybridLoading, setHybridLoading] = useState(false)
  const [tradError, setTradError] = useState('')
  const [aiError, setAiError] = useState('')
  const [hybridError, setHybridError] = useState('')
  const [activeCategory, setActiveCategory] = useState(0)
  const [selectedSample, setSelectedSample] = useState('')
  const [showPolicy, setShowPolicy] = useState(false)
  const [policy, setPolicy] = useState<typeof DEFAULT_POLICY>(JSON.parse(JSON.stringify(DEFAULT_POLICY)))
  const [uploadedFileName, setUploadedFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function updatePolicy(key: PolicyKey, field: string, value: any) {
    setPolicy(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: value }
    }))
  }

  function resetPolicy() {
    setPolicy(JSON.parse(JSON.stringify(DEFAULT_POLICY)))
  }

  const [extracting, setExtracting] = useState(false)

  const BINARY_EXTS = ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.jpg', '.jpeg', '.png']
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      alert(`File too large! Maximum size is 5MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB`)
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }
    setUploadedFileName(file.name)
    setTradResult(null); setAiResult(null); setHybridResult(null)
    const isBinary = BINARY_EXTS.some(ext => file.name.toLowerCase().endsWith(ext))
    if (isBinary) {
      setExtracting(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch('/api/extract-text', { method: 'POST', body: formData })
        const data = await res.json()
        if (data.error) {
          setContent(`[Error] ${data.error}`)
        } else {
          setContent(data.text)
        }
      } catch (err: any) {
        setContent(`[Error extracting text: ${err.message}]`)
      } finally {
        setExtracting(false)
      }
    } else {
      try {
        const text = await file.text()
        setContent(text)
      } catch {
        setContent(`[Error reading file: ${file.name}]`)
      }
    }
    setSelectedSample('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function runScan() {
    if (!content.trim()) return
    setTradResult(null); setAiResult(null); setHybridResult(null)
    setTradError(''); setAiError(''); setHybridError('')
    setTradLoading(true); setAiLoading(true); setHybridLoading(true)
    let tradData: any = null
    ;(async () => {
      try {
        const r1 = await fetch('/api/ai-dlp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, mode: 'traditional', policy })
        })
        const d1 = await r1.json()
        tradData = d1
        setTradResult(d1)
      } catch (e: any) { setTradError(e.message) }
      finally { setTradLoading(false) }
    })()
    ;(async () => {
      try {
        const r2 = await fetch('/api/ai-dlp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content, mode: 'ai', policy })
        })
        const d2 = await r2.json()
        setAiResult(d2)
        const trad = tradData
        const ai = d2
        const mergedFindings: any[] = []
        if (trad?.findings) { for (const f of trad.findings) { mergedFindings.push({ source: 'pattern', ...f }) } }
        if (ai?.findings?.length) { for (const f of ai.findings) { mergedFindings.push({ source: 'ai', ...f }) } }
        const actionPriority: Record<string,number> = { BLOCK: 3, QUARANTINE: 2, AUDIT: 1 }
        let maxAction = 'AUDIT'
        for (const f of mergedFindings) { if ((actionPriority[f.action] || 0) > (actionPriority[maxAction] || 0)) maxAction = f.action }
        const riskPriority: Record<string,number> = { critical: 4, high: 3, medium: 2, low: 1, none: 0 }
        let maxRisk = ai?.risk_level || 'none'
        if (trad?.findings) { for (const f of trad.findings) { if ((riskPriority[f.severity] || 0) > (riskPriority[maxRisk] || 0)) maxRisk = f.severity } }
        const detected = (trad?.detected || false) || (ai?.detected || false)
        setHybridResult({
          detected,
          verdict: detected ? 'VIOLATION_DETECTED' : 'CLEAN',
          recommended_action: detected ? maxAction : 'NONE',
          method: 'Hybrid (Pattern-Based + AI LLM)',
          risk_level: maxRisk,
          evasion_detected: ai?.evasion_detected || false,
          pattern_engine: { detected: trad?.detected || false, totalMatches: trad?.totalMatches || 0, findingCount: trad?.findings?.length || 0 },
          ai_engine: { detected: ai?.detected || false, risk_level: ai?.risk_level || 'none', findingCount: ai?.findings?.length || 0, summary: ai?.summary || '' },
          findings: mergedFindings,
        })
      } catch (e: any) { setAiError(e.message); setHybridError(e.message) }
      finally { setAiLoading(false); setHybridLoading(false) }
    })()
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent">AI DLP Demo</h1>
          <h2 className="text-xl text-zinc-300 mt-2">Traditional DLP vs AI DLP vs Hybrid DLP</h2>
          <p className="text-zinc-500 mt-2 max-w-3xl mx-auto">Compare pattern-based DLP against AI LLM detection and NextGuard Hybrid mode. Traditional DLP uses Regex & Dictionary. AI DLP understands context and detects evasion. Hybrid combines both for maximum coverage.</p>
        </div>

        {/* Policy Settings Toggle */}
        <div className="mb-6">
          <button onClick={() => setShowPolicy(!showPolicy)} className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            ⚙️ DLP Policy Settings {showPolicy ? '▲' : '▼'}
          </button>
          {showPolicy && (
            <div className="mt-3 bg-zinc-900 border border-zinc-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-cyan-400">⚙️ DLP Policy Configuration</h3>
                <button onClick={resetPolicy} className="text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-3 py-1 rounded">Reset to Default</button>
              </div>
              <p className="text-xs text-zinc-500 mb-4">Configure which detection rules are enabled, their action on match, and severity level. These settings apply to Traditional and Hybrid DLP engines.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-zinc-400 border-b border-zinc-700">
                      <th className="text-left py-2 pr-4">Enabled</th>
                      <th className="text-left py-2 pr-4">Rule</th>
                      <th className="text-left py-2 pr-4">Action</th>
                      <th className="text-left py-2">Severity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Object.keys(policy) as PolicyKey[]).map(key => (
                      <tr key={key} className="border-b border-zinc-800">
                        <td className="py-2 pr-4">
                          <input type="checkbox" checked={policy[key].enabled} onChange={e => updatePolicy(key, 'enabled', e.target.checked)} className="accent-cyan-500" />
                        </td>
                        <td className="py-2 pr-4 text-zinc-300">{POLICY_LABELS[key]}</td>
                        <td className="py-2 pr-4">
                          <select value={policy[key].action} onChange={e => updatePolicy(key, 'action', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">
                            {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </td>
                        <td className="py-2">
                          <select value={policy[key].severity} onChange={e => updatePolicy(key, 'severity', e.target.value)} className="bg-zinc-800 border border-zinc-600 rounded px-2 py-1 text-xs text-white">
                            {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Sample Categories */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {SAMPLE_CATEGORIES.map((cat, ci) => (
              <button key={ci} onClick={() => setActiveCategory(ci)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeCategory === ci ? 'bg-cyan-600 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}>{cat.icon} {cat.category}</button>
            ))}
          </div>
          <p className="text-zinc-500 text-sm mb-3">{SAMPLE_CATEGORIES[activeCategory].description}</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {SAMPLE_CATEGORIES[activeCategory].samples.map((s, si) => (
              <button key={si} onClick={() => { setContent(s.content); setSelectedSample(s.name); setUploadedFileName(''); setTradResult(null); setAiResult(null); setHybridResult(null) }} className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${selectedSample === s.name ? 'bg-cyan-700 text-white ring-2 ring-cyan-400' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'}`}>{s.name}</button>
            ))}
          </div>

          {/* File Upload */}
          <div className="flex items-center gap-3 mb-4">
            <input ref={fileInputRef} type="file" accept=".txt,.csv,.json,.xml,.log,.md,.html,.js,.ts,.py,.sql,.yml,.yaml,.env,.cfg,.conf,.ini,.pdf,.docx,.xlsx,.xls,.pptx,.jpg,.jpeg,.png" onChange={handleFileUpload} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="bg-zinc-700 hover:bg-zinc-600 text-zinc-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              📂 Upload File
            </button>
            {uploadedFileName && <span className="text-sm text-cyan-400">📄 {uploadedFileName}</span>}         {extracting && <span className="text-sm text-yellow-400 animate-pulse">Extracting text from file...</span>}
            <span className="text-xs text-zinc-600">Supports: .pdf, .docx, .xlsx, .pptx, .jpg, .txt, .csv, .json, .xml and more (max 5MB per file)</span>
          </div>

          <textarea value={content} onChange={e => setContent(e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder:text-zinc-500 focus:border-cyan-500 focus:outline-none font-mono text-sm min-h-[120px] mb-4" placeholder="Select a sample above, upload a file, or paste your own content to scan..." />
          <button onClick={runScan} disabled={!content.trim() || tradLoading || aiLoading || hybridLoading || extracting} || tradLoading || aiLoading || hybridLoading} className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg font-bold transition-colors">{extracting ? 'Extracting text...' : tradLoading || aiLoading || hybridLoading ? 'Scanning...' : 'Scan Content'}</button>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <ResultPanel title="Traditional DLP (Pattern-Based)" result={tradResult} loading={tradLoading} error={tradError} color="#fb923c" />
          </div>
          <div className="bg-zinc-900 border border-cyan-800 rounded-xl p-6">
            <ResultPanel title="AI LLM Detection" result={aiResult} loading={aiLoading} error={aiError} color="#22d3ee" />
          </div>
          <div className="bg-zinc-900 border border-green-700 rounded-xl p-6 ring-2 ring-green-600/30">
            <ResultPanel title="Hybrid DLP (NextGuard)" result={hybridResult} loading={hybridLoading} error={hybridError} color="#4ade80" />
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="text-orange-400 font-bold mb-2">Traditional DLP (Forcepoint / Symantec / Proofpoint)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Regex patterns for credit cards, HKID, SSN, IBAN</li>
                <li>- Dictionary-based keyword matching</li>
                <li>- Phrase detection for known patterns</li>
                <li className="text-red-400 font-bold">- CANNOT detect obfuscated data (Jo&&@hn)</li>
                <li className="text-red-400 font-bold">- CANNOT read Base64 encoded PII</li>
                <li className="text-red-400 font-bold">- CANNOT understand context or intent</li>
              </ul>
            </div>
            <div>
              <h4 className="text-cyan-400 font-bold mb-2">AI-Powered DLP (LLM Only)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- LLM understands context and meaning</li>
                <li>- Detects PII even with obfuscation</li>
                <li>- Decodes Base64, reverse text, leetspeak</li>
                <li className="text-green-400 font-bold">- CAN detect Jo&&@hn as &quot;John&quot;</li>
                <li className="text-yellow-400 font-bold">- May miss simple keyword policies</li>
                <li className="text-yellow-400 font-bold">- Single keyword like &quot;confidential&quot; may not trigger</li>
              </ul>
            </div>
            <div>
              <h4 className="text-green-400 font-bold mb-2">Hybrid DLP (NextGuard)</h4>
              <ul className="text-sm text-zinc-400 space-y-1">
                <li>- Pattern engine runs first (instant, zero-cost)</li>
                <li>- AI engine runs in parallel for context analysis</li>
                <li>- Results merged: union of all findings</li>
                <li>- Strictest action always applied</li>
                <li className="text-green-400 font-bold">- Keywords ALWAYS enforced (Pattern)</li>
                <li className="text-green-400 font-bold">- Evasion ALWAYS caught (AI)</li>
                <li className="text-green-400 font-bold">- Best of both worlds, zero blind spots</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
