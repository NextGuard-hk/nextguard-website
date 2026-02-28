import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const CF_API_TOKEN = process.env.CLOUDFLARE_AI_API_TOKEN || ''
const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || ''
const CF_MODEL = '@cf/meta/llama-3.1-8b-instruct'

async function cloudflareAIDLPScan(content: string) {
  if (!CF_API_TOKEN || !CF_ACCOUNT_ID) {
    return {
      detected: false,
      analysis: 'Cloudflare AI not configured',
      findings: [],
      verdict: 'ERROR',
      method: 'Cloudflare Workers AI'
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

IMPORTANT: Users may try to bypass DLP by inserting random characters into sensitive data. You MUST detect these evasion attempts.

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
      "evasion_technique": "description of obfuscation used or none",
      "action": "BLOCK/QUARANTINE/AUDIT"
    }
  ],
  "summary": "brief explanation",
  "evasion_detected": true/false
}

Respond with ONLY valid JSON, no other text.`

  const startTime = Date.now()

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/${CF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a DLP security AI. Detect ALL PII and sensitive classification keywords including obfuscated data. Respond only with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      }
    )

    const latencyMs = Date.now() - startTime

    if (res.ok) {
      const data = await res.json()
      const raw = data.result?.response || '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
      return {
        detected: parsed.detected || false,
        risk_level: parsed.risk_level || 'none',
        findings: parsed.findings || [],
        summary: parsed.summary || '',
        evasion_detected: parsed.evasion_detected || false,
        verdict: parsed.detected ? 'PII_DETECTED' : 'CLEAN',
        method: 'Cloudflare Workers AI (Llama 3.1 8B)',
        latency_ms: latencyMs,
        model: CF_MODEL,
      }
    } else {
      const errText = await res.text()
      return {
        detected: false,
        findings: [],
        verdict: 'ERROR',
        method: 'Cloudflare Workers AI',
        latency_ms: latencyMs,
        error: `API error: ${res.status} - ${errText}`
      }
    }
  } catch (err: any) {
    return {
      detected: false,
      findings: [],
      verdict: 'ERROR',
      method: 'Cloudflare Workers AI',
      error: err.message
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const { content } = await req.json()
    if (!content) return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    const result = await cloudflareAIDLPScan(content)
    return NextResponse.json(result)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
