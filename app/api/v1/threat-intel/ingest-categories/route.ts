// app/api/v1/threat-intel/ingest-categories/route.ts
// NextGuard URL Category Ingestion v1.0
// Ingests domain->category mappings from UT1 Toulouse blacklists (HTTP text files)
// Stores into Turso url_categories table for fast lookup
import { NextRequest, NextResponse } from 'next/server';
import { initDB, getDB } from '@/lib/db';

// UT1 Toulouse category feeds (plain text, one domain per line)
// Available via direct HTTP - no tar.gz parsing needed
const UT1_FEEDS: Record<string, string> = {
  'adult':         'https://dsi.ut-capitole.fr/blacklists/download/adult/domains',
  'gambling':      'https://dsi.ut-capitole.fr/blacklists/download/gambling/domains',
  'malware':       'https://dsi.ut-capitole.fr/blacklists/download/malware/domains',
  'phishing':      'https://dsi.ut-capitole.fr/blacklists/download/phishing/domains',
  'social_networks': 'https://dsi.ut-capitole.fr/blacklists/download/social_networks/domains',
  'forums':        'https://dsi.ut-capitole.fr/blacklists/download/forums/domains',
  'games':         'https://dsi.ut-capitole.fr/blacklists/download/games/domains',
  'dating':        'https://dsi.ut-capitole.fr/blacklists/download/dating/domains',
  'crypto':        'https://dsi.ut-capitole.fr/blacklists/download/crypto/domains',
  'weapons':       'https://dsi.ut-capitole.fr/blacklists/download/weapons/domains',
  'drugs':         'https://dsi.ut-capitole.fr/blacklists/download/drugs/domains',
  'hacking':       'https://dsi.ut-capitole.fr/blacklists/download/hacking/domains',
  'vpn':           'https://dsi.ut-capitole.fr/blacklists/download/vpn/domains',
  'streaming':     'https://dsi.ut-capitole.fr/blacklists/download/streaming/domains',
  'filehosting':   'https://dsi.ut-capitole.fr/blacklists/download/filehosting/domains',
  'shopping':      'https://dsi.ut-capitole.fr/blacklists/download/shopping/domains',
  'news':          'https://dsi.ut-capitole.fr/blacklists/download/news/domains',
  'sports':        'https://dsi.ut-capitole.fr/blacklists/download/sports/domains',
};

// Category name normalization
const CATEGORY_DISPLAY: Record<string, string> = {
  'adult': 'Adult Content',
  'gambling': 'Gambling',
  'malware': 'Malware',
  'phishing': 'Phishing',
  'social_networks': 'Social Media',
  'forums': 'Forum & Community',
  'games': 'Gaming',
  'dating': 'Dating',
  'crypto': 'Cryptocurrency',
  'weapons': 'Weapons',
  'drugs': 'Drugs',
  'hacking': 'Hacking',
  'vpn': 'VPN & Proxy',
  'streaming': 'Streaming Media',
  'filehosting': 'File Sharing',
  'shopping': 'Shopping & E-Commerce',
  'news': 'News & Media',
  'sports': 'Sports',
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

async function fetchDomainList(url: string): Promise<string[]> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(25000),
      headers: { 'User-Agent': 'NextGuard-CategoryIngest/1.0' },
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
  db: ReturnType<typeof getDB>,
  categoryKey: string,
  displayName: string,
  url: string,
  batchSize = 500
): Promise<{ added: number; errors: number }> {
  const domains = await fetchDomainList(url);
  if (domains.length === 0) return { added: 0, errors: 1 };

  let added = 0;
  let errors = 0;

  // Batch upserts for performance
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

  // Ensure DB and url_categories table exist
  try {
    await initDB();
  } catch (e: any) {
    return NextResponse.json({ error: 'DB init failed', detail: e.message }, { status: 500 });
  }

  const db = getDB();
  const results: Record<string, any> = {};

  // Determine which categories to run
  const feedsToRun = categoryParam
    ? { [categoryParam]: UT1_FEEDS[categoryParam] }
    : UT1_FEEDS;

  if (categoryParam && !UT1_FEEDS[categoryParam]) {
    return NextResponse.json({
      error: `Unknown category '${categoryParam}'. Available: ${Object.keys(UT1_FEEDS).join(', ')}`
    }, { status: 400 });
  }

  // Run feeds sequentially to avoid DB overload
  for (const [key, url] of Object.entries(feedsToRun)) {
    const displayName = CATEGORY_DISPLAY[key] || key;
    try {
      const result = await ingestCategoryFeed(db, key, displayName, url);
      results[key] = { category: displayName, domains: result.added, errors: result.errors };
    } catch (e: any) {
      results[key] = { category: displayName, domains: 0, error: e.message };
    }
  }

  const totalDomains = Object.values(results).reduce((sum: number, r: any) => sum + (r.domains || 0), 0);

  return NextResponse.json({
    success: true,
    message: 'URL category ingestion complete',
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
