// lib/ai-url-classifier.ts
// AI-powered URL classification using Perplexity (primary) and Gemini (backup)
// Provides real-time categorization for unknown URLs

import { getDB } from './db'

// Perplexity API config (Primary)
const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || ''
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions'
const PERPLEXITY_MODEL = 'sonar'

// Gemini API config (Backup)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
const GEMINI_MODEL = 'gemini-2.0-flash-lite'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

// Valid categories matching our taxonomy
const VALID_CATEGORIES = [
  'Search Engines', 'News', 'Social Networking', 'Email',
  'Streaming Audio', 'Shopping', 'Financial Services',
  'Education', 'Government', 'Health', 'Technology',
  'Entertainment', 'Sports', 'Games', 'Advertising',
  'Malware', 'Phishing', 'Botnet/C2', 'Spam',
  'Exploit/Attack Tools', 'Scam/Fraud', 'Cryptojacking',
  'Proxy/Anonymizer', 'VPN Services', 'DNS over HTTPS',
  'File Sharing', 'Cloud Storage', 'Messaging',
  'Developer Tools', 'CDN/Infrastructure', 'Business',
  'Analytics/Tracking', 'IoT/Smart Home', 'AI/ML Services',
  'Cryptocurrency', 'Gambling', 'Dating',
  'Adult Content', 'Weapons', 'Drugs',
  'Suspicious', 'Uncategorized'
]

const CLASSIFICATION_PROMPT = `You are a URL categorization engine for a cybersecurity web gateway. Classify the given URL into exactly ONE category from this list:

${VALID_CATEGORIES.join(', ')}

Rules:
1. Return ONLY the category name, nothing else
2. If the URL appears malicious, phishing, or suspicious, use the appropriate security category
3. If unsure, use "Suspicious" rather than guessing
4. Consider the domain name, TLD, and any path information
5. Known brands should be categorized by their primary business

URL to classify: `

export interface AIClassificationResult {
  url: string
  category: string
  confidence: number
  source: 'perplexity' | 'gemini' | 'fallback'
  cached: boolean
  responseTimeMs: number
}

// Perplexity classification (Primary)
async function classifyWithPerplexity(url: string): Promise<{ category: string; confidence: number }> {
  if (!PERPLEXITY_API_KEY) {
    throw new Error('Perplexity API key not configured')
  }

  const response = await fetch(PERPLEXITY_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: PERPLEXITY_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a URL categorization engine. Return ONLY the category name.'
        },
        {
          role: 'user',
          content: CLASSIFICATION_PROMPT + url
        }
      ],
      max_tokens: 50,
      temperature: 0.1,
    }),
  })

  if (!response.ok) {
    throw new Error(`Perplexity API error: ${response.status}`)
  }

  const data = await response.json()
  const rawCategory = data.choices?.[0]?.message?.content?.trim() || ''
  const category = VALID_CATEGORIES.find(
    c => c.toLowerCase() === rawCategory.toLowerCase()
  ) || 'Uncategorized'

  return {
    category,
    confidence: category !== 'Uncategorized' ? 85 : 30,
  }
}

// Gemini classification (Backup)
async function classifyWithGemini(url: string): Promise<{ category: string; confidence: number }> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured')
  }

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [{ text: CLASSIFICATION_PROMPT + url }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50,
      }
    }),
  })

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const rawCategory = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
  const category = VALID_CATEGORIES.find(
    c => c.toLowerCase() === rawCategory.toLowerCase()
  ) || 'Uncategorized'

  return {
    category,
    confidence: category !== 'Uncategorized' ? 80 : 25,
  }
}

