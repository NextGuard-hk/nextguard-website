// lib/stix-enrichment.ts
// STIX 2.1 Confidence Scoring & IOC Enrichment Engine
// Phase 2: Exponential decay, cross-feed boost, TTL management

import type { IndicatorType } from './stix-types';

// === Feed Reputation Weights (0-100) ===
const FEED_REPUTATION: Record<string, number> = {
  urlhaus: 95, phishing_army: 85, openphish: 90, phishtank: 88,
  threatfox: 92, feodo_tracker: 95, c2_intel: 88, ipsum: 80,
  blocklist_de: 78, emerging_threats: 82, disposable_emails: 70,
  local_ioc: 99, virustotal: 98, abuseipdb: 92, manual: 60,
  stix_import: 75,
};

// === IOC Type Weights (multiplier) ===
const TYPE_WEIGHT: Record<string, number> = {
  'domain': 1.0,
  'ipv4-addr': 0.9,
  'ipv6-addr': 0.9,
  'url': 1.1,
  'email-addr': 0.8,
  'file-hash': 1.2,
};

// === TTL by IOC Type (days) ===
export const IOC_TTL_DAYS: Record<string, number> = {
  'domain': 180,
  'ipv4-addr': 90,
  'ipv6-addr': 90,
  'url': 30,
  'email-addr': 365,
  'file-hash': 365,
};

// === Confidence Decay Parameters ===
const DECAY_HALF_LIFE_DAYS = 30;
const CONFIDENCE_FLOOR = 5;
const SAME_FEED_BOOST = 15;
const CROSS_FEED_BOOST = 25;
const MAX_CONFIDENCE = 100;

// === Calculate Initial Confidence ===
export function calculateInitialConfidence(
  feedId: string,
  iocType: IndicatorType
): number {
  const feedRep = FEED_REPUTATION[feedId] ?? 70;
  const typeWeight = TYPE_WEIGHT[iocType] ?? 1.0;
  const raw = feedRep * typeWeight;
  return Math.min(MAX_CONFIDENCE, Math.max(CONFIDENCE_FLOOR, Math.round(raw)));
}

// === Exponential Decay ===
// Confidence decays over time with a 30-day half-life
export function applyConfidenceDecay(
  initialConfidence: number,
  daysSinceLastSeen: number
): number {
  if (daysSinceLastSeen <= 0) return initialConfidence;
  const decayFactor = Math.pow(0.5, daysSinceLastSeen / DECAY_HALF_LIFE_DAYS);
  const decayed = initialConfidence * decayFactor;
  return Math.max(CONFIDENCE_FLOOR, Math.round(decayed));
}

// === Re-sighting Boost ===
// When an IOC is seen again, boost confidence
export function applyResightingBoost(
  currentConfidence: number,
  isSameFeed: boolean
): number {
  const boost = isSameFeed ? SAME_FEED_BOOST : CROSS_FEED_BOOST;
  return Math.min(MAX_CONFIDENCE, currentConfidence + boost);
}

// === Calculate Valid Until (TTL) ===
export function calculateValidUntil(
  validFrom: string,
  iocType: IndicatorType
): string {
  const ttlDays = IOC_TTL_DAYS[iocType] ?? 90;
  const from = new Date(validFrom);
  from.setDate(from.getDate() + ttlDays);
  return from.toISOString();
}

// === Check if IOC is Expired ===
export function isExpired(validUntil: string | undefined): boolean {
  if (!validUntil) return false;
  return new Date(validUntil) < new Date();
}

// === Full Enrichment Pipeline ===
export function enrichIOC(params: {
  feedId: string;
  iocType: IndicatorType;
  existingConfidence?: number;
  lastSeenDate?: string;
  isSameFeed?: boolean;
  validFrom?: string;
}): {
  confidence: number;
  validUntil: string;
  isExpired: boolean;
} {
  const { feedId, iocType, existingConfidence, lastSeenDate, isSameFeed, validFrom } = params;

  let confidence: number;

  if (existingConfidence !== undefined && lastSeenDate) {
    // Existing IOC: apply decay then boost
    const daysSince = Math.max(0, (Date.now() - new Date(lastSeenDate).getTime()) / 86400000);
    const decayed = applyConfidenceDecay(existingConfidence, daysSince);
    confidence = applyResightingBoost(decayed, isSameFeed ?? false);
  } else {
    // New IOC: calculate initial
    confidence = calculateInitialConfidence(feedId, iocType);
  }

  const vFrom = validFrom || new Date().toISOString();
  const validUntil = calculateValidUntil(vFrom, iocType);
  const expired = isExpired(validUntil);

  return { confidence, validUntil, isExpired: expired };
}

// === Risk Level from Confidence ===
export function confidenceToRiskLevel(confidence: number): string {
  if (confidence >= 80) return 'known_malicious';
  if (confidence >= 60) return 'high_risk';
  if (confidence >= 40) return 'medium_risk';
  if (confidence >= 20) return 'low_risk';
  return 'unknown';
}

// === Get Feed Reputation ===
export function getFeedReputation(feedId: string): number {
  return FEED_REPUTATION[feedId] ?? 70;
}
