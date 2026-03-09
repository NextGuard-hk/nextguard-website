// lib/db.ts
// Turso (libSQL) database client for NextGuard Threat Intelligence
// Provides persistent IOC storage with STIX 2.1 compatible schema
import { createClient, type Client } from '@libsql/client';
let client: Client | null = null;
export function getDB(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL not configured');
    client = createClient({ url, authToken: authToken || undefined });
  }
  return client;
}
// Alias for v1 API routes
export const getDb = getDB;
// Initialize database schema (idempotent - safe to call multiple times)
export async function initDB(): Promise<void> {
  const db = getDB();
  await db.batch([
    // Core IOC indicators table (STIX 2.1 aligned)
    `CREATE TABLE IF NOT EXISTS indicators (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('domain','ipv4-addr','ipv6-addr','url','email-addr','file-hash')),
      value TEXT NOT NULL,
      value_normalized TEXT NOT NULL,
      risk_level TEXT NOT NULL DEFAULT 'unknown' CHECK(risk_level IN ('known_malicious','high_risk','medium_risk','low_risk','clean','unknown')),
      confidence INTEGER NOT NULL DEFAULT 50 CHECK(confidence BETWEEN 0 AND 100),
      tlp TEXT NOT NULL DEFAULT 'white' CHECK(tlp IN ('white','green','amber','red')),
      categories TEXT DEFAULT '[]',
      tags TEXT DEFAULT '[]',
      description TEXT,
      source_feed TEXT NOT NULL,
      source_ref TEXT,
      first_seen TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      valid_from TEXT NOT NULL DEFAULT (datetime('now')),
      valid_until TEXT,
      kill_chain_phase TEXT,
      threat_actor TEXT,
      campaign TEXT,
      hit_count INTEGER NOT NULL DEFAULT 0,
      last_hit_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_value ON indicators(value_normalized)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_type_value ON indicators(type, value_normalized)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_source ON indicators(source_feed)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_risk ON indicators(risk_level)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_active ON indicators(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_valid ON indicators(valid_from, valid_until)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_last_seen ON indicators(last_seen)`,
    // Feed management table
    `CREATE TABLE IF NOT EXISTS feeds (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      url TEXT NOT NULL,
      feed_type TEXT NOT NULL DEFAULT 'osint' CHECK(feed_type IN ('osint','commercial','internal','community')),
      indicator_type TEXT NOT NULL DEFAULT 'domain',
      parser TEXT NOT NULL DEFAULT 'text_lines',
      is_active INTEGER NOT NULL DEFAULT 1,
      enabled INTEGER NOT NULL DEFAULT 1,
      refresh_interval_min INTEGER NOT NULL DEFAULT 15,
      last_refresh TEXT,
      last_success TEXT,
      last_error TEXT,
      entries_count INTEGER NOT NULL DEFAULT 0,
      total_ingested INTEGER NOT NULL DEFAULT 0,
      avg_refresh_ms INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('active','error','pending','disabled')),
      config TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS ingestion_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feed_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      status TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running','success','error','partial')),
      indicators_added INTEGER DEFAULT 0,
      indicators_updated INTEGER DEFAULT 0,
      indicators_removed INTEGER DEFAULT 0,
      duration_ms INTEGER,
      error_message TEXT,
      FOREIGN KEY (feed_id) REFERENCES feeds(id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ingestion_feed ON ingestion_log(feed_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_log(status)`,
    `CREATE TABLE IF NOT EXISTS lookup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      indicator_value TEXT NOT NULL,
      indicator_type TEXT,
      result_risk_level TEXT,
      sources_hit INTEGER DEFAULT 0,
      sources_checked INTEGER DEFAULT 0,
      lookup_ms INTEGER,
      client_ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lookup_created ON lookup_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_lookup_value ON lookup_log(indicator_value)`,
    `CREATE TABLE IF NOT EXISTS threat_indicators (
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
    )`,
    `CREATE INDEX IF NOT EXISTS idx_ti_value ON threat_indicators(value)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_type ON threat_indicators(type)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_type_value ON threat_indicators(type, value)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_source ON threat_indicators(source_feed)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_active ON threat_indicators(is_active)`,
    `CREATE TABLE IF NOT EXISTS threat_feeds (
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
    )`,
    `CREATE TABLE IF NOT EXISTS lookup_audit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      query_type TEXT NOT NULL,
      query_value TEXT NOT NULL,
      verdict TEXT NOT NULL,
      sources_hit TEXT,
      confidence INTEGER,
      lookup_ms REAL,
      client_ip TEXT,
      checked_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_la_checked ON lookup_audit(checked_at)`,
    // URL Categories table - stores domain->category mappings from Shallalist/UT1
    `CREATE TABLE IF NOT EXISTS url_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domain TEXT NOT NULL,
      category TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'shallalist',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_urlcat_domain_source ON url_categories(domain, source)`,
    `CREATE INDEX IF NOT EXISTS idx_urlcat_domain ON url_categories(domain)`,
    `CREATE INDEX IF NOT EXISTS idx_urlcat_category ON url_categories(category)`,
  ], 'write');
  // Run migrations to add missing columns to existing tables
  await runMigrations(db);
  // Seed default feed configurations
  await seedFeeds(db);
}
async function runMigrations(db: Client): Promise<void> {
  // Migration: add is_active and enabled columns to feeds if missing
  const migrations = [
    `ALTER TABLE feeds ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE feeds ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1`,
    `ALTER TABLE feeds ADD COLUMN indicator_type TEXT NOT NULL DEFAULT 'domain'`,
    `ALTER TABLE feeds ADD COLUMN parser TEXT NOT NULL DEFAULT 'text_lines'`,
    `ALTER TABLE feeds ADD COLUMN feed_type TEXT NOT NULL DEFAULT 'osint'`,
    `ALTER TABLE feeds ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE feeds ADD COLUMN entries_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE feeds ADD COLUMN total_ingested INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE feeds ADD COLUMN last_refresh TEXT`,
    `ALTER TABLE feeds ADD COLUMN last_success TEXT`,
    `ALTER TABLE feeds ADD COLUMN last_error TEXT`,
  ];
  for (const sql of migrations) {
    try { await db.execute(sql); } catch { /* column already exists */ }
  }
}
async function seedFeeds(db: Client): Promise<void> {
  const feeds = [
    { id: 'urlhaus', name: 'URLhaus', url: 'https://urlhaus.abuse.ch/downloads/text_online/', type: 'domain', parser: 'urlhaus' },
    { id: 'phishing_army', name: 'Phishing Army', url: 'https://phishing.army/download/phishing_army_blocklist.txt', type: 'domain', parser: 'text_lines' },
    { id: 'openphish', name: 'OpenPhish', url: 'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt', type: 'url', parser: 'url_to_domain' },
    { id: 'phishtank', name: 'PhishTank', url: 'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt', type: 'domain', parser: 'text_lines' },
    { id: 'threatfox', name: 'ThreatFox', url: 'https://threatfox.abuse.ch/downloads/hostfile/', type: 'domain', parser: 'hostfile' },
    { id: 'feodo_tracker', name: 'Feodo Tracker', url: 'https://feodotracker.abuse.ch/downloads/ipblocklist.txt', type: 'ipv4-addr', parser: 'text_lines' },
    { id: 'c2_intel', name: 'C2 Intel', url: 'https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv', type: 'ipv4-addr', parser: 'c2intel_csv' },
    { id: 'ipsum', name: 'IPsum', url: 'https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt', type: 'ipv4-addr', parser: 'ipsum' },
    { id: 'blocklist_de', name: 'blocklist.de', url: 'https://lists.blocklist.de/lists/all.txt', type: 'ipv4-addr', parser: 'text_lines' },
    { id: 'emerging_threats', name: 'Emerging Threats', url: 'https://rules.emergingthreats.net/blockrules/compromised-ips.txt', type: 'ipv4-addr', parser: 'text_lines' },
    { id: 'disposable_emails', name: 'Disposable Emails', url: 'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf', type: 'email-addr', parser: 'text_lines' },
    { id: 'shallalist', name: 'Shallalist URL Categories', url: 'https://shallalist.de/Downloads/shallalist.tar.gz', type: 'domain', parser: 'shallalist' },
    { id: 'ut1_categories', name: 'UT1 URL Categories', url: 'https://dsi.ut-capitole.fr/blacklists/download/blacklists.tar.gz', type: 'domain', parser: 'ut1' },
  ];
  for (const f of feeds) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO feeds (id, name, url, indicator_type, parser, is_active, enabled, status) VALUES (?, ?, ?, ?, ?, 1, 1, 'pending')`,
      args: [f.id, f.name, f.url, f.type, f.parser],
    });
    // Update existing feeds to ensure is_active=1
    await db.execute({
      sql: `UPDATE feeds SET is_active = 1, enabled = 1, indicator_type = ?, parser = ? WHERE id = ?`,
      args: [f.type, f.parser, f.id],
    });
  }
}
// Helper: generate STIX-style indicator ID
export function generateIndicatorId(type: string, value: string, source: string): string {
  const hash = Buffer.from(`${type}:${value}:${source}`).toString('base64url').slice(0, 16);
  return `indicator--${source}-${hash}`;
}
// Helper: normalize indicator value for consistent lookup
export function normalizeValue(value: string, type: string): string {
  let v = value.toLowerCase().trim();
  if (type === 'domain' || type === 'email-addr') {
    v = v.replace(/^www\./, '');
  }
  if (type === 'url') {
    try {
      const u = new URL(v.startsWith('http') ? v : `https://${v}`);
      v = u.hostname.replace(/^www\./, '');
    } catch {}
  }
  return v;
}
