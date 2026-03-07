// lib/commercial-feeds.ts
// Phase 4 — Commercial Feed Integration
// Paid threat intelligence sources: VirusTotal, AlienVault OTX, AbuseIPDB, GreyNoise

export interface VirusTotalResult {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  lastAnalysisDate: string;
  reputation: number;
  tags: string[];
}

export interface AbuseIPDBResult {
  ipAddress: string;
  isPublic: boolean;
  abuseConfidenceScore: number;
  countryCode: string;
  isp: string;
  domain: string;
  totalReports: number;
  lastReportedAt: string;
  categories: number[];
}

export interface OTXResult {
  pulseCount: number;
  reputation: number;
  country: string;
  asn: string;
  pulses: { id: string; name: string; created: string }[];
  malwareFamilies: string[];
}

export interface GreyNoiseResult {
  ip: string;
  noise: boolean;
  riot: boolean;
  classification: 'benign' | 'malicious' | 'unknown';
  name: string;
  lastSeen: string;
  tags: string[];
}

export interface EnrichmentResult {
  ioc: string;
  ioc_type: string;
  virusTotal?: VirusTotalResult;
  abuseIPDB?: AbuseIPDBResult;
  otx?: OTXResult;
  greyNoise?: GreyNoiseResult;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
  errors: Record<string, string>;
  queriedAt: string;
}

const VT_API = 'https://www.virustotal.com/api/v3';
const ABUSEIPDB_API = 'https://api.abuseipdb.com/api/v2';
const OTX_API = 'https://otx.alienvault.com/api/v1';
const GREYNOISE_API = 'https://api.greynoise.io/v3/community';

// ----- VirusTotal -----
export async function queryVirusTotal(ioc: string, type: string): Promise<VirusTotalResult | null> {
  const key = process.env.VIRUSTOTAL_API_KEY;
  if (!key) return null;
  const endpoint = type === 'ipv4-addr' || type === 'ipv6-addr'
    ? `${VT_API}/ip_addresses/${ioc}`
    : type === 'domain'
    ? `${VT_API}/domains/${ioc}`
    : `${VT_API}/files/${ioc}`;
  try {
    const res = await fetch(endpoint, { headers: { 'x-apikey': key } });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`VT ${res.status}`);
    const d = await res.json();
    const stats = d.data?.attributes?.last_analysis_stats ?? {};
    return {
      malicious: stats.malicious ?? 0,
      suspicious: stats.suspicious ?? 0,
      harmless: stats.harmless ?? 0,
      undetected: stats.undetected ?? 0,
      lastAnalysisDate: d.data?.attributes?.last_analysis_date
        ? new Date(d.data.attributes.last_analysis_date * 1000).toISOString()
        : '',
      reputation: d.data?.attributes?.reputation ?? 0,
      tags: d.data?.attributes?.tags ?? [],
    };
  } catch (e: any) { throw new Error(`VirusTotal: ${e.message}`); }
}

// ----- AbuseIPDB -----
export async function queryAbuseIPDB(ip: string): Promise<AbuseIPDBResult | null> {
  const key = process.env.ABUSEIPDB_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${ABUSEIPDB_API}/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90&verbose`, {
      headers: { Key: key, Accept: 'application/json' },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`AbuseIPDB ${res.status}`);
    const d = await res.json();
    const r = d.data;
    return {
      ipAddress: r.ipAddress,
      isPublic: r.isPublic,
      abuseConfidenceScore: r.abuseConfidenceScore,
      countryCode: r.countryCode ?? '',
      isp: r.isp ?? '',
      domain: r.domain ?? '',
      totalReports: r.totalReports,
      lastReportedAt: r.lastReportedAt ?? '',
      categories: r.categories ?? [],
    };
  } catch (e: any) { throw new Error(`AbuseIPDB: ${e.message}`); }
}

// ----- AlienVault OTX -----
export async function queryOTX(ioc: string, type: string): Promise<OTXResult | null> {
  const key = process.env.OTX_API_KEY;
  if (!key) return null;
  const section = type === 'ipv4-addr' ? 'IPv4' : type === 'ipv6-addr' ? 'IPv6' : type === 'domain' ? 'domain' : 'file';
  try {
    const res = await fetch(`${OTX_API}/indicators/${section}/${ioc}/general`, {
      headers: { 'X-OTX-API-KEY': key },
    });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`OTX ${res.status}`);
    const d = await res.json();
    return {
      pulseCount: d.pulse_info?.count ?? 0,
      reputation: d.reputation ?? 0,
      country: d.country_name ?? '',
      asn: d.asn ?? '',
      pulses: (d.pulse_info?.pulses ?? []).slice(0, 10).map((p: any) => ({
        id: p.id, name: p.name, created: p.created,
      })),
      malwareFamilies: d.pulse_info?.references ?? [],
    };
  } catch (e: any) { throw new Error(`OTX: ${e.message}`); }
}

// ----- GreyNoise -----
export async function queryGreyNoise(ip: string): Promise<GreyNoiseResult | null> {
  const key = process.env.GREYNOISE_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GREYNOISE_API}/${ip}`, {
      headers: { key: key, Accept: 'application/json' },
    });
    if (res.status === 404) return { ip, noise: false, riot: false, classification: 'unknown', name: '', lastSeen: '', tags: [] };
    if (!res.ok) throw new Error(`GreyNoise ${res.status}`);
    const d = await res.json();
    return {
      ip: d.ip,
      noise: d.noise ?? false,
      riot: d.riot ?? false,
      classification: d.classification ?? 'unknown',
      name: d.name ?? '',
      lastSeen: d.last_seen ?? '',
      tags: d.tags ?? [],
    };
  } catch (e: any) { throw new Error(`GreyNoise: ${e.message}`); }
}

