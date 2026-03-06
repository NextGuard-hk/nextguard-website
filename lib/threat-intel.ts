// lib/threat-intel.ts
// NextGuard OSINT Threat Intelligence Engine v3.1
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
  lastUpdated: number;
  feedErrors: string[];
}

let cache: FeedCache = {
  urlhaus: new Set(),
  phishingArmy: new Set(),
  openphish: new Set(),
  phishtankDomains: new Set(),
  phishtankUrls: new Set(),
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

// Enhanced URL shortener detection
const URL_SHORTENERS = ['bit.ly','t.co','tinyurl.com','goo.gl','ow.ly','is.gd','buff.ly','rebrand.ly','bl.ink','short.io','l.wl.co','l.ead.me','qr-codes.io','rb.gy','cutt.ly','shorturl.at'];

// Enhanced domain pattern analysis
function analyzeDomainPattern(domain: string, url: string): { score: number; flags: string[]; detail: string } {
  let score = 0;
  const flags: string[] = [];
  const details: string[] = [];

  // Check URL shorteners (phishing often uses these)
  const isShortener = URL_SHORTENERS.some(s => domain === s || domain.endsWith('.' + s));
  if (isShortener) {
    score += 10;
    flags.push('url_shortener');
    details.push('URL shortener detected');
  }

  // Check for IP address as domain
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(domain)) {
    score += 15;
    flags.push('ip_address_url');
    details.push('IP address used as domain');
  }

  // Check for excessive subdomains (e.g., login.paypal.com.evil.xyz)
  const parts = domain.split('.');
  if (parts.length >= 4) {
    score += 8;
    flags.push('excessive_subdomains');
    details.push(`${parts.length} subdomain levels`);
  }

  // Check for brand impersonation patterns
  const brands = ['paypal','google','microsoft','apple','amazon','netflix','facebook','instagram','whatsapp','telegram','dhl','fedex','usps','bank','secure','login','verify','account','update','confirm','wallet','crypto','bitcoin'];
  const domainLower = domain.toLowerCase();
  const hasBrandInSubdomain = brands.some(b => {
    const idx = domainLower.indexOf(b);
    if (idx < 0) return false;
    // Check if brand is NOT in the actual registered domain (i.e., it's in a subdomain)
    const tldParts = domain.split('.');
    const registeredDomain = tldParts.slice(-2).join('.');
    return !registeredDomain.includes(b) && domainLower.includes(b);
  });
  if (hasBrandInSubdomain) {
    score += 12;
    flags.push('brand_impersonation');
    details.push('Possible brand impersonation in subdomain');
  }

  // Check for very long domain names (common in phishing)
  if (domain.length > 40) {
    score += 5;
    flags.push('long_domain');
    details.push('Unusually long domain name');
  }

  // Check for random-looking domain (high entropy)
  const baseDomain = parts.slice(0, -1).join('.');
  const consonantRatio = (baseDomain.match(/[bcdfghjklmnpqrstvwxyz]/gi) || []).length / Math.max(baseDomain.length, 1);
  if (consonantRatio > 0.75 && baseDomain.length > 8) {
    score += 8;
    flags.push('random_domain');
    details.push('Random-looking domain name');
  }

  // Check for encoded/obfuscated URLs
  if (url.includes('%') && (url.match(/%[0-9a-fA-F]{2}/g) || []).length > 3) {
    score += 5;
    flags.push('encoded_url');
    details.push('Heavily encoded URL');
  }

  // Check for double extensions or suspicious paths
  if (/\.(php|asp|cgi|exe|scr|bat|cmd|js|vbs)$/i.test(url)) {
    score += 5;
    flags.push('suspicious_extension');
    details.push('Suspicious file extension in URL');
  }

  return { score, flags, detail: details.join('; ') };
}

// Feed loader helpers
async function fetchTextFeed(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'NextGuard-ThreatIntel/3.1' } });
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

