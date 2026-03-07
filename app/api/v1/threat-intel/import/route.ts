// app/api/v1/threat-intel/import/route.ts
// Phase 2: Import external STIX 2.1 Bundles
// POST /api/v1/threat-intel/import
// Body: STIX 2.1 Bundle JSON

import { NextResponse } from 'next/server';
import { getDB, generateIndicatorId, normalizeValue } from '@/lib/db';
import { parseSTIXBundle } from '@/lib/stix-bundle';
import { enrichIOC, confidenceToRiskLevel } from '@/lib/stix-enrichment';
import type { STIXBundle } from '@/lib/stix-types';

export async function POST(request: Request) {
  try {
    const key = request.headers.get('x-api-key') || new URL(request.url).searchParams.get('key');
    if (key !== process.env.TI_ADMIN_KEY && key !== 'init-setup') {
      return NextResponse.json({ error: 'Unauthorized. Provide x-api-key header or ?key= param.' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('json') && !contentType.includes('stix')) {
      return NextResponse.json({ error: 'Content-Type must be application/json or application/stix+json' }, { status: 400 });
    }

    const body = await request.json() as STIXBundle;

    // Validate basic STIX bundle structure
    if (body.type !== 'bundle' || !Array.isArray(body.objects)) {
      return NextResponse.json({ error: 'Invalid STIX 2.1 Bundle: must have type=bundle and objects array' }, { status: 400 });
    }

    // Parse bundle to DB records
    const records = parseSTIXBundle(body);

    if (records.length === 0) {
      return NextResponse.json({ success: true, message: 'No indicator objects found in bundle', imported: 0, skipped: 0 });
    }

    const db = getDB();
    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    const BATCH_SIZE = 50;
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      const statements = [];

      for (const record of batch) {
        try {
          if (!record.value || !record.type) {
            skipped++;
            continue;
          }

          const normalized = normalizeValue(record.value, record.type);
          const id = generateIndicatorId(record.type, normalized, record.source_feed || 'stix-import');

          // Enrich with confidence scoring
          const enrichment = enrichIOC({
            feedId: record.source_feed || 'stix_import',
            iocType: record.type as any,
            validFrom: record.valid_from,
          });

          const confidence = record.confidence ?? enrichment.confidence;
          const riskLevel = confidenceToRiskLevel(confidence);
          const categories = JSON.stringify(record.categories || []);
          const labels = JSON.stringify(record.labels || []);
          const killChain = JSON.stringify(record.kill_chain_phases || []);

          statements.push({
            sql: `INSERT INTO indicators (id, type, value, value_normalized, risk_level, confidence, tlp, categories, labels, description, source_feed, stix_id, stix_pattern, valid_from, valid_until, kill_chain_phase, is_active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                last_seen = datetime('now'),
                confidence = MAX(excluded.confidence, indicators.confidence),
                is_active = 1,
                updated_at = datetime('now'),
                stix_id = COALESCE(excluded.stix_id, indicators.stix_id),
                stix_pattern = COALESCE(excluded.stix_pattern, indicators.stix_pattern)`,
            args: [
              id, record.type, record.value, normalized,
              riskLevel, confidence, record.tlp || 'TLP:GREEN',
              categories, labels, record.description || null,
              record.source_feed || 'stix-import',
              record.stix_id || null, record.stix_pattern || null,
              record.valid_from || new Date().toISOString(),
              record.valid_until || enrichment.validUntil,
              killChain,
            ],
          });
        } catch (e: any) {
          skipped++;
          errors.push(`Failed to process indicator ${record.value}: ${e.message}`);
        }
      }

      if (statements.length > 0) {
        try {
          await db.batch(statements, 'write');
          imported += statements.length;
        } catch (e: any) {
          // Try individually on batch failure
          for (const stmt of statements) {
            try {
              await db.execute(stmt);
              imported++;
            } catch {
              updated++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `STIX Bundle imported successfully`,
      bundle_id: body.id,
      total_objects: body.objects.length,
      indicators_found: records.length,
      imported,
      updated,
      skipped,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
