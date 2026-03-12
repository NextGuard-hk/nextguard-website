import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// Map threat_feeds.name to threat_indicators.source_feed
const feedNameMap: Record<string, string[]> = {
  'URLhaus': ['urlhaus'],
  'PhishTank': ['phishtank', 'phishing_army'],
  'C2IntelFeeds': ['c2_intel'],
  'OpenPhish': ['openphish'],
  'FeodoTracker': ['feodo_tracker'],
  'ThreatFox-IOCs': ['threatfox'],
  'AlienVault-OTX': ['ipsum', 'blocklist_de'],
  'EmergingThreats': ['emerging_threats', 'disposable_emails'],
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const db = getDB();

    // Get feeds from threat_feeds table
    let feedQuery = `SELECT * FROM threat_feeds`;
    const params: any[] = [];
    if (active !== null) {
      feedQuery += ` WHERE is_active = ?`;
      params.push(active === 'true' ? 1 : 0);
    }
    feedQuery += ` ORDER BY name ASC`;
    const feedsResult = await db.execute({ sql: feedQuery, args: params });

    // Get indicator counts grouped by source_feed
    const countsResult = await db.execute(`
      SELECT source_feed, COUNT(*) as cnt, MAX(created_at) as last_at
      FROM threat_indicators WHERE is_active = 1
      GROUP BY source_feed
    `);
    const countMap: Record<string, { count: number; lastAt: string | null }> = {};
    for (const row of countsResult.rows as any[]) {
      countMap[row.source_feed] = { count: row.cnt, lastAt: row.last_at };
    }

    const feedList = (feedsResult.rows as any[]).map((row) => {
      const mappedSources = feedNameMap[row.name] || [row.name.toLowerCase().replace(/[^a-z0-9]/g, '_')];
      let indicatorCount = 0;
      let lastIndicatorAt: string | null = null;
      for (const src of mappedSources) {
        const info = countMap[src];
        if (info) {
          indicatorCount += info.count;
          if (info.lastAt && (!lastIndicatorAt || info.lastAt > lastIndicatorAt)) {
            lastIndicatorAt = info.lastAt;
          }
        }
      }

      const lastFetch = row.last_fetch;
      const now = Date.now();
      const lastFetchTime = lastFetch ? new Date(lastFetch).getTime() : 0;
      const intervalMs = (row.fetch_interval_minutes || 60) * 60 * 1000;

      let health = 'never_fetched';
      if (indicatorCount > 0 && !lastFetch) {
        health = 'healthy';
      } else if (lastFetch) {
        const age = now - lastFetchTime;
        if (age < intervalMs * 2 && !row.last_error) health = 'healthy';
        else if (age < intervalMs * 4) health = 'warning';
        else health = 'stale';
      }
      if (row.last_error) health = 'error';
      else if (!row.is_active) health = 'disabled';

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
        indicator_count: indicatorCount,
        last_indicator_at: lastIndicatorAt,
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
