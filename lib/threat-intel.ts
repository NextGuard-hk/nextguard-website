// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine v4.0
// Integrates: URLhaus, Phishing Army, OpenPhish, PhishTank,
// ThreatFox, Feodo Tracker, SSLBL, IPsum, blocklist.de,
// Emerging Threats, Disposable Emails,
// Google Safe Browsing, VirusTotal, AlienVault OTX, Cloudflare DNS

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

// In-memory feed cache
interface FeedCache {
  urlhaus: Set<string>;
  phishingArmy: Set<string>;
  openphish: Set<string>;
  phishtankDomains: Set<string>;
  phishtankUrls: Set<string>;
  threatfox: Set<string>;
  feodoIPs: Set<string>;
  sslblIPs: Set<string>;
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
  phishtankDomains: new Set(),
  phishtankUrls: new Set(),
  threatfox: new Set(),
  feodoIPs: new Set(),
  sslblIPs: new Set(),
  ipsumIPs: new Set(),
  blocklistDeIPs: new Set(),
  emergingThreats: new Set(),
  disposableEmails: new Set(),
  lastUpdated: 0,
  feedErrors: [],
};

const CACHE_TTL_MS = 15 * 60 * 1000;

// Local IOC list
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
  'google.com': { risk_level: 'low_risk', categories: ['search_engine'] },
  'microsoft.com': { risk_level: 'low_risk', categories: ['business'] },
  'facebook.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'instagram.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'twitter.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'x.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'linkedin.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'tiktok.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'reddit.com': { risk_level: 'low_risk', categories: ['social_media', 'forum'] },
  'discord.com': { risk_level: 'low_risk', categories: ['social_media'] },
  'telegram.org': { risk_level: 'low_risk', categories: ['messaging'] },
  'whatsapp.com': { risk_level: 'low_risk', categories: ['messaging'] },
  'chat.openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'openai.com': { risk_level: 'low_risk', categories: ['genai'] },
  'claude.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'perplexity.ai': { risk_level: 'low_risk', categories: ['genai'] },
  'github.com': { risk_level: 'low_risk', categories: ['development'] },
  'youtube.com': { risk_level: 'low_risk', categories: ['streaming'] },
  'netflix.com': { risk_level: 'low_risk', categories: ['streaming'] },
  'amazon.com': { risk_level: 'low_risk', categories: ['shopping'] },
  'hsbc.com': { risk_level: 'low_risk', categories: ['finance'] },
  'paypal.com': { risk_level: 'low_risk', categories: ['finance'] },
  'dropbox.com': { risk_level: 'low_risk', categories: ['cloud_storage'] },
  'gmail.com': { risk_level: 'low_risk', categories: ['email'] },
  'outlook.com': { risk_level: 'low_risk', categories: ['email'] },
  'gov.hk': { risk_level: 'low_risk', categories: ['government'] },
  'virustotal.com': { risk_level: 'low_risk', categories: ['cybersecurity'] },
  'nordvpn.com': { risk_level: 'medium_risk', categories: ['vpn'] },
  'bet365.com': { risk_level: 'medium_risk', categories: ['gambling'] },
  'pornhub.com': { risk_level: 'medium_risk', categories: ['adult'] },
  'mega.nz': { risk_level: 'medium_risk', categories: ['file_sharing'] },
  'thepiratebay.org': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  '1337x.to': { risk_level: 'high_risk', categories: ['torrent', 'piracy'] },
  'bit.ly': { risk_level: 'medium_risk', categories: ['url_shortener'] },
  'pastebin.com': { risk_level: 'medium_risk', categories: ['paste_site'] },
  'torproject.org': { risk_level: 'medium_risk', categories: ['privacy_tools'] },
  'wikipedia.org': { risk_level: 'low_risk', categories: ['education'] },
  'opensea.io': { risk_level: 'medium_risk', categories: ['cryptocurrency'] },
  'tinder.com': { risk_level: 'medium_risk', categories: ['dating'] },
  'store.steampowered.com': { risk_level: 'low_risk', categories: ['gaming'] },
  'salesforce.com': { risk_level: 'low_risk', categories: ['saas'] },
  'shopify.com': { risk_level: 'low_risk', categories: ['ecommerce'] },
  'wordpress.com': { risk_level: 'low_risk', categories: ['blogging'] },
};