// ----- IOC Type Detection -----
export function detectIOCType(ioc: string): string {
  if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ioc)) return 'ipv4-addr';
  if (ioc.includes(':') && /^[0-9a-fA-F:]+$/.test(ioc)) return 'ipv6-addr';
  if (/^[a-f0-9]{32,128}$/i.test(ioc)) return 'hash';
  if (ioc.startsWith('http://') || ioc.startsWith('https://')) return 'url';
  if (ioc.includes('@')) return 'email-addr';
  return 'domain';
}

// ----- Unified Enrichment (all sources) -----
export async function enrichIOC(ioc: string, iocType?: string): Promise<EnrichmentResult> {
  const type = iocType ?? detectIOCType(ioc);
  const errors: Record<string, string> = {};
  const isIP = type === 'ipv4-addr' || type === 'ipv6-addr';
  const tasks: Promise<void>[] = [];
  let vt: VirusTotalResult | null = null;
  let abuse: AbuseIPDBResult | null = null;
  let otx: OTXResult | null = null;
  let gn: GreyNoiseResult | null = null;

  tasks.push(queryVirusTotal(ioc, type).then(r => { vt = r; }).catch(e => { errors.virusTotal = e.message; }));
  if (isIP) tasks.push(queryAbuseIPDB(ioc).then(r => { abuse = r; }).catch(e => { errors.abuseIPDB = e.message; }));
  tasks.push(queryOTX(ioc, type).then(r => { otx = r; }).catch(e => { errors.otx = e.message; }));
  if (isIP) tasks.push(queryGreyNoise(ioc).then(r => { gn = r; }).catch(e => { errors.greyNoise = e.message; }));

  await Promise.allSettled(tasks);

  const riskScore = calculateRiskScore(vt, abuse, otx, gn);
  return {
    ioc,
    ioc_type: type,
    virusTotal: vt ?? undefined,
    abuseIPDB: abuse ?? undefined,
    otx: otx ?? undefined,
    greyNoise: gn ?? undefined,
    riskScore,
    riskLevel: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : riskScore >= 20 ? 'low' : 'info',
    errors,
    queriedAt: new Date().toISOString(),
  };
}

// ----- Risk Score Calculation -----
function calculateRiskScore(
  vt: VirusTotalResult | null,
  abuse: AbuseIPDBResult | null,
  otx: OTXResult | null,
  gn: GreyNoiseResult | null
): number {
  let score = 0;
  let factors = 0;

  if (vt) {
    const total = vt.malicious + vt.suspicious + vt.harmless + vt.undetected;
    if (total > 0) {
      score += ((vt.malicious * 100 + vt.suspicious * 50) / total);
      factors++;
    }
  }
  if (abuse) {
    score += abuse.abuseConfidenceScore;
    factors++;
  }
  if (otx) {
    const otxScore = Math.min(otx.pulseCount * 10, 100);
    score += otxScore;
    factors++;
  }
  if (gn) {
    if (gn.classification === 'malicious') score += 90;
    else if (gn.classification === 'benign' || gn.riot) score += 5;
    else score += 30;
    factors++;
  }

  return factors > 0 ? Math.round(score / factors) : 0;
}
