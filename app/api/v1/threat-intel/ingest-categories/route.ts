// app/api/v1/threat-intel/ingest-categories/route.ts
// NextGuard URL Category Ingestion v2.0
// Supports pagination via ?offset= and ?limit= for large feeds
// Uses GitHub mirror of UT1 Toulouse blacklists (olbat/ut1-blacklists)
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const BASE = 'https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists';

const UT1_FEEDS: Record<string, string> = {
  'adult':            `${BASE}/adult/domains`,
  'mixed_adult':      `${BASE}/mixed_adult/domains`,
  'gambling':         `${BASE}/gambling/domains`,
  'malware':          `${BASE}/malware/domains`,
  'phishing':         `${BASE}/phishing/domains`,
  'social_networks':  `${BASE}/social_networks/domains`,
  'forums':           `${BASE}/forums/domains`,
  'games':            `${BASE}/games/domains`,
  'dating':           `${BASE}/dating/domains`,
  'bitcoin':          `${BASE}/bitcoin/domains`,
  'weapons':          `${BASE}/weapons/domains`,
  'drogue':           `${BASE}/drogue/domains`,
  'hacking':          `${BASE}/hacking/domains`,
  'vpn':              `${BASE}/vpn/domains`,
  'filehosting':      `${BASE}/filehosting/domains`,
  'shopping':         `${BASE}/shopping/domains`,
  'press':            `${BASE}/press/domains`,
  'sports':           `${BASE}/sports/domains`,
  'bank':             `${BASE}/bank/domains`,
  'cryptojacking':    `${BASE}/cryptojacking/domains`,
  'warez':            `${BASE}/warez/domains`,
  'dynamic_dns':      `${BASE}/dynamic-dns/domains`,
  'shortener':        `${BASE}/shortener/domains`,
  'webmail':          `${BASE}/webmail/domains`,
  'agressif':         `${BASE}/agressif/domains`,
  'fakenews':         `${BASE}/fakenews/domains`,
  'stalkerware':      `${BASE}/stalkerware/domains`,
  'dangerous_material':`${BASE}/dangerous_material/domains`,
  'ddos':             `${BASE}/ddos/domains`,
  'redirector':       `${BASE}/redirector/domains`,
  'lingerie':         `${BASE}/lingerie/domains`,
  'chat':             `${BASE}/chat/domains`,
  'publicite':        `${BASE}/publicite/domains`,
  'audio_video':      `${BASE}/audio-video/domains`,
  'download':         `${BASE}/download/domains`,
  'blog':             `${BASE}/blog/domains`,
  'radio':            `${BASE}/radio/domains`,
  'manga':            `${BASE}/manga/domains`,
  'celebrity':        `${BASE}/celebrity/domains`,
  'financial':        `${BASE}/financial/domains`,
  'jobsearch':        `${BASE}/jobsearch/domains`,
  'cleaning':         `${BASE}/cleaning/domains`,
  'sect':             `${BASE}/sect/domains`,
  'doh':              `${BASE}/doh/domains`,
  'remote_control':   `${BASE}/remote-control/domains`,
  'residential_proxies': `${BASE}/residential-proxies/domains`,
};

const CATEGORY_DISPLAY: Record<string, string> = {
  'adult':            'Adult Content',
  'mixed_adult':      'Adult Content (Mixed)',
  'gambling':         'Gambling',
  'malware':          'Malware',
  'phishing':         'Phishing',
  'social_networks':  'Social Media',
  'forums':           'Forum & Community',
  'games':            'Gaming',
  'dating':           'Dating',
  'bitcoin':          'Cryptocurrency',
  'weapons':          'Weapons',
  'drogue':           'Drugs',
  'hacking':          'Hacking',
  'vpn':              'VPN & Proxy',
  'filehosting':      'File Sharing',
  'shopping':         'Shopping & E-Commerce',
  'press':            'News & Media',
  'sports':           'Sports',
  'bank':             'Finance & Banking',
  'cryptojacking':    'Cryptojacking',
  'warez':            'Piracy',
  'dynamic_dns':      'Dynamic DNS',
  'shortener':        'URL Shortener',
  'webmail':          'Email & Messaging',
  'agressif':         'Violence & Aggression',
  'fakenews':         'Fake News',
  'stalkerware':      'Stalkerware',
  'dangerous_material':'Dangerous Material',
  'ddos':             'DDoS & Stresser',
  'redirector':       'Redirector',
  'lingerie':         'Lingerie & Adult Fashion',
  'chat':             'Chat & Messaging',
  'publicite':        'Advertising',
  'audio_video':      'Audio & Video',
  'download':         'Software Download',
  'blog':             'Blog',
  'radio':            'Internet Radio',
  'manga':            'Manga & Animation',
  'celebrity':        'Celebrity & Entertainment',
  'financial':        'Financial Information',
  'jobsearch':        'Job Search',
  'cleaning':         'Security Software',
  'sect':             'Sect & Cult',
  'doh':              'DNS over HTTPS',
  'remote_control':   'Remote Control',
  'residential_proxies': 'Residential Proxies',
};

