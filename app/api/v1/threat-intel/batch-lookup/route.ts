// app/api/v1/threat-intel/batch-lookup/route.ts
// Batch IOC Lookup API - Process up to 100 indicators in parallel
import { NextRequest, NextResponse } from 'next/server';
import { lookupIndicator } from '@/lib/threat-intel-db';
import { checkUrl } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';
import { initDB, getDB } from '@/lib/db';
import { getCategoriesFromRadar } from '@/lib/cloudflare-radar';

const MAX_BATCH = 100;
let dbReady = false;

function riskToVerdict(r: string): string {
  switch (r) {
    case 'critical': case 'high': case 'known_malicious': return 'malicious';
    case 'medium': case 'high_risk': case 'medium_risk': return 'suspicious';
    default: return 'clean';
  }
}

function riskToScore(r: string): number {
  switch (r) {
    case 'known_malicious': return 95;
    case 'high_risk': return 80;
    case 'medium_risk': return 60;
    case 'low_risk': return 30;
    case 'clean': return 5;
    default: return 0;
  }
}

async function lookupUrlCat(domain: string): Promise<string[]> {
  try {
    const db = getDB();
    let d = domain.replace(/^www\./, '');
    const r = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 5', args: [d] });
    if (r.rows.length > 0) return [...new Set(r.rows.map(row => row.category as string))];
    const parts = d.split('.');
    if (parts.length > 2) {
      const parent = parts.slice(-2).join('.');
      const pr = await db.execute({ sql: 'SELECT category FROM url_categories WHERE domain = ? LIMIT 5', args: [parent] });
      if (pr.rows.length > 0) return [...new Set(pr.rows.map(row => row.category as string))];
    }
    return [];
  } catch { return []; }
}

// Resolve categories: manual override > Cloudflare Radar > live > heuristic
async function resolveCategories(domain: string, liveCats: string[]): Promise<{ categories: string[]; category_source: string }> {
  const dbCats = await lookupUrlCat(domain);
  if (dbCats.length > 0) return { categories: dbCats, category_source: 'manual-override' };

  try {
    const radarCats = await getCategoriesFromRadar(domain);
    if (radarCats.length > 0 && radarCats[0] !== 'Uncategorized') {
      return { categories: radarCats, category_source: 'cloudflare-radar' };
    }
  } catch {}

  if (liveCats.length > 0) return { categories: liveCats, category_source: 'live-osint' };

  return { categories: categorizeUrl(domain), category_source: 'heuristic' };
}

async function lookupSingle(indicator: string, mode: string) {
  const start = Date.now();
  const trimmed = indicator.trim().toLowerCase();

  if (mode === 'db' || mode === 'hybrid') {
    try {
      const dbResult = await lookupIndicator(trimmed);
      if (dbResult.hits.length > 0) {
        const top = dbResult.hits[0];
        const allCats = [...new Set(dbResult.hits.flatMap(h => h.categories))];
        const { categories: cats, category_source } = await resolveCategories(trimmed, allCats);
        return {
          indicator: trimmed, verdict: riskToVerdict(top.risk_level),
          risk_level: top.risk_level, risk_score: riskToScore(top.risk_level),
          confidence: top.confidence, categories: cats,
          sources_hit: dbResult.hits.map(h => h.feed),
          engine: 'turso-db-v5.4', lookup_ms: Date.now() - start,
          category_source,
        };
      }
    } catch {}
  }

  if (mode === 'db') {
    const { categories: cats, category_source } = await resolveCategories(trimmed, []);
    return {
      indicator: trimmed, verdict: 'clean', risk_level: 'clean',
      risk_score: 0, confidence: 0, categories: cats,
      sources_hit: [], engine: 'turso-db-v5.4-miss',
      lookup_ms: Date.now() - start, category_source,
    };
  }

  try {
    const result = await checkUrl(trimmed);
    const liveCats = result.categories.length > 0 ? result.categories : [];
    const { categories: cats, category_source } = await resolveCategories(trimmed, liveCats);
    return {
      indicator: trimmed, verdict: riskToVerdict(result.risk_level),
      risk_level: result.risk_level, risk_score: riskToScore(result.risk_level),
      confidence: result.overall_score, categories: cats,
      sources_hit: result.sources.filter(s => s.hit).map(s => s.name),
      engine: 'osint-live-v4.9', lookup_ms: Date.now() - start,
      category_source,
    };
  } catch {
    return {
      indicator: trimmed, verdict: 'error', risk_level: 'unknown',
      risk_score: 0, confidence: 0, categories: categorizeUrl(trimmed),
      sources_hit: [], engine: 'error', lookup_ms: Date.now() - start,
      category_source: 'heuristic',
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    if (!dbReady) { try { await initDB(); dbReady = true; } catch {} }

    const body = await request.json();
    const indicators: string[] = body.indicators || [];
    const mode = body.mode || 'hybrid';

    if (!Array.isArray(indicators) || indicators.length === 0) {
      return NextResponse.json({ error: 'indicators array required' }, { status: 400 });
    }
    if (indicators.length > MAX_BATCH) {
      return NextResponse.json({ error: `Maximum ${MAX_BATCH} indicators per batch` }, { status: 400 });
    }

    const unique = [...new Set(indicators.map(i => i.trim().toLowerCase()).filter(Boolean))];

    // Process in parallel batches of 10
    const results: any[] = [];
    const PARALLEL = 10;
    for (let i = 0; i < unique.length; i += PARALLEL) {
      const batch = unique.slice(i, i + PARALLEL);
      const batchResults = await Promise.allSettled(
        batch.map(ind => lookupSingle(ind, mode))
      );
      for (const r of batchResults) {
        if (r.status === 'fulfilled') results.push(r.value);
        else results.push({ indicator: batch[results.length - i] || 'unknown', verdict: 'error', error: 'lookup_failed' });
      }
    }

    const malicious = results.filter(r => r.verdict === 'malicious').length;
    const suspicious = results.filter(r => r.verdict === 'suspicious').length;
    const clean = results.filter(r => r.verdict === 'clean').length;

    return NextResponse.json({
      success: true,
      total: results.length,
      summary: { malicious, suspicious, clean, error: results.filter(r => r.verdict === 'error').length },
      results,
      mode,
      total_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    endpoint: '/api/v1/threat-intel/batch-lookup',
    method: 'POST',
    description: 'Batch IOC lookup - process up to 100 indicators in one request',
    body: {
      indicators: ['example.com', '8.8.8.8', 'malware-domain.xyz'],
      mode: 'hybrid | db | live'
    },
    example_curl: "curl -X POST -H 'Content-Type: application/json' -d '{\"indicators\":[\"example.com\",\"urlyte.com\"],\"mode\":\"db\"}' https://www.next-guard.com/api/v1/threat-intel/batch-lookup",
  });
}
