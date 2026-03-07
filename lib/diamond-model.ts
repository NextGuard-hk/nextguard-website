// lib/diamond-model.ts
// Phase 6 - Diamond Model analysis for threat intelligence

import { getDb } from "./db";

export interface DiamondEvent {
  id: string;
  adversaryId: string;
  adversaryName: string;
  capabilityId: string;
  capabilityName: string;
  infrastructureId: string;
  infrastructureType: string;
  infrastructureValue: string;
  victimId: string;
  victimSector: string;
  victimRegion: string;
  phase: string;
  confidence: number;
  timestamp: string;
  notes: string;
  sources: string[];
}

export interface Adversary {
  id: string;
  name: string;
  aliases: string[];
  country: string;
  motivation: string;
  sophistication: string;
  firstSeen: string;
  lastSeen: string;
  ttps: string[];
  associatedCampaigns: string[];
}

export interface Campaign {
  id: string;
  name: string;
  adversaryId: string;
  status: "active" | "inactive" | "historic";
  firstSeen: string;
  lastSeen: string;
  targetSectors: string[];
  targetRegions: string[];
  description: string;
  relatedIndicators: string[];
}

const DIAMOND_EVENTS: DiamondEvent[] = [
  {
    id: "de-001",
    adversaryId: "adv-001",
    adversaryName: "APT28",
    capabilityId: "cap-001",
    capabilityName: "Sofacy Trojan",
    infrastructureId: "infra-001",
    infrastructureType: "domain",
    infrastructureValue: "malware-c2.example.com",
    victimId: "vic-001",
    victimSector: "Government",
    victimRegion: "Europe",
    phase: "Command and Control",
    confidence: 85,
    timestamp: "2025-01-15T10:00:00Z",
    notes: "C2 communication observed",
    sources: ["internal-sensor", "osint-feed"],
  },
  {
    id: "de-002",
    adversaryId: "adv-002",
    adversaryName: "Lazarus Group",
    capabilityId: "cap-002",
    capabilityName: "DTrack RAT",
    infrastructureId: "infra-002",
    infrastructureType: "ip",
    infrastructureValue: "198.51.100.44",
    victimId: "vic-002",
    victimSector: "Financial",
    victimRegion: "Asia",
    phase: "Exploitation",
    confidence: 92,
    timestamp: "2025-01-20T14:30:00Z",
    notes: "Targeted financial institution",
    sources: ["commercial-feed", "partner-share"],
  },
  {
    id: "de-003",
    adversaryId: "adv-003",
    adversaryName: "Sandworm",
    capabilityId: "cap-003",
    capabilityName: "Industroyer2",
    infrastructureId: "infra-003",
    infrastructureType: "domain",
    infrastructureValue: "update-service.example.net",
    victimId: "vic-003",
    victimSector: "Energy",
    victimRegion: "Eastern Europe",
    phase: "Actions on Objectives",
    confidence: 78,
    timestamp: "2025-02-01T08:00:00Z",
    notes: "ICS targeting campaign",
    sources: ["govt-advisory", "internal-sensor"],
  },
];

const ADVERSARIES: Adversary[] = [
  {
    id: "adv-001",
    name: "APT28",
    aliases: ["Fancy Bear", "Sofacy", "Pawn Storm"],
    country: "Russia",
    motivation: "Espionage",
    sophistication: "Advanced",
    firstSeen: "2004-01-01",
    lastSeen: "2025-01-15",
    ttps: ["T1566", "T1071", "T1059"],
    associatedCampaigns: ["camp-001"],
  },
  {
    id: "adv-002",
    name: "Lazarus Group",
    aliases: ["Hidden Cobra", "Zinc", "Diamond Sleet"],
    country: "North Korea",
    motivation: "Financial Gain",
    sophistication: "Advanced",
    firstSeen: "2009-01-01",
    lastSeen: "2025-01-20",
    ttps: ["T1566", "T1486", "T1565"],
    associatedCampaigns: ["camp-002"],
  },
  {
    id: "adv-003",
    name: "Sandworm",
    aliases: ["Voodoo Bear", "IRIDIUM", "Seashell Blizzard"],
    country: "Russia",
    motivation: "Sabotage",
    sophistication: "Expert",
    firstSeen: "2011-01-01",
    lastSeen: "2025-02-01",
    ttps: ["T1190", "T1562", "T1485"],
    associatedCampaigns: ["camp-003"],
  },
];

