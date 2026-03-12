// app/api/cron/ingest-feeds/route.ts
// Vercel Cron: fetch all enabled OSINT feeds and store indicators in Turso DB
// Triggered every 15 minutes via vercel.json
// FIXED v2: correct column names (is_active, indicator_type, parser) matching db.ts schema
import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

const MAX_PER_FEED = 500000;
const BATCH_SIZE = 200;

// Feed ID -> risk_level mapping
const FEED_RISK: Record<string, string> = {
  phishtank: 'known_malicious',
  openphish: 'known_malicious',
  urlhaus: 'known_malicious',
  phishing_army: 'known_malicious',
  threatfox: 'known_malicious',
  feodo_tracker: 'known_malicious',
  c2_intel: 'known_malicious',
  blocklist_de: 'high_risk',
  emerging_threats: 'high_risk',
  ipsum: 'high_risk',
  disposable_emails: 'low_risk',
    spamhaus_dbl: 'known_malicious', spamhaus_drop: 'known_malicious',
  abuse_ch_ssl: 'known_malicious', malwaredomains: 'known_malicious',
  dshield: 'high_risk', cinsscore: 'high_risk', stopforumspam: 'medium_risk',
  urlhaus_full: 'known_malicious', phishing_db: 'known_malicious',
  botvrij: 'known_malicious', openbl: 'high_risk', greensnow: 'high_risk',
  alienvault_otx: 'known_malicious', talos: 'high_risk',
};

const FEED_CONFIDENCE: Record<string, number> = {
  phishtank: 88, openphish: 90, urlhaus: 95, phishing_army: 85,
  threatfox: 92, feodo_tracker: 95, c2_intel: 88,
  blocklist_de: 78, emerging_threats: 82, ipsum: 80, disposable_emails: 70,
    spamhaus_dbl: 95, spamhaus_drop: 95, abuse_ch_ssl: 90, malwaredomains: 88,
  dshield: 85, cinsscore: 82, stopforumspam: 75, urlhaus_full: 95,
  phishing_db: 90, botvrij: 88, openbl: 85, greensnow: 80,
  alienvault_otx: 88, talos: 90,
};

const FEED_CATEGORIES: Record<string, string[]> = {
  phishtank: ['phishing'], openphish: ['phishing'], phishing_army: ['phishing'],
  urlhaus: ['malware', 'malware_distribution'],
  threatfox: ['malware', 'c2'], feodo_tracker: ['botnet', 'c2', 'banking_trojan'],
  c2_intel: ['c2', 'botnet'], blocklist_de: ['attack_source', 'brute_force'],
  emerging_threats: ['compromised', 'exploit'], ipsum: ['threat_ip', 'scanner'],
  disposable_emails: ['disposable_email', 'spam'],
    spamhaus_dbl: ['phishing', 'malware', 'spam'],
  spamhaus_drop: ['botnet', 'threat_ip'],
  abuse_ch_ssl: ['malware', 'c2'],
  malwaredomains: ['malware'],
  dshield: ['attack_source', 'scanner'],
  cinsscore: ['threat_ip', 'botnet'],
  stopforumspam: ['spam', 'phishing'],
  urlhaus_full: ['malware', 'malware_distribution'],
  phishing_db: ['phishing'],
  botvrij: ['malware', 'c2'],
  openbl: ['attack_source', 'brute_force'],
  greensnow: ['attack_source'],
  alienvault_otx: ['malware', 'threat_ip', 'c2'],
  talos: ['spam', 'threat_ip'],
};

const FEED_TTL_DAYS: Record<string, number> = {
  phishtank: 30, openphish: 3, urlhaus: 30, phishing_army: 7,
  threatfox: 90, feodo_tracker: 60, c2_intel: 30, ipsum: 7,
    spamhaus_dbl: 1, spamhaus_drop: 1, abuse_ch_ssl: 30, malwaredomains: 7,
  dshield: 1, cinsscore: 7, stopforumspam: 30, urlhaus_full: 1,
  phishing_db: 7, botvrij: 30, openbl: 1, greensnow: 7,
  alienvault_otx: 30, talos: 1,
  blocklist_de: 14, emerging_threats: 7, disposable_emails: 365,
};

const PARSERS: Record<string, (text: string) => string[]> = {
  text_lines: (t) =>
    t.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')),
  hostfile: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => { const p = l.split(/\s+/); return p.length >= 2 ? p[1] : ''; })
      .filter((v) => v && v !== 'localhost'),
  url_to_domain: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        try { return new URL(l.startsWith('http') ? l : `https://${l}`).hostname.replace(/^www\./, ''); }
        catch { return l.replace(/^www\./, ''); }
      })
      .filter(Boolean),
  urlhaus: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => {
        try { return new URL(l.startsWith('http') ? l : `https://${l}`).hostname.replace(/^www\./, ''); }
        catch { return l.replace(/^www\./, ''); }
      })
      .filter(Boolean),
  c2intel_csv: (t) =>
    t.split('\n').slice(1)
      .map((l) => l.split(',')[0]?.trim())
      .filter(Boolean),
  ipsum: (t) =>
    t.split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#'))
      .map((l) => l.split(/\t|\s/)[0])
      .filter(Boolean),
};

