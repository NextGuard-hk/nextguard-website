import { categorizeUrl, categorizeUrlAsync } from './url-categories';
// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine v4.7
// Integrates: URLhaus, Phishing Army, OpenPhish, PhishTank,
// ThreatFox, Feodo Tracker, C2IntelFeeds (replaces deprecated SSLBL), IPsum, blocklist.de,
// Emerging Threats, Disposable Emails, PhishStats
// v4.7 fixes: full URL matching for phishing feeds, additional PhishStats feed,
// improved detection of compromised legitimate domains with phishing paths

export type RiskLevel = 'known_malicious' | 'high_risk' | 'medium_risk' | 'low_risk' | 'clean' | 'unknown';

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
  domain: string;
  risk_level: RiskLevel;
  overall_score: number;
  categories: string[];
  flags: string[];
  sources: SourceHit[];
  checked_at: string;
}

interface FeedCache {
  urlhaus: Set<string>;
  phishingArmy: Set<string>;
  openphish: Set<string>;
  openphishUrls: Set<string>;
  phishtankDomains: Set<string>;
  phishtankUrls: Set<string>;
  phishstatsUrls: Set<string>;
  threatfox: Set<string>;
  feodoIPs: Set<string>;
  c2intelIPs: Set<string>;
  ipsumIPs: Set<string>;
  blocklistDeIPs: Set<string>;
  emergingThreats: Set<string>;
  disposableEmails: Set<string>;
  lastUpdated: number;
  feedErrors: string[];
}

let cache: FeedCache = {
  urlhaus: new Set(),
  phishingArmy: new Set(),
  openphish: new Set(),
  openphishUrls: new Set(),
  phishtankDomains: new Set(),
  phishtankUrls: new Set(),
  phishstatsUrls: new Set(),
  threatfox: new Set(),
  feodoIPs: new Set(),
  c2intelIPs: new Set(),
  ipsumIPs: new Set(),
  blocklistDeIPs: new Set(),
  emergingThreats: new Set(),
  disposableEmails: new Set(),
  lastUpdated: 0,
  feedErrors: [],
};

const CACHE_TTL_MS = 15 * 60 * 1000;

// Whitelist: Known-good domains that should NEVER be flagged as malicious
// These domains are immune to threat feed false positives
const WHITELIST_DOMAINS = new Set([
  'google.com', 'www.google.com', 'microsoft.com', 'facebook.com', 'instagram.com',
  'twitter.com', 'x.com', 'linkedin.com', 'tiktok.com', 'reddit.com', 'discord.com',
  'telegram.org', 'whatsapp.com', 'chat.openai.com', 'openai.com', 'claude.ai',
  'perplexity.ai', 'github.com', 'youtube.com', 'netflix.com', 'amazon.com',
  'hsbc.com', 'paypal.com', 'dropbox.com', 'gmail.com', 'outlook.com', 'gov.hk',
  'virustotal.com', 'apple.com', 'adobe.com', 'zoom.us', 'slack.com',
  'salesforce.com', 'shopify.com', 'wordpress.com', 'wikipedia.org',
  'stackoverflow.com', 'cloudflare.com', 'aws.amazon.com', 'azure.microsoft.com',
  'yahoo.com', 'bing.com', 'duckduckgo.com', 'baidu.com', 'example.com',
  'booking.com', 'airbnb.com', 'expedia.com', 'tripadvisor.com',
  'chatgpt.com', 'gemini.google.com', 'copilot.microsoft.com',
  'coinbase.com', 'binance.com', 'coursera.org', 'udemy.com', 'archive.org',
  'quora.com', 'medium.com', 'wix.com', 'squarespace.com', 'figma.com',
  'canva.com', 'notion.so', 'stripe.com', 'grammarly.com', 'flickr.com',
  'naver.com', 'yandex.com', 'producthunt.com', 'researchgate.net',
  'fiverr.com', 'upwork.com', 'calendly.com', 'digitalocean.com', 'heroku.com',
  'crowdstrike.com', 'zscaler.com', 'paloaltonetworks.com', 'cisco.com',
  'fortinet.com', 'samsung.com', 'dell.com', 'hp.com', 'lenovo.com', 'sony.com',
  'nike.com', 'walmart.com', 'target.com', 'forbes.com', 'wired.com', 'cnet.com',
  '1password.com', 'lastpass.com', 'hbomax.com', 'duolingo.com',
]);

