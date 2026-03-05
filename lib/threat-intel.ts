// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine v2.0
// Integrates URLhaus, Phishing Army, OpenPhish, PhishTank

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
    confidence: number; // 0-100 confidence score
  };
  sources: SourceHit[];
  timestamp: string;
}

// -- In-memory cache (Vercel serverless: per-instance, refreshed by cron) --
interface FeedCache {
  urlhaus: Set<string>;       // domains
  phishingArmy: Set<string>;  // domains
  openphish: Set<string>;     // domains (extracted from URLs)
  phishtank: Set<string>;     // domains (extracted from verified URLs)
  phishtankUrls: Set<string>; // full URLs for exact match
  lastUpdated: number;        // epoch ms
  feedErrors: string[];       // track feed loading errors
}

let cache: FeedCache = {
  urlhaus: new Set(),
  phishingArmy: new Set(),
  openphish: new Set(),
  phishtank: new Set(),
  phishtankUrls: new Set(),
  lastUpdated: 0,
  feedErrors: [],
};

// Cache TTL: 15 minutes (feeds update every 5-15 min)
const CACHE_TTL_MS = 15 * 60 * 1000;

// -- Local IOC list (customer overrides) --
export const LOCAL_IOC: Record<string, { risk_level: RiskLevel; categories: string[] }> = {
  'crimsondew.com': { risk_level: 'known_malicious', categories: ['malware'] },
  'evil.com': { risk_level: 'known_malicious', categories: ['malware'] },
  'phishing-site.com': { risk_level: 'known_malicious', categories: ['phishing'] },
  'fakebank-login.xyz': { risk_level: 'high_risk', categories: ['phishing'] },
  'secure-verify-account.top': { risk_level: 'high_risk', categories: ['phishing'] },
  'crypto-airdrop-free.club': { risk_level: 'high_risk', categories: ['crypto_scam'] },
  'download-crack-now.top': { risk_level: 'high_risk', categories: ['malware'] },
  'login-paypal-secure.xyz': { risk_level: 'known_malicious', categories: ['phishing'] },
  'update-flash-player.club': { risk_level: 'known_malicious', categories: ['malware'] },
  'google.com': { risk_level: 'low_risk', categories: ['search_engine'] },
  'microsoft.com': { risk_level: 'low_risk', categories: ['business'] },
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
  'github.com': { risk_level: 'low_risk', categories: ['development'] },
  'malware.testing.google.test': { risk_level: 'known_malicious', categories: ['malware'] },
  // -- News & Media --
  'cnn.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'bbc.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'reuters.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'nytimes.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'scmp.com': { risk_level: 'low_risk', categories: ['news', 'media', 'hong_kong'] },
  'hk01.com': { risk_level: 'low_risk', categories: ['news', 'media', 'hong_kong'] },
  // -- Streaming --
  'youtube.com': { risk_level: 'low_risk', categories: ['streaming', 'video', 'entertainment'] },
  'netflix.com': { risk_level: 'low_risk', categories: ['streaming', 'entertainment'] },
  'spotify.com': { risk_level: 'low_risk', categories: ['streaming', 'music'] },
  'twitch.tv': { risk_level: 'low_risk', categories: ['streaming', 'gaming', 'entertainment'] },
  'disneyplus.com': { risk_level: 'low_risk', categories: ['streaming', 'entertainment'] },
  // -- Shopping --
  'amazon.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'ebay.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'auction'] },
  'alibaba.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'b2b'] },
  'taobao.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'shopee.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  // -- Finance --
  'hsbc.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'chase.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'paypal.com': { risk_level: 'low_risk', categories: ['finance', 'payment'] },
  'stripe.com': { risk_level: 'low_risk', categories: ['finance', 'payment', 'developer_tools'] },
  'binance.com': { risk_level: 'low_risk', categories: ['finance', 'cryptocurrency', 'exchange'] },
  'coinbase.com': { risk_level: 'low_risk', categories: ['finance', 'cryptocurrency', 'exchange'] },
  // -- Cloud & Productivity --
  'dropbox.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'drive.google.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'onedrive.live.com': { risk_level: 'low_risk', categories: ['cloud_storage', 'productivity'] },
  'notion.so': { risk_level: 'low_risk', categories: ['productivity', 'collaboration'] },
  'slack.com': { risk_level: 'low_risk', categories: ['communication', 'collaboration', 'business'] },
  'zoom.us': { risk_level: 'low_risk', categories: ['communication', 'video_conferencing'] },
  'teams.microsoft.com': { risk_level: 'low_risk', categories: ['communication', 'collaboration', 'business'] },
  // -- Education --
  'coursera.org': { risk_level: 'low_risk', categories: ['education', 'online_learning'] },
  'udemy.com': { risk_level: 'low_risk', categories: ['education', 'online_learning'] },
  'wikipedia.org': { risk_level: 'low_risk', categories: ['education', 'reference', 'encyclopedia'] },
  // -- Developer Tools --
  'stackoverflow.com': { risk_level: 'low_risk', categories: ['development', 'forum', 'technical'] },
  'npmjs.com': { risk_level: 'low_risk', categories: ['development', 'package_registry'] },
  'vercel.com': { risk_level: 'low_risk', categories: ['development', 'cloud_hosting'] },
  'netlify.com': { risk_level: 'low_risk', categories: ['development', 'cloud_hosting'] },
  'aws.amazon.com': { risk_level: 'low_risk', categories: ['cloud_infrastructure', 'business'] },
  // -- VPN & Proxy --
  'nordvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  'expressvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  'protonvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  // -- Gambling --
  'bet365.com': { risk_level: 'medium_risk', categories: ['gambling', 'betting'] },
  'pokerstars.com': { risk_level: 'medium_risk', categories: ['gambling', 'gaming'] },
  // -- Adult Content --
  'pornhub.com': { risk_level: 'medium_risk', categories: ['adult', 'nsfw'] },
  'xvideos.com': { risk_level: 'medium_risk', categories: ['adult', 'nsfw'] },
  // -- File Sharing --
  'wetransfer.com': { risk_level: 'low_risk', categories: ['file_sharing', 'productivity'] },
  'mega.nz': { risk_level: 'medium_risk', categories: ['file_sharing', 'cloud_storage', 'encrypted'] },
  'mediafire.com': { risk_level: 'medium_risk', categories: ['file_sharing'] },
  // -- Email --
  'gmail.com': { risk_level: 'low_risk', categories: ['email', 'communication'] },
  'outlook.com': { risk_level: 'low_risk', categories: ['email', 'communication'] },
  'protonmail.com': { risk_level: 'low_risk', categories: ['email', 'encrypted_communication', 'privacy_tools'] },
  // -- Government --
  'gov.hk': { risk_level: 'low_risk', categories: ['government', 'hong_kong'] },
  'irs.gov': { risk_level: 'low_risk', categories: ['government', 'finance', 'tax'] },
  // -- Travel --
  'booking.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'expedia.com': { risk_level: 'low_risk', categories: ['travel', 'booking'] },
  'airbnb.com': { risk_level: 'low_risk', categories: ['travel', 'booking', 'accommodation'] },
  // -- Food --
  'ubereats.com': { risk_level: 'low_risk', categories: ['food_delivery', 'restaurant'] },
  'doordash.com': { risk_level: 'low_risk', categories: ['food_delivery'] },
  // -- Health --
  'webmd.com': { risk_level: 'low_risk', categories: ['health', 'medical_info'] },
  'mayoclinic.org': { risk_level: 'low_risk', categories: ['health', 'medical_info'] },
  // -- Jobs --
  'indeed.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment'] },
  'glassdoor.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment', 'reviews'] },
  'jobsdb.com': { risk_level: 'low_risk', categories: ['jobs', 'recruitment', 'hong_kong'] },
  // -- Social Media (Additional) --
  'reddit.com': { risk_level: 'low_risk', categories: ['social_media', 'forum'] },
  'pinterest.com': { risk_level: 'low_risk', categories: ['social_media', 'images'] },
  'snapchat.com': { risk_level: 'low_risk', categories: ['social_media', 'messaging'] },
  'discord.com': { risk_level: 'low_risk', categories: ['social_media', 'communication', 'gaming'] },
  'telegram.org': { risk_level: 'low_risk', categories: ['messaging', 'communication'] },
  'whatsapp.com': { risk_level: 'low_risk', categories: ['messaging', 'communication'] },
  'signal.org': { risk_level: 'low_risk', categories: ['messaging', 'encrypted_communication'] },
  'wechat.com': { risk_level: 'low_risk', categories: ['messaging', 'social_media', 'china'] },
  'weibo.com': { risk_level: 'low_risk', categories: ['social_media', 'china'] },
  'medium.com': { risk_level: 'low_risk', categories: ['blogging', 'media'] },
  'quora.com': { risk_level: 'low_risk', categories: ['social_media', 'forum', 'qa'] },
  // -- SaaS & Cloud --
  'salesforce.com': { risk_level: 'low_risk', categories: ['saas', 'crm', 'business'] },
  'hubspot.com': { risk_level: 'low_risk', categories: ['saas', 'marketing', 'crm'] },
  'zendesk.com': { risk_level: 'low_risk', categories: ['saas', 'customer_support'] },
  'atlassian.com': { risk_level: 'low_risk', categories: ['saas', 'development', 'collaboration'] },
  'trello.com': { risk_level: 'low_risk', categories: ['saas', 'project_management'] },
  'figma.com': { risk_level: 'low_risk', categories: ['saas', 'design', 'collaboration'] },
  'canva.com': { risk_level: 'low_risk', categories: ['saas', 'design'] },
  'docusign.com': { risk_level: 'low_risk', categories: ['saas', 'business', 'legal'] },
  // -- Search Engines --
  'bing.com': { risk_level: 'low_risk', categories: ['search_engine'] },
  'duckduckgo.com': { risk_level: 'low_risk', categories: ['search_engine', 'privacy_tools'] },
  'yahoo.com': { risk_level: 'low_risk', categories: ['search_engine', 'portal', 'news'] },
  'baidu.com': { risk_level: 'low_risk', categories: ['search_engine', 'china'] },
  // -- E-commerce (More) --
  'walmart.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'target.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce'] },
  'bestbuy.com': { risk_level: 'low_risk', categories: ['shopping', 'electronics'] },
  'etsy.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'handmade'] },
  'shein.com': { risk_level: 'low_risk', categories: ['shopping', 'fashion'] },
  'temu.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'china'] },
  'aliexpress.com': { risk_level: 'low_risk', categories: ['shopping', 'ecommerce', 'china'] },
  // -- Cybersecurity --
  'virustotal.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'malware_analysis'] },
  'shodan.io': { risk_level: 'low_risk', categories: ['cybersecurity', 'osint'] },
  'haveibeenpwned.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'breach_check'] },
  'crowdstrike.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'endpoint_security'] },
  'paloaltonetworks.com': { risk_level: 'low_risk', categories: ['cybersecurity', 'network_security'] },
  // -- Dating --
  'tinder.com': { risk_level: 'medium_risk', categories: ['dating', 'social_media'] },
  'bumble.com': { risk_level: 'medium_risk', categories: ['dating', 'social_media'] },
  // -- Gaming --
  'store.steampowered.com': { risk_level: 'low_risk', categories: ['gaming', 'ecommerce'] },
  'epicgames.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'roblox.com': { risk_level: 'low_risk', categories: ['gaming', 'kids'] },
  'xbox.com': { risk_level: 'low_risk', categories: ['gaming', 'microsoft'] },
  'playstation.com': { risk_level: 'low_risk', categories: ['gaming', 'sony'] },
  // -- Crypto --
  'ethereum.org': { risk_level: 'low_risk', categories: ['cryptocurrency', 'blockchain'] },
  'bitcoin.org': { risk_level: 'low_risk', categories: ['cryptocurrency', 'blockchain'] },
  'opensea.io': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'nft', 'marketplace'] },
  'uniswap.org': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'defi'] },
  // -- Torrent & Piracy --
  'thepiratebay.org': { risk_level: 'high_risk', categories: ['torrent', 'piracy', 'file_sharing'] },
  '1337x.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'rarbg.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'nyaa.si': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  // -- URL Shorteners --
  'bit.ly': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  'tinyurl.com': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  't.co': { risk_level: 'low_risk', categories: ['url_shortener', 'twitter'] },
  // -- Paste Sites --
  'pastebin.com': { risk_level: 'medium_risk', categories: ['paste_site', 'development'] },
  'ghostbin.com': { risk_level: 'high_risk', categories: ['paste_site', 'anonymous'] },
  // -- Privacy & Anonymizer --
  'torproject.org': { risk_level: 'medium_risk', categories: ['privacy_tools', 'anonymizer'] },
  // -- Technology & Major Sites --
  'apple.com': { risk_level: 'low_risk', categories: ['technology', 'electronics', 'business'] },
  'adobe.com': { risk_level: 'low_risk', categories: ['technology', 'software', 'creative'] },
  'samsung.com': { risk_level: 'low_risk', categories: ['technology', 'electronics'] },
  'intel.com': { risk_level: 'low_risk', categories: ['technology', 'semiconductor'] },
  'cisco.com': { risk_level: 'low_risk', categories: ['technology', 'networking'] },
  'oracle.com': { risk_level: 'low_risk', categories: ['technology', 'enterprise_software'] },
  'ibm.com': { risk_level: 'low_risk', categories: ['technology', 'enterprise_software'] },
  'wordpress.com': { risk_level: 'low_risk', categories: ['blogging', 'cms', 'hosting'] },
  'imdb.com': { risk_level: 'low_risk', categories: ['entertainment', 'movies', 'reference'] },
  'archive.org': { risk_level: 'low_risk', categories: ['education', 'reference', 'archive'] },
  'mozilla.org': { risk_level: 'low_risk', categories: ['technology', 'browser', 'open_source'] },
  // -- News (More) --
  'washingtonpost.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'theguardian.com': { risk_level: 'low_risk', categories: ['news', 'media'] },
  'bloomberg.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'cnbc.com': { risk_level: 'low_risk', categories: ['news', 'finance'] },
  'techcrunch.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  'wired.com': { risk_level: 'low_risk', categories: ['news', 'technology'] },
  'forbes.com': { risk_level: 'low_risk', categories: ['news', 'finance', 'business'] },
  // -- Telecom --
  'att.com': { risk_level: 'low_risk', categories: ['telecom', 'isp'] },
  'verizon.com': { risk_level: 'low_risk', categories: ['telecom', 'isp'] },
  // -- Logistics --
  'ups.com': { risk_level: 'low_risk', categories: ['logistics', 'shipping'] },
  'fedex.com': { risk_level: 'low_risk', categories: ['logistics', 'shipping'] },
  // -- Fashion --
  'nike.com': { risk_level: 'low_risk', categories: ['shopping', 'sports', 'fashion'] },
  'ikea.com': { risk_level: 'low_risk', categories: ['shopping', 'furniture', 'home'] },
  // -- Security Tools --
  '1password.com': { risk_level: 'low_risk', categories: ['security', 'password_manager'] },
  'bitwarden.com': { risk_level: 'low_risk', categories: ['security', 'password_manager', 'open_source'] },
  // -- Hosting --
  'godaddy.com': { risk_level: 'low_risk', categories: ['hosting', 'domain_registrar'] },
  'squarespace.com': { risk_level: 'low_risk', categories: ['hosting', 'cms', 'website_builder'] },
  'wix.com': { risk_level: 'low_risk', categories: ['hosting', 'cms', 'website_builder'] },
  'shopify.com': { risk_level: 'low_risk', categories: ['ecommerce', 'saas', 'business'] },
  // -- Banking (More) --
  'wellsfargo.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'bankofamerica.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'americanexpress.com': { risk_level: 'low_risk', categories: ['finance', 'banking', 'credit_card'] },
};

