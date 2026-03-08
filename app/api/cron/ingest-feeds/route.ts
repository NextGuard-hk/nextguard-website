// app/api/cron/ingest-feeds/route.ts
// Vercel Cron: fetch all enabled OSINT feeds and upsert IOCs into Turso DB
// Triggered every 15 minutes via vercel.json cron config

import { NextResponse } from 'next/server';
import { getDB, generateIndicatorId, normalizeValue } from '@/lib/db';

// Max indicators per feed to avoid timeout (Vercel 60s limit)
const MAX_PER_FEED = 500;
const BATCH_SIZE = 50;

const PARSERS: Record<string, (text: string) => string[]> = {
  text_lines: (t) =>
    t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#') && !l.startsWith('//')),
  hostfile: (t) =>
    t.split('\n').filter((l) => l.startsWith('127.0.0.1') || l.startsWith('0.0.0.0'))
      .map((l) => l.split(/\s+/)[1]?.trim()).filter(Boolean) as string[],
  urlhaus: (t) =>
    t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
  url_to_domain: (t) =>
    t.split('\n').filter((l) => l.startsWith('http')).map((l) => {
      try { return new URL(l.trim()).hostname; } catch { return ''; }
    }).filter(Boolean),
  ipsum: (t) =>
    t.split('\n').map((l) => l.split('\t')[0]?.trim()).filter((l) => l && !l.startsWith('#')),
  c2intel_csv: (t) =>
    t.split('\n').slice(1).map((l) => l.split(',')[0]?.trim()).filter(Boolean),
};

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDB();
  const overallStart = Date.now();
  const results: Array<{ feed: string; added: number; updated: number; total: number; ms: number; error?: string }> = [];

  try {
    // Get all enabled feeds
    const feeds = await db.execute('SELECT * FROM feeds WHERE enabled = 1');

    for (const feed of feeds.rows) {
      const feedId = feed.id as string;
      const feedUrl = feed.url as string;
      const parserName = feed.parser as string;
      const indicatorType = feed.indicator_type as string;
      const startTime = Date.now();

      // Log ingestion start
      await db.execute({
        sql: `INSERT INTO ingestion_log (feed_id, status) VALUES (?, 'running')`,
        args: [feedId],
      });

      try {
        const resp = await fetch(feedUrl, {
          headers: { 'User-Agent': 'NextGuard-TI/1.0' },
          signal: AbortSignal.timeout(30000),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

        const text = await resp.text();
        const parser = PARSERS[parserName] || PARSERS.text_lines;
        const allValues = [...new Set(parser(text))];
        const values = allValues.slice(0, MAX_PER_FEED);

        let added = 0;
        let updated = 0;

        // Batch upsert in chunks
        for (let i = 0; i < values.length; i += BATCH_SIZE) {
          const chunk = values.slice(i, i + BATCH_SIZE);
          const statements = chunk.map((val) => {
            const normalized = normalizeValue(val, indicatorType);
            const id = generateIndicatorId(indicatorType, normalized, feedId);
            return {
              sql: `INSERT INTO indicators (id, type, value, value_normalized, source_feed, risk_level, confidence)
                    VALUES (?, ?, ?, ?, ?, 'medium_risk', 70)
                    ON CONFLICT(id) DO UPDATE SET
                      last_seen = datetime('now'),
                      updated_at = datetime('now'),
                      hit_count = hit_count + 1`,
              args: [id, indicatorType, val, normalized, feedId],
            };
          });

          const batchResults = await db.batch(statements, 'write');
          for (const r of batchResults) {
            if (r.rowsAffected === 1) added++;
            else updated++;
          }
        }

        const duration = Date.now() - startTime;

        // Update feed status
        await db.execute({
          sql: `UPDATE feeds SET
                  last_refresh = datetime('now'),
                  last_success = datetime('now'),
                  entries_count = ?,
                  total_ingested = total_ingested + ?,
                  avg_refresh_ms = ?,
                  status = 'active',
                  updated_at = datetime('now')
                WHERE id = ?`,
          args: [values.length, added, duration, feedId],
        });

        // Update ingestion log
        await db.execute({
          sql: `UPDATE ingestion_log SET
                  status = 'success',
                  completed_at = datetime('now'),
                  indicators_added = ?,
                  indicators_updated = ?,
                  duration_ms = ?
                WHERE feed_id = ? AND status = 'running'`,
          args: [added, updated, duration, feedId],
        });

        results.push({ feed: feedId, added, updated, total: values.length, ms: duration });
      } catch (err: any) {
        const duration = Date.now() - startTime;

        await db.execute({
          sql: `UPDATE feeds SET last_error = ?, status = 'error', updated_at = datetime('now') WHERE id = ?`,
          args: [err.message, feedId],
        });

        await db.execute({
          sql: `UPDATE ingestion_log SET
                  status = 'error',
                  error_message = ?,
                  completed_at = datetime('now'),
                  duration_ms = ?
                WHERE feed_id = ? AND status = 'running'`,
          args: [err.message, duration, feedId],
        });

        results.push({ feed: feedId, added: 0, updated: 0, total: 0, ms: duration, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      feeds_processed: results.length,
      total_added: results.reduce((s, r) => s + r.added, 0),
      total_updated: results.reduce((s, r) => s + r.updated, 0),
      results,
      duration_ms: Date.now() - overallStart,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      duration_ms: Date.now() - overallStart,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
