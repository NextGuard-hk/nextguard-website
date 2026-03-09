// app/api/cron/ingest-feeds/route.ts
// Vercel Cron: fetch all enabled OSINT feeds and store indicators in Turso DB
// Triggered every 15 minutes via vercel.json

import { NextResponse } from 'next/server';
import { getDB, generateIndicatorId, normalizeIndicator } from '@/lib/threat-intel-db';

// Max indicators per feed to avoid timeouts
const MAX_PER_FEED = 500;
const BATCH_SIZE = 50;

const PARSERS: Record<string, (text: string) => string[]> = {
  text_lines: (t) =>
    t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
  hostfile: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        const parts = l.split(/\s+/);
        return parts.length >= 2 ? parts[1] : '';
      })
      .filter((v) => v && v !== 'localhost'),
  csv_first_col: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(',')[0].trim())
      .filter(Boolean),
  phishtank_csv: (t) =>
    t.split('\n')
      .slice(1)
      .map((l) => {
        const cols = l.split(',');
        return cols[1] ? cols[1].replace(/"/g, '').trim() : '';
      })
      .filter(Boolean),
};

// Risk level and confidence mapping per feed
const FEED_RISK_MAP: Record<string, { risk_level: string; confidence: number }> = {
  phishtank: { risk_level: 'high', confidence: 90 },
  openphish: { risk_level: 'high', confidence: 85 },
  urlhaus: { risk_level: 'critical', confidence: 95 },
  abuse_ch: { risk_level: 'critical', confidence: 95 },
  blocklist_de: { risk_level: 'high', confidence: 80 },
  emerging_threats: { risk_level: 'high', confidence: 85 },
  malwaredomains: { risk_level: 'critical', confidence: 90 },
  default: { risk_level: 'medium', confidence: 70 },
};

function getRiskForFeed(feedName: string): { risk_level: string; confidence: number } {
  const lower = feedName.toLowerCase();
  for (const key of Object.keys(FEED_RISK_MAP)) {
    if (key !== 'default' && lower.includes(key)) {
      return FEED_RISK_MAP[key];
    }
  }
  return FEED_RISK_MAP['default'];
}

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const overallStart = Date.now();
  const db = getDB();
  const results: Array<{ feed: string; added: number; updated: number; skipped: number }> = [];

  try {
    // Get all enabled feeds
    const feedRows = await db.execute(
      `SELECT id, name, url, feed_type, parser_type FROM feeds WHERE enabled = 1`
    );
    const feeds = feedRows.rows as Array<{
      id: string;
      name: string;
      url: string;
      feed_type: string;
      parser_type: string;
    }>[];

    for (const feed of feeds) {
      const feedId = feed.id as string;
      const feedName = feed.name as string;
      const feedUrl = feed.url as string;
      const parserType = (feed.parser_type as string) || 'text_lines';
      const feedType = (feed.feed_type as string) || 'domain';
      const { risk_level, confidence } = getRiskForFeed(feedName);

      const feedStart = Date.now();
      let added = 0;
      let updated = 0;
      let skipped = 0;

      try {
        // Log ingestion start
        await db.execute({
          sql: `INSERT OR REPLACE INTO ingestion_log (feed_id, status, started_at) VALUES (?, 'running', datetime('now'))`,
          args: [feedId],
        });

        // Fetch feed
        const resp = await fetch(feedUrl, {
          headers: { 'User-Agent': 'NextGuard-ThreatIntel/1.0' },
          signal: AbortSignal.timeout(30000),
        });

        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();

        // Parse indicators
        const parser = PARSERS[parserType] || PARSERS['text_lines'];
        const rawIndicators = parser(text).slice(0, MAX_PER_FEED);

        // Batch insert/update
        for (let i = 0; i < rawIndicators.length; i += BATCH_SIZE) {
          const batch = rawIndicators.slice(i, i + BATCH_SIZE);
          for (const raw of batch) {
            const normalized = normalizeIndicator(raw, feedType);
            if (!normalized) { skipped++; continue; }

            const id = generateIndicatorId(normalized, feedType);
            const existing = await db.execute({
              sql: `SELECT id FROM threat_indicators WHERE id = ?`,
              args: [id],
            });

            if (existing.rows.length > 0) {
              await db.execute({
                sql: `UPDATE threat_indicators SET
                  last_seen = datetime('now'),
                  confidence = MAX(confidence, ?),
                  updated_at = datetime('now')
                  WHERE id = ?`,
                args: [confidence, id],
              });
              updated++;
            } else {
              await db.execute({
                sql: `INSERT INTO threat_indicators
                  (id, indicator, type, risk_level, confidence, source, feed_id, first_seen, last_seen, is_active)
                  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1)`,
                args: [id, normalized, feedType, risk_level, confidence, feedName, feedId],
              });
              added++;
            }
          }
        }

        const duration = Date.now() - feedStart;
        await db.execute({
          sql: `UPDATE feeds SET last_fetched = datetime('now'), last_error = NULL WHERE id = ?`,
          args: [feedId],
        });
        await db.execute({
          sql: `UPDATE ingestion_log SET
            status = 'success',
            completed_at = datetime('now'),
            records_added = ?,
            records_updated = ?,
            duration_ms = ?
            WHERE feed_id = ? AND status = 'running'`,
          args: [added, updated, duration, feedId],
        });
        results.push({ feed: feedId, added, updated, skipped });
      } catch (err: any) {
        const duration = Date.now() - feedStart;
        await db.execute({
          sql: `UPDATE feeds SET last_error = ? WHERE id = ?`,
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
        results.push({ feed: feedId, added: 0, updated: 0, skipped: 0 });
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