function isWhitelistedDomain(hostname: string): boolean {
  if (WHITELIST_DOMAINS.has(hostname)) return true;
  // Check if it's a subdomain of a whitelisted domain
  for (const wd of WHITELIST_DOMAINS) {
    if (hostname.endsWith('.' + wd)) return true;
  }
  return false;
}

const LOCAL_IOC: Record<string, { risk_level: RiskLevel; categories: string[] }> = {
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
  'google.com': { risk_level: 'clean', categories: ['search_engine'] },
  'microsoft.com': { risk_level: 'clean', categories: ['business'] },
  'facebook.com': { risk_level: 'clean', categories: ['social_media'] },
  'instagram.com': { risk_level: 'clean', categories: ['social_media'] },
  'twitter.com': { risk_level: 'clean', categories: ['social_media'] },
  'x.com': { risk_level: 'clean', categories: ['social_media'] },
  'linkedin.com': { risk_level: 'clean', categories: ['social_media'] },
  'tiktok.com': { risk_level: 'clean', categories: ['social_media'] },
  'reddit.com': { risk_level: 'clean', categories: ['social_media', 'forum'] },
  'discord.com': { risk_level: 'clean', categories: ['social_media'] },
  'telegram.org': { risk_level: 'clean', categories: ['messaging'] },
  'whatsapp.com': { risk_level: 'clean', categories: ['messaging'] },
  'chat.openai.com': { risk_level: 'clean', categories: ['genai'] },
  'openai.com': { risk_level: 'clean', categories: ['genai'] },
  'claude.ai': { risk_level: 'clean', categories: ['genai'] },
  'perplexity.ai': { risk_level: 'clean', categories: ['genai'] },
  'github.com': { risk_level: 'clean', categories: ['development'] },
  'youtube.com': { risk_level: 'clean', categories: ['streaming'] },
  'netflix.com': { risk_level: 'clean', categories: ['streaming'] },
  'amazon.com': { risk_level: 'clean', categories: ['shopping'] },
  'hsbc.com': { risk_level: 'clean', categories: ['finance'] },
  'paypal.com': { risk_level: 'clean', categories: ['finance'] },
  'dropbox.com': { risk_level: 'clean', categories: ['cloud_storage'] },
  'gmail.com': { risk_level: 'clean', categories: ['email'] },
  'outlook.com': { risk_level: 'clean', categories: ['email'] },
  'gov.hk': { risk_level: 'clean', categories: ['government'] },
  'virustotal.com': { risk_level: 'clean', categories: ['cybersecurity'] },
  'nordvpn.com': { risk_level: 'medium_risk', categories: ['vpn'] },
  'bet365.com': { risk_level: 'medium_risk', categories: ['gambling'] },
  'pornhub.com': { risk_level: 'medium_risk', categories: ['adult'] },
  'mega.nz': { risk_level: 'medium_risk', categories: ['file_sharing'] },
  'thepiratebay.org': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  '1337x.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'bit.ly': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  'pastebin.com': { risk_level: 'medium_risk', categories: ['paste_site'] },
  'torproject.org': { risk_level: 'medium_risk', categories: ['privacy_tools'] },
  'wikipedia.org': { risk_level: 'clean', categories: ['education'] },
  'opensea.io': { risk_level: 'medium_risk', categories: ['cryptocurrency'] },
  'tinder.com': { risk_level: 'medium_risk', categories: ['dating'] },
  'store.steampowered.com': { risk_level: 'clean', categories: ['gaming'] },
  'salesforce.com': { risk_level: 'clean', categories: ['saas'] },
  'shopify.com': { risk_level: 'clean', categories: ['ecommerce'] },
  'wordpress.com': { risk_level: 'clean', categories: ['blogging'] },
};

