// app/api/v1/indicators/route.ts
// NextGuard Phase 3 — GET /api/v1/indicators  POST /api/v1/indicators

import { NextResponse } from 'next/server';
import {
  requireAuth,
  checkRateLimit,
  getPagination,
  paginatedResponse,
  parseIndicatorRow,
  withCors,
  corsOptions,
  getDB,
} from '@/lib/threat-intel-api';
import { generateIndicatorId, normalizeValue } from '@/lib/db';

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return corsOptions();
}

// GET /api/v1/indicators
// Query params: page, limit, type, risk_level, source_feed, tlp, active, search, sort, order
export async function GET(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const db = getDB();
    const url = new URL(request.url);
    const pagination = getPagination(url);

    // Filters
    const type = url.searchParams.get('type');
    const riskLevel = url.searchParams.get('risk_level');
    const sourceFeed = url.searchParams.get('source_feed');
    const tlp = url.searchParams.get('tlp');
    const active = url.searchParams.get('active') ?? '1';
    const search = url.searchParams.get('search');
    const sort = url.searchParams.get('sort') ?? 'last_seen';
    const order = url.searchParams.get('order')?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const allowedSorts = ['last_seen', 'first_seen', 'confidence', 'hit_count', 'created_at', 'value'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'last_seen';

    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (type) { conditions.push('type = ?'); args.push(type); }
    if (riskLevel) { conditions.push('risk_level = ?'); args.push(riskLevel); }
    if (sourceFeed) { conditions.push('source_feed = ?'); args.push(sourceFeed); }
    if (tlp) { conditions.push('tlp = ?'); args.push(tlp); }
    if (active !== 'all') { conditions.push('is_active = ?'); args.push(active === '1' ? 1 : 0); }
    if (search) { conditions.push('(value LIKE ? OR description LIKE ?)'); args.push(`%${search}%`, `%${search}%`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Count total
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM indicators ${where}`,
      args,
    });
    const total = (countResult.rows[0]?.total as number) ?? 0;

    // Fetch page
    const rows = await db.execute({
      sql: `SELECT * FROM indicators ${where} ORDER BY ${safeSort} ${order} LIMIT ? OFFSET ?`,
      args: [...args, pagination.limit, pagination.offset],
    });

    const data = rows.rows.map(r => parseIndicatorRow(r as Record<string, unknown>));

    return withCors(paginatedResponse(data, total, pagination));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// POST /api/v1/indicators
// Body: { type, value, source_feed, risk_level?, confidence?, tlp?, description?, tags?, categories?, threat_actor?, campaign?, valid_until? }
export async function POST(request: Request) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true); // admin only
  if (authErr) return withCors(authErr);

  try {
    const db = getDB();
    const body = await request.json();

    const { type, value, source_feed, risk_level, confidence, tlp, description,
      tags, categories, threat_actor, campaign, valid_until, kill_chain_phase } = body;

    if (!type || !value || !source_feed) {
      return withCors(NextResponse.json(
        { success: false, error: 'Required fields: type, value, source_feed' },
        { status: 400 }
      ));
    }

    const validTypes = ['domain', 'ipv4-addr', 'ipv6-addr', 'url', 'email-addr', 'file-hash'];
    if (!validTypes.includes(type)) {
      return withCors(NextResponse.json(
        { success: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      ));
    }

    const normalized = normalizeValue(value, type);
    const id = generateIndicatorId(type, normalized, source_feed);
    const now = new Date().toISOString();

    await db.execute({
      sql: `INSERT INTO indicators
        (id, type, value, value_normalized, risk_level, confidence, tlp, categories, tags,
         description, source_feed, first_seen, last_seen, valid_from, valid_until,
         kill_chain_phase, threat_actor, campaign, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          last_seen = excluded.last_seen,
          confidence = excluded.confidence,
          risk_level = excluded.risk_level,
          updated_at = excluded.updated_at,
          is_active = 1`,
      args: [
        id, type, value, normalized,
        risk_level ?? 'unknown',
        confidence ?? 50,
        tlp ?? 'white',
        JSON.stringify(categories ?? []),
        JSON.stringify(tags ?? []),
        description ?? null,
        source_feed,
        now, now, now,
        valid_until ?? null,
        kill_chain_phase ?? null,
        threat_actor ?? null,
        campaign ?? null,
        now, now,
      ],
    });

    const created = await db.execute({ sql: `SELECT * FROM indicators WHERE id = ?`, args: [id] });
    const indicator = parseIndicatorRow(created.rows[0] as Record<string, unknown>);

    return withCors(NextResponse.json({ success: true, data: indicator }, { status: 201 }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}
