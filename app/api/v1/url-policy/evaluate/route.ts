import { NextRequest, NextResponse } from 'next/server';
import { categorizeUrl, URL_TAXONOMY } from '@/lib/url-categories';
import { getDB } from '@/lib/db';

const ACTION_PRIORITY: Record<string, number> = {
  'Block': 4,
  'Warn': 3,
  'Isolate': 2,
  'Allow': 1,
};

// Default policy rules per category
const DEFAULT_POLICY: Record<string, string> = {
  'adult': 'Block',
  'gambling': 'Block',
  'malware': 'Block',
  'phishing': 'Block',
  'command-and-control': 'Block',
  'botnets': 'Block',
  'spyware': 'Block',
  'hacking': 'Block',
  'drugs': 'Block',
  'weapons': 'Block',
  'violence': 'Block',
  'hate-speech': 'Block',
  'terrorism': 'Block',
  'child-abuse': 'Block',
  'warez': 'Block',
  'peer-to-peer': 'Warn',
  'torrent': 'Warn',
  'anonymous-proxy': 'Warn',
  'vpn': 'Warn',
  'cryptocurrency': 'Warn',
  'social-networking': 'Warn',
  'instant-messaging': 'Warn',
  'video-streaming': 'Warn',
  'online-gaming': 'Warn',
};

function getDefaultAction(catSlug: string): string {
  const slug = catSlug.toLowerCase();
  return DEFAULT_POLICY[slug] || 'Allow';
}

function getHighestAction(categories: string[]): string {
  if (categories.length === 0) return 'Allow';
  return categories.reduce((best, cat) => {
    const action = getDefaultAction(cat);
    return (ACTION_PRIORITY[action] || 0) > (ACTION_PRIORITY[best] || 0) ? action : best;
  }, 'Allow');
}

function normalizeDomain(input: string): string {
  let domain = input.toLowerCase().trim();
  try {
    if (!domain.startsWith('http')) domain = 'https://' + domain;
    const u = new URL(domain);
    domain = u.hostname;
  } catch {}
  return domain.replace(/^www\./, '');
}

// Query Turso url_categories table for DB-backed categorization
async function queryDbCategory(domain: string): Promise<string | null> {
  try {
    const db = getDB();
    const result = await db.execute({
      sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1',
      args: [domain],
    });
    if (result.rows.length > 0) {
      return result.rows[0].category as string;
    }
    // Try subdomain stripping
    const parts = domain.split('.');
    if (parts.length > 2) {
      const apex = parts.slice(-2).join('.');
      const apexResult = await db.execute({
        sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1',
        args: [apex],
      });
      if (apexResult.rows.length > 0) {
        return apexResult.rows[0].category as string;
      }
    }
  } catch (e) {
    console.error('DB category query failed:', e);
  }
  return null;
}

// Check threat intel DB for known malicious indicators
async function queryThreatIntel(domain: string): Promise<{ isMalicious: boolean; riskLevel: string; threatType: string | null }> {
  try {
    const db = getDB();
    const result = await db.execute({
      sql: `SELECT risk_level, categories FROM indicators WHERE value_normalized = ? AND is_active = 1 ORDER BY confidence DESC LIMIT 1`,
      args: [domain],
    });
    if (result.rows.length > 0) {
      const risk = result.rows[0].risk_level as string;
      const cats = JSON.parse((result.rows[0].categories as string) || '[]');
      const isMalicious = ['known_malicious', 'high_risk'].includes(risk);
      return { isMalicious, riskLevel: risk, threatType: cats[0] || null };
    }
  } catch (e) {
    console.error('Threat intel query failed:', e);
  }
  return { isMalicious: false, riskLevel: 'unknown', threatType: null };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || '';
  if (!url) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }
  const result = await evaluateUrl(url);
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Support batch evaluation
    if (Array.isArray(body.urls)) {
      const results = await Promise.all(
        body.urls.slice(0, 50).map((u: string) => evaluateUrl(u))
      );
      return NextResponse.json({ results, count: results.length });
    }
    if (body.url) {
      const result = await evaluateUrl(body.url);
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: 'url or urls required' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}

async function evaluateUrl(inputUrl: string) {
  const domain = normalizeDomain(inputUrl);
  const startTime = Date.now();

  // Layer 1: Static taxonomy (fastest)
  const staticResult = categorizeUrl(inputUrl);
  const staticCategories = staticResult.categories;

  // Layer 2: DB-backed category (UT1/Shallalist)
  const dbCategory = await queryDbCategory(domain);

  // Layer 3: Threat intelligence check
  const threatIntel = await queryThreatIntel(domain);

  // Build final category list
  const allCategories = [...staticCategories];
  let categorySource = 'static-taxonomy';
  let confidence = staticCategories.length > 0 ? 80 : 40;

  if (dbCategory && !allCategories.includes(dbCategory)) {
    allCategories.push(dbCategory);
    categorySource = 'database';
    confidence = Math.min(confidence + 15, 95);
  }

  if (threatIntel.isMalicious) {
    const threatCat = threatIntel.threatType || 'malware';
    if (!allCategories.includes(threatCat)) allCategories.push(threatCat);
    categorySource = 'threat-intel';
    confidence = 99;
  }

  // Determine action
  let action = getHighestAction(allCategories.map(c => c.toLowerCase().replace(/\s+/g, '-')));

  // Override: threat intel always blocks
  if (threatIntel.isMalicious) action = 'Block';

  // Build taxonomy info
  const taxonomyEntry = URL_TAXONOMY.find(t =>
    staticCategories.some(c => c.toLowerCase() === t.name.toLowerCase() || c.toLowerCase() === t.slug.toLowerCase())
  );

  const evalMs = Date.now() - startTime;

  return {
    url: inputUrl,
    domain,
    action,
    confidence,
    categorySource,
    categories: allCategories,
    primaryCategory: allCategories[0] || 'Uncategorized',
    class: taxonomyEntry?.class || staticResult.class || null,
    superCategory: taxonomyEntry?.superCategory || staticResult.superCategory || null,
    threatIntel: {
      isMalicious: threatIntel.isMalicious,
      riskLevel: threatIntel.riskLevel,
      threatType: threatIntel.threatType,
    },
    dbCategoryMatch: dbCategory,
    evalMs,
    timestamp: new Date().toISOString(),
  };
}
