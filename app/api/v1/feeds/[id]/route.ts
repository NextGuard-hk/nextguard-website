// app/api/v1/feeds/[id]/route.ts
// NextGuard Phase 3 — GET / PUT / DELETE /api/v1/feeds/:id

import { NextResponse } from 'next/server';
import {
  requireAuth,
  checkRateLimit,
  parseFeedRow,
  withCors,
  corsOptions,
  getDB,
} from '@/lib/threat-intel-api';

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return corsOptions();
}

// GET /api/v1/feeds/:id
// Returns feed details + indicator stats for this feed
export async function GET(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();

    const result = await db.execute({ sql: `SELECT * FROM feeds WHERE id = ?`, args: [id] });
    if (result.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Feed not found' }, { status: 404 }));
    }

    const feed = parseFeedRow(result.rows[0] as Record<string, unknown>);

    // Get per-feed indicator stats
    const [riskStats, recentIngestion] = await Promise.all([
      db.execute({
        sql: `SELECT risk_level, COUNT(*) as cnt FROM indicators WHERE source_feed = ? AND is_active = 1 GROUP BY risk_level`,
        args: [id],
      }),
      db.execute({
        sql: `SELECT status, indicators_added, indicators_updated, started_at, completed_at, duration_ms
              FROM ingestion_log WHERE feed_id = ? ORDER BY started_at DESC LIMIT 5`,
        args: [id],
      }),
    ]);

    const byRiskLevel = Object.fromEntries(
      riskStats.rows.map(r => [r.risk_level as string, r.cnt as number])
    );
    const recentRuns = recentIngestion.rows.map(r => ({
      status: r.status,
      added: r.indicators_added,
      updated: r.indicators_updated,
      started_at: r.started_at,
      completed_at: r.completed_at,
      duration_ms: r.duration_ms,
    }));

    return withCors(NextResponse.json({
      success: true,
      data: { ...feed, stats: { by_risk_level: byRiskLevel }, recent_runs: recentRuns },
    }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// PUT /api/v1/feeds/:id
export async function PUT(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true);
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();

    const existing = await db.execute({ sql: `SELECT id FROM feeds WHERE id = ?`, args: [id] });
    if (existing.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Feed not found' }, { status: 404 }));
    }

    const body = await request.json();
    const updatable = ['name', 'url', 'feed_type', 'indicator_type', 'parser',
      'enabled', 'refresh_interval_min', 'status', 'config'];

    const setClauses: string[] = [];
    const args: unknown[] = [];

    for (const field of updatable) {
      if (field in body) {
        setClauses.push(`${field} = ?`);
        args.push(field === 'config' && typeof body[field] === 'object'
          ? JSON.stringify(body[field])
          : body[field]);
      }
    }

    if (setClauses.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 }));
    }

    setClauses.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE feeds SET ${setClauses.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({ sql: `SELECT * FROM feeds WHERE id = ?`, args: [id] });
    const feed = parseFeedRow(updated.rows[0] as Record<string, unknown>);

    return withCors(NextResponse.json({ success: true, data: feed }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// DELETE /api/v1/feeds/:id
// Disables feed (soft) or deletes with cascade if ?hard=true
export async function DELETE(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true);
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();
    const url = new URL(request.url);
    const hard = url.searchParams.get('hard') === 'true';

    const existing = await db.execute({ sql: `SELECT id FROM feeds WHERE id = ?`, args: [id] });
    if (existing.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Feed not found' }, { status: 404 }));
    }

    if (hard) {
      // Deactivate all indicators from this feed first
      await db.execute({
        sql: `UPDATE indicators SET is_active = 0, updated_at = ? WHERE source_feed = ?`,
        args: [new Date().toISOString(), id],
      });
      await db.execute({ sql: `DELETE FROM feeds WHERE id = ?`, args: [id] });
    } else {
      await db.execute({
        sql: `UPDATE feeds SET enabled = 0, status = 'disabled', updated_at = ? WHERE id = ?`,
        args: [new Date().toISOString(), id],
      });
    }

    return withCors(NextResponse.json({
      success: true,
      message: hard
        ? `Feed ${id} deleted and indicators deactivated`
        : `Feed ${id} disabled`,
    }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}
