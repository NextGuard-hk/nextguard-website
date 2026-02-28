import { NextRequest, NextResponse } from "next/server"

const NPOINT_ID = process.env.NPOINT_NEWSFEED_ID || ""
const NPOINT_API = `https://api.npoint.io/${NPOINT_ID}`
const COLLECT_SECRET = process.env.CRON_SECRET || ""

interface RSSItem {
  title: string
  link: string
  description: string
  pubDate: string
  source: string
}

interface NewsArticle {
  id: string
  title: string
  summary: string
  url: string
  source: string
  publishedAt: string
  collectedAt: string
  tags: string[]
  importance: "high" | "medium" | "low"
  status: "pending" | "published"
  language: "en"
}

const RSS_SOURCES = [
  { name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "threat-intel" },
  { name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", category: "security-news" },
  { name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "security-news" },
  { name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "security-news" },
  { name: "SecurityWeek", url: "https://feeds.feedburner.com/securityweek", category: "security-news" },
  { name: "Threatpost", url: "https://threatpost.com/feed/", category: "threat-intel" },
    // Hong Kong & Macau cybersecurity sources
    { name: "HKCERT", url: "https://www.hkcert.org/getrss/security-bulletin", category: "hk-security" },
    { name: "HKCERT News", url: "https://www.hkcert.org/getrss/security-news", category: "hk-security" },
    { name: "GovCERT.HK", url: "https://www.govcert.gov.hk/en/rss_security_alerts.xml", category: "hk-security" },
    { name: "InfoSec.gov.hk", url: "https://www.infosec.gov.hk/en/rss/whatsnew.xml", category: "hk-security" },
    { name: "RTHK Local News", url: "https://rthk.hk/rthk/news/rss/e_expressnews_elocal.xml", category: "hk-news" },
]

const AI_KEYWORDS = [
  "ai", "artificial intelligence", "machine learning", "deep learning",
  "llm", "large language model", "gpt", "generative ai", "neural network",
  "chatbot", "nlp", "natural language processing", "computer vision",
  "ai-powered", "ai-driven", "automated threat", "ai security",
  "deepfake", "ai attack", "ai defense", "ml model",
]

const CYBER_KEYWORDS = [
  "cybersecurity", "data breach", "ransomware", "malware", "phishing",
  "vulnerability", "zero-day", "exploit", "threat", "hack",
  "data loss", "dlp", "data protection", "encryption", "firewall",
  "endpoint security", "soc", "siem", "incident response",
]

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase()
  return keywords.some(kw => lower.includes(kw))
}

function autoTag(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const tags: string[] = []
  
  if (matchesKeywords(text, ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "generative ai"])) tags.push("AI")
  if (matchesKeywords(text, ["ransomware"])) tags.push("Ransomware")
  if (matchesKeywords(text, ["phishing"])) tags.push("Phishing")
  if (matchesKeywords(text, ["data breach", "data leak", "data loss"])) tags.push("Data Breach")
  if (matchesKeywords(text, ["vulnerability", "cve", "zero-day", "exploit"])) tags.push("Vulnerability")
  if (matchesKeywords(text, ["malware", "trojan", "virus", "worm"])) tags.push("Malware")
  if (matchesKeywords(text, ["dlp", "data loss prevention", "data protection"])) tags.push("DLP")
  if (matchesKeywords(text, ["cloud", "aws", "azure", "saas"])) tags.push("Cloud Security")
  if (matchesKeywords(text, ["regulation", "compliance", "gdpr", "privacy"])) tags.push("Compliance")
  if (matchesKeywords(text, ["endpoint", "edr", "xdr"])) tags.push("Endpoint Security")
    if (matchesKeywords(text, ["hong kong", "macau", "macao", "hkcert", "hksar", "ogcio", "cyberport"])) tags.push("Hong Kong")
  
  return tags.length > 0 ? tags : ["Cybersecurity"]
}

function scoreImportance(title: string, description: string): "high" | "medium" | "low" {
  const text = `${title} ${description}`.toLowerCase()
  const hasAI = matchesKeywords(text, AI_KEYWORDS)
  const hasCyber = matchesKeywords(text, CYBER_KEYWORDS)
  
  if (hasAI && hasCyber) return "high"
  if (hasAI || hasCyber) return "medium"
  return "low"
}