const SUSPICIOUS_TLDS = ['.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk','.pw','.icu','.buzz','.monster','.rest','.fit','.surf','.bar','.bond','.sbs','.cfd'];
const SUSPICIOUS_KEYWORDS = ['malware','phish','exploit','botnet','ransom','trojan','spyware','login-verify','secure-update','account-confirm','signin','verify-account','security-alert','update-now','free-prize','crypto-giveaway'];
const URL_SHORTENERS = ['bit.ly','t.co','tinyurl.com','goo.gl','ow.ly','is.gd','buff.ly','rebrand.ly','bl.ink','short.io','rb.gy','cutt.ly','shorturl.at'];

function analyzeDomainPattern(domain: string, url: string): { score: number; flags: string[]; detail: string } {
  let score = 0;
  const flags: string[] = [];
  const details: string[] = [];
  if (URL_SHORTENERS.some(s => domain === s || domain.endsWith('.' + s))) {
    score += 10; flags.push('url_shortener'); details.push('URL shortener');
  }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    score += 15; flags.push('ip_address_url'); details.push('IP as domain');
  }
  if (domain.split('.').length >= 4) { score += 8; flags.push('excessive_subdomains'); }
  const brands = ['paypal','google','microsoft','apple','amazon','netflix','facebook','bank','secure','login','verify','wallet','crypto','bitcoin'];
  const dl = domain.toLowerCase();
  const rd = domain.split('.').slice(-2).join('.');
  if (brands.some(b => dl.includes(b) && !rd.includes(b))) { score += 12; flags.push('brand_impersonation'); }
  if (domain.length > 40) { score += 5; flags.push('long_domain'); }
  const base = domain.split('.').slice(0,-1).join('.');
  const cr = (base.match(/[bcdfghjklmnpqrstvwxyz]/gi)||[]).length / Math.max(base.length,1);
  if (cr > 0.75 && base.length > 8) { score += 8; flags.push('random_domain'); }
  if (SUSPICIOUS_TLDS.some(t => domain.endsWith(t))) { score += 8; flags.push('suspicious_tld'); }
  if (SUSPICIOUS_KEYWORDS.some(k => dl.includes(k))) { score += 10; flags.push('suspicious_keyword'); }
  return { score, flags, detail: details.join('; ') };
}

// Helper: safely extract hostname from a URL string
function safeExtractHostname(urlStr: string): string {
  try {
    return new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr).hostname.toLowerCase().replace(/^www\./, '');
  } catch { return ''; }
}

// Helper: normalize URL for comparison (lowercase, remove trailing slash, remove fragment)
function normalizeUrl(urlStr: string): string {
  try {
    const u = new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr);
    return (u.protocol + '//' + u.hostname + u.pathname).toLowerCase().replace(/\/+$/, '');
  } catch { return urlStr.toLowerCase().replace(/\/+$/, ''); }
}

// Helper: exact domain match (domain === target or domain ends with .target)
function domainMatches(hostname: string, target: string): boolean {
  const h = hostname.replace(/^www\./, '');
  const t = target.replace(/^www\./, '');
  return h === t || h.endsWith('.' + t);
}

async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.7' } });
    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
  } catch { return []; }
}

async function loadUrlhaus(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://urlhaus.abuse.ch/downloads/text_online/');
  const domains = new Set<string>();
  for (const line of lines) {
    try { domains.add(new URL(line.startsWith('http') ? line : 'http://' + line).hostname); } catch {}
  }
  return domains;
}

async function loadPhishingArmy(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://phishing.army/download/phishing_army_blocklist.txt');
  return new Set(lines.filter(l => l.length > 3));
}

async function loadOpenPhish(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt');
  const domains = new Set<string>();
  const urls = new Set<string>();
  for (const line of lines) {
    if (line && (line.startsWith('http://') || line.startsWith('https://'))) {
      urls.add(line);
      try { domains.add(new URL(line).hostname.replace(/^www\./, '')); } catch {}
    }
  }
  return { domains, urls };
}