// -- Suspicious TLD list --
const SUSPICIOUS_TLDS = [
  '.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk',
  '.pw','.work','.date','.download','.stream','.racing','.party','.trade',
  '.review','.science','.faith','.bid','.men','.space','.icu','.buzz',
  '.monster','.quest','.rest','.surf','.uno',
];

// -- Suspicious keyword patterns for domain analysis --
const SUSPICIOUS_KEYWORDS = [
  'malware','phish','exploit','botnet','ransom','cryptominer',
  'keylog','trojan','spyware','adware','rootkit','backdoor',
  'login-verify','secure-update','account-confirm','password-reset',
  'signin-alert','verify-identity',
];

// -- Known hosting providers often abused (for context scoring) --
const FREEHOST_PATTERNS = [
  'blogspot.com','weebly.com','000webhostapp.com','firebaseapp.com',
  'herokuapp.com','web.app','pages.dev','workers.dev',
  'netlify.app','vercel.app','github.io','gitlab.io',
];

// -- Feed loader helpers --
async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/2.0' },
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

// URLhaus - malware URLs
async function loadUrlhaus(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://urlhaus.abuse.ch/downloads/text_online/'
  );
  const domains = new Set<string>();
  for (const line of lines) {
    try {
      const hostname = new URL(line.startsWith('http') ? line : 'http://' + line).hostname;
      domains.add(hostname);
    } catch { /* skip malformed */ }
  }
  return domains;
}

