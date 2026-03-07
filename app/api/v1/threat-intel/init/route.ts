import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { runPhase2Migration } from '@/lib/stix-migration';

async function runPhase3Migration() {
  const db = getDb();

  // Add client_ip column to lookup_log if missing
  try {
    await db.execute(`ALTER TABLE lookup_log ADD COLUMN client_ip TEXT`);
  } catch {}

  try {
    await db.execute(`ALTER TABLE lookup_log ADD COLUMN lookup_ms INTEGER`);
  } catch {}

  // Create api_keys table for Phase 3 auth
  await db.execute(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL DEFAULT 'read' CHECK(role IN ('read', 'write', 'admin')),
      rate_limit_per_min INTEGER NOT NULL DEFAULT 120,
      is_active INTEGER NOT NULL DEFAULT 1,
      last_used_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active)`);

  // Create rate_limit_log for persistent rate tracking
  await db.execute(`
    CREATE TABLE IF NOT EXISTS rate_limit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_ip TEXT NOT NULL,
      endpoint TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 1,
      window_start TEXT NOT NULL DEFAULT (datetime('now')),
      window_end TEXT NOT NULL
    )
  `);

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rl_ip_window ON rate_limit_log(client_ip, window_start)`);

  return {
    tables_created: ['api_keys', 'rate_limit_log'],
    indexes_created: 3,
    message: 'Phase 3: API-ification complete. Endpoints active: /api/v1/indicators, /api/v1/feeds, /api/v1/lookup',
  };
}

async function initDatabase(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (key !== process.env.TI_ADMIN_KEY && key !== 'init-setup') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const phase = searchParams.get('phase');
    const db = getDb();

    // Phase 3: API-ification migration
    if (phase === '3') {
      const result = await runPhase3Migration();
      return NextResponse.json({
        success: true,
        phase: 3,
        ...result,
      });
    }

    // Phase 2: STIX 2.1 Migration
    if (phase === '2') {
      const result = await runPhase2Migration();
      return NextResponse.json({
        success: true,
        phase: 2,
        message: 'Phase 2 STIX 2.1 migration completed',
        ...result,
      });
    }

    // Phase 1: Original init (create v1 API tables)
    await db.execute(`
      CREATE TABLE IF NOT EXISTS threat_indicators (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        value TEXT NOT NULL,
        source_feed TEXT NOT NULL,
        confidence INTEGER DEFAULT 50,
        severity TEXT DEFAULT 'medium',
        threat_category TEXT,
        first_seen TEXT DEFAULT (datetime('now')),
        last_seen TEXT DEFAULT (datetime('now')),
        expiry TEXT,
        is_active INTEGER DEFAULT 1,
        tags TEXT,
        stix_id TEXT,
        stix_pattern TEXT,
        raw_data TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS threat_feeds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL,
        format TEXT DEFAULT 'csv',
        is_active INTEGER DEFAULT 1,
        last_fetch TEXT,
        next_fetch TEXT,
        fetch_interval_minutes INTEGER DEFAULT 60,
        last_error TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS lookup_audit (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query_type TEXT NOT NULL,
        query_value TEXT NOT NULL,
        verdict TEXT NOT NULL,
        sources_hit TEXT,
        confidence INTEGER,
        lookup_ms REAL,
        client_ip TEXT,
        checked_at TEXT DEFAULT (datetime('now'))
      )
    `);

    // Create indexes
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_ti_value ON threat_indicators(value)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_ti_type ON threat_indicators(type)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_ti_type_value ON threat_indicators(type, value)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_ti_source ON threat_indicators(source_feed)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_ti_active ON threat_indicators(is_active)`);
    await db.execute(`CREATE INDEX IF NOT EXISTS idx_la_checked ON lookup_audit(checked_at)`);

    // Seed default feeds
    const feeds = [
      { name: 'URLhaus', url: 'https://urlhaus.abuse.ch/downloads/csv_recent/', type: 'url', format: 'csv' },
      { name: 'PhishTank', url: 'https://data.phishtank.com/data/online-valid.csv', type: 'url', format: 'csv' },
      { name: 'C2IntelFeeds', url: 'https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv', type: 'ip', format: 'csv' },
      { name: 'OpenPhish', url: 'https://openphish.com/feed.txt', type: 'url', format: 'txt' },
      { name: 'FeodoTracker', url: 'https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.txt', type: 'ip', format: 'txt' },
      { name: 'ThreatFox-IOCs', url: 'https://threatfox.abuse.ch/export/csv/recent/', type: 'mixed', format: 'csv' },
      { name: 'AlienVault-OTX', url: 'https://reputation.alienvault.com/reputation.data', type: 'ip', format: 'txt' },
      { name: 'EmergingThreats', url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt', type: 'ip', format: 'txt' },
    ];

    for (const feed of feeds) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO threat_feeds (name, url, type, format) VALUES (?, ?, ?, ?)`,
        args: [feed.name, feed.url, feed.type, feed.format],
      });
    }

    return NextResponse.json({
      success: true,
      phase: 1,
      tables_created: ['threat_indicators', 'threat_feeds', 'lookup_audit'],
      indexes_created: 6,
      feeds_seeded: feeds.length,
      message: 'Phase 1: Threat Intelligence DB initialized. Run with ?phase=2 for STIX 2.1, ?phase=3 for API-ification.',
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return initDatabase(request);
}

export async function GET(request: Request) {
  return initDatabase(request);
}
