// app/api/v1/feeds/route.ts
// NextGuard Phase 3 — GET /api/v1/feeds  POST /api/v1/feeds

import { NextResponse } from 'next/server';
import {
  requireAuth,
  checkRateLimit,
  getPagination,
  paginatedResponse,
  parseFeedRow,
  withCors,
  corsOptions,
  getDB,
} from '@/lib/threat-intel-api';

export async function OPTIONS() {
  return corsOptions();
}

// GET /api/v1/feeds
// Query params: page, limit, status, feed_type, indicator_type, enabled, sort, order
export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const db = getDB();
    const url = new URL(request.url);
    const pagination = getPagination(url);

    const status = url.searchParams.get('status');
    const feedType = url.searchParams.get('feed_type');
    const indicatorType = url.searchParams.get('indicator_type');
    const enabled = url.searchParams.get('enabled');
    const sort = url.searchParams.get('sort') ?? 'name';
    const order = url.searchParams.get('order')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const allowedSorts = ['name', 'status', 'entries_count', 'total_ingested', 'last_success', 'created_at'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'name';

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (status) { conditions.push('status = ?'); args.push(status); }
    if (feedType) { conditions.push('feed_type = ?'); args.push(feedType); }
    if (indicatorType) { conditions.push('indicator_type = ?'); args.push(indicatorType); }
    if (enabled !== null && enabled !== undefined) {
      conditions.push('enabled = ?');
      args.push(enabled === 'true' || enabled === '1' ? 1 : 0);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM feeds ${where}`,
      args,
    });
    const total = (countResult.rows[0]?.total as number) ?? 0;

    const rows = await db.execute({
      sql: `SELECT * FROM feeds ${where} ORDER BY ${safeSort} ${order} LIMIT ? OFFSET ?`,
      args: [...args, pagination.limit, pagination.offset],
    });

    const data = rows.rows.map(r => parseFeedRow(r as Record<string, unknown>));

    // Attach summary stats
    const stats = await db.execute(
      `SELECT COUNT(*) as total_indicators FROM indicators WHERE is_active = 1`
    );
    const totalIndicators = (stats.rows[0]?.total_indicators as number) ?? 0;

    return withCors(NextResponse.json({
      success: true,
      data,
      meta: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        pages: Math.ceil(total / pagination.limit),
        total_active_indicators: totalIndicators,
      },
    }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// POST /api/v1/feeds
// Body: { id, name, url, feed_type?, indicator_type?, parser?, refresh_interval_min?, config? }
export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true);
  if (authErr) return withCors(authErr);

  try {
    const db = getDB();
    const body = await request.json();

    const { id, name, url: feedUrl, feed_type, indicator_type, parser,
      refresh_interval_min, config } = body;

    if (!id || !name || !feedUrl) {
      return withCors(NextResponse.json(
        { success: false, error: 'Required fields: id, name, url' },
        { status: 400 }
      ));
    }

    // Validate id format (alphanumeric + underscores only)
    if (!/^[a-z0-9_]+$/.test(id)) {
      return withCors(NextResponse.json(
        { success: false, error: 'id must be lowercase alphanumeric with underscores only' },
        { status: 400 }
      ));
    }

    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO feeds
        (id, name, url, feed_type, indicator_type, parser, refresh_interval_min, config, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, name, feedUrl,
        feed_type ?? 'osint',
        indicator_type ?? 'domain',
        parser ?? 'text_lines',
        refresh_interval_min ?? 60,
        JSON.stringify(config ?? {}),
        now, now,
      ],
    });

    const created = await db.execute({ sql: `SELECT * FROM feeds WHERE id = ?`, args: [id] });
    const feed = parseFeedRow(created.rows[0] as Record<string, unknown>);

    return withCors(NextResponse.json({ success: true, data: feed }, { status: 201 }));
  } catch (e: any) {
    if (e.message?.includes('UNIQUE') || e.message?.includes('already exists')) {
      return withCors(NextResponse.json({ success: false, error: 'Feed with this id already exists' }, { status: 409 }));
    }
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}
