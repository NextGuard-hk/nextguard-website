// lib/stix-types.ts
// STIX 2.1 Type Definitions for NextGuard Threat Intelligence Platform
// Phase 2: STIX 2.1 Standardization
// Reference: OASIS STIX 2.1 Specification (https://docs.oasis-open.org/cti/stix/v2.1/stix-v2.1.html)

// === TLP Marking Definition UUIDs (STIX 2.1 Official) ===
export const TLP_MARKING_DEFINITIONS = {
  'TLP:CLEAR': 'marking-definition--613f2e26-407d-48c7-9eca-b8e91df99dc9',
  'TLP:GREEN': 'marking-definition--34098fce-860f-48ae-8e50-ebd3cc5e41da',
  'TLP:AMBER': 'marking-definition--f88d31f6-486f-44da-b317-01333bde0b82',
  'TLP:AMBER+STRICT': 'marking-definition--826578e1-40a3-4b12-afc3-1c812879afd3',
  'TLP:RED': 'marking-definition--5e57c739-391a-4eb3-b6be-7d15ca92d5ed',
} as const;

export type TLPLevel = keyof typeof TLP_MARKING_DEFINITIONS;

// === STIX 2.1 Common Properties ===
export interface STIXCommonProperties {
  type: string;
  spec_version: '2.1';
  id: string;
  created: string;
  modified: string;
  created_by_ref?: string;
  revoked?: boolean;
  labels?: string[];
  confidence?: number;
  lang?: string;
  external_references?: STIXExternalReference[];
  object_marking_refs?: string[];
  granular_markings?: STIXGranularMarking[];
  extensions?: Record<string, unknown>;
}

export interface STIXExternalReference {
  source_name: string;
  description?: string;
  url?: string;
  hashes?: Record<string, string>;
  external_id?: string;
}

export interface STIXGranularMarking {
  lang?: string;
  marking_ref?: string;
  selectors: string[];
}

// === STIX 2.1 Kill Chain Phase ===
export interface STIXKillChainPhase {
  kill_chain_name: string;
  phase_name: string;
}

// === STIX 2.1 Indicator SDO ===
export interface STIXIndicator extends STIXCommonProperties {
  type: 'indicator';
  name?: string;
  description?: string;
  indicator_types?: string[];
  pattern: string;
  pattern_type: 'stix' | 'pcre' | 'sigma' | 'snort' | 'suricata' | 'yara';
  pattern_version?: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: STIXKillChainPhase[];
}

// === STIX 2.1 Observable Types (SCOs) ===
export interface STIXDomainName {
  type: 'domain-name';
  id: string;
  value: string;
  resolves_to_refs?: string[];
}

export interface STIXIPv4Addr {
  type: 'ipv4-addr';
  id: string;
  value: string;
  resolves_to_refs?: string[];
  belongs_to_refs?: string[];
}

export interface STIXIPv6Addr {
  type: 'ipv6-addr';
  id: string;
  value: string;
  resolves_to_refs?: string[];
  belongs_to_refs?: string[];
}

export interface STIXUrl {
  type: 'url';
  id: string;
  value: string;
}

export interface STIXEmailAddr {
  type: 'email-addr';
  id: string;
  value: string;
  display_name?: string;
  belongs_to_ref?: string;
}

export interface STIXFile {
  type: 'file';
  id: string;
  hashes?: Record<string, string>;
  size?: number;
  name?: string;
  name_enc?: string;
  magic_number_hex?: string;
  mime_type?: string;
}

export type STIXObservable = STIXDomainName | STIXIPv4Addr | STIXIPv6Addr | STIXUrl | STIXEmailAddr | STIXFile;

// === STIX 2.1 Relationship SRO ===
export interface STIXRelationship extends STIXCommonProperties {
  type: 'relationship';
  relationship_type: string;
  description?: string;
  source_ref: string;
  target_ref: string;
  start_time?: string;
  stop_time?: string;
}

// === STIX 2.1 Sighting SRO ===
export interface STIXSighting extends STIXCommonProperties {
  type: 'sighting';
  description?: string;
  first_seen?: string;
  last_seen?: string;
  count?: number;
  sighting_of_ref: string;
  observed_data_refs?: string[];
  where_sighted_refs?: string[];
  summary?: boolean;
}

// === STIX 2.1 Identity SDO ===
export interface STIXIdentity extends STIXCommonProperties {
  type: 'identity';
  name: string;
  description?: string;
  roles?: string[];
  identity_class?: string;
  sectors?: string[];
  contact_information?: string;
}

// === STIX 2.1 Bundle ===
export interface STIXBundle {
  type: 'bundle';
  id: string;
  objects: STIXObject[];
}

export type STIXObject = STIXIndicator | STIXRelationship | STIXSighting | STIXIdentity | STIXObservable;

// === NextGuard Internal Types ===
export type IndicatorType = 'domain' | 'ipv4-addr' | 'ipv6-addr' | 'url' | 'email-addr' | 'file-hash';

export interface NextGuardIOC {
  id: string;
  type: IndicatorType;
  value: string;
  value_normalized: string;
  risk_level: string;
  confidence: number;
  tlp: TLPLevel;
  categories: string[];
  tags: string[];
  description?: string;
  source_feed: string;
  source_ref?: string;
  stix_id?: string;
  stix_pattern?: string;
  first_seen: string;
  last_seen: string;
  valid_from: string;
  valid_until?: string;
  kill_chain_phases?: STIXKillChainPhase[];
  labels?: string[];
  threat_actor?: string;
  campaign?: string;
  hit_count: number;
  last_hit_at?: string;
  is_active: boolean;
}

// === STIX ID Generation ===
export function generateSTIXId(type: string): string {
  const uuid = crypto.randomUUID();
  return `${type}--${uuid}`;
}

// === NextGuard Identity (used as created_by_ref) ===
export const NEXTGUARD_IDENTITY_ID = 'identity--nextguard-threat-intel-platform';

export const NEXTGUARD_IDENTITY: STIXIdentity = {
  type: 'identity',
  spec_version: '2.1',
  id: NEXTGUARD_IDENTITY_ID,
  created: '2026-01-01T00:00:00.000Z',
  modified: '2026-03-08T00:00:00.000Z',
  name: 'NextGuard Threat Intelligence Platform',
  identity_class: 'system',
  description: 'NextGuard OSINT Threat Intelligence aggregation and analysis platform',
  sectors: ['technology'],
  roles: ['threat-intelligence-provider'],
};
