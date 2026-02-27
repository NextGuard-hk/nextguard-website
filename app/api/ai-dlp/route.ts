export const runtime = 'nodejs'
export const maxDuration = 300

import { NextRequest, NextResponse } from 'next/server'

const LLM_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY || ''
const LLM_ENDPOINT = process.env.PERPLEXITY_API_KEY ? 'https://api.perplexity.ai/chat/completions' : 'https://api.openai.com/v1/chat/completions'
const LLM_MODEL = process.env.PERPLEXITY_API_KEY ? 'sonar' : 'gpt-4o-mini'

// Traditional DLP patterns with severity
const DLP_RULES = {
  credit_card: {
    name: 'Credit Card Number',
    patterns: [
      /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/g,
      /\b[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}[\s-]?[0-9]{4}\b/g,
    ],
    type: 'regex',
    severity: 'critical',
    action: 'BLOCK',
  },
  phone_hk: {
    name: 'Hong Kong Phone Number',
    patterns: [
      /\b(?:\+?852[\s-]?)?[2-9][0-9]{3}[\s-]?[0-9]{4}\b/g,
    ],
    type: 'regex',
    severity: 'medium',
    action: 'AUDIT',
  },
  hkid: {
    name: 'Hong Kong ID',
    patterns: [
      /\b[A-Z]{1,2}[0-9]{6}\(?[0-9A]\)?\b/g,
    ],
    type: 'regex',
    severity: 'critical',
    action: 'BLOCK',
  },
  email: {
    name: 'Email Address',
    patterns: [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    ],
    type: 'regex',
    severity: 'low',
    action: 'AUDIT',
  },
  name_phrases: {
    name: 'Common Name Patterns',
    dictionary: ['Mr.', 'Mrs.', 'Ms.', 'Dr.', 'Name:', 'Full Name:', 'Customer:', 'Client:'],
    type: 'dictionary',
    severity: 'low',
    action: 'AUDIT',
  },
  sensitive_keywords: {
    name: 'Sensitive Keywords',
    dictionary: ['confidential', 'secret', 'classified', 'internal only', 'do not distribute', 'password', 'ssn', 'social security'],
    type: 'dictionary',
    severity: 'high',
    action: 'QUARANTINE',
  }
}

function traditionalDLPScan(content: string) {
  const findings: Array<{rule: string; type: string; matches: string[]; action: string; severity: string}> = []
  let totalMatches = 0
  for (const [, rule] of Object.entries(DLP_RULES)) {
    const matches: string[] = []
    if (rule.type === 'regex' && 'patterns' in rule) {
      for (const pattern of rule.patterns) {
        const regex = new RegExp(pattern.source, pattern.flags)
        let match
        while ((match = regex.exec(content)) !== null) {
          matches.push(match[0])
        }
      }
    } else if (rule.type === 'dictionary' && 'dictionary' in rule) {
      const lower = content.toLowerCase()
      for (const word of rule.dictionary) {
        if (lower.includes(word.toLowerCase())) {
          matches.push(word)
        }
      }
    }
    if (matches.length > 0) {
      findings.push({ rule: rule.name, type: rule.type, matches, action: rule.action, severity: rule.severity })
      totalMatches += matches.length
    }
  }
  return {
    detected: totalMatches > 0,
    totalMatches,
    findings,
    verdict: totalMatches > 0 ? 'VIOLATION_DETECTED' : 'CLEAN',
    method: 'Pattern-Based (Regex + Dictionary)',
  }
}

