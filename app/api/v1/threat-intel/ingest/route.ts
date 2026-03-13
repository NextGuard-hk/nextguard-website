// app/api/v1/threat-intel/ingest/route.ts
// NextGuard Threat Intel v6.0 - Feed Ingestion API
// Fetches all OSINT feeds and writes IOCs to Turso DB
// Called by Vercel Cron or manually via POST
// v6.0: Added MalwareBazaar, AbuseIPDB, URLScan feeds, increased coverage

import { NextRequest, NextResponse } from 'next/server';
import { ingestIndicators, expireOldIndicators } from '@/lib/threat-intel-db';

// Feed parsers: each returns array of { value, type, description? }
async function fetchTextLines(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/6.0' },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').map(l => l.trim().toLowerCase()).filter(l => l && !l.startsWith('#'));
  } catch { return []; }
}

// Parse URLhaus - extract hostnames from URLs
async function ingestUrlhaus(): Promise<number> {
  const lines = await fetchTextLines('https://urlhaus.abuse.ch/downloads/text_online/');
  const indicators: { value: string; type: string }[] = [];
  for (const line of lines) {
    if (!line.startsWith('http')) continue;
    try {
      const hostname = new URL(line).hostname.replace(/^www\./, '');
      if (hostname && hostname.includes('.')) {
        indicators.push({ value: hostname, type: 'domain' });
      }
    } catch {}
  }
  const { added, updated } = await ingestIndicators('urlhaus', indicators);
  return added + updated;
}

// Parse Phishing Army - plain domain list
async function ingestPhishingArmy(): Promise<number> {
  const lines = await fetchTextLines('https://phishing.army/download/phishing_army_blocklist.txt');
  const indicators = lines
    .filter(l => l.includes('.') && l.length > 3)
    .map(l => ({ value: l.replace(/^www\./, ''), type: 'domain' }));
  const { added, updated } = await ingestIndicators('phishing_army', indicators);
  return added + updated;
}

// Parse OpenPhish - URL list, extract hostnames
async function ingestOpenPhish(): Promise<number> {
  const lines = await fetchTextLines('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt');
  const indicators: { value: string; type: string }[] = [];
  for (const line of lines) {
    try {
      const hostname = new URL(line.startsWith('http') ? line : `https://${line}`).hostname.replace(/^www\./, '');
      if (hostname) indicators.push({ value: hostname, type: 'domain' });
    } catch {}
  }
  const { added, updated } = await ingestIndicators('openphish', indicators);
  return added + updated;
}

// Parse PhishTank - domain list from GitHub mirror
async function ingestPhishTank(): Promise<number> {
  const urls = [
    'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',
  ];
  for (const feedUrl of urls) {
    try {
      const lines = await fetchTextLines(feedUrl);
      if (lines.length < 10) continue;
      const indicators = lines
        .filter(l => l.includes('.'))
        .map(l => ({ value: l.replace(/^www\./, ''), type: 'domain' }));
      if (indicators.length > 0) {
        const { added, updated } = await ingestIndicators('phishtank', indicators);
        return added + updated;
      }
    } catch {}
  }
  return 0;
}

// Parse PhishStats - recent phishing URLs
async function ingestPhishStats(): Promise<number> {
  const indicators: { value: string; type: string; description: string }[] = [];
  try {
    const res = await fetch('https://phishstats.info/phish_score.csv', {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/6.0' },
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split('\n')) {
      if (line.startsWith('#') || line.length < 10) continue;
      try {
        const match = line.match(/,"?(https?:\/\/[^"\s,]+)"?/);
        if (match?.[1]) {
          const url = match[1].trim().toLowerCase();
          try {
            const hostname = new URL(url).hostname.replace(/^www\./, '');
            if (hostname && hostname.includes('.')) {
              indicators.push({ value: hostname, type: 'domain', description: 'PhishStats phishing URL' });
            }
          } catch {}
        }
      } catch {}
    }
  } catch {}
  if (indicators.length === 0) return 0;
  const { added, updated } = await ingestIndicators('phishstats', indicators);
  return added + updated;
}

// Parse ThreatFox hostfile format
async function ingestThreatFox(): Promise<number> {
  const lines = await fetchTextLines('https://threatfox.abuse.ch/downloads/hostfile/');
  const indicators: { value: string; type: string }[] = [];
  for (const line of lines) {
    if (line.startsWith('127.0.0.1')) {
      const domain = line.replace('127.0.0.1', '').trim();
      if (domain && domain.includes('.') && domain.length > 3) {
        indicators.push({ value: domain, type: 'domain' });
      }
    }
  }
  const { added, updated } = await ingestIndicators('threatfox', indicators);
  return added + updated;
}