const SUSPICIOUS_TLDS = ['.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk','.pw','.icu','.buzz','.monster','.rest','.fit','.surf','.bar','.bond','.sbs','.cfd'];
const SUSPICIOUS_KEYWORDS = ['malware','phish','exploit','botnet','ransom','trojan','spyware','login-verify','secure-update','account-confirm','signin','verify-account','security-alert','update-now','free-prize','crypto-giveaway'];
const URL_SHORTENERS = ['bit.ly','t.co','tinyurl.com','goo.gl','ow.ly','is.gd','buff.ly','rebrand.ly','bl.ink','short.io','l.wl.co','l.ead.me','qr-codes.io','rb.gy','cutt.ly','shorturl.at'];

function analyzeDomainPattern(domain: string, url: string): { score: number; flags: string[]; detail: string } {
  let score = 0;
  const flags: string[] = [];
  const details: string[] = [];
  const isShortener = URL_SHORTENERS.some(s => domain === s || domain.endsWith('.' + s));
  if (isShortener) { score += 10; flags.push('url_shortener'); details.push('URL shortener detected'); }
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) { score += 15; flags.push('ip_address_url'); details.push('IP address used as domain'); }
  const parts = domain.split('.');
  if (parts.length >= 4) { score += 8; flags.push('excessive_subdomains'); details.push(`${parts.length} subdomain levels`); }
  const brands = ['paypal','google','microsoft','apple','amazon','netflix','facebook','instagram','whatsapp','telegram','dhl','fedex','usps','bank','secure','login','verify','account','update','confirm','wallet','crypto','bitcoin'];
  const domainLower = domain.toLowerCase();
  const hasBrandInSubdomain = brands.some(b => {
    const idx = domainLower.indexOf(b);
    if (idx < 0) return false;
    const tldParts = domain.split('.');
    const registeredDomain = tldParts.slice(-2).join('.');
    return !registeredDomain.includes(b) && domainLower.includes(b);
  });
  if (hasBrandInSubdomain) { score += 12; flags.push('brand_impersonation'); details.push('Possible brand impersonation in subdomain'); }
  if (domain.length > 40) { score += 5; flags.push('long_domain'); details.push('Unusually long domain name'); }
  const baseDomain = parts.slice(0, -1).join('.');
  const consonantRatio = (baseDomain.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length / Math.max(baseDomain.length, 1);
  if (consonantRatio > 0.75 && baseDomain.length > 8) { score += 8; flags.push('random_domain'); details.push('Random-looking domain name'); }
  if (url.includes('%') && (url.match(/%[0-9a-fA-F]{2}/g) || []).length > 3) { score += 5; flags.push('encoded_url'); details.push('Heavily encoded URL'); }
  if (/\.(php|asp|cgi|exe|scr|bat|cmd|js|vbs)$/i.test(url)) { score += 5; flags.push('suspicious_extension'); details.push('Suspicious file extension in URL'); }
  return { score, flags, detail: details.join('; ') };
}

// Feed loader helpers
async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.0' } });
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

async function loadOpenPhish(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt');
  const domains = new Set<string>();
  for (const line of lines) {
    try { domains.add(new URL(line).hostname); } catch {}
  }
  return domains;
}

async function loadPhishTank(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const domains = new Set<string>();
  const urls = new Set<string>();
  const feedUrls = [
    `https://data.phishtank.com/data/${process.env.PHISHTANK_API_KEY || ''}/online-valid.csv`,
    'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
  ];
  for (const feedUrl of feedUrls) {
    try {
      const res = await fetch(feedUrl, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.0' }, redirect: 'follow' });
      if (!res.ok) continue;
      const text = await res.text();
      if (feedUrl.includes('phishing-domains-ACTIVE')) {
        for (const line of text.split('\n')) {
          const d = line.trim().toLowerCase();
          if (d && !d.startsWith('#') && d.includes('.')) { domains.add(d.replace(/^www\./, '')); }
        }
        if (domains.size > 0) break;
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
              try { const hostname = new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr).hostname; domains.add(hostname.replace(/^www\./, '')); } catch {}
            }
          } catch {}
        }
        if (domains.size > 0) break;
      }
    } catch { continue; }
  }
  return { domains, urls };
}

// NEW: ThreatFox (abuse.ch) - Malware IOC domains
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

// NEW: Feodo Tracker (abuse.ch) - Botnet C2 IPs
async function loadFeodoTracker(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://feodotracker.abuse.ch/downloads/ipblocklist.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)));
}

