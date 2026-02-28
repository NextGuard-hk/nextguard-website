import { NextResponse } from 'next/server'

const RULES = [
  {
    name: 'HKID Number',
    pattern: /[A-Z]{1,2}\d{6}\(\d\)/g,
    severity: 'HIGH',
    action: 'BLOCK',
    category: 'PII'
  },
  {
    name: 'Credit Card Number',
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
    severity: 'CRITICAL',
    action: 'BLOCK',
    category: 'Financial'
  },
  {
    name: 'Email Address',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    severity: 'MEDIUM',
    action: 'QUARANTINE',
    category: 'PII'
  },
  {
    name: 'Phone Number (HK)',
    pattern: /\+?852[- ]?\d{4}[- ]?\d{4}/g,
    severity: 'MEDIUM',
    action: 'QUARANTINE',
    category: 'PII'
  },
  {
    name: 'SWIFT Code',
    pattern: /\b[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}(?:[A-Z0-9]{3})?\b/g,
    severity: 'HIGH',
    action: 'BLOCK',
    category: 'Financial'
  },
  {
    name: 'Bank Account Number',
    pattern: /\b\d{3}-\d{3}-\d{6,9}-\d{3}\b/g,
    severity: 'CRITICAL',
    action: 'BLOCK',
    category: 'Financial'
  },
  {
    name: 'Sensitive Keyword (CONFIDENTIAL)',
    pattern: /\b(?:CONFIDENTIAL|SECRET|TOP SECRET|CLASSIFIED|RESTRICTED)\b/gi,
    severity: 'HIGH',
    action: 'BLOCK',
    category: 'Classification'
  },
  {
    name: 'Password in Text',
    pattern: /(?:password|passwd|pwd)\s*[:=]\s*\S+/gi,
    severity: 'CRITICAL',
    action: 'BLOCK',
    category: 'Credential'
  },
]

export async function POST(req: Request) {
  const start = Date.now()
  try {
    const { content } = await req.json()
    if (!content) return NextResponse.json({ error: 'No content' }, { status: 400 })

    const findings: any[] = []
    let totalMatches = 0

    for (const rule of RULES) {
      const matches = content.match(rule.pattern)
      if (matches && matches.length > 0) {
        totalMatches += matches.length
        findings.push({
          rule: rule.name,
          severity: rule.severity,
          action: rule.action,
          category: rule.category,
          count: matches.length,
          matches: matches.slice(0, 5),
        })
      }
    }

    const detected = findings.length > 0
    const elapsed = Date.now() - start

    return NextResponse.json({
      detected,
      method: 'Regex + Dictionary (' + elapsed + 'ms server-side)',
      totalMatches,
      findings,
      categories: [...new Set(findings.map(f => f.category))],
    })
  } catch {
    return NextResponse.json({ error: 'Scan failed' }, { status: 500 })
  }
}