// Parse Feodo Tracker - IP blocklist
async function ingestFeodoTracker(): Promise<number> {
  const lines = await fetchTextLines('https://feodotracker.abuse.ch/downloads/ipblocklist.txt');
  const indicators = lines
    .filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l))
    .map(l => ({ value: l, type: 'ipv4-addr', description: 'Feodo Tracker C2 IP' }));
  const { added, updated } = await ingestIndicators('feodo_tracker', indicators);
  return added + updated;
}

// Parse C2IntelFeeds CSV
async function ingestC2Intel(): Promise<number> {
  const lines = await fetchTextLines('https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv');
  const indicators: { value: string; type: string; description: string }[] = [];
  for (const line of lines) {
    if (!line || line.startsWith('#') || line === '#ip,ioc') continue;
    const ip = line.split(',')[0].trim();
    if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
      indicators.push({ value: ip, type: 'ipv4-addr', description: 'Active C2 server (30-day)' });
    }
  }
  const { added, updated } = await ingestIndicators('c2_intel', indicators);
  return added + updated;
}

// Parse IPsum - IP threat aggregator
async function ingestIPsum(): Promise<number> {
  const lines = await fetchTextLines('https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt');
  const indicators = lines
    .filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/.test(l))
    .map(l => ({ value: l.split('\t')[0].trim(), type: 'ipv4-addr' }));
  const { added, updated } = await ingestIndicators('ipsum', indicators);
  return added + updated;
}

// Parse blocklist.de - all IPs
async function ingestBlocklistDe(): Promise<number> {
  const lines = await fetchTextLines('https://lists.blocklist.de/lists/all.txt');
  const indicators = lines
    .filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l))
    .map(l => ({ value: l, type: 'ipv4-addr' }));
  const { added, updated } = await ingestIndicators('blocklist_de', indicators);
  return added + updated;
}

// Parse Emerging Threats compromised IPs + Maltrail domains
async function ingestEmergingThreats(): Promise<number> {
  const [etLines, maltrailLines] = await Promise.all([
    fetchTextLines('https://rules.emergingthreats.net/blockrules/compromised-ips.txt'),
    fetchTextLines('https://raw.githubusercontent.com/stamparm/maltrail/master/trails/static/suspicious/domain.txt'),
  ]);
  const indicators: { value: string; type: string }[] = [
    ...etLines.filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l)).map(l => ({ value: l, type: 'ipv4-addr' })),
    ...maltrailLines.filter(l => l.includes('.') && l.length > 3).map(l => ({ value: l, type: 'domain' })),
  ];
  const { added, updated } = await ingestIndicators('emerging_threats', indicators);
  return added + updated;
}

// Parse Disposable Email Domains
async function ingestDisposableEmails(): Promise<number> {
  const lines = await fetchTextLines('https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf');
  const indicators = lines
    .filter(l => l.includes('.') && l.length > 3)
    .map(l => ({ value: l, type: 'domain' }));
  const { added, updated } = await ingestIndicators('disposable_emails', indicators);
  return added + updated;
}