const CAMPAIGNS: Campaign[] = [
  {
    id: "camp-001",
    name: "Operation Pawn Storm 2025",
    adversaryId: "adv-001",
    status: "active",
    firstSeen: "2025-01-01",
    lastSeen: "2025-01-15",
    targetSectors: ["Government", "Defense"],
    targetRegions: ["Europe", "North America"],
    description: "Ongoing espionage campaign targeting government entities",
    relatedIndicators: ["malware-c2.example.com"],
  },
  {
    id: "camp-002",
    name: "AppleJeus 3.0",
    adversaryId: "adv-002",
    status: "active",
    firstSeen: "2024-11-01",
    lastSeen: "2025-01-20",
    targetSectors: ["Financial", "Cryptocurrency"],
    targetRegions: ["Asia", "North America"],
    description: "Financial theft campaign targeting crypto exchanges",
    relatedIndicators: ["198.51.100.44"],
  },
  {
    id: "camp-003",
    name: "Industroyer Redux",
    adversaryId: "adv-003",
    status: "active",
    firstSeen: "2024-12-01",
    lastSeen: "2025-02-01",
    targetSectors: ["Energy", "Utilities"],
    targetRegions: ["Eastern Europe"],
    description: "ICS/SCADA targeting campaign against energy infrastructure",
    relatedIndicators: ["update-service.example.net"],
  },
];

export function getDiamondEvents(filters?: {
  adversaryId?: string;
  phase?: string;
  sector?: string;
  minConfidence?: number;
}): DiamondEvent[] {
  let events = [...DIAMOND_EVENTS];
  if (filters?.adversaryId) events = events.filter(e => e.adversaryId === filters.adversaryId);
  if (filters?.phase) events = events.filter(e => e.phase === filters.phase);
  if (filters?.sector) events = events.filter(e => e.victimSector === filters.sector);
  if (filters?.minConfidence) events = events.filter(e => e.confidence >= filters.minConfidence);
  return events;
}

export function getDiamondEventById(id: string): DiamondEvent | undefined {
  return DIAMOND_EVENTS.find(e => e.id === id);
}

export function getAdversaries(): Adversary[] {
  return [...ADVERSARIES];
}

export function getAdversaryById(id: string): Adversary | undefined {
  return ADVERSARIES.find(a => a.id === id);
}

export function getCampaigns(filters?: {
  adversaryId?: string;
  status?: string;
  sector?: string;
}): Campaign[] {
  let campaigns = [...CAMPAIGNS];
  if (filters?.adversaryId) campaigns = campaigns.filter(c => c.adversaryId === filters.adversaryId);
  if (filters?.status) campaigns = campaigns.filter(c => c.status === filters.status);
  if (filters?.sector) campaigns = campaigns.filter(c => c.targetSectors.includes(filters.sector!));
  return campaigns;
}

export function getCampaignById(id: string): Campaign | undefined {
  return CAMPAIGNS.find(c => c.id === id);
}

export function getDiamondByAdversary(adversaryId: string) {
  initDiamondData();
  return Array.from(diamondEvents.values()).filter(e => e.adversaryId === adversaryId);
}

export function buildDiamondAnalysis(adversaryId: string) {
  initDiamondData();
  const events = getDiamondByAdversary(adversaryId);
  const allInfra = events.flatMap(e => e.infrastructureValue ? [e.infrastructureValue] : []);
  const allCaps = events.flatMap(e => e.capabilityName ? [e.capabilityName] : []);
  const sectors = [...new Set(events.map(e => e.victimSector))];
  const phases = [...new Set(events.map(e => e.phase))];
  const adversaries = [...new Set(events.map(e => e.adversaryName))];

  return {
    events,
    activityThread: events.map(e => ({ c: e.capabilityName, i: e.infrastructureValue, t: e.timestamp })),
    activityGroup: adversaryId,
    summary: {
      adversaries,
      infrastructureCount: allInfra.length,
      capabilityCount: allCaps.length,
      victimSectors: sectors,
      phases,
    },
  };
}

export function getDiamondByIOC(iocValue: string) {
  initDiamondData();
  return Array.from(diamondEvents.values()).filter(
    e => e.infrastructureValue.some((i: any) => i.value === iocValue)
  );
}

// In-memory store for diamond events
let diamondEvents = new Map<string, any>();
let diamondInitialized = false;

function initDiamondData() {
  if (diamondInitialized) return;
  DIAMOND_EVENTS.forEach(e => diamondEvents.set(e.id, e));
  diamondInitialized = true;
}