async function loadPhishTank(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const domains = new Set<string>();
  const urls = new Set<string>();
  const feedUrls = [
    `https://data.phishtank.com/data/${process.env.PHISHTANK_API_KEY || ''}/online-valid.csv`,
    'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
    'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-links-ACTIVE.txt',
  ];
  for (const feedUrl of feedUrls) {
    try {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.7' }, redirect: 'follow' });
      if (!res.ok) continue;
      const text = await res.text();
      if (feedUrl.includes('phishing-domains-ACTIVE')) {
        for (const line of text.split('\n')) {
          const d = line.trim().toLowerCase();
          if (d && !d.startsWith('#') && d.includes('.')) domains.add(d.replace(/^www\./, ''));
        }
      } else if (feedUrl.includes('phishing-links-ACTIVE')) {
        for (const line of text.split('\n')) {
          const u = line.trim().toLowerCase();
          if (u && !u.startsWith('#') && (u.startsWith('http') || u.includes('.'))) {
            urls.add(u);
            try { domains.add(new URL(u.startsWith('http') ? u : 'http://' + u).hostname.replace(/^www\./, '')); } catch {}
          }
        }
      } else {
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i];
            if (!line || line.length < 10) continue;
            let urlStr = '';
            if (line.startsWith('"')) {
              const match = line.match(/^"?\d+"?,"?([^"\s,]+)"?/);
              if (match?.[1]) urlStr = match[1].trim().toLowerCase();
            } else {
              const parts = line.split(',');
              urlStr = (parts[1] || '').trim().toLowerCase().replace(/^"/,'').replace(/"$/,'');
            }
            if (urlStr && (urlStr.startsWith('http') || urlStr.includes('.'))) {
              urls.add(urlStr);
              try { domains.add(new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr).hostname.replace(/^www\./, '')); } catch {}
            }
          } catch { continue; }
        }
      }
    } catch { continue; }
  }
  return { domains, urls };
}

// NEW v4.7: PhishStats feed - provides recent phishing URLs
async function loadPhishStats(): Promise<Set<string>> {
  const urls = new Set<string>();
  try {
    const res = await fetch('https://phishstats.info/phish_score.csv', {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.7' }
    });
    if (!res.ok) return urls;
    const text = await res.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('#') || line.length < 10) continue;
      try {
        // CSV format: date,score,url,ip
        const match = line.match(/,"?(https?:\/\/[^"\s,]+)"?/);
        if (match?.[1]) {
          const url = match[1].trim().toLowerCase();
          urls.add(url);
        }
      } catch {}
    }
  } catch {}
  return urls;
}

async function loadThreatFox(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://threatfox.abuse.ch/downloads/hostfile/');
  const domains = new Set<string>();
  for (const line of lines) {
    if (line.startsWith('127.0.0.1')) {
      const d = line.replace('127.0.0.1', '').trim();
      if (d && d.includes('.') && d.length > 3) domains.add(d);
    }
  }
  return domains;
}

async function loadFeodoTracker(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://feodotracker.abuse.ch/downloads/ipblocklist.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)));
}

async function loadC2Intel(): Promise<Set<string>> {
  const ips = new Set<string>();
  try {
    const res = await fetch('https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv', {
      signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.7' }
    });
    if (!res.ok) return ips;
    const text = await res.text();
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#') || t === '#ip,ioc') continue;
      const ip = t.split(',')[0].trim();
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) ips.add(ip);
    }
  } catch {}
  return ips;
}

async function loadIPsum(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(l)).map(l => l.split('\t')[0].trim()));
}

async function loadBlocklistDe(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://lists.blocklist.de/lists/all.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)));
}

async function loadEmergingThreats(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://rules.emergingthreats.net/blockrules/compromised-ips.txt');
  const domains = new Set<string>();
  try {
    const res2 = await fetch('https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/suspicious/domain.txt', {
      signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.7' }
    });
    if (res2.ok) {
      const t2 = await res2.text();
      for (const l of t2.split('\n')) {
        const d = l.trim().toLowerCase();
        if (d && !d.startsWith('#') && d.includes('.')) domains.add(d);
      }
    }
  } catch {}
  for (const l of lines) {
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)) domains.add(l);
  }
  return domains;
}

