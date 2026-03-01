import { NextRequest, NextResponse } from 'next/server'

// Traditional Web DLP scanning - simulates Forcepoint/Symantec/McAfee/Zscaler/Netskope/PA style
// Pattern-based detection: Regex, Dictionary, Fingerprint matching

interface WebDLPPolicy {
  credit_card: { enabled: boolean; action: string; severity: string }
  phone_hk: { enabled: boolean; action: string; severity: string }
  hkid: { enabled: boolean; action: string; severity: string }
  email_addr: { enabled: boolean; action: string; severity: string }
  iban: { enabled: boolean; action: string; severity: string }
  passport: { enabled: boolean; action: string; severity: string }
  sensitive_keywords: { enabled: boolean; action: string; severity: string }
  api_keys: { enabled: boolean; action: string; severity: string }
  url_exfil: { enabled: boolean; action: string; severity: string }
  file_type: { enabled: boolean; action: string; severity: string }
}

const PATTERNS: Record<string, { regex: RegExp[]; label: string }> = {
  credit_card: {
    label: 'Credit Card Number',
    regex: [
      /\b(?:4[0-9]{3}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4})\b/g,
      /\b(?:5[1-5][0-9]{2}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4})\b/g,
      /\b(?:3[47][0-9]{2}[-\s]?[0-9]{6}[-\s]?[0-9]{5})\b/g,
      /\b(?:6(?:011|5[0-9]{2})[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4})\b/g,
    ]
  },
  phone_hk: {
    label: 'Phone Number (HK/Intl)',
    regex: [
      /(?:\+852[-\s]?)?[2-9][0-9]{3}[-\s]?[0-9]{4}/g,
      /\+[0-9]{1,3}[-\s]?[0-9]{4,14}/g,
    ]
  },
  hkid: {
    label: 'Hong Kong ID (HKID)',
    regex: [
      /[A-Z]{1,2}[0-9]{6}\([0-9A]\)/g,
    ]
  },
  email_addr: {
    label: 'Email Address',
    regex: [
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    ]
  },
  iban: {
    label: 'IBAN / Bank Account',
    regex: [
      /\b[A-Z]{2}[0-9]{2}\s?[0-9A-Z]{4}\s?[0-9A-Z]{4,30}\b/g,
      /\b[0-9]{3}[-]?[0-9]{6,9}[-]?[0-9]{3}\b/g,
    ]
  },
  passport: {
    label: 'Passport Number',
    regex: [
      /\b[A-Z][0-9]{2}[A-Z0-9]{5,7}\b/g,
    ]
  },
  sensitive_keywords: {
    label: 'Sensitive Keywords',
    regex: [
      /\b(?:confidential|secret|restricted|internal only|classified|do not distribute|privileged|private|password|api[_-]?key|bearer token)\b/gi,
    ]
  },
  api_keys: {
    label: 'API Keys / Secrets',
    regex: [
      /(?:sk_live|sk_test|pk_live|pk_test)_[A-Za-z0-9]{20,}/g,
      /AKIA[0-9A-Z]{16}/g,
      /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,}/g,
      /SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}/g,
      /xox[bpoas]-[A-Za-z0-9-]{10,}/g,
    ]
  },
  url_exfil: {
    label: 'URL Data Exfiltration',
    regex: [
      /https?:\/\/[^\s]+\?[^\s]*(?:ssn|password|secret|token|key|credit|card|hkid)[^\s]*/gi,
      /https?:\/\/(?:pastebin|paste\.|hastebin|ghostbin|controlc|justpaste)\.\S+/gi,
    ]
  },
  file_type: {
    label: 'Sensitive File Reference',
    regex: [
      /\b\S+\.(?:xlsx?|csv|sql|bak|key|pem|pfx|p12|env|credentials)\b/gi,
    ]
  },
}

export async function POST(req: NextRequest) {
  try {
    const { content, channel, destination, policy } = await req.json() as {
      content: string
      channel?: string
      destination?: string
      policy?: Partial<WebDLPPolicy>
    }

    if (!content) {
      return NextResponse.json({ error: 'Content required' }, { status: 400 })
    }

    const findings: Array<{
      rule: string
      action: string
      severity: string
      matches: string[]
      channel?: string
    }> = []

    let totalMatches = 0

    for (const [key, pat] of Object.entries(PATTERNS)) {
      const policyEntry = policy?.[key as keyof WebDLPPolicy]
      if (policyEntry && !policyEntry.enabled) continue

      const action = policyEntry?.action || 'AUDIT'
      const severity = policyEntry?.severity || 'medium'
      const matches: string[] = []

      for (const rx of pat.regex) {
        const rxCopy = new RegExp(rx.source, rx.flags)
        let m: RegExpExecArray | null
        while ((m = rxCopy.exec(content)) !== null) {
          if (!matches.includes(m[0])) matches.push(m[0])
        }
      }

      if (matches.length > 0) {
        totalMatches += matches.length
        findings.push({
          rule: pat.label,
          action,
          severity,
          matches: matches.slice(0, 10),
          channel: channel || 'web-upload',
        })
      }
    }

    const detected = findings.length > 0
    const blocked = findings.some(f => f.action === 'BLOCK')

    return NextResponse.json({
      detected,
      blocked,
      method: 'Regex + Dictionary + Pattern Matching (Traditional Web DLP)',
      channel: channel || 'web-upload',
      destination: destination || 'unknown',
      totalMatches,
      findings,
      verdict: blocked ? 'BLOCKED' : detected ? 'FLAGGED' : 'ALLOWED',
    })
  } catch {
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
