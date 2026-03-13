// app/api/v1/threat-intel/backup/route.ts
// NextGuard Turso DB Backup API v6.0
// Exports all threat intel data as JSON for backup purposes
// Protected by CRON_SECRET or TI_ADMIN_KEY
// Also performs data integrity checks

import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow up to 60s for large exports

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

  try {
    // 1. Export indicators table
    const indicators = await db.execute({
      sql: `SELECT * FROM indicators ORDER BY source_feed, value_normalized`,
      args: [],
    });

    // 2. Export feeds table
    const feeds = await db.execute({
      sql: `SELECT * FROM feeds ORDER BY id`,
      args: [],
    });

    // 3. Export lookup_log (last 30 days only to keep size manageable)
    const lookupLog = await db.execute({
      sql: `SELECT * FROM lookup_log WHERE created_at > datetime('now', '-30 days') ORDER BY created_at DESC`,
      args: [],
    });

    // 4. Data integrity checks
    const integrityChecks: Record<string, any> = {};

    // Check: total counts
    const totalActive = await db.execute(`SELECT COUNT(*) as cnt FROM indicators WHERE is_active = 1`);
    const totalAll = await db.execute(`SELECT COUNT(*) as cnt FROM indicators`);
    integrityChecks.total_indicators = Number(totalAll.rows[0]?.cnt || 0);
    integrityChecks.active_indicators = Number(totalActive.rows[0]?.cnt || 0);
    integrityChecks.inactive_indicators = integrityChecks.total_indicators - integrityChecks.active_indicators;

    // Check: no null primary keys
    const nullIds = await db.execute(`SELECT COUNT(*) as cnt FROM indicators WHERE id IS NULL`);
    const nullIdCount = Number(nullIds.rows[0]?.cnt || 0);
    if (nullIdCount > 0) errors.push(`Found ${nullIdCount} indicators with NULL id`);
    integrityChecks.null_id_count = nullIdCount;

    // Check: no duplicate IDs
    const dupes = await db.execute(`SELECT id, COUNT(*) as cnt FROM indicators GROUP BY id HAVING cnt > 1`);
    if (dupes.rows.length > 0) errors.push(`Found ${dupes.rows.length} duplicate indicator IDs`);
    integrityChecks.duplicate_ids = dupes.rows.length;

    // Check: feed counts match
    const feedCounts = await db.execute(`
      SELECT source_feed, COUNT(*) as actual_count
      FROM indicators WHERE is_active = 1
      GROUP BY source_feed
    `);
    const feedEntries = await db.execute(`SELECT id, entries_count FROM feeds`);
    const feedMismatches: any[] = [];
    const feedCountMap = Object.fromEntries(feedCounts.rows.map(r => [r.source_feed, Number(r.actual_count)]));
    for (const row of feedEntries.rows) {
      const actual = feedCountMap[row.id as string] || 0;
      const recorded = Number(row.entries_count || 0);
      if (Math.abs(actual - recorded) > 10) {
        feedMismatches.push({ feed: row.id, actual, recorded, diff: actual - recorded });
      }
    }
    if (feedMismatches.length > 0) errors.push(`Feed count mismatches: ${feedMismatches.length} feeds`);
    integrityChecks.feed_count_mismatches = feedMismatches;

    // Check: no future dates
    const futureDates = await db.execute(`SELECT COUNT(*) as cnt FROM indicators WHERE valid_from > datetime('now', '+1 day')`);
    integrityChecks.future_dated_indicators = Number(futureDates.rows[0]?.cnt || 0);

    // Check: expired but still active
    const expiredActive = await db.execute(`SELECT COUNT(*) as cnt FROM indicators WHERE valid_until < datetime('now') AND is_active = 1`);
    integrityChecks.expired_but_active = Number(expiredActive.rows[0]?.cnt || 0);

    const backup = {
      version: '6.0',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      integrity: {
        status: errors.length === 0 ? 'healthy' : 'warnings',
        checks: integrityChecks,
        errors,
      },
      data: {
        indicators: {
          count: indicators.rows.length,
          rows: indicators.rows,
        },
        feeds: {
          count: feeds.rows.length,
          rows: feeds.rows,
        },
        lookup_log: {
          count: lookupLog.rows.length,
          rows: lookupLog.rows,
          note: 'Last 30 days only',
        },
      },
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