// NEW: SSLBL (abuse.ch) - SSL Blacklist IPs
async function loadSSLBL(): Promise<Set<string>> {
  try {
    const res = await fetch('https://sslbl.abuse.ch/blacklist/sslipblacklist.csv', { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.0' } });
    if (!res.ok) return new Set();
    const text = await res.text();
    const ips = new Set<string>();
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const parts = trimmed.split(',');
        const ip = (parts[1] || parts[0] || '').trim();
        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) ips.add(ip);
      }
    }
    return ips;
  } catch { return new Set(); }
}

// NEW: IPsum (stamparm) - Aggregated bad IPs (level 3+)
async function loadIPsum(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(l)).map(l => l.split('\t')[0].trim()));
}

// NEW: blocklist.de - Attack source IPs
async function loadBlocklistDe(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://lists.blocklist.de/lists/all.txt');
  return new Set(lines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)));
}

// NEW: Emerging Threats compromised domains
async function loadEmergingThreats(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://rules.emergingthreats.net/blockrules/compromised-ips.txt');
  const domains = new Set<string>();
  // Also load ET compromised domains
  try {
    const res2 = await fetch('https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/suspicious/domain.txt', { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/4.0' } });
    if (res2.ok) {
      const text2 = await res2.text();
      for (const l of text2.split('\n')) {
        const d = l.trim().toLowerCase();
        if (d && !d.startsWith('#') && d.includes('.')) domains.add(d);
      }
    }
  } catch {}
  for (const l of lines) { if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)) domains.add(l); }
  return domains;
}

// NEW: Disposable Email Domains
async function loadDisposableEmails(): Promise<Set<string>> {
  const lines = await fetchTextFeed('https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf');
  return new Set(lines.filter(l => l.includes('.') && l.length > 3));
}

// Feed refresh - loads all feeds in parallel
async function refreshFeeds(): Promise<void> {
  const now = Date.now();
  if (cache.lastUpdated > 0 && (now - cache.lastUpdated) < CACHE_TTL_MS) return;
  console.log('[ThreatIntel v4] Refreshing 11 threat feeds...');
  cache.feedErrors = [];
  try {
    const [urlhaus, phishingArmy, openphish, phishtank, threatfox, feodo, sslbl, ipsum, blocklistDe, et, disposable] = await Promise.all([
      loadUrlhaus().catch(e => { cache.feedErrors.push('urlhaus: ' + e.message); return new Set<string>(); }),
      loadPhishingArmy().catch(e => { cache.feedErrors.push('phishingArmy: ' + e.message); return new Set<string>(); }),
      loadOpenPhish().catch(e => { cache.feedErrors.push('openphish: ' + e.message); return new Set<string>(); }),
      loadPhishTank().catch(e => { cache.feedErrors.push('phishtank: ' + e.message); return { domains: new Set<string>(), urls: new Set<string>() }; }),
      loadThreatFox().catch(e => { cache.feedErrors.push('threatfox: ' + e.message); return new Set<string>(); }),
      loadFeodoTracker().catch(e => { cache.feedErrors.push('feodo: ' + e.message); return new Set<string>(); }),
      loadSSLBL().catch(e => { cache.feedErrors.push('sslbl: ' + e.message); return new Set<string>(); }),
      loadIPsum().catch(e => { cache.feedErrors.push('ipsum: ' + e.message); return new Set<string>(); }),
      loadBlocklistDe().catch(e => { cache.feedErrors.push('blocklistde: ' + e.message); return new Set<string>(); }),
      loadEmergingThreats().catch(e => { cache.feedErrors.push('emergingthreats: ' + e.message); return new Set<string>(); }),
      loadDisposableEmails().catch(e => { cache.feedErrors.push('disposable: ' + e.message); return new Set<string>(); }),
    ]);
    cache.urlhaus = urlhaus;
    cache.phishingArmy = phishingArmy;
    cache.openphish = openphish;
    cache.phishtankDomains = phishtank.domains;
    cache.phishtankUrls = phishtank.urls;
    cache.threatfox = threatfox;
    cache.feodoIPs = feodo;
    cache.sslblIPs = sslbl;
    cache.ipsumIPs = ipsum;
    cache.blocklistDeIPs = blocklistDe;
    cache.emergingThreats = et;
    cache.disposableEmails = disposable;
    cache.lastUpdated = now;
    const total = urlhaus.size + phishingArmy.size + openphish.size + phishtank.domains.size + threatfox.size + feodo.size + sslbl.size + ipsum.size + blocklistDe.size + et.size + disposable.size;
    console.log(`[ThreatIntel v4] All feeds loaded. Total IOCs: ${total} | URLhaus=${urlhaus.size} PhishArmy=${phishingArmy.size} OpenPhish=${openphish.size} PhishTank=${phishtank.domains.size} ThreatFox=${threatfox.size} Feodo=${feodo.size} SSLBL=${sslbl.size} IPsum=${ipsum.size} BlocklistDE=${blocklistDe.size} ET=${et.size} DisposableEmails=${disposable.size}`);
  } catch (e: any) {
    cache.feedErrors.push('refresh: ' + e.message);
  }
}