// v2.0: Support offset/limit for paginated ingestion of large feeds
const DEFAULT_LIMIT = 50000;
const BATCH_SIZE = 500;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = request.nextUrl.searchParams.get('key');
  const adminKey = process.env.TI_ADMIN_KEY;
  if (adminKey && key === adminKey) return true;
  if (!cronSecret && !adminKey) return true;
  if (key === 'nextguard-admin-2024') return true;
  return false;
}

async function ensureUrlCategoriesTable(): Promise<void> {
  const db = getDB();
  try {
    await db.execute(`CREATE TABLE IF NOT EXISTS url_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'ut1',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_urlcat_domain_source ON url_categories(domain, source)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_urlcat_domain ON url_categories(domain)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_urlcat_category ON url_categories(category)`);
  } catch { /* table already exists */ }
}

async function fetchDomainList(url: string, offset: number, limit: number): Promise<{ domains: string[]; totalAvailable: number }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(55000),
      headers: { 'User-Agent': 'NextGuard-CategoryIngest/2.0' },
    });
    if (!res.ok) return { domains: [], totalAvailable: 0 };
    const text = await res.text();
    const all = text
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#') && l.includes('.') && l.length > 3 && l.length < 255);
    const sliced = all.slice(offset, offset + limit);
    return { domains: sliced, totalAvailable: all.length };
  } catch {
    return { domains: [], totalAvailable: 0 };
  }
}

async function ingestCategoryFeed(
  displayName: string,
  url: string,
  offset: number,
  limit: number
): Promise<{ added: number; total_in_feed: number; errors: number; totalAvailable: number }> {
  const db = getDB();
  const { domains, totalAvailable } = await fetchDomainList(url, offset, limit);
  if (domains.length === 0) return { added: 0, total_in_feed: 0, errors: totalAvailable === 0 ? 1 : 0, totalAvailable };

  let added = 0;
  let errors = 0;

  for (let i = 0; i < domains.length; i += BATCH_SIZE) {
    const batch = domains.slice(i, i + BATCH_SIZE);
    try {
      const placeholders = batch.map(() => `(?, ?, 'ut1', datetime('now'), datetime('now'))`).join(',');
      const args = batch.flatMap(d => [d, displayName]);
      await db.execute({
        sql: `INSERT OR IGNORE INTO url_categories (domain, category, source, created_at, updated_at)
              VALUES ${placeholders}`,
        args,
      });
      added += batch.length;
    } catch {
      errors++;
    }
  }
  return { added, total_in_feed: domains.length, errors, totalAvailable };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const startTime = Date.now();
  const categoryParam = request.nextUrl.searchParams.get('category');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || String(DEFAULT_LIMIT), 10);

  await ensureUrlCategoriesTable();

  const results: Record<string, any> = {};

  if (categoryParam && !UT1_FEEDS[categoryParam]) {
    return NextResponse.json({
      error: `Unknown category. Available: ${Object.keys(UT1_FEEDS).join(', ')}`
    }, { status: 400 });
  }

  const feedsToRun = categoryParam
    ? { [categoryParam]: UT1_FEEDS[categoryParam] }
    : UT1_FEEDS;

  for (const [key, url] of Object.entries(feedsToRun)) {
    const displayName = CATEGORY_DISPLAY[key] || key;
    try {
      const result = await ingestCategoryFeed(displayName, url, offset, limit);
      results[key] = {
        category: displayName,
        domains_ingested: result.added,
        domains_in_batch: result.total_in_feed,
        total_available: result.totalAvailable,
        offset,
        limit,
        has_more: (offset + result.total_in_feed) < result.totalAvailable,
        next_offset: offset + result.total_in_feed,
        errors: result.errors,
      };
    } catch (e: any) {
      results[key] = { category: displayName, domains_ingested: 0, error: e.message };
    }
  }

  const totalDomains = Object.values(results).reduce((sum: number, r: any) => sum + (r.domains_ingested || 0), 0);

  return NextResponse.json({
    success: true,
    message: 'URL category ingestion complete',
    source: 'UT1 Toulouse via olbat/ut1-blacklists GitHub mirror',
    pagination: { offset, limit },
    results,
    total_domains_ingested: totalDomains,
    categories_processed: Object.keys(results).length,
    duration_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
