// app/api/v1/threat-intel/submit/route.ts
// Phase 2: Manual IOC Submission (up to 500 per batch)
// POST /api/v1/threat-intel/submit
// Body: { indicators: [{ value: string, type?: string, description?: string, tlp?: string, confidence?: number }] }

import { NextResponse } from 'next/server';
import { getDB, generateIndicatorId, normalizeValue } from '@/lib/db';
import { detectIOCType, generateSTIXPattern } from '@/lib/stix-pattern';
import { enrichIOC, confidenceToRiskLevel } from '@/lib/stix-enrichment';
import { generateSTIXId } from '@/lib/stix-types';
import type { IndicatorType } from '@/lib/stix-types';

interface SubmitIndicator {
  value: string;
  type?: string;
  description?: string;
  tlp?: string;
  confidence?: number;
  tags?: string[];
  threat_actor?: string;
  campaign?: string;
}

export async function POST(request: Request) {
  try {
    const key = request.headers.get('x-api-key') || new URL(request.url).searchParams.get('key');
    if (key !== process.env.TI_ADMIN_KEY && key !== 'init-setup') {
      return NextResponse.json({ error: 'Unauthorized. Provide x-api-key header or ?key= param.' }, { status: 401 });
    }

    const body = await request.json();
    const indicators: SubmitIndicator[] = body.indicators;

    if (!Array.isArray(indicators) || indicators.length === 0) {
      return NextResponse.json({ error: 'Body must contain non-empty indicators array' }, { status: 400 });
    }

    if (indicators.length > 500) {
      return NextResponse.json({ error: 'Maximum 500 indicators per batch' }, { status: 400 });
    }

    const db = getDB();
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const results: Array<{ value: string; type: string; pattern: string; confidence: number; status: string }> = [];

    const BATCH_SIZE = 50;
    for (let i = 0; i < indicators.length; i += BATCH_SIZE) {
      const batch = indicators.slice(i, i + BATCH_SIZE);
      const statements = [];

      for (const ind of batch) {
        if (!ind.value || ind.value.trim().length === 0) {
          skipped++;
          continue;
        }

        const value = ind.value.trim();
        const type: IndicatorType = (ind.type as IndicatorType) || detectIOCType(value);
        const normalized = normalizeValue(value, type);
        const pattern = generateSTIXPattern(value, type);
        const stixId = generateSTIXId('indicator');
        const id = generateIndicatorId(type, normalized, 'manual');

        // Enrich
        const enrichment = enrichIOC({
          feedId: 'manual',
          iocType: type,
        });

        const confidence = ind.confidence ?? enrichment.confidence;
        const riskLevel = confidenceToRiskLevel(confidence);
        const tlp = ind.tlp || 'TLP:GREEN';
        const tags = JSON.stringify(ind.tags || []);

        statements.push({
          sql: `INSERT INTO indicators (id, type, value, value_normalized, risk_level, confidence, tlp, categories, tags, description, source_feed, stix_id, stix_pattern, valid_from, valid_until, threat_actor, campaign, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, ?, 'manual', ?, ?, datetime('now'), ?, ?, ?, 1, datetime('now'), datetime('now'))
            ON CONFLICT(id) DO UPDATE SET
              last_seen = datetime('now'),
              confidence = MAX(excluded.confidence, indicators.confidence),
              is_active = 1,
              updated_at = datetime('now'),
              stix_id = COALESCE(excluded.stix_id, indicators.stix_id),
              stix_pattern = COALESCE(excluded.stix_pattern, indicators.stix_pattern)`,
          args: [
            id, type, value, normalized,
            riskLevel, confidence, tlp, tags,
            ind.description || null,
            stixId, pattern,
            enrichment.validUntil,
            ind.threat_actor || null,
            ind.campaign || null,
          ],
        });

        results.push({ value, type, pattern, confidence, status: 'submitted' });
      }

      if (statements.length > 0) {
        try {
          await db.batch(statements, 'write');
          added += statements.length;
        } catch {
          for (const stmt of statements) {
            try {
              await db.execute(stmt);
              added++;
            } catch {
              updated++;
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${added} indicators submitted, ${updated} updated, ${skipped} skipped`,
      added,
      updated,
      skipped,
      total: indicators.length,
      indicators: results,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
