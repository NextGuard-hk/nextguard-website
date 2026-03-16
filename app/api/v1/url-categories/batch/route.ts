import { NextRequest, NextResponse } from 'next/server';
import { categorizeUrl } from '@/lib/url-categories';
import { getDB, initDB } from '@/lib/db';

// Batch URL Categorization API - Tier 1 Feature
// Supports: bulk categorization up to 1000 URLs per request
// Endpoint: /api/v1/url-categories/batch

function normalizeDomain(input: string): string {
  let d = input.toLowerCase().trim();
  try {
    if (!d.startsWith('http')) d = 'https://' + d;
    d = new URL(d).hostname;
  } catch {}
  return d.replace(/^www\./, '');
}

async function queryDbCategory(db: ReturnType<typeof getDB>, domain: string): Promise<string | null> {
  try {
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

async function queryThreatIntel(db: ReturnType<typeof getDB>, domain: string) {
  try {
    const r = await db.execute({
      sql: 'SELECT risk_level, categories FROM indicators WHERE value_normalized = ? AND is_active = 1 ORDER BY confidence DESC LIMIT 1',
      args: [domain],
    });
    if (r.rows.length > 0) {
      const risk = r.rows[0].risk_level as string;
      let cats: string[] = [];
      try { cats = JSON.parse((r.rows[0].categories as string) || '[]'); } catch {}
      return { isMalicious: ['known_malicious', 'high_risk'].includes(risk), riskLevel: risk, threatType: cats[0] || null };
    }
  } catch {}
  return { isMalicious: false, riskLevel: 'unknown', threatType: null as string | null };
}

export async function POST(request: NextRequest) {
  try {
    await initDB();
    const db = getDB();
    const body = await request.json();
    const urls: string[] = body.urls;

    if (!Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
    }

    const maxUrls = Math.min(urls.length, 1000);
    const startTime = Date.now();
    const includeThreats = body.include_threats !== false;
    const includeDb = body.include_db !== false;

    const results = await Promise.all(
      urls.slice(0, maxUrls).map(async (url) => {
        const domain = normalizeDomain(url);
        const staticCats = categorizeUrl(url);
        let dbCategory: string | null = null;
        let threatIntel = { isMalicious: false, riskLevel: 'unknown', threatType: null as string | null };

        if (includeDb) {
          try { dbCategory = await queryDbCategory(db, domain); } catch {}
        }
        if (includeThreats) {
          try { threatIntel = await queryThreatIntel(db, domain); } catch {}
        }

        const allCategories = [...staticCats];
        let source = 'static';
        if (dbCategory && !allCategories.includes(dbCategory)) {
          allCategories.push(dbCategory);
          source = 'database';
        }
        if (threatIntel.isMalicious) {
          const tc = threatIntel.threatType || 'Malware';
          if (!allCategories.includes(tc)) allCategories.push(tc);
          source = 'threat-intel';
        }

        return {
          url,
          domain,
          categories: allCategories,
          primaryCategory: allCategories[0] || 'Uncategorized',
          source,
          isMalicious: threatIntel.isMalicious,
          riskLevel: threatIntel.riskLevel,
        };
      })
    );

    // Summary statistics
    const categoryCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = { Block: 0, Warn: 0, Allow: 0 };
    let maliciousCount = 0;
    let uncategorizedCount = 0;

    for (const r of results) {
      for (const cat of r.categories) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
      if (r.isMalicious) maliciousCount++;
      if (r.categories.length === 0 || r.primaryCategory === 'Uncategorized') uncategorizedCount++;
    }

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        malicious: maliciousCount,
        uncategorized: uncategorizedCount,
        categoryCounts,
        processingMs: Date.now() - startTime,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
