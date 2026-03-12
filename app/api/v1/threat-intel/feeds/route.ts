import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const db = getDB();

    // Query from threat_feeds table (created by init) + JOIN threat_indicators for counts
    let query = `
      SELECT
        f.id,
        f.name,
        f.url,
        f.type,
        f.format,
        f.is_active,
        f.last_fetch,
        f.next_fetch,
        f.fetch_interval_minutes,
        f.last_error,
        COUNT(i.id) as indicator_count,
        MAX(i.created_at) as last_indicator_at
      FROM threat_feeds f
      LEFT JOIN threat_indicators i ON i.source_feed = f.name
    `;

    const params: any[] = [];
    if (active !== null) {
      query += ` WHERE f.is_active = ?`;
      params.push(active === 'true' ? 1 : 0);
    }

    query += ` GROUP BY f.id ORDER BY f.name ASC`;

    const feeds = await db.execute({ sql: query, args: params });

    const feedList = feeds.rows.map((row: any) => {
      const lastFetch = row.last_fetch;
      const now = Date.now();
      const lastFetchTime = lastFetch ? new Date(lastFetch).getTime() : 0;
      const intervalMs = (row.fetch_interval_minutes || 60) * 60 * 1000;
      const actualCount = row.indicator_count || 0;

      let health = 'never_fetched';
      if (lastFetch) {
        const age = now - lastFetchTime;
        if (age < intervalMs * 2 && !row.last_error) {
          health = 'healthy';
        } else if (age < intervalMs * 4) {
          health = 'warning';
        } else {
          health = 'stale';
        }
      }
      if (row.last_error) {
        health = 'error';
      } else if (!row.is_active) {
        health = 'disabled';
      }

      return {
        id: row.id,
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

    const activeFeeds = feedList.filter(f => f.is_active);
    const healthyFeeds = feedList.filter(f => f.health === 'healthy');
    const totalIndicators = feedList.reduce((s, f) => s + f.indicator_count, 0);

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