// FIXED: PhishTank feed loader with multiple fallback sources and better CSV parsing
async function loadPhishTank(): Promise<{ domains: Set<string>; urls: Set<string> }> {
  const domains = new Set<string>();
  const urls = new Set<string>();
  
  // Try multiple PhishTank feed sources
  const feedUrls = [
    'https://data.phishtank.com/data/online-valid.csv',
    'http://data.phishtank.com/data/online-valid.csv',
    'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
  ];
  
  for (const feedUrl of feedUrls) {
    try {
      const res = await fetch(feedUrl, {
        signal: AbortSignal.timeout(20000),
        headers: { 'User-Agent': 'NextGuard-ThreatIntel/3.1' },
        redirect: 'follow',
      });
      if (!res.ok) continue;
      const text = await res.text();
      
      if (feedUrl.includes('phishing-domains-ACTIVE')) {
        // Plain text domain list fallback
        for (const line of text.split('\n')) {
          const d = line.trim().toLowerCase();
          if (d && !d.startsWith('#') && d.includes('.')) {
            domains.add(d.replace(/^www\./, ''));
          }
        }
        if (domains.size > 0) break;
      } else {
        // CSV format from PhishTank
        const lines = text.split('\n');
        for (let i = 1; i < lines.length; i++) {
          try {
            const line = lines[i];
            if (!line || line.length < 10) continue;
            // Handle CSV with possible quoted fields
            let urlStr = '';
            if (line.startsWith('"')) {
              // CSV with quoted fields
              const match = line.match(/^"?\d+"?,"?([^"\s,]+)"?/);
              if (match?.[1]) urlStr = match[1].trim().toLowerCase();
            } else {
              const parts = line.split(',');
              urlStr = (parts[1] || '').trim().toLowerCase().replace(/^"/,'').replace(/"$/,'');
            }
            if (urlStr && (urlStr.startsWith('http') || urlStr.includes('.'))) {
              urls.add(urlStr);
              try {
                const hostname = new URL(urlStr.startsWith('http') ? urlStr : 'http://' + urlStr).hostname;
                domains.add(hostname.replace(/^www\./, ''));
              } catch {}
            }
          } catch {}
        }
        if (domains.size > 0) break;
      }
    } catch {
      continue;
    }
  }
  
  return { domains, urls };
}

// Feed refresh
async function refreshFeeds(): Promise<void> {
  const now = Date.now();
  if (cache.lastUpdated > 0 && (now - cache.lastUpdated) < CACHE_TTL_MS) return;
  console.log('[ThreatIntel] Refreshing threat feeds...');
  cache.feedErrors = [];
  try {
    const [urlhaus, phishingArmy, openphish, phishtank] = await Promise.all([
      loadUrlhaus().catch(e => { cache.feedErrors.push('urlhaus: ' + e.message); return new Set<string>(); }),
      loadPhishingArmy().catch(e => { cache.feedErrors.push('phishingArmy: ' + e.message); return new Set<string>(); }),
      loadOpenPhish().catch(e => { cache.feedErrors.push('openphish: ' + e.message); return new Set<string>(); }),
      loadPhishTank().catch(e => { cache.feedErrors.push('phishtank: ' + e.message); return { domains: new Set<string>(), urls: new Set<string>() }; }),
    ]);
    cache.urlhaus = urlhaus;
    cache.phishingArmy = phishingArmy;
    cache.openphish = openphish;
    cache.phishtankDomains = phishtank.domains;
    cache.phishtankUrls = phishtank.urls;
    cache.lastUpdated = now;
    console.log(`[ThreatIntel] Feeds loaded: URLhaus=${urlhaus.size}, PhishingArmy=${phishingArmy.size}, OpenPhish=${openphish.size}, PhishTank=${phishtank.domains.size}`);
  } catch (e: any) {
    cache.feedErrors.push('refresh: ' + e.message);
  }
}

