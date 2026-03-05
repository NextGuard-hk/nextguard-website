// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine
// Integrates URLhaus, Phishing Army, OpenPhish

export type RiskLevel = 'known_malicious' | 'high_risk' | 'medium_risk' | 'low_risk' | 'unknown';

export interface SourceHit {
  name: string;
  hit: boolean;
  risk_level?: RiskLevel;
  categories?: string[];
  flags?: string[];
  detail?: string;
}

export interface ThreatIntelResult {
  url: string;
  final: {
    risk_level: RiskLevel;
    categories: string[];
    flags: string[];
    reason: string;
  };
  sources: SourceHit[];
  timestamp: string;
}

// ── In-memory cache (Vercel serverless: per-instance, refreshed by cron) ──
interface FeedCache {
  urlhaus: Set<string>;       // domains
  phishingArmy: Set<string>;  // domains
  openphish: Set<string>;     // full URLs (trimmed)
  lastUpdated: number;        // epoch ms
}

let cache: FeedCache = {
  urlhaus: new Set(),
  phishingArmy: new Set(),
  openphish: new Set(),
  lastUpdated: 0,
};

// Cache TTL: 15 minutes (feeds update every 5-15 min)
const CACHE_TTL_MS = 15 * 60 * 1000;

// ── Local IOC list (your test Excel / customer overrides) ──
// Format: { domain/url: { risk_level, categories } }
export const LOCAL_IOC: Record<string, { risk_level: RiskLevel; categories: string[] }> = {
  'crimsondew.com':       { risk_level: 'known_malicious', categories: ['malware'] },
  'evil.com':             { risk_level: 'known_malicious', categories: ['malware'] },
  'phishing-site.com':    { risk_level: 'known_malicious', categories: ['phishing'] },
    // ── Greylist / Suspicious Content (from test Excel) ──
  'fakebank-login.xyz':       { risk_level: 'high_risk',       categories: ['phishing'] },
  'secure-verify-account.top': { risk_level: 'high_risk',     categories: ['phishing'] },
  'crypto-airdrop-free.club': { risk_level: 'high_risk',      categories: ['crypto_scam'] },
  'download-crack-now.top':   { risk_level: 'high_risk',      categories: ['malware'] },
  'login-paypal-secure.xyz':  { risk_level: 'known_malicious', categories: ['phishing'] },
  'update-flash-player.club': { risk_level: 'known_malicious', categories: ['malware'] },
  // ── Known benign (whitelist examples) ──
  'google.com':               { risk_level: 'low_risk',        categories: ['search_engine'] },
  'microsoft.com':            { risk_level: 'low_risk',        categories: ['business'] },
    // ── URL Category Classification ──
  'facebook.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'instagram.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'twitter.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'x.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'linkedin.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'tiktok.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'chat.openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'claude.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'gemini.google.com': { risk_level: 'low_risk', categories: ['genai'] },
  'perplexity.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'copilot.microsoft.com': { risk_level: 'low_risk', categories: ['genai'] },
  'bard.google.com': { risk_level: 'low_risk', categories: ['genai'] },
  'github.com':               { risk_level: 'low_risk',        categories: ['development'] },
  'malware.testing.google.test': { risk_level: 'known_malicious', categories: ['malware'] },
  // Add more from your test list here
    // — News & Media —
  'cnn.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'bbc.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'reuters.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  
  'nytimes.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'scmp.com': { risk_level: 'low_risk', categories: ['news', 'media', 'hong_kong'] },
  'hk01.com': { risk_level: 'low_risk', categories: ['news', 'media', 'hong_kong'] },
  // — Streaming & Entertainment —
  'youtube.com': { risk_level: 'low_risk', categories: ['streaming', 'video', 'entertainment'] },
  'netflix.com': { risk_level: 'low_risk', categories: ['streaming', 'entertainment'] },
  'spotify.com': { risk_level: 'low_risk', categories: ['streaming', 'music'] },
  'twitch.tv': { risk_level: 'low_risk', categories: ['streaming', 'gaming', 'entertainment'] },
  'disneyplus.com': { risk_level: 'low_risk', categories: ['streaming', 'entertainment'] },
  // — Shopping & E-commerce —
  'amazon.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'ebay.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'auction'] },
  'alibaba.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'b2b'] },
  'taobao.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'shopee.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  // — Finance & Banking —
  'hsbc.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'chase.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'paypal.com': { risk_level: 'low_risk', categories: ['finance', 'payment'] },
  'stripe.com': { risk_level: 'low_risk', categories: ['finance', 'payment', 'developer_tools'] },
  'binance.com': { risk_level: 'low_risk', categories: ['finance', 'cryptocurrency', 'exchange'] },
  'coinbase.com': { risk_level: 'low_risk', categories: ['finance', 'cryptocurrency', 'exchange'] },
  // — Cloud Storage & Productivity —
  'dropbox.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'drive.google.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'onedrive.live.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'notion.so': { risk_level: 'low_risk', categories: ['productivity', 'collaboration'] },
  'slack.com': { risk_level: 'low_risk', categories: ['communication', 'collaboration', 'business'] },
  'zoom.us': { risk_level: 'low_risk', categories: ['communication', 'video_conferencing'] },
  'teams.microsoft.com': { risk_level: 'low_risk', categories: ['communication', 'collaboration', 'business'] },
  // — Education —
  'coursera.org': { risk_level: 'low_risk', categories: ['education', 'online_learning'] },
  'udemy.com': { risk_level: 'low_risk', categories: ['education', 'online_learning'] },
  'wikipedia.org': { risk_level: 'low_risk', categories: ['education', 'reference', 'encyclopedia'] },
  // — Developer Tools —
  'stackoverflow.com': { risk_level: 'low_risk', categories: ['development', 'forum', 'technical'] },
  'npmjs.com': { risk_level: 'low_risk', categories: ['development', 'package_registry'] },
  'vercel.com': { risk_level: 'low_risk', categories: ['development', 'cloud_hosting'] },
  'netlify.com': { risk_level: 'low_risk', categories: ['development', 'cloud_hosting'] },
  'aws.amazon.com': { risk_level: 'low_risk', categories: ['cloud_infrastructure', 'business'] },
  // — VPN & Proxy —
  'nordvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  'expressvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  'protonvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  // — Gambling —
  'bet365.com': { risk_level: 'medium_risk', categories: ['gambling', 'betting'] },
  'pokerstars.com': { risk_level: 'medium_risk', categories: ['gambling', 'gaming'] },
  // — Adult Content —
  'pornhub.com': { risk_level: 'medium_risk', categories: ['adult', 'nsfw'] },
  'xvideos.com': { risk_level: 'medium_risk', categories: ['adult', 'nsfw'] },
  // — File Sharing —
  'wetransfer.com': { risk_level: 'low_risk', categories: ['file_sharing', 'productivity'] },
  'mega.nz': { risk_level: 'medium_risk', categories: ['file_sharing', 'cloud_storage', 'encrypted'] },
  'mediafire.com': { risk_level: 'medium_risk', categories: ['file_sharing'] },
  // — Email Services —
  'gmail.com': { risk_level: 'low_risk', categories: ['email', 'communication'] },
  'outlook.com': { risk_level: 'low_risk', categories: ['email', 'communication'] },
  'protonmail.com': { risk_level: 'low_risk', categories: ['email', 'encrypted_communication', 'privacy_tools'] },
  // — Government —
  'gov.hk': { risk_level: 'low_risk', categories: ['government', 'hong_kong'] },
  'irs.gov': { risk_level: 'low_risk', categories: ['government', 'finance', 'tax'] },
    // — Travel & Booking —
  'booking.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'expedia.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'airbnb.com': { risk_level: 'low_risk', categories: ['travel', 'booking', 'accommodation'] },
  'tripadvisor.com': { risk_level: 'low_risk', categories: ['travel', 'reviews'] },
  'kayak.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'hotels.com': { risk_level: 'low_risk', categories: ['travel', 'accommodation'] },
  'agoda.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'skyscanner.com': { risk_level: 'low_risk', categories: ['travel', 'flights'] },
  // — Food & Delivery —
  'ubereats.com': { risk_level: 'low_risk', categories: ['food_delivery', 'restaurant'] },
  'doordash.com': { risk_level: 'low_risk', categories: ['food_delivery'] },
  'grubhub.com': { risk_level: 'low_risk', categories: ['food_delivery'] },
  'deliveroo.com': { risk_level: 'low_risk', categories: ['food_delivery'] },
  'foodpanda.com': { risk_level: 'low_risk', categories: ['food_delivery'] },
  'yelp.com': { risk_level: 'low_risk', categories: ['reviews', 'restaurant', 'local_business'] },
  // — Health & Fitness —
  'webmd.com': { risk_level: 'low_risk', categories: ['health', 'medical_info'] },
  'mayoclinic.org': { risk_level: 'low_risk', categories: ['health', 'medical_info'] },
  'healthline.com': { risk_level: 'low_risk', categories: ['health', 'medical_info'] },
  'fitbit.com': { risk_level: 'low_risk', categories: ['health', 'fitness', 'wearable'] },
  'myfitnesspal.com': { risk_level: 'low_risk', categories: ['health', 'fitness'] },
  'strava.com': { risk_level: 'low_risk', categories: ['fitness', 'social_media'] },
  // — Real Estate —
  'zillow.com': { risk_level: 'low_risk', categories: ['real_estate', 'property'] },
  'realtor.com': { risk_level: 'low_risk', categories: ['real_estate', 'property'] },
  'rightmove.co.uk': { risk_level: 'low_risk', categories: ['real_estate', 'property'] },
  '28hse.com': { risk_level: 'low_risk', categories: ['real_estate', 'property', 'hong_kong'] },
  // — Job & Recruitment —
  'indeed.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment'] },
  'glassdoor.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment', 'reviews'] },
  'monster.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment'] },
  'jobsdb.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment', 'hong_kong'] },
  'seek.com.au': { risk_level: 'low_risk', categories: ['jobs', 'recruitment'] },
  // — Automotive —
  'tesla.com': { risk_level: 'low_risk', categories: ['automotive', 'ev'] },
  'carvana.com': { risk_level: 'low_risk', categories: ['automotive', 'ecommerce'] },
  'autotrader.com': { risk_level: 'low_risk', categories: ['automotive', 'marketplace'] },
  // — Sports —
  'espn.com': { risk_level: 'low_risk', categories: ['sports', 'news', 'media'] },
  'nba.com': { risk_level: 'low_risk', categories: ['sports', 'basketball'] },
  'fifa.com': { risk_level: 'low_risk', categories: ['sports', 'football'] },
  'nfl.com': { risk_level: 'low_risk', categories: ['sports', 'football'] },
  // — Social Media (Additional) —
  'reddit.com': { risk_level: 'low_risk', categories: ['social_media', 'forum'] },
  'pinterest.com': { risk_level: 'low_risk', categories: ['social_media', 'images'] },
  'snapchat.com': { risk_level: 'low_risk', categories: ['social_media', 'messaging'] },
  'discord.com': { risk_level: 'low_risk', categories: ['social_media', 'communication', 'gaming'] },
  'telegram.org': { risk_level: 'low_risk', categories: ['messaging', 'communication'] },
  'whatsapp.com': { risk_level: 'low_risk', categories: ['messaging', 'communication'] },
  'signal.org': { risk_level: 'low_risk', categories: ['messaging', 'encrypted_communication'] },
  'wechat.com': { risk_level: 'low_risk', categories: ['messaging', 'social_media', 'china'] },
  'weibo.com': { risk_level: 'low_risk', categories: ['social_media', 'china'] },
  'line.me': { risk_level: 'low_risk', categories: ['messaging', 'social_media'] },
  'tumblr.com': { risk_level: 'low_risk', categories: ['social_media', 'blogging'] },
  'quora.com': { risk_level: 'low_risk', categories: ['social_media', 'forum', 'qa'] },
  'medium.com': { risk_level: 'low_risk', categories: ['blogging', 'media'] },
  // — Cloud & SaaS —
  'salesforce.com': { risk_level: 'low_risk', categories: ['saas', 'crm', 'business'] },
  'hubspot.com': { risk_level: 'low_risk', categories: ['saas', 'marketing', 'crm'] },
  'zendesk.com': { risk_level: 'low_risk', categories: ['saas', 'customer_support'] },
  'atlassian.com': { risk_level: 'low_risk', categories: ['saas', 'development', 'collaboration'] },
  'jira.atlassian.com': { risk_level: 'low_risk', categories: ['saas', 'project_management'] },
  'trello.com': { risk_level: 'low_risk', categories: ['saas', 'project_management'] },
  'asana.com': { risk_level: 'low_risk', categories: ['saas', 'project_management'] },
  'monday.com': { risk_level: 'low_risk', categories: ['saas', 'project_management'] },
  'airtable.com': { risk_level: 'low_risk', categories: ['saas', 'productivity', 'database'] },
  'figma.com': { risk_level: 'low_risk', categories: ['saas', 'design', 'collaboration'] },
  'canva.com': { risk_level: 'low_risk', categories: ['saas', 'design'] },
  'miro.com': { risk_level: 'low_risk', categories: ['saas', 'collaboration', 'whiteboard'] },
  'intercom.com': { risk_level: 'low_risk', categories: ['saas', 'customer_support', 'messaging'] },
  'mailchimp.com': { risk_level: 'low_risk', categories: ['saas', 'email_marketing'] },
  'twilio.com': { risk_level: 'low_risk', categories: ['saas', 'communication', 'api'] },
  'docusign.com': { risk_level: 'low_risk', categories: ['saas', 'business', 'legal'] },
  // — Search Engines —
  'bing.com': { risk_level: 'low_risk', categories: ['search_engine'] },
  'duckduckgo.com': { risk_level: 'low_risk', categories: ['search_engine', 'privacy_tools'] },
  'yahoo.com': { risk_level: 'low_risk', categories: ['search_engine', 'portal', 'news'] },
  'baidu.com': { risk_level: 'low_risk', categories: ['search_engine', 'china'] },
  'yandex.com': { risk_level: 'low_risk', categories: ['search_engine', 'russia'] },
  // — E-commerce (Additional) —
  'walmart.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'target.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'bestbuy.com': { risk_level: 'low_risk', categories: ['shopping', 'electronics'] },
  'costco.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'etsy.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'handmade'] },
  'wish.com': { risk_level: 'medium_risk', categories: ['shopping', 'ecommerce'] },
  'shein.com': { risk_level: 'low_risk', categories: ['shopping', 'fashion'] },
  'jd.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'china'] },
  'lazada.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'rakuten.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'japan'] },
  // — Cybersecurity —
  'virustotal.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'malware_analysis'] },
  'shodan.io': { risk_level: 'low_risk', categories: ['cybersecurity', 'osint'] },
  'haveibeenpwned.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'breach_check'] },
  'abuseipdb.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'threat_intel'] },
  'urlhaus.abuse.ch': { risk_level: 'low_risk', categories: ['cybersecurity', 'threat_intel'] },
  'phishtank.org': { risk_level: 'low_risk', categories: ['cybersecurity', 'threat_intel'] },
  'malwarebytes.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'antivirus'] },
  'kaspersky.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'antivirus'] },
  'crowdstrike.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'endpoint_security'] },
  'paloaltonetworks.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'network_security'] },
  // — Dating —
  'tinder.com': { risk_level: 'medium_risk', categories: ['dating', 'social_media'] },
  'bumble.com': { risk_level: 'medium_risk', categories: ['dating', 'social_media'] },
  'match.com': { risk_level: 'medium_risk', categories: ['dating'] },
  'okcupid.com': { risk_level: 'medium_risk', categories: ['dating'] },
  // — Gaming —
  'store.steampowered.com': { risk_level: 'low_risk', categories: ['gaming', 'ecommerce'] },
  'epicgames.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'roblox.com': { risk_level: 'low_risk', categories: ['gaming', 'kids'] },
  'ea.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'blizzard.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'xbox.com': { risk_level: 'low_risk', categories: ['gaming', 'microsoft'] },
  'playstation.com': { risk_level: 'low_risk', categories: ['gaming', 'sony'] },
  'nintendo.com': { risk_level: 'low_risk', categories: ['gaming'] },
  // — Crypto & Web3 —
  'ethereum.org': { risk_level: 'low_risk', categories: ['cryptocurrency', 'blockchain'] },
  'bitcoin.org': { risk_level: 'low_risk', categories: ['cryptocurrency', 'blockchain'] },
  'opensea.io': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'nft', 'marketplace'] },
  'uniswap.org': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'defi'] },
  'metamask.io': { risk_level: 'low_risk', categories: ['cryptocurrency', 'wallet'] },
  // — Advertising & Analytics —
  'analytics.google.com': { risk_level: 'low_risk', categories: ['analytics', 'advertising'] },
  'ads.google.com': { risk_level: 'low_risk', categories: ['advertising'] },
  'semrush.com': { risk_level: 'low_risk', categories: ['marketing', 'seo', 'analytics'] },
  'ahrefs.com': { risk_level: 'low_risk', categories: ['marketing', 'seo'] },
  'hotjar.com': { risk_level: 'low_risk', categories: ['analytics', 'ux'] },
  // — News (Additional) —
  'washingtonpost.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'theguardian.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'bloomberg.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'cnbc.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'apnews.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'ft.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'wsj.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'techcrunch.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  'wired.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  'theverge.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  'arstechnica.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  // — Torrent & P2P —
  'thepiratebay.org': { risk_level: 'high_risk', categories: ['torrent', 'piracy', 'file_sharing'] },
  '1337x.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'rarbg.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'nyaa.si': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  // — URL Shorteners —
  'bit.ly': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  'tinyurl.com': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  't.co': { risk_level: 'low_risk', categories: ['url_shortener', 'twitter'] },
  'goo.gl': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  // — Paste Sites —
  'pastebin.com': { risk_level: 'medium_risk', categories: ['paste_site', 'development'] },
  'hastebin.com': { risk_level: 'medium_risk', categories: ['paste_site', 'development'] },
  'ghostbin.com': { risk_level: 'high_risk', categories: ['paste_site', 'anonymous'] },
  // — Anonymous & Privacy —
  'torproject.org': { risk_level: 'medium_risk', categories: ['privacy_tools', 'anonymizer'] },
  'privacyguides.org': { risk_level: 'low_risk', categories: ['privacy_tools', 'education'] },
};

