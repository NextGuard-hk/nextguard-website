// app/api/v1/threat-intel/ingest-categories/route.ts
// NextGuard URL Category Ingestion v1.2
// Uses GitHub mirror of UT1 Toulouse blacklists (olbat/ut1-blacklists)
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const BASE = 'https://raw.githubusercontent.com/olbat/ut1-blacklists/master/blacklists';

const UT1_FEEDS: Record<string, string> = {
  'adult':           `${BASE}/adult/domains`,
  'gambling':        `${BASE}/gambling/domains`,
  'malware':         `${BASE}/malware/domains`,
  'phishing':        `${BASE}/phishing/domains`,
  'social_networks': `${BASE}/social_networks/domains`,
  'forums':          `${BASE}/forums/domains`,
  'games':           `${BASE}/games/domains`,
  'dating':          `${BASE}/dating/domains`,
  'bitcoin':         `${BASE}/bitcoin/domains`,
  'weapons':         `${BASE}/weapons/domains`,
  'drogue':          `${BASE}/drogue/domains`,
  'hacking':         `${BASE}/hacking/domains`,
  'vpn':             `${BASE}/vpn/domains`,
  'filehosting':     `${BASE}/filehosting/domains`,
  'shopping':        `${BASE}/shopping/domains`,
  'press':           `${BASE}/press/domains`,
  'sports':          `${BASE}/sports/domains`,
  'bank':            `${BASE}/bank/domains`,
  'crypto':          `${BASE}/cryptojacking/domains`,
  'warez':           `${BASE}/warez/domains`,
  'dynamic_dns':     `${BASE}/dynamic-dns/domains`,
  'shortener':       `${BASE}/shortener/domains`,
  'webmail':         `${BASE}/webmail/domains`,
};

const CATEGORY_DISPLAY: Record<string, string> = {
  'adult': 'Adult Content',
  'gambling': 'Gambling',
  'malware': 'Malware',
  'phishing': 'Phishing',
  'social_networks': 'Social Media',
  'forums': 'Forum & Community',
  'games': 'Gaming',
  'dating': 'Dating',
  'bitcoin': 'Cryptocurrency',
  'weapons': 'Weapons',
  'drogue': 'Drugs',
  'hacking': 'Hacking',
  'vpn': 'VPN & Proxy',
  'filehosting': 'File Sharing',
  'shopping': 'Shopping & E-Commerce',
  'press': 'News & Media',
  'sports': 'Sports',
  'bank': 'Finance & Banking',
  'crypto': 'Cryptocurrency',
  'warez': 'Piracy',
  'dynamic_dns': 'Dynamic DNS',
  'shortener': 'URL Shortener',
  'webmail': 'Email & Messaging',
};

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

async function fetchDomainList(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      headers: { 'User-Agent': 'NextGuard-CategoryIngest/1.2' },
    });
    if (!res.ok) return [];
    const text = await res.text();
    return text
      .split('\n')
      .map(l => l.trim().toLowerCase())
      .filter(l => l && !l.startsWith('#') && l.includes('.') && l.length > 3 && l.length < 255);
  } catch {
    return [];
  }
}

async function ingestCategoryFeed(
  categoryKey: string,
  displayName: string,
  url: string,
  batchSize = 200
): Promise<{ added: number; errors: number }> {
  const db = getDB();
  const domains = await fetchDomainList(url);
  if (domains.length === 0) return { added: 0, errors: 1 };

  let added = 0;
  let errors = 0;

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    try {
      await db.batch(
        batch.map(domain => ({
          sql: `INSERT INTO url_categories (domain, category, source, updated_at)
                VALUES (?, ?, 'ut1', datetime('now'))
                ON CONFLICT(domain, source) DO UPDATE SET
                  category = excluded.category,
                  updated_at = datetime('now')`,
          args: [domain, displayName],
        })),
        'write'
      );
      added += batch.length;
    } catch {
      errors++;
    }
  }
  return { added, errors };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const categoryParam = request.nextUrl.searchParams.get('category');

  // Ensure url_categories table exists (lightweight - single CREATE IF NOT EXISTS)
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
      const result = await ingestCategoryFeed(key, displayName, url);
      results[key] = { category: displayName, domains: result.added, errors: result.errors };
    } catch (e: any) {
      results[key] = { category: displayName, domains: 0, error: e.message };
    }
  }

  const totalDomains = Object.values(results).reduce((sum: number, r: any) => sum + (r.domains || 0), 0);

  return NextResponse.json({
    success: true,
    message: 'URL category ingestion complete',
    source: 'UT1 Toulouse via olbat/ut1-blacklists GitHub mirror',
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
