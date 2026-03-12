// app/api/v1/threat-intel/category-override/route.ts
// NextGuard URL Category Manual Override API v1.0
// Allows manual re-categorization of domains
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

// Valid categories for URL classification
const VALID_CATEGORIES = [
  'Adult Content', 'Gambling', 'Malware', 'Phishing', 'Social Media',
  'Forum & Community', 'Gaming', 'Dating', 'Cryptocurrency', 'Weapons',
  'Drugs', 'Hacking', 'VPN & Proxy', 'File Sharing', 'Shopping & E-Commerce',
  'News & Media', 'Sports', 'Finance & Banking', 'Cryptojacking', 'Piracy',
  'Dynamic DNS', 'URL Shortener', 'Email & Messaging', 'Violence & Aggression',
  'Fake News', 'Stalkerware', 'Dangerous Material', 'DDoS & Stresser',
  'Redirector', 'Lingerie & Adult Fashion', 'Chat & Messaging',
  'Technology', 'Education', 'Government', 'Healthcare', 'Business',
  'Entertainment', 'Travel', 'Search Engine', 'Web Portal', 'CDN & Infrastructure',
  'Advertising', 'Analytics', 'Cloud Services', 'Uncategorized',
];

function normalizeDomain(input: string): string {
  let d = input.trim().toLowerCase();
  if (d.startsWith('http')) { try { d = new URL(d).hostname; } catch {} }
  d = d.replace(/^www\./, '');
  return d;
}

// GET: Retrieve current category for a domain
export async function GET(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
  }
  const d = normalizeDomain(domain);
  try {
    const db = getDB();
    const result = await db.execute({
      sql: `SELECT domain, category, source, updated_at FROM url_categories WHERE domain = ? ORDER BY updated_at DESC LIMIT 10`,
      args: [d],
    });
    return NextResponse.json({
      domain: d,
      categories: result.rows.map(r => ({
        category: r.category,
        source: r.source,
        updated_at: r.updated_at,
      })),
      valid_categories: VALID_CATEGORIES,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PUT: Set or update manual category override for a domain
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, category } = body;
    if (!domain || !category) {
      return NextResponse.json({ error: 'domain and category are required' }, { status: 400 });
    }
    const d = normalizeDomain(domain);
    const cat = category.trim();
    if (!VALID_CATEGORIES.includes(cat)) {
      return NextResponse.json({
        error: `Invalid category. Valid options: ${VALID_CATEGORIES.join(', ')}`,
        valid_categories: VALID_CATEGORIES,
      }, { status: 400 });
    }
    const db = getDB();
    // Upsert: insert or replace manual override
    await db.execute({
      sql: `INSERT INTO url_categories (domain, category, source, created_at, updated_at)
            VALUES (?, ?, 'manual', datetime('now'), datetime('now'))
            ON CONFLICT(domain, source) DO UPDATE SET
              category = excluded.category,
              updated_at = datetime('now')`,
      args: [d, cat],
    });
    return NextResponse.json({
      success: true,
      domain: d,
      category: cat,
      source: 'manual',
      message: `Category for ${d} updated to "${cat}"`,
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Remove manual category override for a domain
export async function DELETE(request: NextRequest) {
  const domain = request.nextUrl.searchParams.get('domain');
  if (!domain) {
    return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
  }
  const d = normalizeDomain(domain);
  try {
    const db = getDB();
    const result = await db.execute({
      sql: `DELETE FROM url_categories WHERE domain = ? AND source = 'manual'`,
      args: [d],
    });
    return NextResponse.json({
      success: true,
      domain: d,
      deleted: result.rowsAffected,
      message: result.rowsAffected > 0
        ? `Manual override for ${d} removed`
        : `No manual override found for ${d}`,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
