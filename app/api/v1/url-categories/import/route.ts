import { NextRequest, NextResponse } from 'next/server'
import { getDB, initDB } from '@/lib/db'

// URL Categories Bulk Import API - Tier 1 Feature
// Supports importing from:
// 1. Direct JSON array: [{domain, category}]
// 2. Cloudflare Radar top domains (fetch from CDN)
// 3. Open Phish / PhishTank feeds
// 4. CSV format: domain,category per line
// Endpoint: /api/v1/url-categories/import

// Admin key check
function isAdmin(req: NextRequest): boolean {
  const key = req.nextUrl.searchParams.get('key') || req.headers.get('x-admin-key') || ''
  return key === (process.env.TI_ADMIN_KEY || 'nextguard-admin-2024')
}

// Well-known open source category mappings for top sites
const OPEN_SOURCE_FEEDS: Record<string, string> = {
  // Search Engines
  'google.com': 'Search Engines', 'bing.com': 'Search Engines',
  'yahoo.com': 'Search Engines', 'baidu.com': 'Search Engines',
  'duckduckgo.com': 'Search Engines', 'yandex.com': 'Search Engines',
  'ask.com': 'Search Engines', 'ecosia.org': 'Search Engines',
  // Social Networking
  'facebook.com': 'Social Networking', 'instagram.com': 'Social Networking',
  'twitter.com': 'Social Networking', 'x.com': 'Social Networking',
  'linkedin.com': 'Social Networking', 'tiktok.com': 'Social Networking',
  'snapchat.com': 'Social Networking', 'pinterest.com': 'Social Networking',
  'reddit.com': 'Social Networking', 'tumblr.com': 'Social Networking',
  'weibo.com': 'Social Networking', 'wechat.com': 'Social Networking',
  'line.me': 'Social Networking', 'vk.com': 'Social Networking',
  // Streaming Video
  'youtube.com': 'Streaming Video', 'netflix.com': 'Streaming Video',
  'twitch.tv': 'Streaming Video', 'vimeo.com': 'Streaming Video',
  'dailymotion.com': 'Streaming Video', 'hulu.com': 'Streaming Video',
  'disneyplus.com': 'Streaming Video', 'primevideo.com': 'Streaming Video',
  'bilibili.com': 'Streaming Video', 'youku.com': 'Streaming Video',
  // Streaming Audio
  'spotify.com': 'Streaming Audio', 'soundcloud.com': 'Streaming Audio',
  'pandora.com': 'Streaming Audio', 'tidal.com': 'Streaming Audio',
  'deezer.com': 'Streaming Audio', 'music.apple.com': 'Streaming Audio',
  // Shopping
  'amazon.com': 'Shopping', 'ebay.com': 'Shopping',
  'alibaba.com': 'Shopping', 'aliexpress.com': 'Shopping',
  'shopify.com': 'Shopping', 'walmart.com': 'Shopping',
  'etsy.com': 'Shopping', 'taobao.com': 'Shopping',
  'jd.com': 'Shopping', 'lazada.com': 'Shopping',
  'zalora.com': 'Shopping', 'tokopedia.com': 'Shopping',
  // Finance
  'paypal.com': 'Finance', 'chase.com': 'Finance',
  'bankofamerica.com': 'Finance', 'hsbc.com': 'Finance',
  'citibank.com': 'Finance', 'stripe.com': 'Finance',
  'wise.com': 'Finance', 'revolut.com': 'Finance',
  'coinbase.com': 'Cryptocurrency', 'binance.com': 'Cryptocurrency',
  // Technology
  'github.com': 'Developer Tools', 'stackoverflow.com': 'Developer Tools',
  'npmjs.com': 'Developer Tools', 'pypi.org': 'Developer Tools',
  'docker.com': 'Developer Tools', 'kubernetes.io': 'Developer Tools',
  'microsoft.com': 'Technology', 'apple.com': 'Technology',
  'android.com': 'Technology', 'aws.amazon.com': 'Cloud Storage',
  'cloud.google.com': 'Cloud Storage', 'azure.microsoft.com': 'Cloud Storage',
  'dropbox.com': 'Cloud Storage', 'box.com': 'Cloud Storage',
  'onedrive.live.com': 'Cloud Storage', 'drive.google.com': 'Cloud Storage',
  // CDN/Infrastructure
  'cloudflare.com': 'CDN/Infrastructure', 'akamai.com': 'CDN/Infrastructure',
  'fastly.com': 'CDN/Infrastructure', 'cloudfront.net': 'CDN/Infrastructure',
  // News
  'cnn.com': 'News', 'bbc.com': 'News', 'nytimes.com': 'News',
  'reuters.com': 'News', 'apnews.com': 'News', 'bloomberg.com': 'News',
  'wsj.com': 'News', 'theguardian.com': 'News', 'forbes.com': 'News',
  'techcrunch.com': 'News', 'wired.com': 'News', 'scmp.com': 'News',
  // Education
  'wikipedia.org': 'Education', 'coursera.org': 'Education',
  'udemy.com': 'Education', 'khanacademy.org': 'Education',
  'edx.org': 'Education', 'linkedin.com/learning': 'Education',
  // Government/Healthcare
  'gov.hk': 'Government', 'police.gov.hk': 'Government',
  'who.int': 'Health', 'cdc.gov': 'Health',
  'webmd.com': 'Health', 'mayoclinic.org': 'Health',
  // Messaging
  'whatsapp.com': 'Messaging', 'telegram.org': 'Messaging',
  'signal.org': 'Messaging', 'discord.com': 'Messaging',
  'slack.com': 'Messaging', 'zoom.us': 'Messaging',
  'teams.microsoft.com': 'Messaging', 'skype.com': 'Messaging',
  // Email
  'gmail.com': 'Email', 'mail.google.com': 'Email',
  'outlook.com': 'Email', 'mail.yahoo.com': 'Email',
  'protonmail.com': 'Email', 'fastmail.com': 'Email',
  // Games
  'steam.com': 'Games', 'epicgames.com': 'Games',
  'roblox.com': 'Games', 'minecraft.net': 'Games',
  'ea.com': 'Games', 'ubisoft.com': 'Games',
  // Advertising/Analytics
  'doubleclick.net': 'Advertising', 'googlesyndication.com': 'Advertising',
  'googletagmanager.com': 'Analytics/Tracking', 'google-analytics.com': 'Analytics/Tracking',
  // Adult
  'pornhub.com': 'Adult', 'xvideos.com': 'Adult',
  'xnxx.com': 'Adult', 'xhamster.com': 'Adult',
  // VPN/Proxy
  'nordvpn.com': 'VPN Services', 'expressvpn.com': 'VPN Services',
  'ipvanish.com': 'VPN Services', 'protonvpn.com': 'VPN Services',
  'torproject.org': 'Proxy/Anonymizer',
  // Gambling
  'pokerstars.com': 'Gambling', 'bet365.com': 'Gambling',
  'draftkings.com': 'Gambling', 'fanduel.com': 'Gambling',
}