// Google Safe Browsing API
async function checkGoogleSafeBrowsing(url: string): Promise<SourceHit> {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!apiKey) return { name: 'google_safe_browsing', hit: false, detail: 'API key not configured' };
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'nextguard-swg', clientVersion: '3.1' },
        threatInfo: {
          threatTypes: ['MALWARE','SOCIAL_ENGINEERING','UNWANTED_SOFTWARE','POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url }]
        }
      }),
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const hasMatch = data.matches && data.matches.length > 0;
    return { name: 'google_safe_browsing', hit: hasMatch, risk_level: hasMatch ? 'known_malicious' : 'unknown', categories: hasMatch ? ['malware'] : [], detail: hasMatch ? 'Flagged by Google Safe Browsing' : 'Not flagged' };
  } catch (e: any) {
    return { name: 'google_safe_browsing', hit: false, detail: 'API error: ' + e.message };
  }
}

// VirusTotal API
async function checkVirusTotal(url: string): Promise<SourceHit> {
  const apiKey = process.env.VIRUSTOTAL_API_KEY;
  if (!apiKey) return { name: 'virustotal', hit: false, detail: 'API key not configured' };
  try {
    const urlId = Buffer.from(url).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const res = await fetch(`https://www.virustotal.com/api/v3/urls/${urlId}`, {
      headers: { 'x-apikey': apiKey }, signal: AbortSignal.timeout(8000)
    });
    if (res.status === 404) return { name: 'virustotal', hit: false, detail: 'Not in VT database' };
    const data = await res.json();
    const stats = data.data?.attributes?.last_analysis_stats || {};
    const malicious = stats.malicious || 0;
    const suspicious = stats.suspicious || 0;
    const total = (stats.harmless || 0) + (stats.undetected || 0) + malicious + suspicious;
    const score = malicious + suspicious;
    let risk: RiskLevel = 'unknown';
    if (malicious >= 5) risk = 'known_malicious';
    else if (malicious >= 2) risk = 'high_risk';
    else if (score >= 1) risk = 'medium_risk';
    return { name: 'virustotal', hit: score > 0, risk_level: risk, detail: `VT: ${malicious}/${total} engines flagged` };
  } catch (e: any) {
    return { name: 'virustotal', hit: false, detail: 'API error: ' + e.message };
  }
}