async function loadDisposableEmails(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf');
  return new Set(lines.filter(l => l.includes('.') && l.length > 3));
}

export async function refreshFeeds(): Promise<void> {
  const now = Date.now();
  if (cache.lastUpdated > 0 && (now - cache.lastUpdated) < CACHE_TTL_MS) return;
  console.log('[ThreatIntel v4.7] Refreshing 12 threat feeds...');
  cache.feedErrors = [];
  try {
    const [urlhaus, phishingArmy, openphish, phishtank, phishstats, threatfox, feodo, c2intel, ipsum, blocklistDe, et, disposable] = await Promise.all([
      loadUrlhaus().catch(e => { cache.feedErrors.push('urlhaus: ' + e.message); return new Set<string>(); }),
      loadPhishingArmy().catch(e => { cache.feedErrors.push('phishingArmy: ' + e.message); return new Set<string>(); }),
      loadOpenPhish().catch(e => { cache.feedErrors.push('openphish: ' + e.message); return { domains: new Set<string>(), urls: new Set<string>() }; }),
      loadPhishTank().catch(e => { cache.feedErrors.push('phishtank: ' + e.message); return { domains: new Set<string>(), urls: new Set<string>() }; }),
      loadPhishStats().catch(e => { cache.feedErrors.push('phishstats: ' + e.message); return new Set<string>(); }),
      loadThreatFox().catch(e => { cache.feedErrors.push('threatfox: ' + e.message); return new Set<string>(); }),
      loadFeodoTracker().catch(e => { cache.feedErrors.push('feodo: ' + e.message); return new Set<string>(); }),
      loadC2Intel().catch(e => { cache.feedErrors.push('c2intel: ' + e.message); return new Set<string>(); }),
      loadIPsum().catch(e => { cache.feedErrors.push('ipsum: ' + e.message); return new Set<string>(); }),
      loadBlocklistDe().catch(e => { cache.feedErrors.push('blocklistde: ' + e.message); return new Set<string>(); }),
      loadEmergingThreats().catch(e => { cache.feedErrors.push('et: ' + e.message); return new Set<string>(); }),
      loadDisposableEmails().catch(e => { cache.feedErrors.push('disposable: ' + e.message); return new Set<string>(); }),
    ]);
    cache.urlhaus = urlhaus;
    cache.phishingArmy = phishingArmy;
    cache.openphish = (openphish as any).domains || new Set();
    cache.openphishUrls = (openphish as any).urls || new Set();
    cache.phishtankDomains = (phishtank as any).domains || new Set();
    cache.phishtankUrls = (phishtank as any).urls || new Set();
    cache.phishstatsUrls = phishstats as Set<string>;
    cache.threatfox = threatfox as Set<string>;
    cache.feodoIPs = feodo as Set<string>;
    cache.c2intelIPs = c2intel as Set<string>;
    cache.ipsumIPs = ipsum as Set<string>;
    cache.blocklistDeIPs = blocklistDe as Set<string>;
    cache.emergingThreats = et as Set<string>;
    cache.disposableEmails = disposable as Set<string>;
    cache.lastUpdated = now;
    const total = urlhaus.size + phishingArmy.size +
      ((openphish as any).domains?.size || 0) + ((openphish as any).urls?.size || 0) +
      ((phishtank as any).domains?.size || 0) + ((phishtank as any).urls?.size || 0) +
      (phishstats as Set<string>).size +
      (threatfox as Set<string>).size + (feodo as Set<string>).size +
      (c2intel as Set<string>).size + (ipsum as Set<string>).size +
      (blocklistDe as Set<string>).size + (et as Set<string>).size +
      (disposable as Set<string>).size;
    console.log(`[ThreatIntel v4.7] All feeds loaded. Total IOCs: ${total}`);
  } catch (e: any) {
    cache.feedErrors.push('refresh: ' + e.message);
  }
}

async function ensureFeedsLoaded() { await refreshFeeds(); }

