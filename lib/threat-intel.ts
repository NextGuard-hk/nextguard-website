// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine v3.0
// Integrates: URLhaus, Phishing Army, OpenPhish, PhishTank,
// Google Safe Browsing, VirusTotal, AlienVault OTX, Cloudflare DNS

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
    confidence: number;
  };
  sources: SourceHit[];
  timestamp: string;
}

// -- In-memory cache (Vercel serverless: per-instance, refreshed by cron) --
interface FeedCache {
  urlhaus: Set<string>;
  phishingArmy: Set<string>;
  openphish: Set<string>;
  phishtank: Set<string>;
  phishtankUrls: Set<string>;
  lastUpdated: number;
  feedErrors: string[];
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

const CACHE_TTL_MS = 15 * 60 * 1000;

// -- Local IOC list (customer overrides + URL category database) --
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
  'malware.testing.google.test': { risk_level: 'known_malicious', categories: ['malware'] },
  // Search & Social & GenAI
  'google.com': { risk_level: 'low_risk', categories: ['search_engine'] },
  'microsoft.com': { risk_level: 'low_risk', categories: ['business'] },
  'facebook.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'instagram.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'twitter.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'x.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'linkedin.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'tiktok.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'reddit.com': { risk_level: 'low_risk', categories: ['social_media', 'forum'] },
  'pinterest.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'snapchat.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'discord.com': { risk_level: 'low_risk', categories: ['social_media', 'communication'] },
  'telegram.org': { risk_level: 'low_risk', categories: ['messaging'] },
  'whatsapp.com': { risk_level: 'low_risk', categories: ['messaging'] },
  'signal.org': { risk_level: 'low_risk', categories: ['messaging', 'encrypted_communication'] },
  'wechat.com': { risk_level: 'low_risk', categories: ['messaging', 'china'] },
  'weibo.com': { risk_level: 'low_risk', categories: ['social_media', 'china'] },
  'chat.openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'claude.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'gemini.google.com': { risk_level: 'low_risk', categories: ['genai'] },
  'perplexity.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'copilot.microsoft.com': { risk_level: 'low_risk', categories: ['genai'] },
  'bard.google.com': { risk_level: 'low_risk', categories: ['genai'] },
  'github.com': { risk_level: 'low_risk', categories: ['development'] },
  // News & Media
  'cnn.com': { risk_level: 'low_risk', categories: ['news'] },
  'bbc.com': { risk_level: 'low_risk', categories: ['news'] },
  'reuters.com': { risk_level: 'low_risk', categories: ['news'] },
  'scmp.com': { risk_level: 'low_risk', categories: ['news', 'hong_kong'] },
  'hk01.com': { risk_level: 'low_risk', categories: ['news', 'hong_kong'] },
  // Streaming
  'youtube.com': { risk_level: 'low_risk', categories: ['streaming', 'entertainment'] },
  'netflix.com': { risk_level: 'low_risk', categories: ['streaming'] },
  'spotify.com': { risk_level: 'low_risk', categories: ['streaming', 'music'] },
  'twitch.tv': { risk_level: 'low_risk', categories: ['streaming', 'gaming'] },
  // Shopping
  'amazon.com': { risk_level: 'low_risk', categories: ['shopping'] },
  'ebay.com': { risk_level: 'low_risk', categories: ['shopping'] },
  'alibaba.com': { risk_level: 'low_risk', categories: ['shopping', 'b2b'] },
  'taobao.com': { risk_level: 'low_risk', categories: ['shopping'] },
  'shopee.com': { risk_level: 'low_risk', categories: ['shopping'] },
  // Finance
  'hsbc.com': { risk_level: 'low_risk', categories: ['finance', 'banking'] },
  'paypal.com': { risk_level: 'low_risk', categories: ['finance', 'payment'] },
  'stripe.com': { risk_level: 'low_risk', categories: ['finance', 'payment'] },
  'binance.com': { risk_level: 'low_risk', categories: ['finance', 'cryptocurrency'] },
  // Cloud & Productivity
  'dropbox.com': { risk_level: 'low_risk', categories: ['cloud_storage'] },
  'drive.google.com': { risk_level: 'low_risk', categories: ['cloud_storage'] },
  'onedrive.live.com': { risk_level: 'low_risk', categories: ['cloud_storage'] },
  'notion.so': { risk_level: 'low_risk', categories: ['productivity'] },
  'slack.com': { risk_level: 'low_risk', categories: ['communication', 'business'] },
  'zoom.us': { risk_level: 'low_risk', categories: ['communication'] },
  // Developer & Tech
  'stackoverflow.com': { risk_level: 'low_risk', categories: ['development'] },
  'vercel.com': { risk_level: 'low_risk', categories: ['development', 'hosting'] },
  'apple.com': { risk_level: 'low_risk', categories: ['technology'] },
  'adobe.com': { risk_level: 'low_risk', categories: ['technology', 'software'] },
  // VPN & Proxy
  'nordvpn.com': { risk_level: 'medium_risk', categories: ['vpn', 'privacy_tools'] },
  'expressvpn.com': { risk_level: 'medium_risk', categories: ['vpn'] },
  // Gambling
  'bet365.com': { risk_level: 'medium_risk', categories: ['gambling'] },
  // Adult
  'pornhub.com': { risk_level: 'medium_risk', categories: ['adult', 'nsfw'] },
  // File Sharing
  'mega.nz': { risk_level: 'medium_risk', categories: ['file_sharing', 'encrypted'] },
  // Torrent
  'thepiratebay.org': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  '1337x.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  // URL Shorteners
  'bit.ly': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  'tinyurl.com': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  // Paste Sites
  'pastebin.com': { risk_level: 'medium_risk', categories: ['paste_site'] },
  // Privacy
  'torproject.org': { risk_level: 'medium_risk', categories: ['privacy_tools', 'anonymizer'] },
  // Education
  'wikipedia.org': { risk_level: 'low_risk', categories: ['education', 'reference'] },
  // Email
  'gmail.com': { risk_level: 'low_risk', categories: ['email'] },
  'outlook.com': { risk_level: 'low_risk', categories: ['email'] },
  // Government
  'gov.hk': { risk_level: 'low_risk', categories: ['government', 'hong_kong'] },
  // Security
  'virustotal.com': { risk_level: 'low_risk', categories: ['cybersecurity'] },
  'crowdstrike.com': { risk_level: 'low_risk', categories: ['cybersecurity'] },
  // Crypto
  'opensea.io': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'nft'] },
  'uniswap.org': { risk_level: 'medium_risk', categories: ['cryptocurrency', 'defi'] },
  // Dating
  'tinder.com': { risk_level: 'medium_risk', categories: ['dating'] },
  // Gaming
  'store.steampowered.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'roblox.com': { risk_level: 'low_risk', categories: ['gaming'] },
  // More business
  'salesforce.com': { risk_level: 'low_risk', categories: ['saas', 'crm'] },
  'shopify.com': { risk_level: 'low_risk', categories: ['ecommerce', 'saas'] },
  'wordpress.com': { risk_level: 'low_risk', categories: ['blogging', 'cms'] },
};

