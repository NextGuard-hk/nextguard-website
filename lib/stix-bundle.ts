// lib/stix-bundle.ts
// STIX 2.1 Bundle Builder & Parser
// Phase 2: Converts DB records to/from STIX 2.1 Bundles for import/export

import type { STIXBundle, STIXIndicator, STIXObject, TLPLevel, NextGuardIOC, IndicatorType } from './stix-types';
import { generateSTIXId, TLP_MARKING_DEFINITIONS, NEXTGUARD_IDENTITY_ID, NEXTGUARD_IDENTITY } from './stix-types';
import { generateSTIXPattern, detectIOCType } from './stix-pattern';

// === DB Record -> STIX Indicator ===
export function dbRecordToSTIXIndicator(record: NextGuardIOC): STIXIndicator {
  const now = new Date().toISOString();
  const tlp = record.tlp || 'TLP:GREEN';
  const markingRef = TLP_MARKING_DEFINITIONS[tlp as TLPLevel] || TLP_MARKING_DEFINITIONS['TLP:GREEN'];

  const indicator: STIXIndicator = {
    type: 'indicator',
    spec_version: '2.1',
    id: record.stix_id || generateSTIXId('indicator'),
    created: record.first_seen || now,
    modified: record.last_seen || now,
    created_by_ref: NEXTGUARD_IDENTITY_ID,
    name: `${record.type}: ${record.value}`,
    description: record.description || `${record.risk_level} indicator from ${record.source_feed}`,
    indicator_types: mapCategoriesToIndicatorTypes(record.categories),
    pattern: record.stix_pattern || generateSTIXPattern(record.value, record.type),
    pattern_type: 'stix',
    valid_from: record.valid_from || record.first_seen || now,
    valid_until: record.valid_until || undefined,
    confidence: record.confidence,
    labels: record.labels || record.categories || [],
    object_marking_refs: [markingRef],
    kill_chain_phases: record.kill_chain_phases || [],
    external_references: [{
      source_name: record.source_feed,
      description: `Ingested from ${record.source_feed} feed`,
    }],
  };
  return indicator;
}

// === STIX Indicator -> DB Record ===
export function stixIndicatorToDBRecord(indicator: STIXIndicator): Partial<NextGuardIOC> {
  const value = extractValueFromPattern(indicator.pattern);
  const type = extractTypeFromPattern(indicator.pattern);
  const tlp = extractTLPFromMarkings(indicator.object_marking_refs || []);

  return {
    stix_id: indicator.id,
    stix_pattern: indicator.pattern,
    type: type,
    value: value,
    value_normalized: value.toLowerCase().replace(/^www\./, ''),
    confidence: indicator.confidence ?? 50,
    tlp: tlp,
    description: indicator.description,
    labels: indicator.labels || [],
    categories: indicator.indicator_types || [],
    valid_from: indicator.valid_from,
    valid_until: indicator.valid_until,
    kill_chain_phases: indicator.kill_chain_phases || [],
    first_seen: indicator.created,
    last_seen: indicator.modified,
    source_feed: indicator.external_references?.[0]?.source_name || 'stix-import',
    is_active: !indicator.revoked,
  };
}

// === Build STIX Bundle from DB Records ===
export function buildSTIXBundle(records: NextGuardIOC[]): STIXBundle {
  const objects: STIXObject[] = [NEXTGUARD_IDENTITY];
  for (const record of records) {
    objects.push(dbRecordToSTIXIndicator(record));
  }
  return {
    type: 'bundle',
    id: generateSTIXId('bundle'),
    objects,
  };
}

// === Parse STIX Bundle -> DB Records ===
export function parseSTIXBundle(bundle: STIXBundle): Array<Partial<NextGuardIOC>> {
  const records: Array<Partial<NextGuardIOC>> = [];
  for (const obj of bundle.objects) {
    if (obj.type === 'indicator') {
      records.push(stixIndicatorToDBRecord(obj as STIXIndicator));
    }
  }
  return records;
}

// === Export to CSV ===
export function exportToCSV(records: NextGuardIOC[]): string {
  const headers = ['type', 'value', 'risk_level', 'confidence', 'tlp', 'categories', 'source_feed', 'first_seen', 'last_seen', 'valid_from', 'valid_until', 'stix_pattern'];
  const rows = records.map(r => [
    r.type, r.value, r.risk_level, r.confidence,
    r.tlp, (r.categories || []).join(';'),
    r.source_feed, r.first_seen, r.last_seen,
    r.valid_from, r.valid_until || '',
    r.stix_pattern || '',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
  return [headers.join(','), ...rows].join('\n');
}

// === Helpers ===
function mapCategoriesToIndicatorTypes(categories: string[]): string[] {
  const mapping: Record<string, string> = {
    malware: 'malicious-activity',
    phishing: 'malicious-activity',
    c2: 'malicious-activity',
    botnet: 'malicious-activity',
    attack_source: 'malicious-activity',
    compromised: 'compromised',
    threat_ip: 'malicious-activity',
    disposable_email: 'anomalous-activity',
    spam: 'anomalous-activity',
    crypto_scam: 'malicious-activity',
    piracy: 'unwanted',
    adult: 'unwanted',
    gambling: 'unwanted',
  };
  const types = categories.map(c => mapping[c] || 'unknown').filter(t => t !== 'unknown');
  return [...new Set(types.length > 0 ? types : ['malicious-activity'])];
}

function extractValueFromPattern(pattern: string): string {
  const match = pattern.match(/= '([^']+)'/);
  return match ? match[1] : '';
}

function extractTypeFromPattern(pattern: string): IndicatorType {
  if (pattern.includes('domain-name:')) return 'domain';
  if (pattern.includes('ipv4-addr:')) return 'ipv4-addr';
  if (pattern.includes('ipv6-addr:')) return 'ipv6-addr';
  if (pattern.includes('url:')) return 'url';
  if (pattern.includes('email-addr:')) return 'email-addr';
  if (pattern.includes('file:hashes')) return 'file-hash';
  return 'domain';
}

function extractTLPFromMarkings(markingRefs: string[]): TLPLevel {
  for (const [tlp, uuid] of Object.entries(TLP_MARKING_DEFINITIONS)) {
    if (markingRefs.includes(uuid)) return tlp as TLPLevel;
  }
  return 'TLP:GREEN';
}
