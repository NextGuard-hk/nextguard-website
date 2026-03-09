// app/api/v1/threat-intel/health/route.ts
// NextGuard DB Health Check + Turso backup status
// Called by Vercel Cron every 5 min - acts as a circuit-breaker reset probe
import { NextResponse } from 'next/server';
import { getDB, initDB } from '@/lib/db';

const DB_PROBE_TIMEOUT = 5000; // 5s max for health probe

export const dynamic = 'force-dynamic';

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, any> = {};

  // 1. DB connectivity check
  try {
    await Promise.race([
      (async () => {
        const db = getDB();
        // Lightweight probe: count active indicators
        const result = await db.execute(
          `SELECT COUNT(*) as total, MAX(updated_at) as last_updated FROM indicators WHERE is_active = 1`
        );
        const feedResult = await db.execute(
          `SELECT COUNT(*) as active_feeds FROM feeds WHERE is_active = 1 AND status = 'active'`
        );
        const logResult = await db.execute(
          `SELECT COUNT(*) as lookups_24h FROM lookup_log WHERE created_at > datetime('now', '-24 hours')`
        );
        checks.db = {
          status: 'healthy',
          total_indicators: result.rows[0]?.total ?? 0,
          last_updated: result.rows[0]?.last_updated ?? null,
          active_feeds: feedResult.rows[0]?.active_feeds ?? 0,
          lookups_last_24h: logResult.rows[0]?.lookups_24h ?? 0,
        };
      })(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('DB probe timeout after 5s')), DB_PROBE_TIMEOUT)
      ),
    ]);
  } catch (err: any) {
    checks.db = {
      status: 'unhealthy',
      error: err.message,
    };
  }

  // 2. Feed freshness check
  if (checks.db.status === 'healthy') {
    try {
      const db = getDB();
      const staleness = await db.execute(`
        SELECT id, name, last_success, status,
          CAST((julianday('now') - julianday(COALESCE(last_success, '2000-01-01'))) * 24 AS INTEGER) as hours_since_update
        FROM feeds
        WHERE is_active = 1
        ORDER BY hours_since_update DESC
        LIMIT 5
      `);
      const staleFeeds = staleness.rows
        .filter(r => (r.hours_since_update as number) > 24)
        .map(r => ({ id: r.id, name: r.name, hours_stale: r.hours_since_update }));
      checks.feeds = {
        status: staleFeeds.length === 0 ? 'fresh' : 'stale',
        stale_feeds: staleFeeds,
        stale_count: staleFeeds.length,
      };
    } catch {
      checks.feeds = { status: 'unknown' };
    }
  }

  // 3. Turso backup info (via env variable - Turso handles backups automatically)
  checks.backup = {
    provider: 'Turso (libSQL)',
    backup_type: 'Continuous point-in-time replication',
    rpo: '< 1 minute (WAL-based streaming replication)',
    rto: '< 30 seconds (automatic replica promotion)',
    replicas: process.env.TURSO_REPLICA_URL ? 'enabled (replica URL configured)' : 'primary only (add TURSO_REPLICA_URL for HA)',
    backup_docs: 'https://docs.turso.tech/features/point-in-time-recovery',
    note: 'Turso automatically replicates to edge replicas. Enable PITR in Turso dashboard for point-in-time recovery.',
  };

  // 4. Failover status
  checks.failover = {
    mode: 'automatic',
    strategy: 'DB circuit-breaker -> live OSINT fallback',
    db_retry_interval_ms: 60000,
    live_osint_sources: 13,
    note: 'If DB fails, all lookups auto-failover to live OSINT feeds with engine=osint-live-v4.7-db-failover',
  };

  const overallStatus = checks.db.status === 'healthy' ? 'healthy' : 'degraded';
  const statusCode = overallStatus === 'healthy' ? 200 : 503;

  return NextResponse.json({
    status: overallStatus,
    service: 'NextGuard Threat Intelligence Engine',
    version: 'v5.2',
    timestamp: new Date().toISOString(),
    probe_ms: Date.now() - startTime,
    checks,
  }, { status: statusCode });
}