// NEW v6.0: Parse MalwareBazaar - recent malware hashes and hosting domains
async function ingestMalwareBazaar(): Promise<number> {
  const indicators: { value: string; type: string; description: string }[] = [];
  try {
    const res = await fetch('https://bazaar.abuse.ch/export/txt/md5/recent/', {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/6.0' },
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split('\n')) {
      const l = line.trim().toLowerCase();
      if (!l || l.startsWith('#') || l.length < 32) continue;
      if (/^[a-f0-9]{32}$/.test(l)) {
        indicators.push({ value: l, type: 'file-hash-md5', description: 'MalwareBazaar recent malware' });
      }
    }
  } catch {}
  // Also fetch hosting domains
  try {
    const res2 = await fetch('https://bazaar.abuse.ch/export/txt/domain/recent/', {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/6.0' },
    });
    if (res2.ok) {
      const text2 = await res2.text();
      for (const line of text2.split('\n')) {
        const l = line.trim().toLowerCase();
        if (!l || l.startsWith('#')) continue;
        if (l.includes('.') && l.length > 3) {
          indicators.push({ value: l, type: 'domain', description: 'MalwareBazaar hosting domain' });
        }
      }
    }
  } catch {}
  if (indicators.length === 0) return 0;
  const { added, updated } = await ingestIndicators('malware_bazaar', indicators);
  return added + updated;
}

// NEW v6.0: Parse AbuseIPDB - blacklisted IPs (public feed)
async function ingestAbuseIPDB(): Promise<number> {
  const indicators: { value: string; type: string; description: string }[] = [];
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    // Fallback to public blocklist mirror
    const lines = await fetchTextLines('https://raw.githubusercontent.com/borestad/blocklist-abuseipdb/main/abuseipdb-s100-all.ipv4');
    const inds = lines
      .filter(l => /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(l))
      .map(l => ({ value: l, type: 'ipv4-addr', description: 'AbuseIPDB high-confidence IP' }));
    if (inds.length === 0) return 0;
    const { added, updated } = await ingestIndicators('abuseipdb', inds);
    return added + updated;
  }
  try {
    const res = await fetch('https://api.abuseipdb.com/api/v2/blacklist?confidenceMinimum=90&limit=10000', {
      signal: AbortSignal.timeout(30000),
      headers: { 'Key': apiKey, 'Accept': 'text/plain' },
    });
    if (!res.ok) return 0;
    const text = await res.text();
    for (const line of text.split('\n')) {
      const ip = line.trim();
      if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
        indicators.push({ value: ip, type: 'ipv4-addr', description: 'AbuseIPDB blacklisted IP (confidence>=90)' });
      }
    }
  } catch {}
  if (indicators.length === 0) return 0;
  const { added, updated } = await ingestIndicators('abuseipdb', indicators);
  return added + updated;
}

// NEW v6.0: Parse URLScan.io - recent malicious URLs
async function ingestURLScan(): Promise<number> {
  const indicators: { value: string; type: string; description: string }[] = [];
  try {
    const res = await fetch('https://urlscan.io/api/v1/search/?q=task.tags:phishing%20AND%20date:>now-7d&size=1000', {
      signal: AbortSignal.timeout(20000),
      headers: { 'User-Agent': 'NextGuard-ThreatIntel/6.0' },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    if (data.results) {
      for (const r of data.results) {
        try {
          const hostname = new URL(r.task?.url || r.page?.url || '').hostname.replace(/^www\./, '').toLowerCase();
          if (hostname && hostname.includes('.')) {
            indicators.push({ value: hostname, type: 'domain', description: 'URLScan.io phishing detection' });
          }
        } catch {}
      }
    }
  } catch {}
  if (indicators.length === 0) return 0;
  const { added, updated } = await ingestIndicators('urlscan', indicators);
  return added + updated;
}

// Verify cron or API key auth
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = request.nextUrl.searchParams.get('key');
  const adminKey = process.env.TI_ADMIN_KEY;
  if (adminKey && key === adminKey) return true;
  if (!cronSecret && !adminKey) return true;
  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const feedParam = request.nextUrl.searchParams.get('feed');
  const startTime = Date.now();
  const results: Record<string, any> = {};
  const feedFunctions: Record<string, () => Promise<number>> = {
    urlhaus: ingestUrlhaus,
    phishing_army: ingestPhishingArmy,
    openphish: ingestOpenPhish,
    phishtank: ingestPhishTank,
    phishstats: ingestPhishStats,
    threatfox: ingestThreatFox,
    feodo_tracker: ingestFeodoTracker,
    c2_intel: ingestC2Intel,
    ipsum: ingestIPsum,
    blocklist_de: ingestBlocklistDe,
    emerging_threats: ingestEmergingThreats,
    disposable_emails: ingestDisposableEmails,
    malware_bazaar: ingestMalwareBazaar,
    abuseipdb: ingestAbuseIPDB,
    urlscan: ingestURLScan,
  };
  const feedsToRun = feedParam ? [feedParam] : Object.keys(feedFunctions);
  // Run feeds in parallel (2 at a time to avoid timeout)
  for (let i = 0; i < feedsToRun.length; i += 2) {
    const chunk = feedsToRun.slice(i, i + 2);
    await Promise.all(chunk.map(async (feedId) => {
      const fn = feedFunctions[feedId];
      if (!fn) { results[feedId] = { count: 0, error: 'Unknown feed' }; return; }
      try {
        const count = await fn();
        results[feedId] = { count };
      } catch (e: any) {
        results[feedId] = { count: 0, error: e.message };
      }
    }));
  }
  const expired = await expireOldIndicators();
  return NextResponse.json({
    success: true,
    message: 'Feed ingestion complete',
    results,
    expired_indicators: expired,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