const SUSPICIOUS_TLDS = ['.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk','.pw','.work','.date','.download','.stream','.racing','.party','.trade','.review','.science','.faith','.bid','.men','.space','.icu','.buzz','.monster','.quest','.rest','.surf','.uno'];
const SUSPICIOUS_KEYWORDS = ['malware','phish','exploit','botnet','ransom','cryptominer','keylog','trojan','spyware','adware','rootkit','backdoor','login-verify','secure-update','account-confirm','password-reset','signin-alert','verify-identity'];
const FREEHOST_PATTERNS = ['blogspot.com','weebly.com','000webhostapp.com','firebaseapp.com','herokuapp.com','web.app','pages.dev','workers.dev','netlify.app','vercel.app','github.io','gitlab.io'];

// -- Feed loader helpers --
async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/3.0' } });
    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
  } catch { return []; }
}

async function loadUrlhaus(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://urlhaus.abuse.ch/downloads/text_online/');
  const domains = new Set<string>();
  for (const line of lines) { try { domains.add(new URL(line.startsWith('http') ? line : 'http://' + line).hostname); } catch {} }
  return domains;
}

async function loadPhishingArmy(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://phishing.army/download/phishing_army_blocklist.txt');
  return new Set(lines.filter(l => l.length > 3));
}