// Phishing Army blocklist
async function loadPhishingArmy(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://phishing.army/download/phishing_army_blocklist.txt'
  );
  return new Set(lines.filter(l => l.length > 3));
}

// OpenPhish community feed
async function loadOpenPhish(): Promise<Set<string>> {
  const lines = await fetchTextFeed(
    'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt'
  );
  const domains = new Set<string>();
  for (const line of lines) {
    try {
      domains.add(new URL(line).hostname);
    } catch { /* skip */ }
  }
  return domains;
}

// PhishTank verified online phishing URLs (CSV format)
async function loadPhishTank(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const domains = new Set<string>();
  const urls = new Set<string>();
  try {
    const res = await fetch('http://data.phishtank.com/data/online-valid.csv', {
      signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/2.0' },
    });
    if (!res.ok) return { domains, urls };
    const text = await res.text();
    const lines = text.split('\n').slice(1); // skip header
    for (const line of lines) {
      try {
        // CSV: phish_id,url,phish_detail_url,submission_time,verified,verification_time,online,target
        const urlMatch = line.match(/^\d+,([^,]+),/);
        if (urlMatch && urlMatch[1]) {
          const rawUrl = urlMatch[1].trim().toLowerCase();
          urls.add(rawUrl);
          const hostname = new URL(rawUrl).hostname.replace(/^www\./, '');
          domains.add(hostname);
        }
      } catch { /* skip malformed */ }
    }
  } catch { /* feed unavailable */ }
  return { domains, urls };
}

