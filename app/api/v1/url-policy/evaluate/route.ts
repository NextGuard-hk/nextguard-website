import { NextRequest, NextResponse } from 'next/server';
import { categorizeUrl, URL_TAXONOMY } from '@/lib/url-categories';
import { getDB } from '@/lib/db'; import { classifyUrlWithAI, isAIClassificationAvailable } from '@/lib/ai-url-classifier';

const ACTION_PRIORITY: Record<string, number> = {
  'Block': 4, 'Warn': 3, 'Isolate': 2, 'Allow': 1,
};

const DEFAULT_POLICY: Record<string, string> = {
  'adult': 'Block', 'gambling': 'Block', 'malware': 'Block',
  'phishing': 'Block', 'botnet/c2': 'Block', 'suspicious': 'Warn',
  'spyware': 'Block', 'exploit/attack tools': 'Block',
  'scam/fraud': 'Block', 'proxy/anonymizer': 'Warn',
  'vpn services': 'Warn', 'cryptocurrency': 'Warn',
  'social networking': 'Warn', 'streaming video': 'Warn',
  'games': 'Warn', 'messaging': 'Warn', 'dynamic dns': 'Warn',
};

function getDefaultAction(cat: string): string {
  return DEFAULT_POLICY[cat.toLowerCase()] || 'Allow';
}

function getHighestAction(categories: string[]): string {
  if (!categories.length) return 'Allow';
  return categories.reduce((best, cat) => {
    const a = getDefaultAction(cat);
    return (ACTION_PRIORITY[a] || 0) > (ACTION_PRIORITY[best] || 0) ? a : best;
  }, 'Allow');
}

function normalizeDomain(input: string): string {
  let d = input.toLowerCase().trim();
  try {
    if (!d.startsWith('http')) d = 'https://' + d;
    d = new URL(d).hostname;
  } catch {}
  return d.replace(/^www\./, '');
}

async function queryDbCategory(domain: string): Promise<string | null> {
  try {
    const db = getDB();
    const r = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1', args: [domain] });
    if (r.rows.length > 0) return r.rows[0].category as string;
    const parts = domain.split('.');
    if (parts.length > 2) {
      const apex = parts.slice(-2).join('.');
      const r2 = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 1', args: [apex] });
      if (r2.rows.length > 0) return r2.rows[0].category as string;
    }
  } catch {}
  return null;
}

async function queryThreatIntel(domain: string): Promise<{isMalicious:boolean;riskLevel:string;threatType:string|null}> {
  try {
    const db = getDB();
    const r = await db.execute({
      sql: 'SELECT risk_level, categories FROM indicators WHERE value_normalized = ? AND is_active = 1 ORDER BY confidence DESC LIMIT 1',
      args: [domain],
    });
    if (r.rows.length > 0) {
      const risk = r.rows[0].risk_level as string;
      let cats: string[] = [];
      try { cats = JSON.parse((r.rows[0].categories as string) || '[]'); } catch {}
      return { isMalicious: ['known_malicious','high_risk'].includes(risk), riskLevel: risk, threatType: cats[0] || null };
    }
  } catch {}
  return { isMalicious: false, riskLevel: 'unknown', threatType: null };
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || '';
  if (!url) return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  try {
    const result = await evaluateUrl(url);
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (Array.isArray(body.urls)) {
      const results = await Promise.all(body.urls.slice(0, 50).map((u: string) => evaluateUrl(u)));
      return NextResponse.json({ results, count: results.length });
    }
    if (body.url) return NextResponse.json(await evaluateUrl(body.url));
    return NextResponse.json({ error: 'url or urls required' }, { status: 400 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function evaluateUrl(inputUrl: string) {
  const domain = normalizeDomain(inputUrl);
  const startTime = Date.now();

  // Layer 1: Static taxonomy
  const staticCategories = categorizeUrl(inputUrl);

  // Layer 2: DB category (graceful fallback)
  let dbCategory: string | null = null;
  try { dbCategory = await queryDbCategory(domain); } catch {}

  // Layer 3: Threat intel (graceful fallback)
  let threatIntel = { isMalicious: false, riskLevel: 'unknown', threatType: null as string | null };
  try { threatIntel = await queryThreatIntel(domain); } catch {}

  const allCategories = [...staticCategories];
  let categorySource = 'static-taxonomy';
  let confidence = staticCategories.length > 0 && staticCategories[0] !== 'Uncategorized' ? 80 : 40;

  if (dbCategory && !allCategories.includes(dbCategory)) {
    allCategories.push(dbCategory);
    categorySource = 'database';
    confidence = Math.min(confidence + 15, 95);
  }
  if (threatIntel.isMalicious) {
    const tc = threatIntel.threatType || 'Malware';
    if (!allCategories.includes(tc)) allCategories.push(tc);
    categorySource = 'threat-intel';
    confidence = 99;
  }

    // Layer 4: AI classification for uncategorized URLs
  let aiClassified = false;
  if (isAIClassificationAvailable() && (allCategories.length === 0 || (allCategories.length === 1 && allCategories[0] === 'Uncategorized'))) {
    try {
      const aiResult = await classifyUrlWithAI(domain);
      if (aiResult.primaryCategory && aiResult.primaryCategory !== 'Uncategorized' && aiResult.confidence >= 50) {
        allCategories.push(aiResult.primaryCategory);
        categorySource = 'ai-gemini';
        confidence = aiResult.confidence;
        aiClassified = true;
      }
    } catch {}
  }
  let action = getHighestAction(allCategories);
  if (threatIntel.isMalicious) action = 'Block';

  const taxonomyEntries = Object.values(URL_TAXONOMY) as Array<{slug:string;name:string;group:string;defaultAction:string}>;
  const te = taxonomyEntries.find(t =>
    staticCategories.some(c => c.toLowerCase() === t.name.toLowerCase() || c.toLowerCase() === t.slug.toLowerCase())
  );

  return {
    url: inputUrl, domain, action, confidence, categorySource,
    categories: allCategories,
    primaryCategory: allCategories[0] || 'Uncategorized',
    group: te?.group || null,
    defaultAction: te?.defaultAction || null,
    threatIntel,
    dbCategoryMatch: dbCategory,
    evalMs: Date.now() - startTime,
        aiClassified,
    timestamp: new Date().toISOString(),
  };
}