async function loadOpenPhish(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt');
  const domains = new Set<string>();
  for (const line of lines) { try { domains.add(new URL(line).hostname); } catch {} }
  return domains;
}

async function loadPhishTank(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const domains = new Set<string>();
  const urls = new Set<string>();
  try {
    const res = await fetch('http://data.phishtank.com/data/online-valid.csv', { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/3.0' } });
    if (!res.ok) return { domains, urls };
    const text = await res.text();
    for (const line of text.split('\n').slice(1)) {
      try {
        const urlMatch = line.match(/^\d+,([^,]+),/);
        if (urlMatch?.[1]) { const u = urlMatch[1].trim().toLowerCase(); urls.add(u); domains.add(new URL(u).hostname.replace(/^www\./, '')); }
      } catch {}
    }
  } catch {}
  return { domains, urls };
}

// ============================================================
// NEW: Real-time API-based Threat Intelligence Sources
// ============================================================

// -- Google Safe Browsing API v4 --
async function checkGoogleSafeBrowsing(url: string): Promise<SourceHit> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return { name: 'google_safe_browsing', hit: false, detail: 'API key not configured' };
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'nextguard-swg', clientVersion: '3.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const hasMatch = data.matches && data.matches.length > 0;
    const threatTypes = hasMatch ? data.matches.map((m: any) => m.threatType).join(', ') : '';
    const categories: string[] = [];
    if (threatTypes.includes('MALWARE')) categories.push('malware');
    if (threatTypes.includes('SOCIAL_ENGINEERING')) categories.push('phishing');
    if (threatTypes.includes('UNWANTED_SOFTWARE')) categories.push('unwanted_software');
    return {
      name: 'google_safe_browsing',
      hit: hasMatch,
      risk_level: hasMatch ? 'known_malicious' : 'unknown',
      categories,
      flags: hasMatch ? ['gsb_' + threatTypes.toLowerCase().replace(/[^a-z_]/g, '_')] : [],
      detail: hasMatch ? `Google Safe Browsing: ${threatTypes}` : 'Not flagged by Google Safe Browsing',
    };
  } catch (e: any) {
    return { name: 'google_safe_browsing', hit: false, detail: 'API timeout or error: ' + e.message };
  }
}

// -- VirusTotal API v3 --
async function checkVirusTotal(url: string): Promise<SourceHit> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return { name: 'virustotal', hit: false, detail: 'API key not configured' };
  try {
    // URL ID is base64url-encoded URL without padding
    const urlId = Buffer.from(url).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': apiKey },
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 404) {
      return { name: 'virustotal', hit: false, detail: 'URL not found in VirusTotal database' };
    }
    const data = await res.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const totalEngines = (stats.harmless || 0) + (stats.undetected || 0) + malicious + suspicious;
    const score = malicious + suspicious;
    let risk: RiskLevel = 'unknown';
    const categories: string[] = [];
    if (malicious >= 5) { risk = 'known_malicious'; categories.push('malware'); }
    else if (malicious >= 2 || suspicious >= 3) { risk = 'high_risk'; categories.push('suspicious'); }
    else if (malicious >= 1 || suspicious >= 1) { risk = 'medium_risk'; categories.push('suspicious'); }
    else if (totalEngines > 0) { risk = 'low_risk'; }
    // Get community categories
    const vtCategories = data.data?.attributes?.categories || {};
    Object.values(vtCategories).forEach((c: any) => { if (c && !categories.includes(c)) categories.push(String(c).toLowerCase()); });
    return {
      name: 'virustotal',
      hit: score > 0,
      risk_level: risk,
      categories,
      flags: score > 0 ? [`vt_${malicious}/${totalEngines}_engines`] : [],
      detail: totalEngines > 0 ? `VirusTotal: ${malicious} malicious, ${suspicious} suspicious out of ${totalEngines} engines` : 'No VirusTotal analysis available',
    };
  } catch (e: any) {
    return { name: 'virustotal', hit: false, detail: 'API error: ' + e.message };
  }
}

