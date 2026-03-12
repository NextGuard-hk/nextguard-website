import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// Manual category overrides — ground truth for known domains
const MANUAL_OVERRIDES = [
  // News & Media
  { domain: 'sina.com', category: 'News & Media' },
  { domain: 'sina.com.cn', category: 'News & Media' },
  { domain: 'bbc.com', category: 'News & Media' },
  { domain: 'cnn.com', category: 'News & Media' },
  { domain: 'nytimes.com', category: 'News & Media' },
  // Sports Scores (no gambling)
  { domain: 'livescore.com', category: 'Sports' },
  { domain: 'flashscore.com', category: 'Sports' },
  { domain: 'sofascore.com', category: 'Sports' },
  { domain: 'espn.com', category: 'Sports' },
  // Licensed Gambling / Regulated
  { domain: 'hkjc.com', category: 'Licensed Gambling' },
  { domain: 'hkjc.org', category: 'Licensed Gambling' },
  { domain: 'bet365.com', category: 'Licensed Gambling' },
  { domain: 'ladbrokes.com', category: 'Licensed Gambling' },
  { domain: 'williamhill.com', category: 'Licensed Gambling' },
  // Unlicensed / Grey-market Gambling
  { domain: '7m.com', category: 'Gambling' },
  { domain: '7m.cn', category: 'Gambling' },
  { domain: 'bet88.com', category: 'Gambling' },
  // Social Media
  { domain: 'facebook.com', category: 'Social Media' },
  { domain: 'instagram.com', category: 'Social Media' },
  { domain: 'twitter.com', category: 'Social Media' },
  { domain: 'x.com', category: 'Social Media' },
  { domain: 'tiktok.com', category: 'Social Media' },
  { domain: 'youtube.com', category: 'Video Streaming' },
  { domain: 'netflix.com', category: 'Video Streaming' },
  // Search Engines
  { domain: 'google.com', category: 'Search Engine' },
  { domain: 'bing.com', category: 'Search Engine' },
  { domain: 'baidu.com', category: 'Search Engine' },
  // Tech / Cloud
  { domain: 'github.com', category: 'Technology' },
  { domain: 'cloudflare.com', category: 'Technology' },
  { domain: 'vercel.com', category: 'Technology' },
  { domain: 'microsoft.com', category: 'Technology' },
  { domain: 'apple.com', category: 'Technology' },
  // Finance
  { domain: 'hsbc.com', category: 'Finance' },
  { domain: 'paypal.com', category: 'Finance' },
  { domain: 'stripe.com', category: 'Finance' },
];

export async function GET() {
  try {
    const db = getDB();
    // Ensure table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS url_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        domain TEXT NOT NULL,
        category TEXT NOT NULL,
        source TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `);
    await db.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_url_categories_domain_category ON url_categories(domain, category)`);

    let inserted = 0;
    let updated = 0;
    const results: { domain: string; category: string; action: string }[] = [];

    for (const override of MANUAL_OVERRIDES) {
      // Check if exists
      const existing = await db.execute({
        sql: `SELECT id FROM url_categories WHERE domain = ? AND category = ?`,
        args: [override.domain, override.category],
      });
      if (existing.rows.length > 0) {
        // Update updated_at
        await db.execute({
          sql: `UPDATE url_categories SET source = 'manual', updated_at = datetime('now') WHERE domain = ? AND category = ?`,
          args: [override.domain, override.category],
        });
        updated++;
        results.push({ ...override, action: 'updated' });
      } else {
        // Remove any old categories for this domain first
        await db.execute({
          sql: `DELETE FROM url_categories WHERE domain = ? AND source = 'manual'`,
          args: [override.domain],
        });
        await db.execute({
          sql: `INSERT INTO url_categories (domain, category, source) VALUES (?, ?, 'manual')`,
          args: [override.domain, override.category],
        });
        inserted++;
        results.push({ ...override, action: 'inserted' });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${inserted} new + ${updated} updated category overrides`,
      total: MANUAL_OVERRIDES.length,
      results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
