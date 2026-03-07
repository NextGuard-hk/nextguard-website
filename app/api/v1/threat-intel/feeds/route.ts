import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');

    const db = getDb();

    let query = `
      SELECT 
        f.*,
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

    query += ` GROUP BY f.id ORDER BY f.last_fetch DESC`;

    const feeds = await db.execute({ sql: query, args: params });

    const feedList = feeds.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      url: row.url,
      type: row.type,
      format: row.format,
      is_active: Boolean(row.is_active),
      last_fetch: row.last_fetch,
      next_fetch: row.next_fetch,
      fetch_interval_minutes: row.fetch_interval_minutes,
      indicator_count: Number(row.indicator_count || 0),
      last_indicator_at: row.last_indicator_at,
      health: getHealthStatus(row),
    }));

    // Summary stats
    const totalActive = feedList.filter((f: any) => f.is_active).length;
    const totalIndicators = feedList.reduce((sum: number, f: any) => sum + f.indicator_count, 0);
    const healthyFeeds = feedList.filter((f: any) => f.health === 'healthy').length;

    return NextResponse.json({
      feeds: feedList,
      summary: {
        total: feedList.length,
        active: totalActive,
        healthy: healthyFeeds,
        total_indicators: totalIndicators,
        last_updated: new Date().toISOString(),
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { feed_name, is_active, fetch_interval_minutes } = body;

    if (!feed_name) {
      return NextResponse.json({ error: 'feed_name required' }, { status: 400 });
    }

    const db = getDb();
    const updates: string[] = [];
    const params: any[] = [];

    if (typeof is_active === 'boolean') {
      updates.push('is_active = ?');
      params.push(is_active ? 1 : 0);
    }

    if (fetch_interval_minutes) {
      updates.push('fetch_interval_minutes = ?');
      params.push(fetch_interval_minutes);

      // Recalculate next_fetch
      updates.push("next_fetch = datetime('now', '+' || ? || ' minutes')");
      params.push(fetch_interval_minutes);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    params.push(feed_name);
    await db.execute({
      sql: `UPDATE threat_feeds SET ${updates.join(', ')} WHERE name = ?`,
      args: params,
    });

    return NextResponse.json({ success: true, feed_name, updated: updates.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

function getHealthStatus(row: any): string {
  if (!row.is_active) return 'disabled';
  if (!row.last_fetch) return 'never_fetched';

  const lastFetch = new Date(row.last_fetch);
  const now = new Date();
  const minutesSinceLastFetch = (now.getTime() - lastFetch.getTime()) / 60000;
  const expectedInterval = row.fetch_interval_minutes || 60;

  if (minutesSinceLastFetch > expectedInterval * 3) return 'stale';
  if (minutesSinceLastFetch > expectedInterval * 1.5) return 'warning';
  return 'healthy';
}