export async function checkUrl(inputUrl: string): Promise<ThreatIntelResult> {
  await ensureFeedsLoaded();
  const sources: SourceHit[] = [];
  let hostname = '';
  try {
    hostname = new URL(inputUrl.startsWith('http') ? inputUrl : `https://${inputUrl}`).hostname.toLowerCase();
  } catch { hostname = inputUrl.toLowerCase(); }
  const cleanHostname = hostname.replace(/^www\./, '');
  // v4.7: Normalize the input URL for full URL matching
  const normalizedInputUrl = normalizeUrl(inputUrl);
  const allCategories: string[] = [];
  const allFlags: string[] = [];
  let totalScore = 0;

  // === Whitelist check ===
  const whitelisted = isWhitelistedDomain(cleanHostname);

  // === Local IOC ===
  const localMatch = Object.entries(LOCAL_IOC).find(([k]) => domainMatches(cleanHostname, k));
  if (localMatch) {
    sources.push({ name: 'Local IOC', hit: true, risk_level: localMatch[1].risk_level, categories: localMatch[1].categories, detail: `Matched: ${localMatch[0]}` });
    allCategories.push(...localMatch[1].categories);
    totalScore += localMatch[1].risk_level === 'known_malicious' ? 90 : localMatch[1].risk_level === 'high_risk' ? 70 : localMatch[1].risk_level === 'medium_risk' ? 40 : 10;
  } else {
    sources.push({ name: 'Local IOC', hit: false });
  }

  // === For whitelisted domains, skip feed checks ===
  if (whitelisted) {
    const feedNames = ['URLhaus', 'Phishing Army', 'OpenPhish', 'PhishTank', 'PhishStats', 'ThreatFox', 'Feodo Tracker', 'C2 Intel', 'IPsum', 'blocklist.de', 'Emerging Threats', 'Disposable Emails'];
    for (const name of feedNames) { sources.push({ name, hit: false }); }
    const cats = localMatch ? localMatch[1].categories : await categorizeUrlAsync(cleanHostname);
    const riskLvl = 'clean';
    return { url: inputUrl, domain: hostname, risk_level: riskLvl, overall_score: Math.min(totalScore, 15), categories: cats.length > 0 ? [...new Set(cats)] : await categorizeUrlAsync(cleanHostname), flags: [], sources, checked_at: new Date().toISOString() };
  }

  // URLhaus
  const uhHit = cache.urlhaus.has(cleanHostname) || cache.urlhaus.has(hostname);
  sources.push({ name: 'URLhaus', hit: uhHit, risk_level: uhHit ? 'known_malicious' : undefined, categories: uhHit ? ['malware'] : undefined, detail: uhHit ? 'Active malware distribution' : undefined });
  if (uhHit) { allCategories.push('malware'); totalScore += 90; }

  // Phishing Army
  const paHit = cache.phishingArmy.has(cleanHostname) || cache.phishingArmy.has(hostname);
  sources.push({ name: 'Phishing Army', hit: paHit, risk_level: paHit ? 'known_malicious' : undefined, categories: paHit ? ['phishing'] : undefined });
  if (paHit) { allCategories.push('phishing'); totalScore += 85; }

  // === v4.7 FIX: OpenPhish - check BOTH domain AND full URL ===
  let opHit = cache.openphish.has(cleanHostname) || cache.openphish.has(hostname);
  if (!opHit) {
    // Check full URL match against OpenPhish URL feed
    for (const u of cache.openphishUrls) {
      const normalizedFeedUrl = normalizeUrl(u);
      if (normalizedFeedUrl === normalizedInputUrl) { opHit = true; break; }
      // Also check if input URL starts with a feed URL (path prefix match)
      if (normalizedInputUrl.startsWith(normalizedFeedUrl)) { opHit = true; break; }
    }
  }
  if (!opHit) {
    for (const u of cache.openphish) {
      if (domainMatches(u, cleanHostname)) { opHit = true; break; }
    }
  }
  sources.push({ name: 'OpenPhish', hit: opHit, risk_level: opHit ? 'known_malicious' : undefined, categories: opHit ? ['phishing'] : undefined });
  if (opHit) { allCategories.push('phishing'); totalScore += 85; }

  // === v4.7 FIX: PhishTank - check domain AND full URL matching ===
  let ptHit = cache.phishtankDomains.has(cleanHostname) || cache.phishtankDomains.has(hostname);
  if (!ptHit) {
    // Check full URL match against PhishTank/Phishing.Database URL feeds
    for (const u of cache.phishtankUrls) {
      const normalizedFeedUrl = normalizeUrl(u);
      if (normalizedFeedUrl === normalizedInputUrl) { ptHit = true; break; }
      if (normalizedInputUrl.startsWith(normalizedFeedUrl)) { ptHit = true; break; }
      // Also extract hostname and do domain match
      const feedHost = safeExtractHostname(u);
      if (feedHost && domainMatches(feedHost, cleanHostname)) { ptHit = true; break; }
    }
  }
  sources.push({ name: 'PhishTank', hit: ptHit, risk_level: ptHit ? 'known_malicious' : undefined, categories: ptHit ? ['phishing'] : undefined });
  if (ptHit) { allCategories.push('phishing'); totalScore += 85; }

  // === NEW v4.7: PhishStats - full URL matching ===
  let psHit = false;
  for (const u of cache.phishstatsUrls) {
    const normalizedFeedUrl = normalizeUrl(u);
    if (normalizedFeedUrl === normalizedInputUrl) { psHit = true; break; }
    if (normalizedInputUrl.startsWith(normalizedFeedUrl)) { psHit = true; break; }
    const feedHost = safeExtractHostname(u);
    if (feedHost && domainMatches(feedHost, cleanHostname)) { psHit = true; break; }
  }
  sources.push({ name: 'PhishStats', hit: psHit, risk_level: psHit ? 'known_malicious' : undefined, categories: psHit ? ['phishing'] : undefined });
  if (psHit) { allCategories.push('phishing'); totalScore += 85; }

  // ThreatFox
  const tfHit = cache.threatfox.has(cleanHostname) || cache.threatfox.has(hostname);
  sources.push({ name: 'ThreatFox', hit: tfHit, risk_level: tfHit ? 'known_malicious' : undefined, categories: tfHit ? ['malware', 'c2'] : undefined });
  if (tfHit) { allCategories.push('malware', 'c2'); totalScore += 90; }

  // Feodo Tracker
  const feHit = cache.feodoIPs.has(hostname);
  sources.push({ name: 'Feodo Tracker', hit: feHit, risk_level: feHit ? 'known_malicious' : undefined, categories: feHit ? ['botnet', 'c2'] : undefined });
  if (feHit) { allCategories.push('botnet'); totalScore += 95; }

  // C2IntelFeeds
  const c2Hit = cache.c2intelIPs.has(hostname);
  sources.push({ name: 'C2 Intel', hit: c2Hit, risk_level: c2Hit ? 'known_malicious' : undefined, categories: c2Hit ? ['c2', 'botnet'] : undefined, detail: c2Hit ? 'Active C2 server (30-day feed)' : undefined });
  if (c2Hit) { allCategories.push('c2', 'botnet'); totalScore += 90; }

  // IPsum
  const ipHit = cache.ipsumIPs.has(hostname);
  sources.push({ name: 'IPsum', hit: ipHit, risk_level: ipHit ? 'high_risk' : undefined, categories: ipHit ? ['threat_ip'] : undefined });
  if (ipHit) { allCategories.push('threat_ip'); totalScore += 75; }

  // blocklist.de
  const blHit = cache.blocklistDeIPs.has(hostname);
  sources.push({ name: 'blocklist.de', hit: blHit, risk_level: blHit ? 'high_risk' : undefined, categories: blHit ? ['attack_source'] : undefined });
  if (blHit) { allCategories.push('attack_source'); totalScore += 70; }

  // Emerging Threats
  const etHit = cache.emergingThreats.has(cleanHostname) || cache.emergingThreats.has(hostname);
  sources.push({ name: 'Emerging Threats', hit: etHit, risk_level: etHit ? 'high_risk' : undefined, categories: etHit ? ['compromised'] : undefined });
  if (etHit) { allCategories.push('compromised'); totalScore += 70; }

  // Disposable Emails
  const deHit = cache.disposableEmails.has(cleanHostname) || cache.disposableEmails.has(hostname);
  sources.push({ name: 'Disposable Emails', hit: deHit, risk_level: deHit ? 'low_risk' : undefined, categories: deHit ? ['disposable_email'] : undefined });
  if (deHit) { allCategories.push('disposable_email'); totalScore += 15; }

  // Domain heuristics
  const heuristic = analyzeDomainPattern(hostname, inputUrl);
  totalScore += heuristic.score;
  allFlags.push(...heuristic.flags);

  const hitCount = sources.filter(s => s.hit).length;
  const overallScore = Math.min(100, totalScore);
  let riskLevel: RiskLevel = 'unknown';
  if (hitCount > 0 && overallScore >= 80) riskLevel = 'known_malicious';
  else if (hitCount > 0 && overallScore >= 60) riskLevel = 'high_risk';
  else if (hitCount > 0 || overallScore >= 30) riskLevel = 'medium_risk';
  else if (overallScore >= 10) riskLevel = 'low_risk';
  else if (localMatch) riskLevel = localMatch[1].risk_level;
  else riskLevel = 'clean';

  return {
    url: inputUrl, domain: hostname, risk_level: riskLevel, overall_score: overallScore,
    categories: allCategories.length > 0 ? [...new Set(allCategories)] : await categorizeUrlAsync(cleanHostname),
    flags: [...new Set(allFlags)], sources, checked_at: new Date().toISOString(),
  };
}