// FIXED: AlienVault OTX - properly encode hostname and handle errors
async function checkAlienVaultOTX(hostname: string): Promise<SourceHit> {
  const apiKey = process.env.ALIENVAULT_OTX_API_KEY;
  try {
    // Clean hostname - remove port, path, etc.
    const cleanHost = hostname.replace(/[^a-zA-Z0-9.-]/g, '').toLowerCase();
    if (!cleanHost || cleanHost.length < 3) return { name: 'alienvault_otx', hit: false, detail: 'Invalid hostname' };
    const headers: Record<string, string> = { 'User-Agent': 'NextGuard-ThreatIntel/3.1' };
    if (apiKey) headers['X-OTX-API-KEY'] = apiKey;
    const res = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${encodeURIComponent(cleanHost)}/general`, {
      headers, signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { name: 'alienvault_otx', hit: false, detail: `OTX returned ${res.status}` };
    const data = await res.json();
    const pulseCount = data.pulse_info?.count || 0;
    const hit = pulseCount > 0;
    let risk: RiskLevel = 'unknown';
    if (pulseCount >= 10) risk = 'known_malicious';
    else if (pulseCount >= 5) risk = 'high_risk';
    else if (pulseCount >= 2) risk = 'medium_risk';
    else if (pulseCount >= 1) risk = 'low_risk';
    return { name: 'alienvault_otx', hit, risk_level: risk, detail: hit ? `OTX: ${pulseCount} threat pulses` : 'Not in OTX' };
  } catch (e: any) {
    return { name: 'alienvault_otx', hit: false, detail: 'OTX error: ' + e.message };
  }
}

// Cloudflare DNS Security Check (1.1.1.2)
async function checkCloudflareDNS(hostname: string): Promise<SourceHit> {
  try {
    const res = await fetch(`https://security.cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { 'Accept': 'application/dns-json' }, signal: AbortSignal.timeout(3000)
    });
    const data = await res.json();
    const blocked = data.Status === 3 || (data.Answer && data.Answer.some((a: any) => a.data === '0.0.0.0')) || (!data.Answer && data.Status === 0 && data.Authority);
    let normalResolves = true;
    if (blocked) {
      try {
        const nr = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(hostname)}&type=A`, {
          headers: { 'Accept': 'application/dns-json' }, signal: AbortSignal.timeout(3000)
        });
        const nd = await nr.json();
        normalResolves = nd.Answer && nd.Answer.length > 0;
      } catch { normalResolves = true; }
    }
    const isBlocked = blocked && normalResolves;
    return { name: 'cloudflare_dns', hit: isBlocked, risk_level: isBlocked ? 'high_risk' : 'unknown', categories: isBlocked ? ['dns_blocked'] : [], detail: isBlocked ? 'Blocked by Cloudflare 1.1.1.2' : 'Not blocked' };
  } catch (e: any) {
    return { name: 'cloudflare_dns', hit: false, detail: 'DNS error: ' + e.message };
  }
}

// Main URL Check - Multi-Source Aggregation with Enhanced Heuristics
export async function checkUrl(inputUrl: string): Promise<ThreatIntelResult> {
  await refreshFeeds();
  let url = inputUrl.trim().toLowerCase();
  if (!url.startsWith('http')) url = 'https://' + url;
  let domain = '';
  try { domain = new URL(url).hostname; } catch { domain = url.replace(/^https?:\/\//, '').split('/')[0]; }

  const sources: SourceHit[] = [];
  const allCategories: Set<string> = new Set();
  const allFlags: Set<string> = new Set();

  // 1. Local IOC
  const localMatch = LOCAL_IOC[domain];
  if (localMatch) {
    sources.push({ name: 'known_domains', hit: true, risk_level: localMatch.risk_level, categories: localMatch.categories, detail: localMatch.categories.join(', ') });
    localMatch.categories.forEach(c => allCategories.add(c));
    allFlags.add('known_domain');
  } else {
    let found = false;
    for (const [key, val] of Object.entries(LOCAL_IOC)) {
      if (domain.endsWith('.' + key)) {
        sources.push({ name: 'known_domains', hit: true, risk_level: val.risk_level, categories: val.categories, detail: val.categories.join(', ') });
        val.categories.forEach(c => allCategories.add(c));
        allFlags.add('known_domain');
        found = true;
        break;
      }
    }
    if (!found) sources.push({ name: 'known_domains', hit: false, detail: 'Clean' });
  }

  // 2. Suspicious TLD/keyword heuristics
  const hasSuspiciousTld = SUSPICIOUS_TLDS.some(t => domain.endsWith(t));
  const hasSuspiciousKw = SUSPICIOUS_KEYWORDS.some(k => domain.includes(k));
  if (hasSuspiciousTld || hasSuspiciousKw) {
    sources.push({ name: 'heuristic', hit: true, detail: hasSuspiciousTld ? 'Suspicious TLD' : 'Suspicious keyword' });
    allFlags.add('heuristic_hit');
  }

  // 3. Enhanced domain pattern analysis (NEW)
  const patternAnalysis = analyzeDomainPattern(domain, url);
  if (patternAnalysis.score > 0) {
    sources.push({ name: 'pattern_analysis', hit: true, detail: patternAnalysis.detail });
    patternAnalysis.flags.forEach(f => allFlags.add(f));
  }

  // 4. Feed checks
  const inUrlhaus = cache.urlhaus.has(domain);
  sources.push({ name: 'urlhaus', hit: inUrlhaus, detail: inUrlhaus ? 'Found in URLhaus' : 'Clean' });
  if (inUrlhaus) { allCategories.add('malware'); allFlags.add('urlhaus_hit'); }

  const inPhishArmy = cache.phishingArmy.has(domain);
  sources.push({ name: 'phishing_army', hit: inPhishArmy, detail: inPhishArmy ? 'Found in Phishing Army' : 'Clean' });
  if (inPhishArmy) { allCategories.add('phishing'); allFlags.add('phishing_army_hit'); }

  const inOpenPhish = cache.openphish.has(domain);
  sources.push({ name: 'openphish', hit: inOpenPhish, detail: inOpenPhish ? 'Found in OpenPhish' : 'Clean' });
  if (inOpenPhish) { allCategories.add('phishing'); allFlags.add('openphish_hit'); }

  const inPhishTank = cache.phishtankDomains.has(domain) || cache.phishtankDomains.has(domain.replace(/^www\./, ''));
  sources.push({ name: 'phishtank', hit: inPhishTank, detail: inPhishTank ? 'Found in PhishTank' : 'Clean' });
  if (inPhishTank) { allCategories.add('phishing'); allFlags.add('phishtank_hit'); }

  // 5. API checks (parallel)
  const [gsb, vt, otx, cf] = await Promise.all([
    checkGoogleSafeBrowsing(url).catch(() => ({ name: 'google_safe_browsing', hit: false, detail: 'error' } as SourceHit)),
    checkVirusTotal(url).catch(() => ({ name: 'virustotal', hit: false, detail: 'error' } as SourceHit)),
    checkAlienVaultOTX(domain).catch(() => ({ name: 'alienvault_otx', hit: false, detail: 'error' } as SourceHit)),
    checkCloudflareDNS(domain).catch(() => ({ name: 'cloudflare_dns', hit: false, detail: 'error' } as SourceHit)),
  ]);
  sources.push(gsb, vt, otx, cf);
  if (gsb.hit) { allCategories.add('google_flagged'); allFlags.add('gsb_hit'); }
  if (vt.hit) { allCategories.add('virustotal_flagged'); allFlags.add('vt_hit'); }
  if (otx.hit) { allCategories.add('otx_flagged'); allFlags.add('otx_hit'); }
  if (cf.hit) { allCategories.add('dns_blocked'); allFlags.add('cf_dns_blocked'); }

  // Calculate weighted score (ENHANCED)
  let score = 0;
  for (const s of sources) {
    if (!s.hit) continue;
    switch (s.name) {
      case 'google_safe_browsing': score += 25; break;
      case 'virustotal': score += 20; break;
      case 'cloudflare_dns': score += 20; break;
      case 'alienvault_otx': score += 15; break;
      case 'phishtank': score += 15; break;
      case 'urlhaus': score += 15; break;
      case 'openphish': score += 15; break;
      case 'phishing_army': score += 10; break;
      case 'known_domains': {
        const rl = s.risk_level;
        if (rl === 'known_malicious') score += 30;
        else if (rl === 'high_risk') score += 20;
        else if (rl === 'medium_risk') score += 10;
        else score += 5;
        break;
      }
      case 'heuristic': score += 5; break;
      case 'pattern_analysis': score += patternAnalysis.score; break;
      default: score += 10;
    }
  }
  score = Math.min(score, 100);

  let risk_level: RiskLevel = 'unknown';
  if (score >= 50) risk_level = 'known_malicious';
  else if (score >= 30) risk_level = 'high_risk';
  else if (score >= 15) risk_level = 'medium_risk';
  else if (score >= 5) risk_level = 'low_risk';

  return {
    url: inputUrl, domain, risk_level, overall_score: score,
    categories: Array.from(allCategories), flags: Array.from(allFlags),
    sources, checked_at: new Date().toISOString(),
  };
}

// Feed status for health check
export function getFeedStatus() {
  return {
    lastUpdated: cache.lastUpdated ? new Date(cache.lastUpdated).toISOString() : 'never',
    feeds: {
      urlhaus: cache.urlhaus.size,
      phishingArmy: cache.phishingArmy.size,
      openphish: cache.openphish.size,
      phishtank: cache.phishtankDomains.size,
    },
    errors: cache.feedErrors,
    sources: ['known_domains', 'heuristic', 'pattern_analysis', 'urlhaus', 'phishing_army', 'openphish', 'phishtank', 'google_safe_browsing', 'virustotal', 'alienvault_otx', 'cloudflare_dns'],
  };
}

export { refreshFeeds };