// Main classification with Perplexity primary, Gemini backup
export async function classifyURL(url: string): Promise<AIClassificationResult> {
  const startTime = Date.now()

  // Check cache first
  try {
    const db = getDB()
    const cached = await db.execute({
      sql: 'SELECT category, confidence, source FROM ai_url_cache WHERE url = ? AND created_at > datetime("now", "-24 hours")',
      args: [url]
    })
    if (cached.rows.length > 0) {
      const row = cached.rows[0]
      return {
        url,
        category: row.category as string,
        confidence: row.confidence as number,
        source: row.source as 'perplexity' | 'gemini' | 'fallback',
        cached: true,
        responseTimeMs: Date.now() - startTime,
      }
    }
  } catch (e) {
    console.error('Cache lookup failed:', e)
  }

  let result: { category: string; confidence: number }
  let source: 'perplexity' | 'gemini' | 'fallback' = 'fallback'

  // Try Perplexity first (primary)
  try {
    result = await classifyWithPerplexity(url)
    source = 'perplexity'
  } catch (perplexityError) {
    console.error('Perplexity classification failed, trying Gemini backup:', perplexityError)
    // Try Gemini as backup
    try {
      result = await classifyWithGemini(url)
      source = 'gemini'
    } catch (geminiError) {
      console.error('Gemini backup also failed:', geminiError)
      // Final fallback - heuristic
      result = heuristicClassify(url)
      source = 'fallback'
    }
  }

  // Cache the result
  try {
    const db = getDB()
    await db.execute({
      sql: 'INSERT OR REPLACE INTO ai_url_cache (url, category, confidence, source, created_at) VALUES (?, ?, ?, ?, datetime("now"))',
      args: [url, result.category, result.confidence, source]
    })
  } catch (e) {
    console.error('Cache write failed:', e)
  }

  return {
    url,
    category: result.category,
    confidence: result.confidence,
    source,
    cached: false,
    responseTimeMs: Date.now() - startTime,
  }
}

// Heuristic fallback when both AI services fail
function heuristicClassify(url: string): { category: string; confidence: number } {
  const domain = url.toLowerCase().replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0]
  const tld = domain.split('.').pop() || ''

  // Security-suspicious TLDs
  const suspiciousTLDs = ['xyz', 'top', 'club', 'buzz', 'tk', 'ml', 'ga', 'cf', 'gq', 'icu', 'cam', 'rest']
  if (suspiciousTLDs.includes(tld)) {
    return { category: 'Suspicious', confidence: 60 }
  }

  // Known patterns
  const patterns: Record<string, string> = {
    'google': 'Search Engines', 'bing': 'Search Engines', 'yahoo': 'Search Engines',
    'facebook': 'Social Networking', 'twitter': 'Social Networking', 'instagram': 'Social Networking', 'linkedin': 'Social Networking',
    'youtube': 'Entertainment', 'netflix': 'Entertainment', 'spotify': 'Streaming Audio',
    'amazon': 'Shopping', 'ebay': 'Shopping', 'shopify': 'Shopping',
    'github': 'Developer Tools', 'stackoverflow': 'Developer Tools',
    'bank': 'Financial Services', 'paypal': 'Financial Services',
    '.gov': 'Government', '.edu': 'Education',
  }

  for (const [pattern, category] of Object.entries(patterns)) {
    if (domain.includes(pattern)) {
      return { category, confidence: 70 }
    }
  }

  return { category: 'Uncategorized', confidence: 20 }
}

// Initialize AI cache table
export async function initAICacheTable() {
  try {
    const db = getDB()
    await db.execute(`
      CREATE TABLE IF NOT EXISTS ai_url_cache (
        url TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        confidence INTEGER DEFAULT 0,
        source TEXT DEFAULT 'fallback',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `)
    console.log('AI URL cache table ready')
  } catch (e) {
    console.error('Failed to init AI cache table:', e)
  }
}

// Legacy wrapper functions for backward compatibility with route.ts
export function isAIClassificationAvailable(): boolean {
  return !!(PERPLEXITY_API_KEY || GEMINI_API_KEY)
}

export async function classifyUrlWithAI(url: string): Promise<{ primaryCategory: string; confidence: number; source: string }> {
  const result = await classifyURL(url)
  return {
    primaryCategory: result.category,
    confidence: result.confidence,
    source: result.source,
  }
}

// Batch classification for multiple URLs
export async function batchClassifyWithAI(urls: string[]): Promise<Array<{ url: string; primaryCategory: string; confidence: number; source: string; cached: boolean; classificationMs: number }>> {
  const results = await Promise.all(
    urls.slice(0, 50).map(async (url) => {
      const result = await classifyURL(url)
      return {
        url: result.url,
        primaryCategory: result.category,
        confidence: result.confidence,
        source: result.source,
        cached: result.cached,
        classificationMs: result.responseTimeMs,
      }
    })
  )
  return results
}
