// lib/threat-intel-db.ts
// NextGuard Threat Intelligence Engine v5.0 - DB Persistent Edition
// Replaces in-memory Set caching with Turso (libSQL) persistent storage
// Architecture: Feed ingestion writes to DB; lookups query DB with index

import { getDB, initDB, generateIndicatorId, normalizeValue } from './db';
import type { RiskLevel, ThreatIntelResult, SourceHit } from './threat-intel';

// Feed-specific confidence scores (based on source reputation)
const FEED_CONFIDENCE: Record<string, number> = {
  urlhaus: 95,       // abuse.ch - high quality, verified active malware
  phishing_army: 85, // Community curated phishing domains
  openphish: 90,     // Automated phishing detection
  phishtank: 88,     // Crowd-verified phishing URLs
  threatfox: 92,     // abuse.ch IOC sharing platform
  feodo_tracker: 95, // abuse.ch C2 botnet IPs
  c2_intel: 88,      // 30-day rolling C2 server IPs
  ipsum: 80,         // Aggregated IP reputation
  blocklist_de: 78,  // Attack source IPs
  emerging_threats: 82, // Compromised hosts
  disposable_emails: 70, // Disposable email domains
  local_ioc: 99,     // Internal curated IOCs
};

// Feed risk level assignments
const FEED_RISK: Record<string, RiskLevel> = {
  urlhaus: 'known_malicious',
  phishing_army: 'known_malicious',
  openphish: 'known_malicious',
  phishtank: 'known_malicious',
  threatfox: 'known_malicious',
  feodo_tracker: 'known_malicious',
  c2_intel: 'known_malicious',
  ipsum: 'high_risk',
  blocklist_de: 'high_risk',
  emerging_threats: 'high_risk',
  disposable_emails: 'low_risk',
};

// Feed categories
const FEED_CATEGORIES: Record<string, string[]> = {
  urlhaus: ['malware', 'malware_distribution'],
  phishing_army: ['phishing'],
  openphish: ['phishing'],
  phishtank: ['phishing'],
  threatfox: ['malware', 'c2'],
  feodo_tracker: ['botnet', 'c2', 'banking_trojan'],
  c2_intel: ['c2', 'botnet'],
  ipsum: ['threat_ip', 'scanner'],
  blocklist_de: ['attack_source', 'brute_force'],
  emerging_threats: ['compromised', 'exploit'],
  disposable_emails: ['disposable_email', 'spam'],
};

// IOC valid duration by feed (days)
const FEED_TTL_DAYS: Record<string, number> = {
  urlhaus: 30,
  phishing_army: 7,
  openphish: 3,
  phishtank: 30,
  threatfox: 90,
  feodo_tracker: 60,
  c2_intel: 30,
  ipsum: 7,
  blocklist_de: 14,
  emerging_threats: 7,
  disposable_emails: 365,
  local_ioc: 3650,
};
// DB is initialized via /api/v1/threat-intel/init endpoint
// No need to call initDB() on every request
async function ensureDB(): Promise<void> {
  // Tables already created by init endpoint
    getDB();
  
  }
}

// Batch upsert indicators into DB
export async function ingestIndicators(
  feedId: string,
  indicators: Array<{ value: string; type: string; description?: string; threat_actor?: string; campaign?: string }>
): Promise<{ added: number; updated: number }> {
  await ensureDB();
  const db = getDB();

  const ttlDays = FEED_TTL_DAYS[feedId] ?? 30;
  const validUntil = new Date(Date.now() + ttlDays * 86400000).toISOString();
  const confidence = FEED_CONFIDENCE[feedId] ?? 70;
  const riskLevel = FEED_RISK[feedId] ?? 'medium_risk';
  const categories = JSON.stringify(FEED_CATEGORIES[feedId] ?? []);

  let added = 0;
  let updated = 0;

  // Process in batches of 500 for Turso write efficiency
  const BATCH_SIZE = 500;
  for (let i = 0; i < indicators.length; i += BATCH_SIZE) {
    const batch = indicators.slice(i, i + BATCH_SIZE);
    const statements = batch.map(ind => {
      const normalized = normalizeValue(ind.value, ind.type);
      const id = generateIndicatorId(ind.type, normalized, feedId);
      return {
        sql: `INSERT INTO indicators 
          (id, type, value, value_normalized, risk_level, confidence, categories,
           description, source_feed, valid_from, valid_until, threat_actor, campaign, is_active, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, ?, ?, 1, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET
            last_seen = datetime('now'),
            is_active = 1,
            updated_at = datetime('now'),
            confidence = excluded.confidence`,
        args: [
          id, ind.type, ind.value, normalized, riskLevel, confidence, categories,
          ind.description ?? null, feedId, validUntil,
          ind.threat_actor ?? null, ind.campaign ?? null
        ],
      };
    });

    try {
      await db.batch(statements, 'write');
      added += batch.length;
    } catch (e) {
      // Fall back to individual inserts on batch error
      for (const stmt of statements) {
        try {
          const result = await db.execute(stmt);
          if (result.rowsAffected > 0) added++;
        } catch { updated++; }
      }
    }
  }

  // Update feed stats
  await db.execute({
    sql: `UPDATE feeds SET 
      entries_count = (SELECT COUNT(*) FROM indicators WHERE source_feed = ? AND is_active = 1),
      total_ingested = total_ingested + ?,
      last_success = datetime('now'),
      last_refresh = datetime('now'),
      status = 'active',
      updated_at = datetime('now')
      WHERE id = ?`,
    args: [feedId, added + updated, feedId],
  });

  return { added, updated };
}