// -- AlienVault OTX --
async function checkAlienVaultOTX(hostname: string): Promise<SourceHit> {
  const apiKey = process.env.ALIENVAULT_OTX_API_KEY;
  try {
    const headers: Record<string, string> = { 'User-Agent': 'NextGuard-ThreatIntel/3.0' };
    if (apiKey) headers['X-OTX-API-KEY'] = apiKey;
    const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${hostname}/general`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { name: 'alienvault_otx', hit: false, detail: `OTX API returned ${res.status}` };
    const data = await res.json();
    const pulseCount = data.pulse_info?.count || 0;
    const hasReputation = data.reputation !== undefined && data.reputation !== null;
    const hit = pulseCount > 0;
    let risk: RiskLevel = 'unknown';
    if (pulseCount >= 10) risk = 'known_malicious';
    else if (pulseCount >= 5) risk = 'high_risk';
    else if (pulseCount >= 2) risk = 'medium_risk';
    else if (pulseCount >= 1) risk = 'low_risk';
    const categories: string[] = [];
    if (data.pulse_info?.pulses) {
      for (const pulse of data.pulse_info.pulses.slice(0, 5)) {
        if (pulse.tags) pulse.tags.forEach((t: string) => { const lt = t.toLowerCase(); if (!categories.includes(lt)) categories.push(lt); });
      }
    }
    return {
      name: 'alienvault_otx',
      hit,
      risk_level: risk,
      categories: categories.slice(0, 5),
      flags: hit ? [`otx_${pulseCount}_pulses`] : [],
      detail: hit ? `AlienVault OTX: ${pulseCount} threat pulses${hasReputation ? ', reputation: ' + data.reputation : ''}` : 'Not found in AlienVault OTX',
    };
  } catch (e: any) {
    return { name: 'alienvault_otx', hit: false, detail: 'OTX API error: ' + e.message };
  }
}

// -- Cloudflare DNS Security Check (1.1.1.2 family filter) --
async function checkCloudflareDNS(hostname: string): Promise<SourceHit> {
  try {
    // Use Cloudflare's security DNS (1.1.1.2) via DoH
    const res = await fetch(`https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { 'Accept': 'application/dns-json' },
      signal: AbortSignal.timeout(3000),
    });
    const data = await res.json();
    // If Cloudflare blocks a domain, it returns 0.0.0.0 or NXDOMAIN
    const blocked = data.Status === 3 || // NXDOMAIN
      (data.Answer && data.Answer.some((a: any) => a.data === '0.0.0.0')) ||
      (!data.Answer && data.Status === 0 && data.Authority);
    // Also check against 1.1.1.1 (normal) to see if it's specifically blocked
    let normalResolves = true;
    if (blocked) {
      try {
        const normalRes = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
          headers: { 'Accept': 'application/dns-json' },
          signal: AbortSignal.timeout(3000),
        });
        const normalData = await normalRes.json();
        normalResolves = normalData.Answer && normalData.Answer.length > 0;
      } catch { normalResolves = true; }
    }
    const isBlocked = blocked && normalResolves; // blocked by security DNS but resolves normally
    return {
      name: 'cloudflare_dns',
      hit: isBlocked,
      risk_level: isBlocked ? 'high_risk' : 'unknown',
      categories: isBlocked ? ['dns_blocked'] : [],
      flags: isBlocked ? ['cf_dns_blocked'] : [],
      detail: isBlocked ? 'Blocked by Cloudflare security DNS (1.1.1.2)' : 'Not blocked by Cloudflare DNS',
    };
  } catch (e: any) {
    return { name: 'cloudflare_dns', hit: false, detail: 'DNS check error: ' + e.message };
  }

  // ============================================
