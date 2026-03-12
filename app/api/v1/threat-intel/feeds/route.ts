import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const db = getDB();

    // Query from 'feeds' table (Phase 2 STIX) - where ingestIndicators writes
    const feedsResult = await db.execute('SELECT * FROM feeds ORDER BY name ASC');

    // Get indicator counts from 'indicators' table (Phase 2 STIX)
    const countsResult = await db.execute(
      'SELECT source_feed, COUNT(*) as cnt, MAX(updated_at) as last_at FROM indicators WHERE is_active = 1 GROUP BY source_feed'
    );
    const countMap: Record<string, { count: number; lastAt: string | null }> = {};
    for (const row of countsResult.rows) {
      const r = row as any;
      if (r.source_feed) countMap[r.source_feed] = { count: Number(r.cnt), lastAt: r.last_at };
    }

    const feedList = (feedsResult.rows as any[]).map((row) => {
      const feedId = row.id as string;
      const countInfo = countMap[feedId];
      const indicatorCount = row.entries_count || countInfo?.count || 0;
      const lastIndicatorAt = countInfo?.lastAt || null;

      let health = 'never_fetched';
      if (row.status === 'active' && indicatorCount > 0) {
        health = 'healthy';
      } else if (row.status === 'error') {
        health = 'error';
      } else if (row.status === 'active') {
        health = 'warning';
      }
      if (!row.is_active) health = 'disabled';

      return {
        id: feedId,
        name: row.name || feedId,
        url: row.feed_url || '',
        type: row.feed_type || 'unknown',
        format: row.format || 'txt',
        is_active: Boolean(row.is_active),
        last_fetch: row.last_success || null,
        next_fetch: row.last_refresh || null,
        fetch_interval_minutes: 60,
        indicator_count: indicatorCount,
        last_indicator_at: lastIndicatorAt,
        health,
      };
    });

    // Filter by active if requested
    const filtered = active !== null
      ? feedList.filter(f => f.is_active === (active === 'true'))
      : feedList;

    const activeFeeds = filtered.filter(f => f.is_active);
    const healthyFeeds = filtered.filter(f => f.health === 'healthy');
    const totalIndicators = filtered.reduce((s, f) => s + f.indicator_count, 0);

    return NextResponse.json({
      feeds: filtered,
      summary: {
        total: filtered.length,
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
