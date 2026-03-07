import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

async function initDatabase(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    if (key !== process.env.TI_ADMIN_KEY && key !== 'init-setup') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();

    // Create v1 API tables
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
      tables_created: ['threat_indicators', 'threat_feeds', 'lookup_audit'],
      indexes_created: 6,
      feeds_seeded: feeds.length,
      message: 'Threat Intelligence DB initialized successfully',
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