function normalizeValue(value: string, type: string): string {
  const v = value.toLowerCase().trim();
  if (type === 'url') {
    try {
      const url = new URL(v.startsWith('http') ? v : `https://${v}`);
      return url.hostname.replace(/^www\./, '') + (url.pathname !== '/' ? url.pathname.replace(/\/$/, '') : '');
    } catch {
      return v.replace(/^www\./, '');
    }
  }
  return v.replace(/^www\./, '');
}

function generateId(type: string, normalizedValue: string, feedId: string): string {
  const str = `${type}:${normalizedValue}:${feedId}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${type}_${Math.abs(hash).toString(36)}_${feedId.slice(0, 8)}`;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const overallStart = Date.now();
  const db = getDB();
  const results: Array<{ feed: string; added: number; updated: number; skipped: number; error?: string }> = [];
  try {
    // FIXED: use is_active (not enabled), indicator_type (not feed_type), parser (not parser_type)
    const feedRows = await db.execute(
      `SELECT id, name, url, indicator_type, parser FROM feeds WHERE is_active = 1`
    );
    if (feedRows.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No feeds found - run /api/v1/threat-intel/init first', feeds_processed: 0 }, { status: 200 });
    }
    for (const feedRow of feedRows.rows) {
      const feedId = feedRow.id as string;
      const feedUrl = feedRow.url as string;
      const parserType = (feedRow.parser as string) || 'text_lines';
      const indicatorType = (feedRow.indicator_type as string) || 'domain';
      const riskLevel = FEED_RISK[feedId] ?? 'high_risk';
      const confidence = FEED_CONFIDENCE[feedId] ?? 80;
      const categories = JSON.stringify(FEED_CATEGORIES[feedId] ?? ['malware']);
      const ttlDays = FEED_TTL_DAYS[feedId] ?? 30;
      const validUntil = new Date(Date.now() + ttlDays * 86400000).toISOString();
      let added = 0, updated = 0, skipped = 0;
      try {
        const resp = await fetch(feedUrl, {
          headers: { 'User-Agent': 'NextGuard-ThreatIntel/1.0' },
          signal: AbortSignal.timeout(30000),
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const text = await resp.text();
        const parser = PARSERS[parserType] || PARSERS['text_lines'];
        const rawIndicators = parser(text).slice(0, MAX_PER_FEED);
        for (let i = 0; i < rawIndicators.length; i += BATCH_SIZE) {
          const batch = rawIndicators.slice(i, i + BATCH_SIZE);
          const statements = batch
            .map((raw) => {
              const normalized = normalizeValue(raw, indicatorType);
              if (!normalized || normalized.length < 3) return null;
              const id = generateId(indicatorType, normalized, feedId);
              return {
                sql: `INSERT INTO indicators
                  (id, type, value, value_normalized, risk_level, confidence, categories,
                   source_feed, valid_from, valid_until, is_active, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?, 1, datetime('now'))
                  ON CONFLICT(id) DO UPDATE SET
                    last_seen = datetime('now'),
                    is_active = 1,
                    updated_at = datetime('now'),
                    confidence = MAX(confidence, excluded.confidence)`,
                args: [id, indicatorType, raw, normalized, riskLevel, confidence, categories, feedId, validUntil],
              };
            })
            .filter(Boolean) as { sql: string; args: any[] }[];
          if (statements.length === 0) continue;
          try {
            await db.batch(statements, 'write');
            added += statements.length;
          } catch {
            for (const stmt of statements) {
              try { await db.execute(stmt); added++; }
              catch { skipped++; }
            }
          }
        }
        await db.execute({
          sql: `UPDATE feeds SET last_success = datetime('now'), last_refresh = datetime('now'),
            entries_count = (SELECT COUNT(*) FROM indicators WHERE source_feed = ? AND is_active = 1),
            status = 'active', updated_at = datetime('now') WHERE id = ?`,
          args: [feedId, feedId],
        });
        results.push({ feed: feedId, added, updated, skipped });
      } catch (err: any) {
        await db.execute({
          sql: `UPDATE feeds SET last_error = ?, status = 'error', updated_at = datetime('now') WHERE id = ?`,
          args: [err.message, feedId],
        });
        results.push({ feed: feedId, added: 0, updated: 0, skipped: 0, error: err.message });
      }
    }
    return NextResponse.json({
      success: true,
      feeds_processed: results.length,
      total_added: results.reduce((s, r) => s + r.added, 0),
      results,
      duration_ms: Date.now() - overallStart,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      duration_ms: Date.now() - overallStart,
    }, { status: 500 });
  }
}
