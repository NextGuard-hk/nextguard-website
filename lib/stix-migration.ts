// lib/stix-migration.ts
// Phase 2 DB Migration: STIX 2.1 columns + relationships/sightings tables
// Run via POST /api/v1/threat-intel/init?phase=2

import { getDB } from './db';
import { generateSTIXPattern, detectIOCType } from './stix-pattern';
import { generateSTIXId } from './stix-types';

export async function runPhase2Migration(): Promise<{
  tablesCreated: string[];
  columnsAdded: string[];
  backfilledCount: number;
}> {
  const db = getDB();
  const tablesCreated: string[] = [];
  const columnsAdded: string[] = [];

  // 1. Add STIX columns to indicators table (safe: IF NOT EXISTS via try/catch)
  const newColumns = [
    { name: 'stix_id', def: 'TEXT' },
    { name: 'stix_pattern', def: 'TEXT' },
    { name: 'labels', def: "TEXT DEFAULT '[]'" },
  ];

  for (const col of newColumns) {
    try {
      await db.execute(`ALTER TABLE indicators ADD COLUMN ${col.name} ${col.def}`);
      columnsAdded.push(col.name);
    } catch {
      // Column already exists, skip
    }
  }

  // 2. Create STIX indexes
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_indicators_stix_id ON indicators(stix_id)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_indicators_stix_pattern ON indicators(stix_pattern)`);

  // 3. Create IOC relationships table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ioc_relationships (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'relationship',
      relationship_type TEXT NOT NULL,
      source_ref TEXT NOT NULL,
      target_ref TEXT NOT NULL,
      description TEXT,
      confidence INTEGER DEFAULT 50,
      start_time TEXT,
      stop_time TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  tablesCreated.push('ioc_relationships');

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rel_source ON ioc_relationships(source_ref)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rel_target ON ioc_relationships(target_ref)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_rel_type ON ioc_relationships(relationship_type)`);

  // 4. Create IOC sightings table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ioc_sightings (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL DEFAULT 'sighting',
      sighting_of_ref TEXT NOT NULL,
      where_sighted TEXT,
      first_seen TEXT,
      last_seen TEXT,
      count INTEGER DEFAULT 1,
      confidence INTEGER DEFAULT 50,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  tablesCreated.push('ioc_sightings');

  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sight_ref ON ioc_sightings(sighting_of_ref)`);
  await db.execute(`CREATE INDEX IF NOT EXISTS idx_sight_first ON ioc_sightings(first_seen)`);

  // 5. Backfill existing indicators with STIX IDs and patterns
  const unpatched = await db.execute(
    `SELECT id, type, value, value_normalized FROM indicators WHERE stix_id IS NULL OR stix_pattern IS NULL LIMIT 1000`
  );

  let backfilledCount = 0;
  const BATCH = 50;
  for (let i = 0; i < unpatched.rows.length; i += BATCH) {
    const batch = unpatched.rows.slice(i, i + BATCH);
    const stmts = batch.map(row => {
      const val = (row.value_normalized as string) || (row.value as string);
      const iocType = (row.type as string) || 'domain';
      const pattern = generateSTIXPattern(val, iocType as any);
      const stixId = generateSTIXId('indicator');
      return {
        sql: `UPDATE indicators SET stix_id = ?, stix_pattern = ? WHERE id = ? AND (stix_id IS NULL OR stix_pattern IS NULL)`,
        args: [stixId, pattern, row.id as string],
      };
    });
    try {
      await db.batch(stmts, 'write');
      backfilledCount += batch.length;
    } catch {}
  }

  // 6. Also backfill threat_indicators (v1 table)
  try {
    const v1Unpatched = await db.execute(
      `SELECT id, type, value FROM threat_indicators WHERE stix_id IS NULL OR stix_pattern IS NULL LIMIT 1000`
    );
    for (let i = 0; i < v1Unpatched.rows.length; i += BATCH) {
      const batch = v1Unpatched.rows.slice(i, i + BATCH);
      const stmts = batch.map(row => {
        const val = (row.value as string) || '';
        const type = detectIOCType(val);
        const pattern = generateSTIXPattern(val, type);
        const stixId = generateSTIXId('indicator');
        return {
          sql: `UPDATE threat_indicators SET stix_id = ?, stix_pattern = ? WHERE id = ? AND (stix_id IS NULL OR stix_pattern IS NULL)`,
          args: [stixId, pattern, row.id],
        };
      });
      try {
        await db.batch(stmts, 'write');
        backfilledCount += batch.length;
      } catch {}
    }
  } catch {}

  return { tablesCreated, columnsAdded, backfilledCount };
}
