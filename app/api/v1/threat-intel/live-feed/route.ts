// app/api/v1/threat-intel/live-feed/route.ts
// Real-time threat intelligence feed from OTX, NVD, and CISA
import { NextResponse } from 'next/server';

const OTX_API_KEY = process.env.OTX_API_KEY || '';
const CACHE_TTL = 300000; // 5 min cache
let feedCache: { data: any; ts: number } | null = null;

async function fetchOTXPulses() {
  try {
    const headers: Record<string,string> = { 'Accept': 'application/json' };
    if (OTX_API_KEY) headers['X-OTX-API-KEY'] = OTX_API_KEY;
    const res = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=20&modified_since=' + new Date(Date.now() - 7 * 86400000).toISOString(), { headers, next: { revalidate: 300 } });
    if (!res.ok) {
      const fallback = await fetch('https://otx.alienvault.com/api/v1/pulses/activity?limit=20', { headers, next: { revalidate: 300 } });
      if (!fallback.ok) return [];
      const data = await fallback.json();
      return (data.results || []).map((p: any) => ({
        id: p.id,
        source: 'AlienVault OTX',
        sourceIcon: 'AV',
        title: p.name || 'Untitled Pulse',
        summary: (p.description || '').slice(0, 200) || 'No description available.',
        category: mapOTXTags(p.tags || []),
        severity: mapOTXSeverity(p.adversary, p.tags, p.indicators?.length),
        timestamp: p.modified || p.created,
        tags: (p.tags || []).slice(0, 5),
        url: `https://otx.alienvault.com/pulse/${p.id}`,
        indicatorCount: p.indicators?.length || 0,
      }));
    }
    const data = await res.json();
    return (data.results || []).map((p: any) => ({
      id: p.id,
      source: 'AlienVault OTX',
      sourceIcon: 'AV',
      title: p.name || 'Untitled Pulse',
      summary: (p.description || '').slice(0, 200) || 'No description available.',
      category: mapOTXTags(p.tags || []),
      severity: mapOTXSeverity(p.adversary, p.tags, p.indicators?.length),
      timestamp: p.modified || p.created,
      tags: (p.tags || []).slice(0, 5),
      url: `https://otx.alienvault.com/pulse/${p.id}`,
      indicatorCount: p.indicators?.length || 0,
    }));
  } catch { return []; }
}

async function fetchCISAAlerts() {
  try {
    const res = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json', { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.vulnerabilities || []).slice(0, 10).map((v: any, i: number) => ({
      id: `cisa-${v.cveID || i}`,
      source: 'CISA KEV',
      sourceIcon: 'CI',
      title: `${v.cveID}: ${v.vulnerabilityName || 'Known Exploited Vulnerability'}`,
      summary: `${v.shortDescription || 'Active exploitation detected.'}`.slice(0, 200),
      category: 'Vulnerability',
      severity: 'critical' as const,
      timestamp: v.dateAdded || new Date().toISOString(),
      tags: [v.cveID, v.vendorProject, 'kev'].filter(Boolean),
      url: `https://nvd.nist.gov/vuln/detail/${v.cveID}`,
      indicatorCount: 0,
    }));
  } catch { return []; }
}

async function fetchAbuseChRecent() {
  try {
    const res = await fetch('https://feodotracker.abuse.ch/downloads/ipblocklist_recommended.json', { next: { revalidate: 600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const items = (Array.isArray(data) ? data : []).slice(0, 5);
    if (items.length === 0) return [];
    return [{
      id: 'abusech-feodo-' + Date.now(),
      source: 'Abuse.ch',
      sourceIcon: 'AB',
      title: `Feodo Tracker: ${items.length}+ active C2 servers detected`,
      summary: `Active botnet C2 infrastructure identified. Top IPs: ${items.slice(0,3).map((i:any) => i.ip_address || i.dst_ip).filter(Boolean).join(', ')}`,
      category: 'Botnet',
      severity: 'high' as const,
      timestamp: new Date().toISOString(),
      tags: ['feodo', 'botnet', 'c2'],
      url: 'https://feodotracker.abuse.ch/browse/',
      indicatorCount: items.length,
    }];
  } catch { return []; }
}

function mapOTXTags(tags: string[]): string {
  const t = tags.map(t => t.toLowerCase());
  if (t.some(x => /malware|trojan|ransomware|rat/.test(x))) return 'Malware';
  if (t.some(x => /phish/.test(x))) return 'Phishing';
  if (t.some(x => /apt|threat.actor|nation.state/.test(x))) return 'APT';
  if (t.some(x => /cve|vuln|exploit/.test(x))) return 'Vulnerability';
  if (t.some(x => /ddos|dos/.test(x))) return 'DDoS';
  if (t.some(x => /botnet|c2|c&c/.test(x))) return 'Botnet';
  return 'Threat Intel';
}

function mapOTXSeverity(adversary: string|null, tags: string[], indicatorCount?: number): string {
  if (adversary) return 'high';
  const t = tags.map(t => t.toLowerCase());
  if (t.some(x => /critical|ransomware|zero.day|apt/.test(x))) return 'critical';
  if (t.some(x => /exploit|malware|backdoor/.test(x))) return 'high';
  if (indicatorCount && indicatorCount > 50) return 'high';
  if (indicatorCount && indicatorCount > 10) return 'medium';
  return 'medium';
}

export async function GET() {
  try {
    if (feedCache && Date.now() - feedCache.ts < CACHE_TTL) {
      return NextResponse.json({ items: feedCache.data, cached: true, timestamp: new Date().toISOString() });
    }
    const [otx, cisa, abusech] = await Promise.allSettled([
      fetchOTXPulses(),
      fetchCISAAlerts(),
      fetchAbuseChRecent(),
    ]);
    const items = [
      ...(otx.status === 'fulfilled' ? otx.value : []),
      ...(cisa.status === 'fulfilled' ? cisa.value : []),
      ...(abusech.status === 'fulfilled' ? abusech.value : []),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    feedCache = { data: items, ts: Date.now() };
    return NextResponse.json({ items, cached: false, timestamp: new Date().toISOString(), sources: { otx: otx.status, cisa: cisa.status, abusech: abusech.status } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, items: [] }, { status: 500 });
  }
}
