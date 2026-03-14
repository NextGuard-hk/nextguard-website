// app/api/v1/threat-intel/cve/route.ts
// Real-time CVE data from NVD and CISA KEV
import { NextResponse } from 'next/server';

const CACHE_TTL = 600000; // 10 min
let cveCache: { data: any; ts: number } | null = null;

interface CVEItem {
  id: string;
  cveId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvssScore: number;
  status: 'open' | 'in_progress' | 'patched' | 'accepted_risk';
  description: string;
  discoveredDate: string;
  exploitAvailable: boolean;
  affectedSystems: number;
  vendor?: string;
  product?: string;
}

async function fetchNVDRecent(): Promise<CVEItem[]> {
  try {
    const since = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 23);
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${since}&resultsPerPage=20&cvssV3Severity=HIGH`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.vulnerabilities || []).map((v: any, i: number) => {
      const cve = v.cve;
      const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
      const score = metrics?.cvssData?.baseScore || 0;
      const desc = cve.descriptions?.find((d: any) => d.lang === 'en')?.value || '';
      return {
        id: `nvd-${cve.id}`,
        cveId: cve.id,
        title: desc.slice(0, 100) + (desc.length > 100 ? '...' : ''),
        severity: score >= 9 ? 'critical' : score >= 7 ? 'high' : score >= 4 ? 'medium' : 'low',
        cvssScore: score,
        status: 'open' as const,
        description: desc.slice(0, 300),
        discoveredDate: cve.published || new Date().toISOString(),
        exploitAvailable: (cve.references || []).some((r: any) => r.tags?.includes('Exploit')),
        affectedSystems: 0,
        vendor: cve.configurations?.[0]?.nodes?.[0]?.cpeMatch?.[0]?.criteria?.split(':')?.[3] || undefined,
        product: cve.configurations?.[0]?.nodes?.[0]?.cpeMatch?.[0]?.criteria?.split(':')?.[4] || undefined,
      };
    });
  } catch { return []; }
}

async function fetchCISAKEV(): Promise<CVEItem[]> {
  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.vulnerabilities || []).slice(0, 15).map((v: any, i: number) => ({
      id: `kev-${v.cveID}`,
      cveId: v.cveID,
      title: v.vulnerabilityName || v.cveID,
      severity: 'critical' as const,
      cvssScore: 9.8,
      status: new Date(v.dueDate) < new Date() ? 'open' : 'in_progress' as any,
      description: v.shortDescription || 'Known exploited vulnerability - immediate action required.',
      discoveredDate: v.dateAdded || new Date().toISOString(),
      exploitAvailable: true,
      affectedSystems: 0,
      vendor: v.vendorProject || undefined,
      product: v.product || undefined,
    }));
  } catch { return []; }
}

export async function GET() {
  try {
    if (cveCache && Date.now() - cveCache.ts < CACHE_TTL) {
      return NextResponse.json({ vulnerabilities: cveCache.data, cached: true, timestamp: new Date().toISOString() });
    }
    const [nvd, kev] = await Promise.allSettled([fetchNVDRecent(), fetchCISAKEV()]);
    const seen = new Set<string>();
    const all = [
      ...(kev.status === 'fulfilled' ? kev.value : []),
      ...(nvd.status === 'fulfilled' ? nvd.value : []),
    ].filter(v => { if (seen.has(v.cveId)) return false; seen.add(v.cveId); return true; })
     .sort((a, b) => b.cvssScore - a.cvssScore)
     .slice(0, 25);
    cveCache = { data: all, ts: Date.now() };
    return NextResponse.json({ vulnerabilities: all, cached: false, timestamp: new Date().toISOString(), sources: { nvd: nvd.status, kev: kev.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, vulnerabilities: [] }, { status: 500 });
  }
}