// Feed Refresh & Cache Management
// ============================================

let feedCache: {
  phishtank: Set<string>;
  urlhaus: { domains: Set<string>; urls: Set<string> };
  openphish: Set<string>;
  phishingArmy: Set<string>;
  lastRefresh: number;
} | null = null;

const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function refreshFeeds(): Promise<void> {
  const now = Date.now();
  if (feedCache && (now - feedCache.lastRefresh) < CACHE_TTL) return;

  console.log('[ThreatIntel] Refreshing threat feeds...');
  const [phishtank, urlhaus, openphish, phishingArmy] = await Promise.all([
    loadPhishTank(),
    loadPhishTank(), // placeholder - urlhaus
    loadOpenPhish(),
    loadPhishingArmy(),
  ]);

  // Load URLhaus separately since it returns { domains, urls }
  const urlhausData = await loadPhishTank();

  feedCache = {
    phishtank,
    urlhaus: { domains: new Set<string>(), urls: new Set<string>() },
    openphish,
    phishingArmy,
    lastRefresh: now,
  };

  // Try loading URLhaus properly
  try {
    const uh = await loadUrlhaus();
    feedCache.urlhaus = uh;
  } catch (e) {
    console.warn('[ThreatIntel] URLhaus load failed:', e);
  }

  console.log(`[ThreatIntel] Feeds refreshed: PhishTank=${phishtank.size}, OpenPhish=${openphish.size}, PhishingArmy=${phishingArmy.size}, URLhaus=${feedCache.urlhaus.domains.size} domains`);
}

async function ensureCache() {
  if (!feedCache) await refreshFeeds();
}

// ============================================
// Main URL Check - Aggregated Multi-Source
// ============================================

export interface ThreatCheckResult {
  url: string;
  domain: string;
  risk_level: 'high_risk' | 'medium_risk' | 'low_risk' | 'safe';
  categories: string[];
  flags: string[];
  sources: {
    name: string;
    hit: boolean;
    risk_level?: string;
    detail?: string;
  }[];
  overall_score: number; // 0-100
  checked_at: string;
}

