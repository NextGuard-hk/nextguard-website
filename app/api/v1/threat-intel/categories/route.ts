// app/api/v1/threat-intel/categories/route.ts
// NextGuard URL Category Query API v1.0
// Returns category statistics and domain lists from Turso url_categories table
// Used by: URL Category Intel dashboard, Web Proxy, Email Gateway
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const db = getDB();
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'summary';
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Mode: summary - return category counts and stats
    if (mode === 'summary') {
      const catStats = await db.execute({
        sql: `SELECT category, COUNT(*) as count,
              MAX(updated_at) as last_updated
              FROM url_categories
              GROUP BY category
              ORDER BY count DESC`,
        args: [],
      });

      const totalResult = await db.execute({
        sql: `SELECT COUNT(*) as total, COUNT(DISTINCT category) as categories FROM url_categories`,
        args: [],
      });

      const riskMap: Record<string, { risk: string; color: string; proxyPolicy: string; emailPolicy: string }> = {
        'Malware': { risk: 'critical', color: '#ef4444', proxyPolicy: 'block', emailPolicy: 'block' },
        'Phishing': { risk: 'critical', color: '#ef4444', proxyPolicy: 'block', emailPolicy: 'block' },
        'Cryptojacking': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'Hacking': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'DDoS & Stresser': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'Stalkerware': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'Violence & Aggression': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'Dangerous Material': { risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
        'Adult Content': { risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
        'Gambling': { risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
        'Drugs': { risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
        'Weapons': { risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
        'Piracy': { risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
        'Fake News': { risk: 'medium', color: '#eab308', proxyPolicy: 'warn', emailPolicy: 'block' },
        'Dating': { risk: 'low', color: '#22c55e', proxyPolicy: 'warn', emailPolicy: 'allow' },
        'Lingerie & Adult Fashion': { risk: 'low', color: '#22c55e', proxyPolicy: 'warn', emailPolicy: 'allow' },
        'Social Media': { risk: 'low', color: '#22c55e', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Gaming': { risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'allow' },
        'Forum & Community': { risk: 'low', color: '#22c55e', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'VPN & Proxy': { risk: 'medium', color: '#eab308', proxyPolicy: 'warn', emailPolicy: 'warn' },
        'Dynamic DNS': { risk: 'medium', color: '#eab308', proxyPolicy: 'warn', emailPolicy: 'block' },
        'URL Shortener': { risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'sandbox' },
        'Redirector': { risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'sandbox' },
        'File Sharing': { risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'sandbox' },
        'Shopping & E-Commerce': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'News & Media': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Finance & Banking': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Email & Messaging': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Chat & Messaging': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Sports': { risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
        'Cryptocurrency': { risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'warn' },
      };

      const categories = catStats.rows.map((row: any) => {
        const name = row.category as string;
        const meta = riskMap[name] || { risk: 'low', color: '#22c55e', proxyPolicy: 'allow', emailPolicy: 'allow' };
        const count = row.count as number;
        const blocked = ['critical', 'high'].includes(meta.risk) ? count : meta.risk === 'medium' ? count : 0;
        return {
          id: name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          name,
          description: `${name} - ${count.toLocaleString()} domains classified`,
          count,
          blocked,
          risk: meta.risk,
          color: meta.color,
          proxyPolicy: meta.proxyPolicy,
          emailPolicy: meta.emailPolicy,
          lastUpdated: row.last_updated,
        };
      });

      return NextResponse.json({
        success: true,
        total_domains: totalResult.rows[0]?.total || 0,
        total_categories: totalResult.rows[0]?.categories || 0,
        categories,
        timestamp: new Date().toISOString(),
      });
    }

    // Mode: domains - return domains for a specific category
    if (mode === 'domains') {
      if (!category) {
        return NextResponse.json({ error: 'category parameter required for domains mode' }, { status: 400 });
      }
      const result = await db.execute({
        sql: `SELECT domain, category, source, created_at, updated_at
              FROM url_categories
              WHERE category = ?
              ORDER BY updated_at DESC
              LIMIT ? OFFSET ?`,
        args: [category, limit, offset],
      });

      const countResult = await db.execute({
        sql: `SELECT COUNT(*) as total FROM url_categories WHERE category = ?`,
        args: [category],
      });

      return NextResponse.json({
        success: true,
        category,
        total: countResult.rows[0]?.total || 0,
        domains: result.rows,
        limit,
        offset,
      });
    }

    // Mode: search - search domains across all categories
    if (mode === 'search' && search) {
      const result = await db.execute({
        sql: `SELECT domain, category, source, created_at
              FROM url_categories
              WHERE domain LIKE ?
              ORDER BY category, domain
              LIMIT ?`,
        args: [`%${search}%`, limit],
      });

      return NextResponse.json({
        success: true,
        query: search,
        results: result.rows,
        count: result.rows.length,
      });
    }

    // Mode: lookup - check a single domain's categories
    if (mode === 'lookup') {
      const domain = searchParams.get('domain');
      if (!domain) {
        return NextResponse.json({ error: 'domain parameter required' }, { status: 400 });
      }
      let d = domain.toLowerCase().trim();
      if (d.startsWith('http')) {
        try { d = new URL(d).hostname; } catch {}
      }
      d = d.replace(/^www\./, '');

      const result = await db.execute({
        sql: `SELECT category, source, created_at, updated_at FROM url_categories WHERE domain = ?`,
        args: [d],
      });

      // Try parent domain
      let parentResults: any[] = [];
      const parts = d.split('.');
      if (parts.length > 2) {
        const parent = parts.slice(-2).join('.');
        const pResult = await db.execute({
          sql: `SELECT category, source, created_at FROM url_categories WHERE domain = ?`,
          args: [parent],
        });
        parentResults = pResult.rows as any[];
      }

      return NextResponse.json({
        success: true,
        domain: d,
        categories: result.rows.map((r: any) => r.category),
        details: result.rows,
        parent_match: parentResults.length > 0 ? parentResults : undefined,
      });
    }

    return NextResponse.json({ error: 'Invalid mode. Use: summary, domains, search, lookup' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