async function aiDLPScan(content: string) {
  if (!LLM_API_KEY) {
    return {
      detected: false,
      analysis: 'AI API key not configured',
      findings: [],
      verdict: 'ERROR',
      method: 'AI LLM Analysis',
    }
  }
  const prompt = `You are an advanced AI-powered DLP (Data Loss Prevention) system. Your job is to analyze text content and detect ANY sensitive/PII data, even if it has been obfuscated, encoded, or disguised to evade traditional pattern-based detection.

Analyze the following content for:
1. Personal names (even with special characters inserted)
2. Phone numbers (even with obfuscation like &&@ or other characters)
3. Credit card numbers (even partial, masked, or obfuscated)
4. ID numbers (HKID, SSN, passport, etc.)
5. Email addresses
6. Sensitive keywords and classifications (confidential, secret, classified, internal only, restricted, password, etc.)
7. Any other PII or sensitive data

IMPORTANT: 
- Users may try to bypass DLP by inserting random characters (like &&@, ##, **, etc.) into sensitive data. You MUST detect these evasion attempts.
- Also detect sensitive classification keywords like "confidential", "secret", "classified", "internal only", "do not distribute", "restricted", "password" etc. These indicate policy violations even without PII.

Content to analyze:
"""${content}"""

Respond in this exact JSON format:
{
  "detected": true/false,
  "risk_level": "critical"/"high"/"medium"/"low"/"none",
  "findings": [
    {
      "type": "category of PII or policy violation",
      "original_text": "the text found",
      "decoded_value": "the actual value after removing obfuscation",
      "confidence": 0-100,
      "evasion_technique": "description of obfuscation used or 'none'",
      "action": "BLOCK/QUARANTINE/AUDIT"
    }
  ],
  "summary": "brief explanation",
  "evasion_detected": true/false
}
Respond with ONLY valid JSON.`
  try {
    const res = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: 'You are a DLP security AI. Detect ALL PII and sensitive classification keywords including obfuscated data. Respond only with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000,
      }),
    })
    if (res.ok) {
      const data = await res.json()
      const raw = data.choices?.[0]?.message?.content || '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      return {
        detected: parsed.detected || false,
        risk_level: parsed.risk_level || 'none',
        findings: parsed.findings || [],
        summary: parsed.summary || '',
        evasion_detected: parsed.evasion_detected || false,
        verdict: parsed.detected ? 'PII_DETECTED' : 'CLEAN',
        method: 'AI LLM Analysis (Perplexity Sonar)',
      }
    } else {
      return { detected: false, findings: [], verdict: 'ERROR', method: 'AI LLM Analysis', error: `API error: ${res.status}` }
    }
  } catch (err: any) {
    return { detected: false, findings: [], verdict: 'ERROR', method: 'AI LLM Analysis', error: err.message }
  }
}

// Hybrid DLP: Union of Traditional + AI, takes strictest action
async function hybridDLPScan(content: string) {
  const [traditional, ai] = await Promise.all([
    Promise.resolve(traditionalDLPScan(content)),
    aiDLPScan(content),
  ])

  // Merge findings with source tags
  const mergedFindings: Array<any> = []

  // Add pattern-based findings
  for (const f of traditional.findings) {
    mergedFindings.push({
      source: 'pattern',
      rule: f.rule,
      type: f.type,
      matches: f.matches,
      action: f.action,
      severity: f.severity,
    })
  }

  // Add AI findings
  if (ai.findings && ai.findings.length > 0) {
    for (const f of ai.findings) {
      mergedFindings.push({
        source: 'ai',
        type: f.type,
        original_text: f.original_text,
        decoded_value: f.decoded_value,
        confidence: f.confidence,
        evasion_technique: f.evasion_technique,
        action: f.action,
      })
    }
  }

  // Determine strictest action: BLOCK > QUARANTINE > AUDIT
  const actionPriority: Record<string, number> = { BLOCK: 3, QUARANTINE: 2, AUDIT: 1 }
  let maxAction = 'AUDIT'
  for (const f of mergedFindings) {
    if ((actionPriority[f.action] || 0) > (actionPriority[maxAction] || 0)) {
      maxAction = f.action
    }
  }

  // Determine highest risk level
  const riskPriority: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, none: 0 }
  let maxRisk = ai.risk_level || 'none'
  // Also consider traditional findings severity
  for (const f of traditional.findings) {
    if ((riskPriority[f.severity] || 0) > (riskPriority[maxRisk] || 0)) {
      maxRisk = f.severity
    }
  }

  const detected = traditional.detected || ai.detected

  return {
    detected,
    verdict: detected ? 'VIOLATION_DETECTED' : 'CLEAN',
    recommended_action: detected ? maxAction : 'NONE',
    method: 'Hybrid (Pattern-Based + AI LLM)',
    risk_level: maxRisk,
    evasion_detected: ai.evasion_detected || false,
    pattern_engine: {
      detected: traditional.detected,
      totalMatches: traditional.totalMatches,
      findingCount: traditional.findings.length,
    },
    ai_engine: {
      detected: ai.detected,
      risk_level: ai.risk_level || 'none',
      findingCount: ai.findings?.length || 0,
      summary: ai.summary || '',
    },
    findings: mergedFindings,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content, mode } = await req.json()
    if (!content) return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    if (mode === 'traditional') {
      const result = traditionalDLPScan(content)
      return NextResponse.json(result)
    } else if (mode === 'ai') {
      const result = await aiDLPScan(content)
      return NextResponse.json(result)
    } else if (mode === 'hybrid') {
      const result = await hybridDLPScan(content)
      return NextResponse.json(result)
    } else {
      // All three
      const [traditional, ai, hybrid] = await Promise.all([
        Promise.resolve(traditionalDLPScan(content)),
        aiDLPScan(content),
        hybridDLPScan(content),
      ])
      return NextResponse.json({ traditional, ai, hybrid })
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