// ── Suspicious TLD list ──
const SUSPICIOUS_TLDS = [
  '.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk',
  '.pw','.work','.date','.download','.stream','.racing','.party','.trade',
  '.review','.science','.faith','.bid','.men','.space',
];

// ── Feed loader helpers ──
async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/1.0' },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#'));
  } catch {
    return [];
  }
}

// URLhaus domains_online.txt - one domain per line
async function loadUrlhaus(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://urlhaus.abuse.ch/downloads/text_online/'
  );
  const domains = new Set<string>();
  for (const line of lines) {
    try {
      const hostname = new URL(line.startsWith('http') ? line : 'http://' + line).hostname;
      domains.add(hostname);
    } catch {
      // skip malformed
    }
  }
  return domains;
}

// Phishing Army blocklist - one domain per line
async function loadPhishingArmy(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://phishing.army/download/phishing_army_blocklist.txt'
  );
  return new Set(lines.filter(l => l.length > 3));
}

// OpenPhish community feed - one URL per line
async function loadOpenPhish(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt'
  );
  const urls = new Set<string>();
  for (const line of lines) {
    try {
      urls.add(new URL(line).hostname);
    } catch {
      // skip
    }
  }
  return urls;
}

// ── Refresh all feeds (called by cron route or lazily) ──
export async function refreshFeeds(): Promise<void> {
  const [urlhaus, phishingArmy, openphish] = await Promise.all([
    loadUrlhaus(),
    loadPhishingArmy(),
    loadOpenPhish(),
  ]);
  cache = {
    urlhaus,
    phishingArmy,
    openphish,
    lastUpdated: Date.now(),
  };
}