// -- Refresh all feeds (called by cron route or lazily) --
export async function refreshFeeds(): Promise<void> {
  const errors: string[] = [];
  const [urlhaus, phishingArmy, openphish, phishtankData] = await Promise.all([
    loadUrlhaus().catch(() => { errors.push('urlhaus'); return new Set<string>(); }),
    loadPhishingArmy().catch(() => { errors.push('phishing_army'); return new Set<string>(); }),
    loadOpenPhish().catch(() => { errors.push('openphish'); return new Set<string>(); }),
    loadPhishTank().catch(() => { errors.push('phishtank'); return { domains: new Set<string>(), urls: new Set<string>() }; }),
  ]);
  cache = {
    urlhaus,
    phishingArmy,
    openphish,
    phishtank: phishtankData.domains,
    phishtankUrls: phishtankData.urls,
    lastUpdated: Date.now(),
    feedErrors: errors,
  };
}

async function ensureCache(): Promise<void> {
  if (Date.now() - cache.lastUpdated > CACHE_TTL_MS) {
    await refreshFeeds();
  }
}

// -- Risk level ordering --
const RISK_ORDER: RiskLevel[] = [
  'unknown', 'low_risk', 'medium_risk', 'high_risk', 'known_malicious',
];

function maxRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RISK_ORDER.indexOf(a) >= RISK_ORDER.indexOf(b) ? a : b;
}

