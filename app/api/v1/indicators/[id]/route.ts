// app/api/v1/indicators/[id]/route.ts
// NextGuard Phase 3 — GET / PUT / DELETE /api/v1/indicators/:id

import { NextResponse } from 'next/server';
import {
  requireAuth,
  checkRateLimit,
  parseIndicatorRow,
  withCors,
  corsOptions,
  getDB,
} from '@/lib/threat-intel-api';

type RouteContext = { params: Promise<{ id: string }> };

// OPTIONS — CORS preflight
export async function OPTIONS() {
  return corsOptions();
}

// GET /api/v1/indicators/:id
export async function GET(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request);
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();
    const result = await db.execute({
      sql: `SELECT * FROM indicators WHERE id = ?`,
      args: [id],
    });

    if (result.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Indicator not found' }, { status: 404 }));
    }

    const indicator = parseIndicatorRow(result.rows[0] as Record<string, unknown>);
    return withCors(NextResponse.json({ success: true, data: indicator }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// PUT /api/v1/indicators/:id
// Body: partial indicator fields to update
export async function PUT(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true); // admin only
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();

    // Check exists
    const existing = await db.execute({ sql: `SELECT id FROM indicators WHERE id = ?`, args: [id] });
    if (existing.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Indicator not found' }, { status: 404 }));
    }

    const body = await request.json();
    const updatable = [
      'risk_level', 'confidence', 'tlp', 'categories', 'tags',
      'description', 'valid_until', 'kill_chain_phase', 'threat_actor',
      'campaign', 'is_active',
    ];

    const setClauses: string[] = [];
    const args: unknown[] = [];

    for (const field of updatable) {
      if (field in body) {
        const val = body[field];
        setClauses.push(`${field} = ?`);
        if (field === 'categories' || field === 'tags') {
          args.push(JSON.stringify(Array.isArray(val) ? val : []));
        } else {
          args.push(val);
        }
      }
    }

    if (setClauses.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 }));
    }

    setClauses.push('updated_at = ?');
    args.push(new Date().toISOString());
    args.push(id);

    await db.execute({
      sql: `UPDATE indicators SET ${setClauses.join(', ')} WHERE id = ?`,
      args,
    });

    const updated = await db.execute({ sql: `SELECT * FROM indicators WHERE id = ?`, args: [id] });
    const indicator = parseIndicatorRow(updated.rows[0] as Record<string, unknown>);

    return withCors(NextResponse.json({ success: true, data: indicator }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}

// DELETE /api/v1/indicators/:id
// Soft-deletes by setting is_active = 0 unless ?hard=true
export async function DELETE(request: Request, context: RouteContext) {
  const rl = checkRateLimit(request);
  if (rl) return rl;

  const authErr = requireAuth(request, true); // admin only
  if (authErr) return withCors(authErr);

  try {
    const { id } = await context.params;
    const db = getDB();
    const url = new URL(request.url);
    const hard = url.searchParams.get('hard') === 'true';

    const existing = await db.execute({ sql: `SELECT id FROM indicators WHERE id = ?`, args: [id] });
    if (existing.rows.length === 0) {
      return withCors(NextResponse.json({ success: false, error: 'Indicator not found' }, { status: 404 }));
    }

    if (hard) {
      await db.execute({ sql: `DELETE FROM indicators WHERE id = ?`, args: [id] });
    } else {
      await db.execute({
        sql: `UPDATE indicators SET is_active = 0, updated_at = ? WHERE id = ?`,
        args: [new Date().toISOString(), id],
      });
    }

    return withCors(NextResponse.json({
      success: true,
      message: hard ? `Indicator ${id} permanently deleted` : `Indicator ${id} deactivated`,
    }));
  } catch (e: any) {
    return withCors(NextResponse.json({ success: false, error: e.message }, { status: 500 }));
  }
}
