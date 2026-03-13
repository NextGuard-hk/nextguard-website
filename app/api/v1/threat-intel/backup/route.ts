// app/api/v1/threat-intel/backup/route.ts
// NextGuard Turso DB Backup API v8.3
// Default: lightweight integrity check + row counts
// Paginated export: ?table=indicators&page=1&limit=1000
// Full single-table: ?table=feeds (small tables)
// Protected by CRON_SECRET or TI_ADMIN_KEY

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = request.nextUrl.searchParams.get('key');
  const adminKey = process.env.TI_ADMIN_KEY;
  if (adminKey && key === adminKey) return true;
  if (!cronSecret && !adminKey) return true;
  return false;
}

// Explicit column lists to avoid SELECT * issues with schema mismatches
const TABLE_COLUMNS: Record<string, string> = {
  indicators: 'id, type, value, value_normalized, risk_level, confidence, tlp, categories, tags, description, source_feed, source_ref, first_seen, last_seen, valid_from, valid_until, kill_chain_phase, threat_actor, campaign, hit_count, last_hit_at, is_active, created_at, updated_at',
  feeds: 'id, name, url, feed_type, indicator_type, parser, is_active, enabled, refresh_interval_min, last_refresh, last_success, last_error, entries_count, total_ingested, avg_refresh_ms, status, config, created_at, updated_at',
  lookup_log: 'id, indicator_value, indicator_type, result_risk_level, sources_hit, sources_checked, lookup_ms, client_ip, created_at',
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = getDB();
  const table = request.nextUrl.searchParams.get('table');
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '1000'), 2000);
  const offset = (page - 1) * limit;

  try {
    if (table) {
      const validTables = ['indicators', 'feeds', 'lookup_log'];
      if (!validTables.includes(table)) {
        return NextResponse.json({ error: `Invalid table. Use: ${validTables.join(', ')}` }, { status: 400 });
      }

      const countResult = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM ${table}`, args: [] });
      const totalRows = Number(countResult.rows[0]?.cnt ?? 0);
      const totalPages = Math.ceil(totalRows / limit);

      // Use explicit columns instead of SELECT * to avoid schema mismatch errors
      const columns = TABLE_COLUMNS[table] || '*';
      const rows = await db.execute({
        sql: `SELECT ${columns} FROM ${table} LIMIT ? OFFSET ?`,
        args: [limit, offset],
      });

      return NextResponse.json({
        version: '8.3',
        export: {
          table,
          page,
          limit,
          total_rows: totalRows,
          total_pages: totalPages,
          rows_in_page: rows.rows.length,
          has_more: page < totalPages,
        },
        rows: rows.rows,
        duration_ms: Date.now() - startTime,
      });
    }

    // Default: lightweight integrity check
    const errors: string[] = [];
    const indicatorCount = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM indicators', args: [] });
    const feedCount = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM feeds', args: [] });
    let lookupLogCount = { rows: [{ cnt: 0 }] };
    try {
      lookupLogCount = await db.execute({ sql: 'SELECT COUNT(*) as cnt FROM lookup_log', args: [] });
    } catch { /* table may not exist */ }

    const counts = {
      indicators: Number(indicatorCount.rows[0]?.cnt ?? 0),
      feeds: Number(feedCount.rows[0]?.cnt ?? 0),
      lookup_log: Number(lookupLogCount.rows[0]?.cnt ?? 0),
    };

    const integrityChecks: string[] = [];
    if (counts.indicators === 0) errors.push('indicators table is empty');
    else integrityChecks.push(`indicators: ${counts.indicators} rows`);
    if (counts.feeds === 0) errors.push('feeds table is empty');
    else integrityChecks.push(`feeds: ${counts.feeds} rows`);
    integrityChecks.push(`lookup_log: ${counts.lookup_log} rows`);

    const sampleIndicator = await db.execute({ sql: 'SELECT value_normalized, source_feed FROM indicators LIMIT 1', args: [] });
    if (sampleIndicator.rows.length === 0) errors.push('Cannot read from indicators');
    else integrityChecks.push('sample read: OK');

    return NextResponse.json({
      version: '8.3',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      integrity: {
        status: errors.length === 0 ? 'healthy' : 'degraded',
        checks: integrityChecks,
        errors,
      },
      data: { counts },
    });
  } catch (e: any) {
    return NextResponse.json({
      error: 'Backup failed',
      message: e.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