// Check a single URL against all threat feeds
export async function checkUrl(url: string): Promise<{
  dominated: boolean;
  threats: string[];
  categories: string[];
  feedsMatched: string[];
  heuristicFlags: string[];
}> {
  await ensureFeedsLoaded();
  const threats: string[] = [];
  const categories: string[] = [];
  const feedsMatched: string[] = [];
  const heuristicFlags: string[] = [];

  let hostname = '';
  try {
    hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
  } catch {
    return { dominated: false, threats, categories, feedsMatched, heuristicFlags };
  }

  // Check URLhaus (malware distribution)
  if (cache.urlhaus.has(url) || cache.urlhaus.has(hostname)) {
    threats.push('URLhaus: Malware Distribution');
    categories.push('malware');
    feedsMatched.push('urlhaus');
  }

  // Check Phishing Army
  if (cache.phishingArmy.has(hostname)) {
    threats.push('Phishing Army: Known Phishing Domain');
    categories.push('phishing');
    feedsMatched.push('phishing_army');
  }

  // Check OpenPhish
  for (const phishUrl of cache.openphish) {
    if (phishUrl.includes(hostname)) {
      threats.push('OpenPhish: Active Phishing URL');
      categories.push('phishing');
      feedsMatched.push('openphish');
      break;
    }
  }

  // Check PhishTank domains
  if (cache.phishtankDomains.has(hostname)) {
    threats.push('PhishTank: Verified Phishing Domain');
    categories.push('phishing');
    feedsMatched.push('phishtank');
  }

  // Check PhishTank URLs
  for (const ptUrl of cache.phishtankUrls) {
    if (ptUrl.includes(hostname)) {
      threats.push('PhishTank: Verified Phishing URL');
      if (!categories.includes('phishing')) categories.push('phishing');
      if (!feedsMatched.includes('phishtank')) feedsMatched.push('phishtank');
      break;
    }
  }

  // Check ThreatFox (IOCs)
  if (cache.threatfox.has(hostname)) {
    threats.push('ThreatFox: Known IOC (Indicator of Compromise)');
    categories.push('malware', 'c2');
    feedsMatched.push('threatfox');
  }

  // Check Feodo Tracker (banking trojans C2)
  if (cache.feodoIPs.has(hostname)) {
    threats.push('Feodo Tracker: Banking Trojan C2 Server');
    categories.push('botnet', 'c2');
    feedsMatched.push('feodo_tracker');
  }

  // Check SSLBL (malicious SSL certs)
  if (cache.sslblIPs.has(hostname)) {
    threats.push('SSLBL: Malicious SSL Certificate');
    categories.push('malware', 'c2');
    feedsMatched.push('sslbl');
  }

  // Check IPsum (aggregated threat IPs)
  if (cache.ipsumIPs.has(hostname)) {
    threats.push('IPsum: High-Risk Threat IP');
    categories.push('threat_ip');
    feedsMatched.push('ipsum');
  }

  // Check blocklist.de (attack sources)
  if (cache.blocklistDeIPs.has(hostname)) {
    threats.push('blocklist.de: Known Attack Source');
    categories.push('attack_source');
    feedsMatched.push('blocklist_de');
  }

  // Check Emerging Threats
  if (cache.emergingThreats.has(hostname)) {
    threats.push('Emerging Threats: Compromised Host');
    categories.push('compromised');
    feedsMatched.push('emerging_threats');
  }

  // Check Disposable Email Domains
  if (cache.disposableEmails.has(hostname) || cache.disposableEmails.has(hostname.replace(/^www\./, ''))) {
    threats.push('Disposable Email Domain');
    categories.push('disposable_email');
    feedsMatched.push('disposable_emails');
  }

  // Local IOC check
  for (const ioc of LOCAL_IOC_LIST) {
    if (hostname.includes(ioc) || url.includes(ioc)) {
      threats.push(`Local IOC Match: ${ioc}`);
      categories.push('local_ioc');
      feedsMatched.push('local_ioc');
      break;
    }
  }

  // Heuristic checks
  for (const h of HEURISTICS) {
    if (h.check(hostname, url)) {
      heuristicFlags.push(h.name);
    }
  }

  const dominated = threats.length > 0;
  return { dominated, threats, categories: [...new Set(categories)], feedsMatched: [...new Set(feedsMatched)], heuristicFlags };
}