export async function checkUrlFast(inputUrl: string): Promise<ThreatIntelResult> { return checkUrl(inputUrl); }

export function getFeedStatus() {
  return {
    feeds: [
      { name: 'URLhaus', entries: cache.urlhaus.size, status: cache.urlhaus.size > 0 ? 'active' : 'error' },
      { name: 'Phishing Army', entries: cache.phishingArmy.size, status: cache.phishingArmy.size > 0 ? 'active' : 'error' },
      { name: 'OpenPhish', entries: cache.openphish.size + cache.openphishUrls.size, status: cache.openphish.size > 0 ? 'active' : 'error' },
      { name: 'PhishTank', entries: cache.phishtankDomains.size + cache.phishtankUrls.size, status: cache.phishtankDomains.size > 0 || cache.phishtankUrls.size > 0 ? 'active' : 'error' },
      { name: 'PhishStats', entries: cache.phishstatsUrls.size, status: cache.phishstatsUrls.size > 0 ? 'active' : 'error' },
      { name: 'ThreatFox', entries: cache.threatfox.size, status: cache.threatfox.size > 0 ? 'active' : 'error' },
      { name: 'Feodo Tracker', entries: cache.feodoIPs.size, status: cache.feodoIPs.size > 0 ? 'active' : 'error' },
      { name: 'C2 Intel', entries: cache.c2intelIPs.size, status: cache.c2intelIPs.size > 0 ? 'active' : 'error' },
      { name: 'IPsum', entries: cache.ipsumIPs.size, status: cache.ipsumIPs.size > 0 ? 'active' : 'error' },
      { name: 'blocklist.de', entries: cache.blocklistDeIPs.size, status: cache.blocklistDeIPs.size > 0 ? 'active' : 'error' },
      { name: 'Emerging Threats', entries: cache.emergingThreats.size, status: cache.emergingThreats.size > 0 ? 'active' : 'error' },
      { name: 'Disposable Emails', entries: cache.disposableEmails.size, status: cache.disposableEmails.size > 0 ? 'active' : 'error' },
    ],
    lastUpdated: cache.lastUpdated > 0 ? new Date(cache.lastUpdated).toISOString() : null,
    feedErrors: cache.feedErrors,
    totalEntries: cache.urlhaus.size + cache.phishingArmy.size + cache.openphish.size + cache.openphishUrls.size +
      cache.phishtankDomains.size + cache.phishtankUrls.size + cache.phishstatsUrls.size +
      cache.threatfox.size + cache.feodoIPs.size + cache.c2intelIPs.size +
      cache.ipsumIPs.size + cache.blocklistDeIPs.size + cache.emergingThreats.size + cache.disposableEmails.size,
  };
}
