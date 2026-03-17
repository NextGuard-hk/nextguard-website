// lib/db.ts
// Turso (libSQL) database client for NextGuard Threat Intelligence
// Provides persistent IOC storage with STIX 2.1 compatible schema
// v2.2: Fixed initDB to avoid batch timeout on serverless
import { createClient, type Client } from '@libsql/client';

let client: Client | null = null;
let dbInitialized = false;

export function getDB(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;
    if (!url) throw new Error('TURSO_DATABASE_URL not configured');
    client = createClient({ url, authToken: authToken || undefined });
  }
  return client;
}

export const getDb = getDB;

// Safe init: runs once, sequential statements, no batch
export async function initDB(): Promise<void> {
  if (dbInitialized) return;
  dbInitialized = true;
  const db = getDB();
  const tables = [
    `CREATE TABLE IF NOT EXISTS indicators (id TEXT PRIMARY KEY, type TEXT NOT NULL, value TEXT NOT NULL, value_normalized TEXT NOT NULL, risk_level TEXT NOT NULL DEFAULT 'unknown', confidence INTEGER NOT NULL DEFAULT 50, tlp TEXT NOT NULL DEFAULT 'white', categories TEXT DEFAULT '[]', tags TEXT DEFAULT '[]', description TEXT, source_feed TEXT NOT NULL, source_ref TEXT, first_seen TEXT NOT NULL DEFAULT (datetime('now')), last_seen TEXT NOT NULL DEFAULT (datetime('now')), valid_from TEXT NOT NULL DEFAULT (datetime('now')), valid_until TEXT, kill_chain_phase TEXT, threat_actor TEXT, campaign TEXT, hit_count INTEGER NOT NULL DEFAULT 0, last_hit_at TEXT, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS feeds (id TEXT PRIMARY KEY, name TEXT NOT NULL, url TEXT NOT NULL, feed_type TEXT NOT NULL DEFAULT 'osint', indicator_type TEXT NOT NULL DEFAULT 'domain', parser TEXT NOT NULL DEFAULT 'text_lines', is_active INTEGER NOT NULL DEFAULT 1, enabled INTEGER NOT NULL DEFAULT 1, refresh_interval_min INTEGER NOT NULL DEFAULT 15, last_refresh TEXT, last_success TEXT, last_error TEXT, entries_count INTEGER NOT NULL DEFAULT 0, total_ingested INTEGER NOT NULL DEFAULT 0, avg_refresh_ms INTEGER DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', config TEXT DEFAULT '{}', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS ingestion_log (id INTEGER PRIMARY KEY AUTOINCREMENT, feed_id TEXT NOT NULL, started_at TEXT NOT NULL DEFAULT (datetime('now')), completed_at TEXT, status TEXT NOT NULL DEFAULT 'running', indicators_added INTEGER DEFAULT 0, indicators_updated INTEGER DEFAULT 0, indicators_removed INTEGER DEFAULT 0, duration_ms INTEGER, error_message TEXT)`,
    `CREATE TABLE IF NOT EXISTS lookup_log (id INTEGER PRIMARY KEY AUTOINCREMENT, indicator_value TEXT NOT NULL, indicator_type TEXT, result_risk_level TEXT, sources_hit INTEGER DEFAULT 0, sources_checked INTEGER DEFAULT 0, lookup_ms INTEGER, client_ip TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS threat_indicators (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, value TEXT NOT NULL, source_feed TEXT NOT NULL, confidence INTEGER DEFAULT 50, severity TEXT DEFAULT 'medium', threat_category TEXT, first_seen TEXT DEFAULT (datetime('now')), last_seen TEXT DEFAULT (datetime('now')), expiry TEXT, is_active INTEGER DEFAULT 1, tags TEXT, stix_id TEXT, stix_pattern TEXT, raw_data TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS threat_feeds (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, url TEXT NOT NULL, type TEXT NOT NULL, format TEXT DEFAULT 'csv', is_active INTEGER DEFAULT 1, last_fetch TEXT, next_fetch TEXT, fetch_interval_minutes INTEGER DEFAULT 60, last_error TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS lookup_audit (id INTEGER PRIMARY KEY AUTOINCREMENT, query_type TEXT NOT NULL, query_value TEXT NOT NULL, verdict TEXT NOT NULL, sources_hit TEXT, confidence INTEGER, lookup_ms REAL, client_ip TEXT, checked_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS url_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, category TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'ut1', created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS custom_url_categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, action TEXT NOT NULL DEFAULT 'Block', is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS custom_url_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, category_id INTEGER NOT NULL, domain TEXT NOT NULL, added_by TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS url_policy_overrides (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL UNIQUE, action TEXT NOT NULL, reason TEXT, added_by TEXT, expires_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS url_policy_groups (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, description TEXT, priority INTEGER NOT NULL DEFAULT 100, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS url_policy_group_rules (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL, category TEXT NOT NULL, action TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS url_policy_user_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, group_id INTEGER NOT NULL, assigned_at TEXT NOT NULL DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS url_policy_schedules (id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER NOT NULL, days_of_week TEXT NOT NULL DEFAULT '["mon","tue","wed","thu","fri"]', start_time INTEGER NOT NULL DEFAULT 900, end_time INTEGER NOT NULL DEFAULT 1800, is_active INTEGER NOT NULL DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS url_policy_log (id INTEGER PRIMARY KEY AUTOINCREMENT, domain TEXT NOT NULL, action TEXT NOT NULL, category TEXT, risk_level TEXT, user_id TEXT, evaluated_at TEXT NOT NULL DEFAULT (datetime('now')))`,
  ];
  const indexes = [
    `CREATE INDEX IF NOT EXISTS idx_indicators_value ON indicators(value_normalized)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_type_value ON indicators(type, value_normalized)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_source ON indicators(source_feed)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_risk ON indicators(risk_level)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_active ON indicators(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_valid ON indicators(valid_from, valid_until)`,
    `CREATE INDEX IF NOT EXISTS idx_indicators_last_seen ON indicators(last_seen)`,
    `CREATE INDEX IF NOT EXISTS idx_ingestion_feed ON ingestion_log(feed_id)`,
    `CREATE INDEX IF NOT EXISTS idx_ingestion_status ON ingestion_log(status)`,
    `CREATE INDEX IF NOT EXISTS idx_lookup_created ON lookup_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_lookup_value ON lookup_log(indicator_value)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_value ON threat_indicators(value)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_type ON threat_indicators(type)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_type_value ON threat_indicators(type, value)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_source ON threat_indicators(source_feed)`,
    `CREATE INDEX IF NOT EXISTS idx_ti_active ON threat_indicators(is_active)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_urlcat_domain_source ON url_categories(domain, source)`,
    `CREATE INDEX IF NOT EXISTS idx_urlcat_domain ON url_categories(domain)`,
    `CREATE INDEX IF NOT EXISTS idx_urlcat_category ON url_categories(category)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_cue_domain_cat ON custom_url_entries(domain, category_id)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_upa_user_group ON url_policy_user_assignments(user_id, group_id)`,
    `CREATE INDEX IF NOT EXISTS idx_upl_evaluated ON url_policy_log(evaluated_at)`,
    `CREATE INDEX IF NOT EXISTS idx_upl_domain ON url_policy_log(domain)`,
    `CREATE INDEX IF NOT EXISTS idx_la_checked ON lookup_audit(checked_at)`,
  ];
  try {
    // Run tables first, then indexes - sequential to avoid batch timeout
    for (const sql of tables) {
      await db.execute(sql);
    }
    for (const sql of indexes) {
      await db.execute(sql);
    }
    await seedFeeds(db);
  } catch (e) {
    console.error('initDB error (non-fatal, tables likely exist):', e);
  }
}

