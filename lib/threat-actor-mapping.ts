// lib/threat-actor-mapping.ts
// Phase 6 — Threat Actor Mapping & Campaign Tracking

export interface ThreatActor {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  threatActorTypes: ('nation-state' | 'crime-syndicate' | 'hactivist' | 'insider' | 'unknown')[];
  sophistication: 'none' | 'minimal' | 'intermediate' | 'advanced' | 'expert' | 'innovator';
  resourceLevel: 'individual' | 'club' | 'contest' | 'team' | 'organization' | 'government';
  primaryMotivation: string;
  regions: string[];
  ttps: string[];
  iocIds: string[];
  campaigns: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'historic' | 'suspected';
  threatActorId: string;
  objective: string;
  targetSectors: string[];
  targetRegions: string[];
  iocIds: string[];
  ttps: string[];
  firstSeen: string;
  lastSeen: string;
  confidence: number;
}

// In-memory stores
const threatActors: Map<string, ThreatActor> = new Map();
const campaigns: Map<string, Campaign> = new Map();

function initActorData() {
  if (threatActors.size > 0) return;
  const now = new Date().toISOString();

  threatActors.set('ta-001', {
    id: 'ta-001',
    name: 'ShadowDragon',
    aliases: ['APT-SD', 'DragonForce'],
    description: 'Advanced persistent threat group targeting financial and technology sectors in APAC',
    threatActorTypes: ['nation-state'],
    sophistication: 'advanced',
    resourceLevel: 'organization',
    primaryMotivation: 'organizational-gain',
    regions: ['East Asia', 'Southeast Asia'],
    ttps: ['T1566-Phishing', 'T1059-Command and Scripting', 'T1071-Application Layer Protocol', 'T1486-Data Encrypted for Impact'],
    iocIds: ['ioc-1', 'ioc-2', 'ioc-4', 'ioc-5'],
    campaigns: ['campaign-001'],
    firstSeen: '2024-01-15T00:00:00Z',
    lastSeen: now,
    confidence: 82,
  });

  threatActors.set('ta-002', {
    id: 'ta-002',
    name: 'PhishNet Collective',
    aliases: ['PhishKing'],
    description: 'Financially motivated phishing group operating credential harvesting campaigns',
    threatActorTypes: ['crime-syndicate'],
    sophistication: 'intermediate',
    resourceLevel: 'team',
    primaryMotivation: 'personal-gain',
    regions: ['Global'],
    ttps: ['T1566.001-Spearphishing Attachment', 'T1078-Valid Accounts', 'T1539-Steal Web Session Cookie'],
    iocIds: ['ioc-2'],
    campaigns: ['campaign-002'],
    firstSeen: '2023-06-01T00:00:00Z',
    lastSeen: now,
    confidence: 75,
  });

  campaigns.set('campaign-001', {
    id: 'campaign-001',
    name: 'Operation NextRAT',
    description: 'Multi-stage attack campaign deploying NextRAT malware through compromised supply chain',
    status: 'active',
    threatActorId: 'ta-001',
    objective: 'Data exfiltration and persistent access to enterprise networks',
    targetSectors: ['Technology', 'Finance', 'Government'],
    targetRegions: ['Hong Kong', 'Singapore', 'Japan'],
    iocIds: ['ioc-1', 'ioc-4', 'ioc-5', 'ioc-6'],
    ttps: ['T1566-Phishing', 'T1059.001-PowerShell', 'T1071.001-Web Protocols'],
    firstSeen: '2025-08-01T00:00:00Z',
    lastSeen: now,
    confidence: 88,
  });

  campaigns.set('campaign-002', {
    id: 'campaign-002',
    name: 'CredHarvest 2026',
    description: 'Large-scale credential phishing campaign targeting enterprise email users',
    status: 'active',
    threatActorId: 'ta-002',
    objective: 'Credential theft for account takeover',
    targetSectors: ['Enterprise', 'Education', 'Healthcare'],
    targetRegions: ['APAC', 'Europe'],
    iocIds: ['ioc-2'],
    ttps: ['T1566.001-Spearphishing Attachment', 'T1078-Valid Accounts'],
    firstSeen: '2026-01-10T00:00:00Z',
    lastSeen: now,
    confidence: 72,
  });
}

// ----- Threat Actor Operations -----
export function getAllThreatActors(): ThreatActor[] {
  initActorData();
  return Array.from(threatActors.values());
}

export function getThreatActor(id: string): ThreatActor | undefined {
  initActorData();
  return threatActors.get(id);
}

export function findActorsByIOC(iocId: string): ThreatActor[] {
  initActorData();
  return Array.from(threatActors.values()).filter(ta => ta.iocIds.includes(iocId));
}

// ----- Campaign Operations -----
export function getAllCampaigns(): Campaign[] {
  initActorData();
  return Array.from(campaigns.values());
}

export function getCampaign(id: string): Campaign | undefined {
  initActorData();
  return campaigns.get(id);
}

export function findCampaignsByActor(actorId: string): Campaign[] {
  initActorData();
  return Array.from(campaigns.values()).filter(c => c.threatActorId === actorId);
}

export function findCampaignsByIOC(iocId: string): Campaign[] {
  initActorData();
  return Array.from(campaigns.values()).filter(c => c.iocIds.includes(iocId));
}