async function ensureCache(): Promise<void> {
  if (Date.now() - cache.lastUpdated > CACHE_TTL_MS) {
    await refreshFeeds();
  }
}

// ── Risk level ordering ──
const RISK_ORDER: RiskLevel[] = [
  'unknown', 'low_risk', 'medium_risk', 'high_risk', 'known_malicious',
];

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

// ── Main check function ──
export async function checkUrl(url: string): Promise<ThreatIntelResult> {
  await ensureCache();

  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return {
      url,
      final: {
        risk_level: 'unknown',
        categories: ['invalid_url'],
        flags: [],
        reason: 'Invalid URL format',
      },
      sources: [],
      timestamp: new Date().toISOString(),
    };
  }

  const sources: SourceHit[] = [];

  // 1. Local IOC check (highest priority)
  const localMatch = LOCAL_IOC[hostname] || LOCAL_IOC[url];
  sources.push({
    name: 'nextguard_local_ioc',
    hit: !!localMatch,
    risk_level: localMatch?.risk_level,
    categories: localMatch?.categories,
    flags: localMatch ? ['local_ioc'] : [],
  });

  // 2. URLhaus check
  const urlhausHit = cache.urlhaus.has(hostname);
  sources.push({
    name: 'urlhaus',
    hit: urlhausHit,
    risk_level: urlhausHit ? 'known_malicious' : 'unknown',
    categories: urlhausHit ? ['malware'] : [],
    flags: urlhausHit ? ['osint_urlhaus'] : [],
    detail: urlhausHit ? 'Listed in URLhaus malware feed (abuse.ch)' : undefined,
  });

  // 3. Phishing Army check
  const phishArmyHit = cache.phishingArmy.has(hostname);
  sources.push({
    name: 'phishing_army',
    hit: phishArmyHit,
    risk_level: phishArmyHit ? 'high_risk' : 'unknown',
    categories: phishArmyHit ? ['phishing'] : [],
    flags: phishArmyHit ? ['osint_phishing_army'] : [],
    detail: phishArmyHit ? 'Listed in Phishing Army blocklist' : undefined,
  });

  // 4. OpenPhish check
  const openPhishHit = cache.openphish.has(hostname);
  sources.push({
    name: 'openphish',
    hit: openPhishHit,
    risk_level: openPhishHit ? 'high_risk' : 'unknown',
    categories: openPhishHit ? ['phishing'] : [],
    flags: openPhishHit ? ['osint_openphish'] : [],
    detail: openPhishHit ? 'Listed in OpenPhish community feed' : undefined,
  });

  // ── Aggregation logic ──
  let final_risk: RiskLevel = 'unknown';
  const final_categories: string[] = [];
  const final_flags: string[] = [];
  const reasons: string[] = [];

  // Rule 1: Local IOC override
  if (localMatch) {
    final_risk = localMatch.risk_level;
    final_categories.push(...localMatch.categories);
    final_flags.push('customer_override', 'local_ioc');
    reasons.push('Matched Nextguard local IOC list');
  }

  // Rule 2: URLhaus = known_malicious
  if (urlhausHit) {
    final_risk = maxRisk(final_risk, 'known_malicious');
    if (!final_categories.includes('malware')) final_categories.push('malware');
    final_flags.push('osint_urlhaus');
    reasons.push('Listed in URLhaus malware feed');
  }

  // Rule 3: OpenPhish + PhishingArmy both hit = escalate to known_malicious
  if (openPhishHit && phishArmyHit) {
    final_risk = maxRisk(final_risk, 'known_malicious');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_openphish', 'osint_phishing_army');
    reasons.push('Listed in both OpenPhish and Phishing Army feeds');
  } else if (openPhishHit) {
    final_risk = maxRisk(final_risk, 'high_risk');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_openphish');
    reasons.push('Listed in OpenPhish community feed');
  } else if (phishArmyHit) {
    final_risk = maxRisk(final_risk, 'high_risk');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_phishing_army');
    reasons.push('Listed in Phishing Army blocklist');
  }

  // Rule 4: Greylist heuristics (only if no hits)
  if (final_risk === 'unknown') {
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => hostname.endsWith(t));
    const hasMaliciousKeyword = ['malware','phish','exploit','botnet','ransom','cryptominer'].some(k => hostname.includes(k));
    if (hasMaliciousKeyword) {
      final_risk = 'high_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'malicious_keyword');
      reasons.push('Domain contains malicious keyword pattern');
    } else if (hasSuspiciousTld) {
      final_risk = 'medium_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'suspicious_tld');
      reasons.push('Domain uses high-risk TLD with no positive reputation');
    }
  }

  // Deduplicate flags
  const uniqueFlags = [...new Set(final_flags)];
  const uniqueCategories = final_categories.length > 0 ? [...new Set(final_categories)] : ['uncategorized'];

  return {
    url,
    final: {
      risk_level: final_risk,
      categories: uniqueCategories,
      flags: uniqueFlags,
      reason: reasons.length > 0 ? reasons.join('; ') : 'No evidence of malicious activity in OSINT feeds',
    },
    sources,
    timestamp: new Date().toISOString(),
  };
}

// ── Feed status (for health check) ──
export function getFeedStatus() {
  return {
    lastUpdated: cache.lastUpdated ? new Date(cache.lastUpdated).toISOString() : null,
    counts: {
      urlhaus: cache.urlhaus.size,
      phishingArmy: cache.phishingArmy.size,
      openphish: cache.openphish.size,
      localIoc: Object.keys(LOCAL_IOC).length,
    },
  };
}