async function seedFeeds(db: Client): Promise<void> {
  const feeds = [
    {id:'urlhaus',name:'URLhaus',url:'https://urlhaus.abuse.ch/downloads/text_online/',type:'domain',parser:'urlhaus'},
    {id:'phishing_army',name:'Phishing Army',url:'https://phishing.army/download/phishing_army_blocklist.txt',type:'domain',parser:'text_lines'},
    {id:'openphish',name:'OpenPhish',url:'https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt',type:'url',parser:'url_to_domain'},
    {id:'phishtank',name:'PhishTank',url:'https://raw.githubusercontent.com/mitchellkrogza/Phishing.Database/master/phishing-domains-ACTIVE.txt',type:'domain',parser:'text_lines'},
    {id:'threatfox',name:'ThreatFox',url:'https://threatfox.abuse.ch/downloads/hostfile/',type:'domain',parser:'hostfile'},
    {id:'feodo_tracker',name:'Feodo Tracker',url:'https://feodotracker.abuse.ch/downloads/ipblocklist.txt',type:'ipv4-addr',parser:'text_lines'},
    {id:'c2_intel',name:'C2 Intel',url:'https://raw.githubusercontent.com/drb-ra/C2IntelFeeds/master/feeds/IPC2s-30day.csv',type:'ipv4-addr',parser:'c2intel_csv'},
    {id:'ipsum',name:'IPsum',url:'https://raw.githubusercontent.com/stamparm/ipsum/master/levels/3.txt',type:'ipv4-addr',parser:'ipsum'},
    {id:'blocklist_de',name:'blocklist.de',url:'https://lists.blocklist.de/lists/all.txt',type:'ipv4-addr',parser:'text_lines'},
    {id:'emerging_threats',name:'Emerging Threats',url:'https://rules.emergingthreats.net/blockrules/compromised-ips.txt',type:'ipv4-addr',parser:'text_lines'},
    {id:'disposable_emails',name:'Disposable Emails',url:'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf',type:'email-addr',parser:'text_lines'},
    {id:'shallalist',name:'Shallalist URL Categories',url:'https://shallalist.de/Downloads/shallalist.tar.gz',type:'domain',parser:'shallalist'},
    {id:'ut1_categories',name:'UT1 URL Categories',url:'https://dsi.ut-capitole.fr/blacklists/download/blacklists.tar.gz',type:'domain',parser:'ut1'},
  ];
  for (const f of feeds) {
    await db.execute({sql:`INSERT OR IGNORE INTO feeds (id,name,url,indicator_type,parser,is_active,enabled,status) VALUES (?,?,?,?,?,1,1,'pending')`,args:[f.id,f.name,f.url,f.type,f.parser]});
    await db.execute({sql:`UPDATE feeds SET is_active=1,enabled=1,indicator_type=?,parser=? WHERE id=?`,args:[f.type,f.parser,f.id]});
  }
}

export function generateIndicatorId(type: string, value: string, source: string): string {
  const hash = Buffer.from(`${type}:${value}:${source}`).toString('base64url').slice(0, 16);
  return `indicator--${source}-${hash}`;
}

export function normalizeValue(value: string, type: string): string {
  let v = value.toLowerCase().trim();
  if (type === 'domain' || type === 'email-addr') { v = v.replace(/^www\./, ''); }
  if (type === 'url') { try { const u = new URL(v.startsWith('http') ? v : `https://${v}`); v = u.hostname.replace(/^www\./, ''); } catch {} }
  return v;
}
