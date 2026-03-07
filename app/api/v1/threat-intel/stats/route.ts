import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    const db = getDb();

    // Overall indicator counts by type
    const byType = await db.execute({
      sql: `SELECT type, COUNT(*) as count, 
              SUM(CASE WHEN confidence >= 80 THEN 1 ELSE 0 END) as high_confidence,
              AVG(confidence) as avg_confidence
            FROM threat_indicators 
            GROUP BY type ORDER BY count DESC`,
      args: [],
    });

    // Counts by source feed
    const byFeed = await db.execute({
      sql: `SELECT source_feed, COUNT(*) as count,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
              MAX(created_at) as last_added
            FROM threat_indicators 
            GROUP BY source_feed ORDER BY count DESC`,
      args: [],
    });

    // Counts by threat category
    const byCategory = await db.execute({
      sql: `SELECT threat_category, COUNT(*) as count
            FROM threat_indicators 
            WHERE threat_category IS NOT NULL
            GROUP BY threat_category ORDER BY count DESC LIMIT 20`,
      args: [],
    });

    // Recent ingestion trend (last N days)
    const trend = await db.execute({
      sql: `SELECT DATE(created_at) as date, COUNT(*) as added
            FROM threat_indicators
            WHERE created_at >= datetime('now', '-' || ? || ' days')
            GROUP BY DATE(created_at)
            ORDER BY date ASC`,
      args: [days],
    });

    // Total counts
    const totals = await db.execute({
      sql: `SELECT 
              COUNT(*) as total,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
              SUM(CASE WHEN confidence >= 80 THEN 1 ELSE 0 END) as high_confidence,
              SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical,
              SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high,
              SUM(CASE WHEN severity = 'medium' THEN 1 ELSE 0 END) as medium,
              SUM(CASE WHEN severity = 'low' THEN 1 ELSE 0 END) as low,
              MIN(created_at) as oldest_indicator,
              MAX(updated_at) as last_updated
            FROM threat_indicators`,
      args: [],
    });

    // Feed health summary
    const feedHealth = await db.execute({
      sql: `SELECT 
              COUNT(*) as total_feeds,
              SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_feeds,
              MIN(last_fetch) as oldest_fetch,
              MAX(last_fetch) as newest_fetch
            FROM threat_feeds`,
      args: [],
    });

    // Lookup performance stats (last 24h)
    const lookupStats = await db.execute({
      sql: `SELECT 
              COUNT(*) as total_lookups,
              SUM(CASE WHEN verdict != 'clean' THEN 1 ELSE 0 END) as threats_detected,
              AVG(lookup_ms) as avg_lookup_ms,
              MAX(lookup_ms) as max_lookup_ms
            FROM lookup_audit
            WHERE checked_at >= datetime('now', '-1 day')`,
      args: [],
    });

    const t = totals.rows[0] as any;
    const fh = feedHealth.rows[0] as any;
    const ls = lookupStats.rows[0] as any;

    return NextResponse.json({
      overview: {
        total_indicators: Number(t?.total || 0),
        active_indicators: Number(t?.active || 0),
        high_confidence: Number(t?.high_confidence || 0),
        oldest_indicator: t?.oldest_indicator,
        last_updated: t?.last_updated,
        severity_breakdown: {
          critical: Number(t?.critical || 0),
          high: Number(t?.high || 0),
          medium: Number(t?.medium || 0),
          low: Number(t?.low || 0),
        },
      },
      feeds: {
        total: Number(fh?.total_feeds || 0),
        active: Number(fh?.active_feeds || 0),
        oldest_fetch: fh?.oldest_fetch,
        newest_fetch: fh?.newest_fetch,
      },
      by_type: byType.rows.map((r: any) => ({
        type: r.type,
        count: Number(r.count),
        high_confidence: Number(r.high_confidence || 0),
        avg_confidence: Math.round(Number(r.avg_confidence || 0)),
      })),
      by_feed: byFeed.rows.map((r: any) => ({
        feed: r.source_feed,
        total: Number(r.count),
        active: Number(r.active_count || 0),
        last_added: r.last_added,
      })),
      by_category: byCategory.rows.map((r: any) => ({
        category: r.threat_category,
        count: Number(r.count),
      })),
      trend: {
        days,
        data: trend.rows.map((r: any) => ({
          date: r.date,
          added: Number(r.added),
        })),
      },
      lookup_performance_24h: {
        total_lookups: Number(ls?.total_lookups || 0),
        threats_detected: Number(ls?.threats_detected || 0),
        detection_rate: ls?.total_lookups > 0
          ? ((Number(ls.threats_detected) / Number(ls.total_lookups)) * 100).toFixed(2) + '%'
          : '0%',
        avg_lookup_ms: Math.round(Number(ls?.avg_lookup_ms || 0)),
        max_lookup_ms: Number(ls?.max_lookup_ms || 0),
      },
      generated_at: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
