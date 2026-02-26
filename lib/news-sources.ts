// RSS sources for AI Cybersecurity News Feed
export interface NewsSource {
  name: string
  rssUrl: string
  color: string
}

export const NEWS_SOURCES: NewsSource[] = [
  { name: "The Hacker News", rssUrl: "https://feeds.feedburner.com/TheHackersNews", color: "#ff6600" },
  { name: "SecurityWeek", rssUrl: "https://feeds.feedburner.com/securityweek", color: "#1a73e8" },
  { name: "Cybersecurity Dive", rssUrl: "https://www.cybersecuritydive.com/feeds/news/", color: "#00b4d8" },
  { name: "Dark Reading", rssUrl: "https://www.darkreading.com/rss.xml", color: "#6c2bd9" },
]

export const AI_KEYWORDS = [
  "artificial intelligence", "AI", "machine learning", "ML", "LLM", "GPT",
  "generative AI", "deep learning", "neural network", "ChatGPT", "copilot",
  "deepfake", "AI-powered", "AI-driven",
]

export const SECURITY_KEYWORDS = [
  "cybersecurity", "security", "threat", "malware", "ransomware",
  "phishing", "vulnerability", "zero-day", "breach", "attack",
  "DLP", "data loss", "data protection", "SOC", "SIEM",
]

export interface NewsItem {
  id: string
  source: string
  sourceColor: string
  sourceUrl: string
  title: string
  summaryZh: string
  summaryEn: string
  tags: string[]
  publishedAt: string
  collectedAt: string
  status: "pending" | "published" | "hidden"
  importance: number
}

export function parseRssXml(xml: string) {
  const items: { title: string; link: string; description: string; pubDate: string }[] = []
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g
  let match
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1]
    const title = extractTag(itemXml, "title")
    const link = extractTag(itemXml, "link")
    const description = extractTag(itemXml, "description")
    const pubDate = extractTag(itemXml, "pubDate")
    if (title && link) items.push({ title, link, description, pubDate })
  }
  return items
}

function extractTag(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i")
  const cdataM = cdataRe.exec(xml)
  if (cdataM) return cdataM[1].trim()
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i")
  const m = re.exec(xml)
  return m ? m[1].trim().replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"') : ""
}

export function isAiSecurityRelated(title: string, description: string): boolean {
  const text = `${title} ${description}`.toLowerCase()
  const hasAi = AI_KEYWORDS.some(k => text.includes(k.toLowerCase()))
  const hasSecurity = SECURITY_KEYWORDS.some(k => text.includes(k.toLowerCase()))
  return hasAi || (hasSecurity && text.includes("ai"))
}

export function autoAssignTags(title: string, description: string): string[] {
  const text = `${title} ${description}`.toLowerCase()
  const tags: string[] = []
  if (text.includes("attack") || text.includes("exploit") || text.includes("breach")) tags.push("AI-Attack")
  if (text.includes("defense") || text.includes("protection") || text.includes("detect")) tags.push("AI-Defense")
  if (text.includes("llm") || text.includes("gpt") || text.includes("large language")) tags.push("LLM-Security")
  if (text.includes("ransomware")) tags.push("Ransomware")
  if (text.includes("phishing")) tags.push("Phishing")
  if (text.includes("zero-day") || text.includes("0day")) tags.push("Zero-Day")
  if (text.includes("regulation") || text.includes("compliance")) tags.push("Regulation")
  if (text.includes("dlp") || text.includes("data loss")) tags.push("Data-Protection")
  if (text.includes("cloud") || text.includes("saas")) tags.push("Cloud-Security")
  if (text.includes("threat") || text.includes("report")) tags.push("Threat-Report")
  if (tags.length === 0) tags.push("Industry-News")
  return tags.slice(0, 3)
}