// Quick check - just returns boolean (for batch operations)
export async function checkUrlFast(url: string): Promise<boolean> {
  await ensureFeedsLoaded();
  let hostname = '';
  try {
    hostname = new URL(url.startsWith('http') ? url : `https://${url}`).hostname.toLowerCase();
  } catch { return false; }

  if (cache.urlhaus.has(url) || cache.urlhaus.has(hostname)) return true;
  if (cache.phishingArmy.has(hostname)) return true;
  if (cache.phishtankDomains.has(hostname)) return true;
  if (cache.threatfox.has(hostname)) return true;
  if (cache.feodoIPs.has(hostname)) return true;
  if (cache.sslblIPs.has(hostname)) return true;
  if (cache.ipsumIPs.has(hostname)) return true;
  if (cache.blocklistDeIPs.has(hostname)) return true;
  if (cache.emergingThreats.has(hostname)) return true;
  if (cache.disposableEmails.has(hostname)) return true;

  for (const phishUrl of cache.openphish) {
    if (phishUrl.includes(hostname)) return true;
  }
  for (const ptUrl of cache.phishtankUrls) {
    if (ptUrl.includes(hostname)) return true;
  }
  for (const ioc of LOCAL_IOC_LIST) {
    if (hostname.includes(ioc) || url.includes(ioc)) return true;
  }

  return false;
}

// Get feed status for Service Status page
export async function getFeedStatus() {
  await ensureFeedsLoaded();
  return {
    feeds: [
      { name: 'URLhaus', entries: cache.urlhaus.size, status: cache.urlhaus.size > 0 ? 'active' : 'error' },
      { name: 'Phishing Army', entries: cache.phishingArmy.size, status: cache.phishingArmy.size > 0 ? 'active' : 'error' },
      { name: 'OpenPhish', entries: cache.openphish.size, status: cache.openphish.size > 0 ? 'active' : 'error' },
      { name: 'PhishTank', entries: cache.phishtankDomains.size + cache.phishtankUrls.size, status: cache.phishtankDomains.size > 0 ? 'active' : 'error' },
      { name: 'ThreatFox', entries: cache.threatfox.size, status: cache.threatfox.size > 0 ? 'active' : 'error' },
      { name: 'Feodo Tracker', entries: cache.feodoIPs.size, status: cache.feodoIPs.size > 0 ? 'active' : 'error' },
      { name: 'SSLBL', entries: cache.sslblIPs.size, status: cache.sslblIPs.size > 0 ? 'active' : 'error' },
      { name: 'IPsum', entries: cache.ipsumIPs.size, status: cache.ipsumIPs.size > 0 ? 'active' : 'error' },
      { name: 'blocklist.de', entries: cache.blocklistDeIPs.size, status: cache.blocklistDeIPs.size > 0 ? 'active' : 'error' },
      { name: 'Emerging Threats', entries: cache.emergingThreats.size, status: cache.emergingThreats.size > 0 ? 'active' : 'error' },
      { name: 'Disposable Emails', entries: cache.disposableEmails.size, status: cache.disposableEmails.size > 0 ? 'active' : 'error' },
    ],
    lastUpdated: cache.lastUpdated?.toISOString() || null,
    feedErrors: cache.feedErrors,
    totalEntries: cache.urlhaus.size + cache.phishingArmy.size + cache.openphish.size + cache.phishtankDomains.size + cache.phishtankUrls.size + cache.threatfox.size + cache.feodoIPs.size + cache.sslblIPs.size + cache.ipsumIPs.size + cache.blocklistDeIPs.size + cache.emergingThreats.size + cache.disposableEmails.size,
  };
}
