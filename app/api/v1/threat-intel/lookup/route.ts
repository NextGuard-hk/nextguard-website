import { NextResponse } from 'next/server';
import { checkUrl, getFeedStatus } from '@/lib/threat-intel';
import { categorizeUrl } from '@/lib/url-categories';

export async function GET(request: Request) {
  try {
    const startTime = Date.now();
    const { searchParams } = new URL(request.url);
    const indicator = searchParams.get('indicator');
    const type = searchParams.get('type');

    if (!indicator) {
      return NextResponse.json({ error: 'indicator parameter required' }, { status: 400 });
    }

    // Use live OSINT feed engine (threat-intel.ts v4.3)
    const result = await checkUrl(indicator.trim());
    const lookupMs = Date.now() - startTime;

    // Build response compatible with dashboard expectations
    const verdict = result.risk_level === 'known_malicious' ? 'malicious'
      : result.risk_level === 'high_risk' ? 'suspicious'
      : result.risk_level === 'medium_risk' ? 'suspicious'
      : 'clean';

    const sourcesHit = result.sources.filter(s => s.hit).map(s => s.name);
    const categories = result.categories.length > 0 ? result.categories : categorizeUrl(result.domain);

    return NextResponse.json({
      indicator: indicator.trim(),
      type: type || 'url',
      verdict,
      risk_level: result.risk_level,
      confidence: result.overall_score,
      categories,
      sources_hit: sourcesHit,
      sources_checked: result.sources.length,
      flags: result.flags,
      lookup_ms: lookupMs,
      checked_at: result.checked_at,
      engine: 'osint-live-v4.7',
      // Full source details for dashboard
      source_details: result.sources,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
