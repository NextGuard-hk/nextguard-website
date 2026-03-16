// lib/ai-url-classifier.ts
// AI-powered URL classification using Gemini API
// Provides real-time categorization for unknown/uncategorized URLs

import { getDB } from './db'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`

// Valid categories matching our taxonomy
const VALID_CATEGORIES = [
  'Search Engines', 'News', 'Social Networking', 'Streaming Video',
  'Streaming Audio', 'Shopping', 'Finance', 'Business', 'Technology',
  'Education', 'Government', 'Health', 'Travel', 'Food & Dining',
  'Entertainment', 'Sports', 'Games', 'Adult', 'Gambling',
  'Malware', 'Phishing', 'Botnet/C2', 'Spyware',
  'Exploit/Attack Tools', 'Scam/Fraud', 'Cryptocurrency',
  'Proxy/Anonymizer', 'VPN Services', 'Dynamic DNS',
  'File Sharing', 'Cloud Storage', 'Messaging', 'Email',
  'Developer Tools', 'CDN/Infrastructure', 'Advertising',
  'Analytics/Tracking', 'IoT/Smart Home', 'Automotive',
  'Real Estate', 'Job Search', 'Dating', 'Religion',
  'Political', 'Weapons', 'Drug Related', 'Suspicious',
  'Uncategorized'
]

export interface AIClassificationResult {
  url: string
  domain: string
  categories: string[]
  primaryCategory: string
  confidence: number
  reasoning: string
  source: 'ai-gemini'
  cached: boolean
  classificationMs: number
}

// In-memory cache for AI classifications (TTL: 1 hour)
const classificationCache = new Map<string, { result: AIClassificationResult; expiry: number }>()
const CACHE_TTL = 3600 * 1000 // 1 hour

function getCached(domain: string): AIClassificationResult | null {
  const entry = classificationCache.get(domain)
  if (entry && entry.expiry > Date.now()) {
    return { ...entry.result, cached: true }
  }
  if (entry) classificationCache.delete(domain)
  return null
}

function setCache(domain: string, result: AIClassificationResult) {
  // Limit cache size to 10000 entries
  if (classificationCache.size > 10000) {
    const oldest = classificationCache.keys().next().value
    if (oldest) classificationCache.delete(oldest)
  }
  classificationCache.set(domain, { result, expiry: Date.now() + CACHE_TTL })
}

export function isAIClassificationAvailable(): boolean {
  return !!GEMINI_API_KEY
}

export async function classifyUrlWithAI(url: string): Promise<AIClassificationResult> {
  const startTime = Date.now()
  let domain = url.toLowerCase().trim()
  try {
    if (!domain.startsWith('http')) domain = 'https://' + domain
    domain = new URL(domain).hostname
  } catch {}
  domain = domain.replace(/^www\./, '')

  // Check memory cache first
  const cached = getCached(domain)
  if (cached) return { ...cached, classificationMs: Date.now() - startTime }

  // Check DB cache
  try {
    const db = getDB()
    const dbCache = await db.execute({
      sql: 'SELECT category, confidence, reasoning FROM ai_url_cache WHERE domain = ? AND expires_at > datetime("now") LIMIT 1',
      args: [domain]
    })
    if (dbCache.rows.length > 0) {
      const row = dbCache.rows[0]
      const result: AIClassificationResult = {
        url, domain,
        categories: [row.category as string],
        primaryCategory: row.category as string,
        confidence: row.confidence as number,
        reasoning: row.reasoning as string || '',
        source: 'ai-gemini',
        cached: true,
        classificationMs: Date.now() - startTime
      }
      setCache(domain, result)
      return result
    }
  } catch {}

  if (!GEMINI_API_KEY) {
    return {
      url, domain,
      categories: ['Uncategorized'],
      primaryCategory: 'Uncategorized',
      confidence: 0,
      reasoning: 'AI classification unavailable: GEMINI_API_KEY not configured',
      source: 'ai-gemini',
      cached: false,
      classificationMs: Date.now() - startTime
    }
  }

  // Call Gemini API
  const prompt = `You are a URL classification engine for a web security gateway. Classify the following domain into exactly ONE primary category.

Domain: ${domain}

Valid categories: ${VALID_CATEGORIES.join(', ')}

Respond in this exact JSON format only, no other text:
{"category": "<category>", "confidence": <0-100>, "reasoning": "<brief reason>"}

Rules:
- Choose the MOST specific matching category
- Confidence 90+ for well-known domains
- Confidence 60-89 for domains with clear indicators
- Confidence 30-59 for ambiguous domains
- If truly unknown, use "Uncategorized" with low confidence`

  try {
    const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 200,
          responseMimeType: 'application/json'
        }
      }),
    })

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`)
    }

    const data = await response.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    let parsed: { category: string; confidence: number; reasoning: string }
    try {
      parsed = JSON.parse(text)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[^}]+\}/)
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Failed to parse AI response')
      }
    }

    // Validate category
    const category = VALID_CATEGORIES.find(
      c => c.toLowerCase() === (parsed.category || '').toLowerCase()
    ) || 'Uncategorized'

    const result: AIClassificationResult = {
      url, domain,
      categories: [category],
      primaryCategory: category,
      confidence: Math.min(Math.max(parsed.confidence || 50, 0), 100),
      reasoning: parsed.reasoning || '',
      source: 'ai-gemini',
      cached: false,
      classificationMs: Date.now() - startTime
    }

    // Cache in memory
    setCache(domain, result)

    // Cache in DB (async, don't await)
    cacheInDB(domain, result).catch(() => {})

    return result
  } catch (e) {
    return {
      url, domain,
      categories: ['Uncategorized'],
      primaryCategory: 'Uncategorized',
      confidence: 0,
      reasoning: `AI classification error: ${e instanceof Error ? e.message : String(e)}`,
      source: 'ai-gemini',
      cached: false,
      classificationMs: Date.now() - startTime
    }
  }
}

async function cacheInDB(domain: string, result: AIClassificationResult) {
  try {
    const db = getDB()
    await db.execute(`CREATE TABLE IF NOT EXISTS ai_url_cache (
      domain TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      confidence INTEGER DEFAULT 50,
      reasoning TEXT,
      source TEXT DEFAULT 'ai-gemini',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL DEFAULT (datetime('now', '+24 hours'))
    )`)
    await db.execute({
      sql: `INSERT OR REPLACE INTO ai_url_cache (domain, category, confidence, reasoning, expires_at)
            VALUES (?, ?, ?, ?, datetime('now', '+24 hours'))`,
      args: [domain, result.primaryCategory, result.confidence, result.reasoning]
    })
  } catch {}
}

// Batch classify multiple URLs
export async function batchClassifyWithAI(urls: string[]): Promise<AIClassificationResult[]> {
  const results = await Promise.all(urls.slice(0, 50).map(u => classifyUrlWithAI(u)))
  return results
}
