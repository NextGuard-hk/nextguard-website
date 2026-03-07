// app/api/v1/lookup/route.ts
// NextGuard Phase 3 — GET+POST /api/v1/lookup
// High-performance IOC lookup with multi-source hits, verdict, and context

import { NextResponse } from 'next/server';
import {
  requireAuth,
  checkRateLimit,
  withCors,
  corsOptions,
  normalizeLookupValue,
  getDB,
} from '@/lib/threat-intel-api';

export async function OPTIONS() {
  return corsOptions();
}

// Shared lookup logic
async function performLookup(value: string, requestIp: string) {
  const db = getDB();
  const startMs = Date.now();

  const variants = normalizeLookupValue(value);
  const placeholders = variants.map(() => '?').join(',');

  // Query active indicators
  const result = await db.execute({
    sql: `SELECT
      id, type, value, risk_level, confidence, tlp,
      categories, source_feed, first_seen, last_seen,
      valid_from, valid_until, threat_actor, campaign,
      kill_chain_phase, hit_count, description
    FROM indicators
    WHERE value_normalized IN (${placeholders})
      AND is_active = 1
    ORDER BY confidence DESC`,
    args: variants,
  });

  const hits = result.rows.map(r => ({
    id: r.id as string,
    type: r.type as string,
    value: r.value as string,
    risk_level: r.risk_level as string,
    confidence: r.confidence as number,
    tlp: r.tlp as string,
    categories: JSON.parse((r.categories as string) || '[]') as string[],
    source_feed: r.source_feed as string,
    first_seen: r.first_seen as string,
    last_seen: r.last_seen as string,
    valid_from: r.valid_from as string,
    valid_until: r.valid_until as string | null,
    threat_actor: r.threat_actor as string | null,
    campaign: r.campaign as string | null,
    kill_chain_phase: r.kill_chain_phase as string | null,
    hit_count: r.hit_count as number,
    description: r.description as string | null,
  }));

  // Determine overall verdict
  let verdict: 'malicious' | 'suspicious' | 'clean' | 'unknown' = 'unknown';
  let maxConfidence = 0;

  if (hits.length === 0) {
    verdict = 'unknown';
  } else {
    const riskPriority: Record<string, number> = {
      known_malicious: 100,
      high_risk: 80,
      medium_risk: 50,
      low_risk: 20,
      clean: 0,
      unknown: -1,
    };
    const topHit = hits.reduce((best, h) =>
      (riskPriority[h.risk_level] ?? -1) > (riskPriority[best.risk_level] ?? -1) ? h : best
    );
    maxConfidence = topHit.confidence;

    if (topHit.risk_level === 'known_malicious') verdict = 'malicious';
    else if (topHit.risk_level === 'high_risk' || topHit.risk_level === 'medium_risk') verdict = 'suspicious';
    else if (topHit.risk_level === 'clean') verdict = 'clean';
    else verdict = 'unknown';
  }

  // Get total active feeds checked
  const feedCount = await db.execute(
    `SELECT COUNT(*) as cnt FROM feeds WHERE enabled = 1 AND status = 'active'`
  );
  const feedsChecked = (feedCount.rows[0]?.cnt as number) || 0;

  const durationMs = Date.now() - startMs;

  // Log to lookup_log
  try {
    await db.execute({
      sql: `INSERT INTO lookup_log (indicator_value, result_risk_level, sources_hit, sources_checked, lookup_ms, client_ip)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [
        value,
        hits[0]?.risk_level ?? 'unknown',
        hits.length,
        feedsChecked,
        durationMs,
        requestIp,
      ],
    });
  } catch {}

  // Increment hit counters
  if (hits.length > 0) {
    try {
      await db.execute({
        sql: `UPDATE indicators SET hit_count = hit_count + 1, last_hit_at = datetime('now')
              WHERE value_normalized IN (${placeholders}) AND is_active = 1`,
        args: variants,
      });
    } catch {}
  }

  // Aggregate categories across all hits
  const allCategories = [...new Set(hits.flatMap(h => h.categories))];
  const sources = [...new Set(hits.map(h => h.source_feed))];

  return {
    query: value,
    verdict,
    confidence: maxConfidence,
    hits_count: hits.length,
    feeds_checked: feedsChecked,
    lookup_ms: durationMs,
    categories: allCategories,
    sources,
    hits,
  };
}

// GET /api/v1/lookup?value=<ioc>&key=<api_key>
export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const url = new URL(request.url);
    const value = url.searchParams.get('value') || url.searchParams.get('q');

    if (!value || value.trim().length === 0) {
      return withCors(NextResponse.json(
        { success: false, error: 'Required query param: value (or q)' },
        { status: 400 }
      ));
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const result = await performLookup(value.trim(), ip);

    return withCors(NextResponse.json({ success: true, data: result }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// POST /api/v1/lookup
// Body: { value: string } OR { values: string[] } for batch lookup (max 50)
export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const body = await request.json();
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

    // Batch lookup
    if (body.values && Array.isArray(body.values)) {
      const values: string[] = body.values.slice(0, 50);
      if (values.length === 0) {
        return withCors(NextResponse.json(
          { success: false, error: 'values array must not be empty' },
          { status: 400 }
        ));
      }

      const results = await Promise.all(
        values.map(v => performLookup(String(v).trim(), ip))
      );

      const summary = {
        total: results.length,
        malicious: results.filter(r => r.verdict === 'malicious').length,
        suspicious: results.filter(r => r.verdict === 'suspicious').length,
        clean: results.filter(r => r.verdict === 'clean').length,
        unknown: results.filter(r => r.verdict === 'unknown').length,
      };

      return withCors(NextResponse.json({ success: true, summary, data: results }));
    }

    // Single lookup
    const value = body.value;
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      return withCors(NextResponse.json(
        { success: false, error: 'Required body field: value (string) or values (string[])' },
        { status: 400 }
      ));
    }

    const result = await performLookup(value.trim(), ip);
    return withCors(NextResponse.json({ success: true, data: result }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}