export async function checkUrl(inputUrl: string): Promise<ThreatCheckResult> {
  await ensureCache();

  let url = inputUrl.trim().toLowerCase();
  if (!url.startsWith('http')) url = 'https://' + url;

  let domain = '';
  try {
    domain = new URL(url).hostname;
  } catch {
    domain = url.replace(/^https?:\/\//, '').split('/')[0];
  }

  const sources: ThreatCheckResult['sources'] = [];
  const categories: Set<string> = new Set();
  const flags: Set<string> = new Set();

  // 1. Check known domains from hardcoded list
  const knownResult = checkKnownDomain(domain);
  sources.push({
    name: 'known_domains',
    hit: knownResult.risk_level !== 'unknown',
    risk_level: knownResult.risk_level,
    detail: knownResult.category,
  });
  if (knownResult.risk_level !== 'unknown') {
    categories.add(knownResult.category);
    flags.push && flags.add('known_domain');
  }

  // 2. PhishTank feed
  const inPhishTank = feedCache?.phishtank.has(domain) || feedCache?.phishtank.has(url) || false;
  sources.push({ name: 'phishtank', hit: inPhishTank, detail: inPhishTank ? 'Found in PhishTank active phishing DB' : undefined });
  if (inPhishTank) { categories.add('phishing'); flags.add('phishtank_hit'); }

  // 3. URLhaus feed
  const inUrlhaus = feedCache?.urlhaus.domains.has(domain) || feedCache?.urlhaus.urls.has(url) || false;
  sources.push({ name: 'urlhaus', hit: inUrlhaus, detail: inUrlhaus ? 'Found in URLhaus malware URL DB' : undefined });
  if (inUrlhaus) { categories.add('malware'); flags.add('urlhaus_hit'); }

  // 4. OpenPhish feed
  const inOpenPhish = feedCache?.openphish.has(url) || false;
  sources.push({ name: 'openphish', hit: inOpenPhish, detail: inOpenPhish ? 'Found in OpenPhish feed' : undefined });
  if (inOpenPhish) { categories.add('phishing'); flags.add('openphish_hit'); }

  // 5. Phishing Army feed
  const inPhishArmy = feedCache?.phishingArmy.has(domain) || false;
  sources.push({ name: 'phishing_army', hit: inPhishArmy, detail: inPhishArmy ? 'Found in Phishing Army blocklist' : undefined });
  if (inPhishArmy) { categories.add('phishing'); flags.add('phishing_army_hit'); }

  // 6. Google Safe Browsing (async)
  try {
    const gsb = await checkGoogleSafeBrowsing(url);
    sources.push(gsb);
    if (gsb.hit) {
      categories.add('google_flagged');
      flags.add('gsb_hit');
    }
  } catch { sources.push({ name: 'google_safe_browsing', hit: false, detail: 'API error' }); }

  // 7. VirusTotal (async)
  try {
    const vt = await checkVirusTotal(url);
    sources.push(vt);
    if (vt.hit) {
      categories.add('virustotal_flagged');
      flags.add('vt_hit');
    }
  } catch { sources.push({ name: 'virustotal', hit: false, detail: 'API error' }); }

  // 8. Cloudflare DNS (async)
  try {
    const cf = await checkCloudflareDns(domain);
    sources.push(cf);
    if (cf.hit) {
      categories.add('dns_blocked');
      flags.add('cf_dns_blocked');
    }
  } catch { sources.push({ name: 'cloudflare_dns', hit: false, detail: 'API error' }); }

  // Calculate overall risk score
  const hitCount = sources.filter(s => s.hit).length;
  const totalSources = sources.length;
  let score = 0;

  // Weight: feed hits = 15 each, API hits = 20 each, known domain = 10
  for (const s of sources) {
    if (!s.hit) continue;
    switch (s.name) {
      case 'google_safe_browsing': score += 25; break;
      case 'virustotal': score += 20; break;
      case 'cloudflare_dns': score += 20; break;
      case 'phishtank': score += 15; break;
      case 'urlhaus': score += 15; break;
      case 'openphish': score += 15; break;
      case 'phishing_army': score += 10; break;
      case 'known_domains': score += 10; break;
      default: score += 10;
    }
  }

  score = Math.min(score, 100);

  // Determine risk level
  let risk_level: ThreatCheckResult['risk_level'] = 'safe';
  if (score >= 50) risk_level = 'high_risk';
  else if (score >= 25) risk_level = 'medium_risk';
  else if (score >= 10) risk_level = 'low_risk';

  return {
    url: inputUrl,
    domain,
    risk_level,
    categories: Array.from(categories),
    flags: Array.from(flags),
    sources,
    overall_score: score,
    checked_at: new Date().toISOString(),
  };
}

// Helper: check known domain from hardcoded list
function checkKnownDomain(domain: string): { risk_level: string; category: string } {
  for (const [key, val] of Object.entries(KNOWN_DOMAINS)) {
    if (domain === key || domain.endsWith('.' + key)) {
      return { risk_level: (val as any).risk_level, category: (val as any).category };
    }
  }
  return { risk_level: 'unknown', category: 'uncategorized' };
}

// Export feed refresh for manual trigger
export { refreshFeeds, ensureCache };
}