// -- Confidence scoring helper --
function calculateConfidence(sources: SourceHit[], finalRisk: RiskLevel, isLocalMatch: boolean): number {
  const hitCount = sources.filter(s => s.hit).length;
  let confidence = 0;
  if (isLocalMatch) confidence += 40;
  // Each OSINT feed hit adds confidence
  confidence += hitCount * 20;
  // Known malicious from any source = high confidence
  if (finalRisk === 'known_malicious') confidence = Math.max(confidence, 80);
  // Multiple feed corroboration boosts confidence
  if (hitCount >= 3) confidence = Math.max(confidence, 95);
  if (hitCount >= 2) confidence = Math.max(confidence, 75);
  // Unknown with no hits = low confidence
  if (finalRisk === 'unknown' && hitCount === 0) confidence = 10;
  // Low risk from local IOC = moderate confidence
  if (finalRisk === 'low_risk' && isLocalMatch) confidence = Math.max(confidence, 60);
  return Math.min(confidence, 100);
}

// -- Main check function --
export async function checkUrl(url: string): Promise<ThreatIntelResult> {
  await ensureCache();

  let hostname = '';
  let normalizedUrl = url.toLowerCase().trim();
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
        confidence: 0,
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

  // 5. PhishTank check (domain + exact URL match)
  const phishtankDomainHit = cache.phishtank.has(hostname);
  const phishtankUrlHit = cache.phishtankUrls.has(normalizedUrl);
  const phishtankHit = phishtankDomainHit || phishtankUrlHit;
  sources.push({
    name: 'phishtank',
    hit: phishtankHit,
    risk_level: phishtankHit ? (phishtankUrlHit ? 'known_malicious' : 'high_risk') : 'unknown',
    categories: phishtankHit ? ['phishing'] : [],
    flags: phishtankHit ? (phishtankUrlHit ? ['osint_phishtank', 'exact_url_match'] : ['osint_phishtank']) : [],
    detail: phishtankHit ? (phishtankUrlHit ? 'Exact URL match in PhishTank verified database' : 'Domain listed in PhishTank verified database') : undefined,
  });

  // -- Aggregation logic --
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

  // Rule 3: PhishTank exact URL match = known_malicious
  if (phishtankUrlHit) {
    final_risk = maxRisk(final_risk, 'known_malicious');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_phishtank', 'exact_url_match');
    reasons.push('Exact URL match in PhishTank verified database');
  } else if (phishtankDomainHit) {
    final_risk = maxRisk(final_risk, 'high_risk');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_phishtank');
    reasons.push('Domain found in PhishTank verified database');
  }

  // Rule 4: Multi-source phishing corroboration
  const phishingSources = [openPhishHit, phishArmyHit, phishtankDomainHit].filter(Boolean).length;
  if (phishingSources >= 2) {
    final_risk = maxRisk(final_risk, 'known_malicious');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('multi_source_corroboration');
    reasons.push(`Corroborated across ${phishingSources} phishing feeds`);
  } else if (openPhishHit && !phishtankHit) {
    final_risk = maxRisk(final_risk, 'high_risk');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_openphish');
    reasons.push('Listed in OpenPhish community feed');
  } else if (phishArmyHit && !phishtankHit) {
    final_risk = maxRisk(final_risk, 'high_risk');
    if (!final_categories.includes('phishing')) final_categories.push('phishing');
    final_flags.push('osint_phishing_army');
    reasons.push('Listed in Phishing Army blocklist');
  }

  // Rule 5: Greylist heuristics (only if no hits from feeds or local IOC)
  if (final_risk === 'unknown') {
    const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => hostname.endsWith(t));
    const hasMaliciousKeyword = SUSPICIOUS_KEYWORDS.some(k => hostname.includes(k));
    const isOnFreeHost = FREEHOST_PATTERNS.some(p => hostname.endsWith(p));

    if (hasMaliciousKeyword) {
      final_risk = 'high_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'malicious_keyword');
      reasons.push('Domain contains malicious keyword pattern');
    } else if (hasSuspiciousTld && isOnFreeHost) {
      final_risk = 'high_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'suspicious_tld', 'free_hosting');
      reasons.push('Suspicious TLD on free hosting platform');
    } else if (hasSuspiciousTld) {
      final_risk = 'medium_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'suspicious_tld');
      reasons.push('Domain uses high-risk TLD with no positive reputation');
    } else if (isOnFreeHost) {
      final_risk = 'medium_risk';
      final_categories.push('suspicious');
      final_flags.push('greylist', 'free_hosting');
      reasons.push('Hosted on commonly-abused free hosting platform');
    }
  }

  // Deduplicate
  const uniqueFlags = [...new Set(final_flags)];
  const uniqueCategories = final_categories.length > 0 ? [...new Set(final_categories)] : ['uncategorized'];
  const confidence = calculateConfidence(sources, final_risk, !!localMatch);

  return {
    url,
    final: {
      risk_level: final_risk,
      categories: uniqueCategories,
      flags: uniqueFlags,
      reason: reasons.length > 0 ? reasons.join('; ') : 'No evidence of malicious activity in OSINT feeds',
      confidence,
    },
    sources,
    timestamp: new Date().toISOString(),
  };
}

// -- Feed status (for health check) --
export function getFeedStatus() {
  return {
    lastUpdated: cache.lastUpdated ? new Date(cache.lastUpdated).toISOString() : null,
    counts: {
      urlhaus: cache.urlhaus.size,
      phishingArmy: cache.phishingArmy.size,
      openphish: cache.openphish.size,
      phishtank: cache.phishtank.size,
      phishtankUrls: cache.phishtankUrls.size,
      localIoc: Object.keys(LOCAL_IOC).length,
    },
    errors: cache.feedErrors,
  };
}