function generateId(title: string, source: string): string {
  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)
  const hash = Math.random().toString(36).slice(2, 8)
  return `${slug}-${hash}`
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").replace(/&[a-z]+;/g, " ").trim()
}

async function fetchRSSFeed(source: { name: string; url: string; category: string }): Promise<RSSItem[]> {
  try {
    const response = await fetch(source.url, {
      headers: { "User-Agent": "NextGuard-NewsBot/1.0" },
      signal: AbortSignal.timeout(10000),
    })
    if (!response.ok) return []
    
    const xml = await response.text()
    const items: RSSItem[] = []
    const itemRegex = /<item>(.*?)<\/item>/gs
    let match
    
    while ((match = itemRegex.exec(xml)) !== null) {
      const itemXml = match[1]
      const title = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s)?.[1] || ""
      const link = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/s)?.[1] || ""
      const desc = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/s)?.[1] || ""
      const pubDate = itemXml.match(/<pubDate>(.*?)<\/pubDate>/s)?.[1] || ""
      
      if (title && link) {
        items.push({
          title: stripHtml(title),
          link: stripHtml(link),
          description: stripHtml(desc).slice(0, 500),
          pubDate,
          source: source.name,
        })
      }
    }
    
    return items.slice(0, 10)
  } catch {
    console.error(`Failed to fetch RSS from ${source.name}`)
    return []
  }
}

function filterRelevantArticles(items: RSSItem[]): RSSItem[] {
  return items.filter(item => {
    const text = `${item.title} ${item.description}`
    const HK_SOURCES = ["HKCERT","HKCERT News","GovCERT.HK","InfoSec.gov.hk","RTHK Local News"]; return HK_SOURCES.includes(item.source) || matchesKeywords(text, AI_KEYWORDS) || matchesKeywords(text, CYBER_KEYWORDS)
  })
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization")
  const url = new URL(request.url)
  const secret = url.searchParams.get("secret")
  
  if (authHeader !== `Bearer ${COLLECT_SECRET}` && secret !== COLLECT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  
  try {
    const allItems: RSSItem[] = []
    const feedPromises = RSS_SOURCES.map(source => fetchRSSFeed(source))
    const results = await Promise.allSettled(feedPromises)
    
    results.forEach(result => {
      if (result.status === "fulfilled") {
        allItems.push(...result.value)
      }
    })
    
    const relevantItems = filterRelevantArticles(allItems)
    
    // Safely read existing data from npoint, handle both formats
    let existingArticles: NewsArticle[] = []
    try {
      const existingRes = await fetch(NPOINT_API)
      if (existingRes.ok) {
        const raw = await existingRes.json()
        // Support both { articles: [...] } and { news: [...] } formats
        existingArticles = Array.isArray(raw.articles) ? raw.articles : Array.isArray(raw.news) ? raw.news : []
      }
    } catch {
      existingArticles = []
    }
    
    const existingUrls = new Set(existingArticles.map(a => a.url))
    const now = new Date().toISOString()
    
    const newArticles: NewsArticle[] = relevantItems
      .filter(item => !existingUrls.has(item.link))
      .map(item => ({
        id: generateId(item.title, item.source),
        title: item.title,
        summary: item.description.slice(0, 300),
        url: item.link,
        source: item.source,
        publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : now,
        collectedAt: now,
        tags: (() => { const t = autoTag(item.title, item.description); if (["HKCERT","HKCERT News","GovCERT.HK","InfoSec.gov.hk","RTHK Local News"].includes(item.source) && !t.includes("Hong Kong")) t.push("Hong Kong"); return t })(),
        importance: scoreImportance(item.title, item.description),
        status: "published" as const,
        language: "en" as const,
      }))
    
            // Always write back in the correct { articles: [...] } format
    const updatedArticles = [...newArticles, ...existingArticles].slice(0, 200)
    await fetch(NPOINT_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articles: updatedArticles }),
    })
    
    return NextResponse.json({
      success: true,
      totalFetched: allItems.length,
      relevant: relevantItems.length,
      newAdded: newArticles.length,
      totalStored: updatedArticles.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