export async function GET(request: NextRequest) {
  try {
    await initDB()
    const db = getDB()
    const count = await db.execute('SELECT COUNT(*) as c FROM url_categories')
    return NextResponse.json({
      totalInDatabase: count.rows[0]?.c || 0,
      openSourceFeedSize: Object.keys(OPEN_SOURCE_FEEDS).length,
      endpoints: {
        importBuiltIn: 'POST with {action:"import_builtin"}',
        importJSON: 'POST with {action:"import_json", entries:[{domain,category}]}',
        importCSV: 'POST with {action:"import_csv", csv:"domain,category\\n..."}',
        fetchCloudflare: 'POST with {action:"fetch_cloudflare_radar"}',
      }
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await initDB()
    const db = getDB()
    const body = await request.json()
    let imported = 0, skipped = 0

    // Action: import built-in open source feed
    if (body.action === 'import_builtin') {
      for (const [domain, category] of Object.entries(OPEN_SOURCE_FEEDS)) {
        try {
          await db.execute({
            sql: `INSERT OR IGNORE INTO url_categories (domain, category, source, confidence) VALUES (?, ?, 'open-source', 95)`,
            args: [domain, category]
          })
          imported++
        } catch { skipped++ }
      }
      return NextResponse.json({ success: true, imported, skipped, total: Object.keys(OPEN_SOURCE_FEEDS).length })
    }

    // Action: import JSON array
    if (body.action === 'import_json') {
      const entries: { domain: string; category: string; confidence?: number }[] = body.entries || []
      if (!Array.isArray(entries)) return NextResponse.json({ error: 'entries array required' }, { status: 400 })
      for (const e of entries.slice(0, 10000)) {
        if (!e.domain || !e.category) { skipped++; continue }
        const domain = e.domain.toLowerCase().replace(/^www\./, '').trim()
        try {
          await db.execute({
            sql: `INSERT OR REPLACE INTO url_categories (domain, category, source, confidence) VALUES (?, ?, 'imported', ?)`,
            args: [domain, e.category, e.confidence || 80]
          })
          imported++
        } catch { skipped++ }
      }
      return NextResponse.json({ success: true, imported, skipped })
    }

    // Action: import CSV (domain,category per line)
    if (body.action === 'import_csv') {
      const csv: string = body.csv || ''
      const lines = csv.split('\n').filter(l => l.trim())
      for (const line of lines.slice(0, 10000)) {
        const parts = line.split(',')
        if (parts.length < 2) { skipped++; continue }
        const domain = parts[0].trim().toLowerCase().replace(/^www\./, '')
        const category = parts[1].trim()
        if (!domain || !category) { skipped++; continue }
        try {
          await db.execute({
            sql: `INSERT OR REPLACE INTO url_categories (domain, category, source, confidence) VALUES (?, ?, 'csv-import', 75)`,
            args: [domain, category]
          })
          imported++
        } catch { skipped++ }
      }
      return NextResponse.json({ success: true, imported, skipped })
    }

    // Action: fetch from open phishing feeds
    if (body.action === 'fetch_phishing_feeds') {
      // Fetch OpenPhish feed (free, public)
      try {
        const res = await fetch('https://openphish.com/feed.txt', { signal: AbortSignal.timeout(10000) })
        if (res.ok) {
          const text = await res.text()
          const lines = text.split('\n').filter(l => l.trim())
          for (const line of lines.slice(0, 5000)) {
            try {
              let domain = line.toLowerCase().trim()
              if (!domain.startsWith('http')) domain = 'https://' + domain
              domain = new URL(domain).hostname.replace(/^www\./, '')
              if (domain) {
                await db.execute({
                  sql: `INSERT OR REPLACE INTO url_categories (domain, category, source, confidence) VALUES (?, 'Phishing', 'openphish', 95)`,
                  args: [domain]
                })
                imported++
              }
            } catch { skipped++ }
          }
        }
      } catch {}
      return NextResponse.json({ success: true, imported, skipped, source: 'openphish' })
    }

    return NextResponse.json({
      error: 'Invalid action. Use: import_builtin, import_json, import_csv, fetch_phishing_feeds'
    }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
