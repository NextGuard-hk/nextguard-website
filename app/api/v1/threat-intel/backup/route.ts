// app/api/v1/threat-intel/backup/route.ts
// NextGuard Turso DB Backup API v7.0
// Lightweight integrity check + row counts (no full export to avoid timeout)
// Protected by CRON_SECRET or TI_ADMIN_KEY
// Use ?full=true for full data export (manual use only)

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

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = getDB();
  const errors: string[] = [];
  const fullExport = request.nextUrl.searchParams.get('full') === 'true';

  try {
    // 1. Get row counts (fast)
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

    // 2. Integrity checks
    const integrityChecks: string[] = [];
    if (counts.indicators === 0) errors.push('indicators table is empty');
    else integrityChecks.push(`indicators: ${counts.indicators} rows`);
    if (counts.feeds === 0) errors.push('feeds table is empty');
    else integrityChecks.push(`feeds: ${counts.feeds} rows`);
    integrityChecks.push(`lookup_log: ${counts.lookup_log} rows`);

    // 3. Sample check - verify a few rows are readable
    const sampleIndicator = await db.execute({ sql: 'SELECT value_normalized, source_feed FROM indicators LIMIT 1', args: [] });
    if (sampleIndicator.rows.length === 0) errors.push('Cannot read from indicators');
    else integrityChecks.push('sample read: OK');

    // 4. Optional full export
    let data: any = { counts };
    if (fullExport) {
      const indicators = await db.execute({ sql: 'SELECT * FROM indicators ORDER BY source_feed, value_normalized', args: [] });
      const feeds = await db.execute({ sql: 'SELECT * FROM feeds ORDER BY feed_id', args: [] });
      const lookupLog = await db.execute({ sql: 'SELECT * FROM lookup_log ORDER BY timestamp DESC LIMIT 1000', args: [] });
      data = {
        counts,
        indicators: { count: indicators.rows.length, rows: indicators.rows },
        feeds: { count: feeds.rows.length, rows: feeds.rows },
        lookup_log: { count: lookupLog.rows.length, rows: lookupLog.rows, note: 'Last 1000 entries' },
      };
    }

    const backup = {
      version: '7.0',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      integrity: {
        status: errors.length === 0 ? 'healthy' : 'degraded',
        checks: integrityChecks,
        errors,
      },
      data,
    };

    return NextResponse.json(backup);
  } catch (e: any) {
    return NextResponse.json({
      error: 'Backup failed',
      message: e.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
