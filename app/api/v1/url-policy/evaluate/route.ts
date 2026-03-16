import { NextRequest, NextResponse } from 'next/server';
import { categorizeUrl, URL_TAXONOMY } from '@/lib/url-categories';
import { checkUrl } from '@/lib/threat-intel';

const ACTION_PRIORITY: Record<string, number> = { Block: 3, Alert: 2, Allow: 1 };

function getDefaultAction(catName: string): string {
  const entry = Object.values(URL_TAXONOMY).find(
    c => c.name.toLowerCase() === catName.toLowerCase()
      || c.slug.toLowerCase() === catName.toLowerCase().replace(/[_\s]/g, '-')
  );
  return entry?.defaultAction || 'Allow';
}

function getHighestAction(categories: string[]): string {
  if (categories.length === 0) return 'Allow';
  return categories.reduce((best, cat) => {
    const action = getDefaultAction(cat);
    return (ACTION_PRIORITY[action] || 0) > (ACTION_PRIORITY[best] || 0) ? action : best;
  }, 'Allow');
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawUrl = searchParams.get('url') || searchParams.get('domain') || '';
  if (!rawUrl) {
    return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
  }

  // Normalize domain
  let domain = rawUrl.toLowerCase();
  if (domain.startsWith('http')) {
    try { domain = new URL(domain).hostname; } catch {}
  }
  domain = domain.replace(/^www\./, '');

  try {
    // 1. Local taxonomy classification
    const localCategories = categorizeUrl(domain);

    // 2. Threat intel lookup for verdict + API categories
    let verdict = 'unknown';
    let threatScore = 0;
    let riskLevel = 'unknown';
    let apiCategories: string[] = [];
    let scoreBreakdown = null;

    try {
      const intel = await checkUrl(domain);
      if (intel) {
        verdict = intel.verdict || 'unknown';
        threatScore = intel.threat_score || 0;
        riskLevel = intel.risk_level || 'unknown';
        apiCategories = intel.categories || [];
        scoreBreakdown = intel.score_breakdown || null;
      }
    } catch {
      // Threat intel unavailable - use local only
    }

    const finalCategories = apiCategories.length > 0 ? apiCategories : localCategories;
    const defaultAction = getHighestAction(finalCategories);

    // 3. Category details
    const categoryDetails = finalCategories.map(cat => {
      const entry = Object.entries(URL_TAXONOMY).find(
        ([, c]) => c.name.toLowerCase() === cat.toLowerCase()
          || c.slug.toLowerCase() === cat.toLowerCase().replace(/[_\s]/g, '-')
      );
      return entry ? {
        id: Number(entry[0]),
        name: entry[1].name,
        slug: entry[1].slug,
        group: entry[1].group,
        defaultAction: entry[1].defaultAction,
        priority: entry[1].priority,
      } : { id: -1, name: cat, slug: cat, group: 'Unknown', defaultAction: 'Allow', priority: 5 };
    });

    return NextResponse.json({
      domain,
      url: rawUrl,
      categories: finalCategories,
      category_details: categoryDetails,
      category_source: apiCategories.length > 0 ? 'api' : 'local-taxonomy',
      default_action: defaultAction,
      verdict,
      threat_score: threatScore,
      risk_level: riskLevel,
      score_breakdown: scoreBreakdown,
      taxonomy_version: '5.0',
      evaluated_at: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({
      domain,
      url: rawUrl,
      categories: categorizeUrl(domain),
      category_source: 'local-taxonomy-fallback',
      default_action: getHighestAction(categorizeUrl(domain)),
      verdict: 'unknown',
      threat_score: 0,
      error: 'Partial evaluation - threat intel unavailable',
      evaluated_at: new Date().toISOString(),
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const urls: string[] = body.urls || body.domains || [];
    if (!urls.length) {
      return NextResponse.json({ error: 'urls array required' }, { status: 400 });
    }
    const results = await Promise.allSettled(
      urls.slice(0, 50).map(async (url) => {
        let domain = url.toLowerCase();
        if (domain.startsWith('http')) { try { domain = new URL(domain).hostname; } catch {} }
        domain = domain.replace(/^www\./, '');
        const cats = categorizeUrl(domain);
        return { url, domain, categories: cats, default_action: getHighestAction(cats) };
      })
    );
    const evaluated = results.map((r, i) =>
      r.status === 'fulfilled' ? r.value : { url: urls[i], categories: [], default_action: 'Allow', error: 'failed' }
    );
    return NextResponse.json({ results: evaluated, count: evaluated.length });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
