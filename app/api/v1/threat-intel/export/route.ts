// app/api/v1/threat-intel/export/route.ts
// Phase 2: Export IOCs as STIX 2.1 Bundle, CSV, or JSON
// GET /api/v1/threat-intel/export?format=stix|csv|json&type=domain&tlp=TLP:GREEN&confidence_min=50&limit=1000

import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { buildSTIXBundle, exportToCSV } from '@/lib/stix-bundle';
import type { NextGuardIOC, TLPLevel } from '@/lib/stix-types';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'stix';
    const type = searchParams.get('type');
    const tlp = searchParams.get('tlp');
    const confidenceMin = parseInt(searchParams.get('confidence_min') || '0');
    const confidenceMax = parseInt(searchParams.get('confidence_max') || '100');
    const fromDate = searchParams.get('from');
    const toDate = searchParams.get('to');
    const sourceFeed = searchParams.get('source');
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 10000);
    const offset = parseInt(searchParams.get('offset') || '0');

    const db = getDB();

    // Build dynamic query
    const conditions: string[] = ['is_active = 1'];
    const args: any[] = [];

    if (type) {
      conditions.push('type = ?');
      args.push(type);
    }
    if (tlp) {
      conditions.push('tlp = ?');
      args.push(tlp);
    }
    if (confidenceMin > 0) {
      conditions.push('confidence >= ?');
      args.push(confidenceMin);
    }
    if (confidenceMax < 100) {
      conditions.push('confidence <= ?');
      args.push(confidenceMax);
    }
    if (fromDate) {
      conditions.push('valid_from >= ?');
      args.push(fromDate);
    }
    if (toDate) {
      conditions.push('(valid_until IS NULL OR valid_until <= ?)');
      args.push(toDate);
    }
    if (sourceFeed) {
      conditions.push('source_feed = ?');
      args.push(sourceFeed);
    }

    const whereClause = conditions.join(' AND ');
    args.push(limit, offset);

    const result = await db.execute({
      sql: `SELECT * FROM indicators WHERE ${whereClause} ORDER BY confidence DESC, last_seen DESC LIMIT ? OFFSET ?`,
      args,
    });

    // Count total
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) as total FROM indicators WHERE ${whereClause.replace(/ LIMIT \? OFFSET \?/, '')}`,
      args: args.slice(0, -2),
    });
    const total = (countResult.rows[0]?.total as number) || 0;

    // Map DB rows to NextGuardIOC
    const records: NextGuardIOC[] = result.rows.map(row => ({
      id: row.id as string,
      type: row.type as any,
      value: row.value as string,
      value_normalized: row.value_normalized as string,
      risk_level: row.risk_level as string,
      confidence: row.confidence as number,
      tlp: (row.tlp || 'TLP:GREEN') as TLPLevel,
      categories: JSON.parse((row.categories as string) || '[]'),
      tags: JSON.parse((row.tags as string) || '[]'),
      description: row.description as string | undefined,
      source_feed: row.source_feed as string,
      source_ref: row.source_ref as string | undefined,
      stix_id: row.stix_id as string | undefined,
      stix_pattern: row.stix_pattern as string | undefined,
      first_seen: row.first_seen as string,
      last_seen: row.last_seen as string,
      valid_from: row.valid_from as string,
      valid_until: row.valid_until as string | undefined,
      hit_count: row.hit_count as number,
      last_hit_at: row.last_hit_at as string | undefined,
      is_active: (row.is_active as number) === 1,
    }));

    // Return in requested format
    switch (format) {
      case 'stix': {
        const bundle = buildSTIXBundle(records);
        return new NextResponse(JSON.stringify(bundle, null, 2), {
          headers: {
            'Content-Type': 'application/stix+json;version=2.1',
            'Content-Disposition': `attachment; filename="nextguard-stix-export-${Date.now()}.json"`,
            'X-Total-Count': String(total),
          },
        });
      }
      case 'csv': {
        const csv = exportToCSV(records);
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="nextguard-ioc-export-${Date.now()}.csv"`,
            'X-Total-Count': String(total),
          },
        });
      }
      case 'json':
      default: {
        return NextResponse.json({
          success: true,
          total,
          count: records.length,
          offset,
          limit,
          indicators: records,
        });
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
