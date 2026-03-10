// lib/commercial-feeds.ts
// Phase 4 — Commercial Feed Integration
// Paid threat intelligence sources: VirusTotal, AlienVault OTX, AbuseIPDB, GreyNoise, Google Safe Browsing, Cloudflare Radar
import { categorizeUrl } from './url-categories';
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
export interface GoogleSafeBrowsingResult {
  threatFound: boolean;
  threats: { threatType: string; platformType: string; url: string }[];
  cacheDuration: string;
}
export interface CloudflareRadarResult {
  malicious: boolean;
  categories: string[];
  rank: number;
  scanId: string;
}
export interface EnrichmentResult {
  ioc: string;
  ioc_type: string;
  virusTotal?: VirusTotalResult;
  abuseIPDB?: AbuseIPDBResult;
  otx?: OTXResult;
  greyNoise?: GreyNoiseResult;
  googleSafeBrowsing?: GoogleSafeBrowsingResult;
  cloudflareRadar?: CloudflareRadarResult;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low' | 'info';
  errors: Record<string, string>;
  queriedAt: string;
  // URL Category fields
  categories?: string[];
  category_source?: string;
}
const VT_API = 'https://www.virustotal.com/api/v3';
const ABUSEIPDB_API = 'https://api.abuseipdb.com/api/v2';
const OTX_API = 'https://otx.alienvault.com/api/v1';
const GREYNOISE_API = 'https://api.greynoise.io/v3/community';
const GOOGLE_SB_API = 'https://safebrowsing.googleapis.com/v4/threatMatches:find';
const CLOUDFLARE_RADAR_API = 'https://api.cloudflare.com/client/v4/url_scanner/scan';
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
// ----- Google Safe Browsing -----
export async function queryGoogleSafeBrowsing(url: string): Promise<GoogleSafeBrowsingResult | null> {
  const key = process.env.GOOGLE_SAFE_BROWSING_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${GOOGLE_SB_API}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: { clientId: 'nextguard', clientVersion: '1.0' },
        threatInfo: {
          threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE', 'POTENTIALLY_HARMFUL_APPLICATION'],
          platformTypes: ['ANY_PLATFORM'],
          threatEntryTypes: ['URL'],
          threatEntries: [{ url: url.startsWith('http') ? url : `https://${url}` }],
        },
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`Google SB ${res.status}`);
    const d = await res.json();
    const matches = d.matches || [];
    return {
      threatFound: matches.length > 0,
      threats: matches.map((m: any) => ({
        threatType: m.threatType || '',
        platformType: m.platformType || '',
        url: m.threat?.url || '',
      })),
      cacheDuration: matches[0]?.cacheDuration || '',
    };
  } catch (e: any) { throw new Error(`Google Safe Browsing: ${e.message}`); }
}
// ----- Cloudflare Radar URL Scanner -----
export async function queryCloudflareRadar(url: string): Promise<CloudflareRadarResult | null> {
  const key = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!key || !accountId) return null;
  try {
    // Submit scan
    const scanRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/urlscanner/scan`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.startsWith('http') ? url : `https://${url}`, visibility: 'unlisted' }),
      signal: AbortSignal.timeout(10000),
    });
    if (!scanRes.ok) throw new Error(`Cloudflare Radar ${scanRes.status}`);
    const scanData = await scanRes.json();
    const scanId = scanData.result?.uuid || '';
    if (!scanId) return { malicious: false, categories: [], rank: 0, scanId: '' };
    // Wait for scan to complete (poll with timeout)
    await new Promise(r => setTimeout(r, 5000));
    const resultRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/urlscanner/scan/${scanId}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!resultRes.ok) return { malicious: false, categories: [], rank: 0, scanId };
    const resultData = await resultRes.json();
    const verdict = resultData.result?.scan?.verdicts?.overall || {};
    const cats = verdict.categories || resultData.result?.scan?.categories || [];
    return {
      malicious: verdict.malicious || false,
      categories: Array.isArray(cats) ? cats.map((c: any) => typeof c === 'string' ? c : c.name || '') : [],
      rank: resultData.result?.scan?.page?.rank || 0,
      scanId,
    };
  } catch (e: any) { throw new Error(`Cloudflare Radar: ${e.message}`); }
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
// ----- URL Category lookup via threat-intel lookup API -----
async function fetchUrlCategories(ioc: string, type: string): Promise<{ categories: string[]; category_source: string }> {
  if (type !== 'url' && type !== 'domain') {
    return { categories: [], category_source: 'none' };
  }
  try {
    const base = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'https://www.next-guard.com';
    const res = await fetch(
      `${base}/api/v1/threat-intel/lookup?indicator=${encodeURIComponent(ioc)}&mode=db`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) throw new Error('lookup failed');
    const data = await res.json();
    return {
      categories: Array.isArray(data.categories) && data.categories.length > 0
        ? data.categories
        : categorizeUrl(ioc),
      category_source: data.category_source || 'heuristic',
    };
  } catch {
    return { categories: categorizeUrl(ioc), category_source: 'heuristic' };
  }
}
// ----- Unified Enrichment (all sources) -----
export async function enrichIOC(ioc: string, iocType?: string): Promise<EnrichmentResult> {
  const type = iocType ?? detectIOCType(ioc);
  const errors: Record<string, string> = {};
  const isIP = type === 'ipv4-addr' || type === 'ipv6-addr';
  const isDomainOrUrl = type === 'domain' || type === 'url';
  const tasks: Promise<void>[] = [];
  let vt: VirusTotalResult | null = null;
  let abuse: AbuseIPDBResult | null = null;
  let otx: OTXResult | null = null;
  let gn: GreyNoiseResult | null = null;
  let gsb: GoogleSafeBrowsingResult | null = null;
  let cfr: CloudflareRadarResult | null = null;
  tasks.push(queryVirusTotal(ioc, type).then(r => { vt = r; }).catch(e => { errors.virusTotal = e.message; }));
  if (isIP) tasks.push(queryAbuseIPDB(ioc).then(r => { abuse = r; }).catch(e => { errors.abuseIPDB = e.message; }));
  tasks.push(queryOTX(ioc, type).then(r => { otx = r; }).catch(e => { errors.otx = e.message; }));
  if (isIP) tasks.push(queryGreyNoise(ioc).then(r => { gn = r; }).catch(e => { errors.greyNoise = e.message; }));
  // Google Safe Browsing - works for domains and URLs
  if (isDomainOrUrl) tasks.push(queryGoogleSafeBrowsing(ioc).then(r => { gsb = r; }).catch(e => { errors.googleSafeBrowsing = e.message; }));
  // Cloudflare Radar - works for domains and URLs
  if (isDomainOrUrl) tasks.push(queryCloudflareRadar(ioc).then(r => { cfr = r; }).catch(e => { errors.cloudflareRadar = e.message; }));
  // Fetch URL categories in parallel
  const catPromise = fetchUrlCategories(ioc, type);
  await Promise.allSettled(tasks);
  const { categories, category_source } = await catPromise;
  const riskScore = calculateRiskScore(vt, abuse, otx, gn, gsb, cfr);
  return {
    ioc,
    ioc_type: type,
    virusTotal: vt ?? undefined,
    abuseIPDB: abuse ?? undefined,
    otx: otx ?? undefined,
    greyNoise: gn ?? undefined,
    googleSafeBrowsing: gsb ?? undefined,
    cloudflareRadar: cfr ?? undefined,
    riskScore,
    riskLevel: riskScore >= 80 ? 'critical' : riskScore >= 60 ? 'high' : riskScore >= 40 ? 'medium' : riskScore >= 20 ? 'low' : 'info',
    errors,
    queriedAt: new Date().toISOString(),
    categories: categories.length > 0 ? categories : undefined,
    category_source: categories.length > 0 ? category_source : undefined,
  };
}
// ----- Risk Score Calculation -----
function calculateRiskScore(
  vt: VirusTotalResult | null,
  abuse: AbuseIPDBResult | null,
  otx: OTXResult | null,
  gn: GreyNoiseResult | null,
  gsb: GoogleSafeBrowsingResult | null,
  cfr: CloudflareRadarResult | null
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
  if (gsb) {
    if (gsb.threatFound) score += 95;
    else score += 0;
    factors++;
  }
  if (cfr) {
    if (cfr.malicious) score += 90;
    else score += 5;
    factors++;
  }
  return factors > 0 ? Math.round(score / factors) : 0;
}
