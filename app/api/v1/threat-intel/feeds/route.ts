import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const db = getDB();

    // Query from the actual 'feeds' table (where ingest writes) + JOIN indicators for counts
    let query = `
      SELECT
        f.id,
        f.name,
        f.feed_url as url,
        f.feed_type as type,
        f.format,
        f.is_active,
        f.status,
        f.last_success as last_fetch,
        f.last_refresh as next_fetch,
        f.last_error,
        f.entries_count as indicator_count,
        f.fetch_interval_minutes,
        f.last_success as last_indicator_at
      FROM feeds f
    `;

    const params: any[] = [];
    if (active !== null) {
      query += ` WHERE f.is_active = ?`;
      params.push(active === 'true' ? 1 : 0);
    }

    query += ` ORDER BY f.name ASC`;

    const feeds = await db.execute({ sql: query, args: params });

    // Also get actual indicator counts per feed from indicators table
    const indicatorCounts = await db.execute({
      sql: `SELECT source_feed, COUNT(*) as cnt FROM indicators WHERE is_active = 1 GROUP BY source_feed`,
      args: [],
    });
    const countMap: Record<string, number> = {};
    for (const row of indicatorCounts.rows) {
      countMap[row.source_feed as string] = row.cnt as number;
    }

    const feedList = feeds.rows.map((row: any) => {
      const feedId = row.id as string;
      const actualCount = countMap[feedId] || Number(row.indicator_count || 0);
      const lastFetch = row.last_fetch as string | null;
      const status = row.status as string;

      // Determine health based on status and last fetch time
      let health = 'unknown';
      if (status === 'active' && lastFetch) {
        const hoursSinceLastFetch = (Date.now() - new Date(lastFetch).getTime()) / 3600000;
        if (hoursSinceLastFetch < 2) health = 'healthy';
        else if (hoursSinceLastFetch < 24) health = 'warning';
        else health = 'stale';
      } else if (status === 'active' && !lastFetch) {
        health = 'never_fetched';
      } else if (status === 'error') {
        health = 'error';
      } else if (!row.is_active) {
        health = 'disabled';
      }

      return {
        id: feedId,
        name: row.name,
        url: row.url,
        type: row.type,
        format: row.format,
        is_active: Boolean(row.is_active),
        last_fetch: lastFetch,
        next_fetch: row.next_fetch,
        fetch_interval_minutes: row.fetch_interval_minutes || 60,
        indicator_count: actualCount,
        last_indicator_at: row.last_indicator_at,
        health,
      };
    });

    const totalIndicators = Object.values(countMap).reduce((s, c) => s + c, 0);
    const activeFeeds = feedList.filter(f => f.is_active);
    const healthyFeeds = feedList.filter(f => f.health === 'healthy');

    return NextResponse.json({
      feeds: feedList,
      summary: {
        total: feedList.length,
        active: activeFeeds.length,
        healthy: healthyFeeds.length,
        total_indicators: totalIndicators,
        last_updated: new Date().toISOString(),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