// Mark expired indicators as inactive
export async function expireOldIndicators(feedId?: string): Promise<number> {
  await ensureDB();
  const db = getDB();
  const result = await db.execute({
    sql: feedId
      ? `UPDATE indicators SET is_active = 0, updated_at = datetime('now') WHERE source_feed = ? AND valid_until < datetime('now') AND is_active = 1`
      : `UPDATE indicators SET is_active = 0, updated_at = datetime('now') WHERE valid_until < datetime('now') AND is_active = 1`,
    args: feedId ? [feedId] : [],
  });
  return result.rowsAffected;
}

// Core lookup: query DB for an indicator
export async function lookupIndicator(value: string): Promise<{
  hits: Array<{ feed: string; risk_level: RiskLevel; confidence: number; categories: string[]; first_seen: string; last_seen: string }>;
  totalChecked: number;
}> {
  await ensureDB();
  const db = getDB();

  // Normalize all forms to check
  const normalized = value.toLowerCase().trim().replace(/^www\./, '');
  let hostname = normalized;
  try {
    hostname = new URL(value.startsWith('http') ? value : `https://${value}`).hostname.toLowerCase().replace(/^www\./, '');
  } catch {}

  const valuesToCheck = [...new Set([normalized, hostname])].filter(Boolean);

  const placeholders = valuesToCheck.map(() => '?').join(',');
  const result = await db.execute({
    sql: `SELECT source_feed, risk_level, confidence, categories, first_seen, last_seen
          FROM indicators
          WHERE value_normalized IN (${placeholders})
            AND is_active = 1
          ORDER BY confidence DESC`,
    args: valuesToCheck,
  });

  const hits = result.rows.map(row => ({
    feed: row.source_feed as string,
    risk_level: row.risk_level as RiskLevel,
    confidence: row.confidence as number,
    categories: JSON.parse((row.categories as string) || '[]') as string[],
    first_seen: row.first_seen as string,
    last_seen: row.last_seen as string,
  }));

  // Count total active feeds for "sources checked"
  const feedCount = await db.execute(`SELECT COUNT(*) as cnt FROM feeds WHERE enabled = 1 AND status = 'active'`);
  const totalChecked = (feedCount.rows[0]?.cnt as number) || 11;

  // Log the lookup for analytics
  try {
    await db.execute({
      sql: `INSERT INTO lookup_log (indicator_value, result_risk_level, sources_hit, sources_checked)
            VALUES (?, ?, ?, ?)`,
      args: [normalized, hits[0]?.risk_level ?? 'clean', hits.length, totalChecked],
    });
  } catch {}

  // Update hit_count for matched indicators
  if (hits.length > 0) {
    await db.execute({
      sql: `UPDATE indicators SET hit_count = hit_count + 1, last_hit_at = datetime('now')
            WHERE value_normalized IN (${placeholders}) AND is_active = 1`,
      args: valuesToCheck,
    });
  }

  return { hits, totalChecked };
}

// Get all feed statuses from DB
export async function getFeedStatusFromDB() {
  await ensureDB();
  const db = getDB();

  const result = await db.execute(
    `SELECT id, name, status, entries_count, last_success, last_error, last_refresh, feed_type
     FROM feeds ORDER BY name ASC`
  );

  const totalResult = await db.execute(
    `SELECT COUNT(*) as total FROM indicators WHERE is_active = 1`
  );

  const feeds = result.rows.map(row => ({
    name: row.name as string,
    id: row.id as string,
    status: row.status as string,
    entries: row.entries_count as number,
    lastUpdated: row.last_success as string | null,
    lastError: row.last_error as string | null,
    feed_type: row.feed_type as string,
  }));

  return {
    feeds,
    totalEntries: (totalResult.rows[0]?.total as number) || 0,
    lastUpdated: feeds.find(f => f.lastUpdated)?.lastUpdated ?? null,
    feedErrors: feeds.filter(f => f.status === 'error').map(f => f.name),
  };
}

// DB-backed stats for dashboard
export async function getThreatIntelStats() {
  await ensureDB();
  const db = getDB();

  const [byRisk, byFeed, recentLookups, topHits] = await Promise.all([
    db.execute(`SELECT risk_level, COUNT(*) as cnt FROM indicators WHERE is_active = 1 GROUP BY risk_level`),
    db.execute(`SELECT source_feed, COUNT(*) as cnt FROM indicators WHERE is_active = 1 GROUP BY source_feed ORDER BY cnt DESC`),
    db.execute(`SELECT COUNT(*) as cnt FROM lookup_log WHERE created_at > datetime('now', '-24 hours')`),
    db.execute(`SELECT indicator_value, hit_count FROM indicators WHERE hit_count > 0 ORDER BY hit_count DESC LIMIT 10`),
  ]);

  return {
    byRiskLevel: Object.fromEntries(byRisk.rows.map(r => [r.risk_level, r.cnt])),
    byFeed: Object.fromEntries(byFeed.rows.map(r => [r.source_feed, r.cnt])),
    lookupsLast24h: (recentLookups.rows[0]?.cnt as number) || 0,
    topHitIndicators: topHits.rows.map(r => ({ value: r.indicator_value, hits: r.hit_count })),
  };
}
