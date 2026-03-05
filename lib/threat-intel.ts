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
  'github.com':               { risk_level: 'low_risk',        categories: ['development'] },
  'malware.testing.google.test': { risk_level: 'known_malicious', categories: ['malware'] },
  // Add more from your test list here
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
