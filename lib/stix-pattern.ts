// lib/stix-pattern.ts
// STIX 2.1 Pattern Generator & IOC Type Detector
// Phase 2: Auto-generates compliant STIX patterns from raw IOC values

import type { IndicatorType } from './stix-types';

// === IOC Type Detection ===
const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const URL_REGEX = /^https?:\/\//i;
const MD5_REGEX = /^[a-fA-F0-9]{32}$/;
const SHA1_REGEX = /^[a-fA-F0-9]{40}$/;
const SHA256_REGEX = /^[a-fA-F0-9]{64}$/;
const SHA512_REGEX = /^[a-fA-F0-9]{128}$/;
const DOMAIN_REGEX = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;

export function detectIOCType(value: string): IndicatorType {
  const v = value.trim();
  if (IPV4_REGEX.test(v)) return 'ipv4-addr';
  if (IPV6_REGEX.test(v)) return 'ipv6-addr';
  if (EMAIL_REGEX.test(v)) return 'email-addr';
  if (URL_REGEX.test(v)) return 'url';
  if (MD5_REGEX.test(v) || SHA1_REGEX.test(v) || SHA256_REGEX.test(v) || SHA512_REGEX.test(v)) return 'file-hash';
  if (DOMAIN_REGEX.test(v)) return 'domain';
  // Fallback: try to parse as URL
  try {
    const u = new URL(v.includes('://') ? v : `https://${v}`);
    if (u.hostname && u.hostname.includes('.')) return 'domain';
  } catch {}
  return 'domain'; // default
}

// === Hash Algorithm Detection ===
export function detectHashAlgorithm(hash: string): string {
  const h = hash.trim();
  if (MD5_REGEX.test(h)) return 'MD5';
  if (SHA1_REGEX.test(h)) return 'SHA-1';
  if (SHA256_REGEX.test(h)) return 'SHA-256';
  if (SHA512_REGEX.test(h)) return 'SHA-512';
  return 'MD5'; // fallback
}

// === STIX 2.1 Pattern Generation ===
// Generates compliant STIX patterns per OASIS spec
// e.g. evil.com -> [domain-name:value = 'evil.com']
// e.g. 1.2.3.4 -> [ipv4-addr:value = '1.2.3.4']

export function generateSTIXPattern(value: string, type?: IndicatorType): string {
  const v = value.trim();
  const iocType = type || detectIOCType(v);

  switch (iocType) {
    case 'domain': {
      const domain = extractDomain(v);
      return `[domain-name:value = '${escapeSTIXValue(domain)}']`;
    }
    case 'ipv4-addr':
      return `[ipv4-addr:value = '${escapeSTIXValue(v)}']`;
    case 'ipv6-addr':
      return `[ipv6-addr:value = '${escapeSTIXValue(v)}']`;
    case 'url':
      return `[url:value = '${escapeSTIXValue(v)}']`;
    case 'email-addr':
      return `[email-addr:value = '${escapeSTIXValue(v)}']`;
    case 'file-hash': {
      const algo = detectHashAlgorithm(v);
      return `[file:hashes.'${algo}' = '${escapeSTIXValue(v)}']`;
    }
    default:
      return `[domain-name:value = '${escapeSTIXValue(v)}']`;
  }
}

// === Compound Pattern Generation ===
export function generateCompoundPattern(values: Array<{ value: string; type?: IndicatorType }>, operator: 'AND' | 'OR' = 'OR'): string {
  const patterns = values.map(v => generateSTIXPattern(v.value, v.type));
  return patterns.join(` ${operator} `);
}

// === Helper: Extract domain from URL or raw value ===
function extractDomain(value: string): string {
  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return value.toLowerCase().replace(/^www\./, '');
  }
}

// === Helper: Escape special characters in STIX pattern values ===
function escapeSTIXValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// === Pattern Validation ===
export function isValidSTIXPattern(pattern: string): boolean {
  // Basic STIX pattern syntax validation
  if (!pattern.startsWith('[') || !pattern.endsWith("']")) return false;
  // Check for valid object type
  const validTypes = ['domain-name', 'ipv4-addr', 'ipv6-addr', 'url', 'email-addr', 'file', 'process', 'network-traffic', 'artifact', 'software'];
  const typeMatch = pattern.match(/^\[([a-z-]+):/);
  if (!typeMatch || !validTypes.includes(typeMatch[1])) return false;
  // Check for comparison operator
  if (!pattern.includes(' = ') && !pattern.includes(' != ') && !pattern.includes(' LIKE ') && !pattern.includes(' MATCHES ')) return false;
  return true;
}

// === Bulk Pattern Generation ===
export function generatePatternsForIOCs(iocs: Array<{ value: string; type?: IndicatorType }>): Array<{ value: string; type: IndicatorType; pattern: string }> {
  return iocs.map(ioc => {
    const type = ioc.type || detectIOCType(ioc.value);
    const pattern = generateSTIXPattern(ioc.value, type);
    return { value: ioc.value, type, pattern };
  });
}
