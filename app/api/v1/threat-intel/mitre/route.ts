// app/api/v1/threat-intel/mitre/route.ts
// Real MITRE ATT&CK data from STIX/TAXII + adversary groups
import { NextResponse } from 'next/server';

const CACHE_TTL = 3600000; // 1 hour
let mitreCache: { data: any; ts: number } | null = null;

const MITRE_STIX_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';

async function fetchMitreData() {
  try {
    const res = await fetch(MITRE_STIX_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const objects = data.objects || [];
    
    // Extract tactics
    const tactics = objects
      .filter((o: any) => o.type === 'x-mitre-tactic')
      .map((t: any) => ({ id: t.external_references?.[0]?.external_id, name: t.name, shortname: t.x_mitre_shortname }))
      .sort((a: any, b: any) => {
        const order = ['reconnaissance','resource-development','initial-access','execution','persistence','privilege-escalation','defense-evasion','credential-access','discovery','lateral-movement','collection','command-and-control','exfiltration','impact'];
        return order.indexOf(a.shortname) - order.indexOf(b.shortname);
      });
    
    // Extract techniques
    const techniques = objects
      .filter((o: any) => o.type === 'attack-pattern' && !o.revoked && !o.x_mitre_deprecated)
      .map((t: any) => ({
        id: t.external_references?.[0]?.external_id || '',
        name: t.name,
        tactic: (t.kill_chain_phases || []).map((p: any) => p.phase_name),
        platforms: t.x_mitre_platforms || [],
        isSubtechnique: t.x_mitre_is_subtechnique || false,
        description: (t.description || '').slice(0, 200),
        dataSources: t.x_mitre_data_sources || [],
      }))
      .filter((t: any) => t.id && !t.isSubtechnique);
    
    // Extract groups (adversaries)
    const groups = objects
      .filter((o: any) => o.type === 'intrusion-set' && !o.revoked)
      .map((g: any) => {
        const extRef = g.external_references?.[0];
        return {
          id: extRef?.external_id || g.id,
          name: g.name,
          aliases: g.aliases || [],
          description: (g.description || '').slice(0, 300),
          created: g.created,
          modified: g.modified,
          country: extractCountry(g.description || '', g.aliases || []),
          motivation: extractMotivation(g.description || ''),
          url: extRef?.url || '',
        };
      })
      .sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
    
    // Extract relationships (group -> technique)
    const relationships = objects
      .filter((o: any) => o.type === 'relationship' && o.relationship_type === 'uses')
      .slice(0, 500);
    
    return { tactics, techniques: techniques.slice(0, 200), groups: groups.slice(0, 50), relationshipCount: relationships.length, totalTechniques: techniques.length, totalGroups: groups.length };
  } catch { return null; }
}

function extractCountry(desc: string, aliases: string[]): string {
  const d = desc.toLowerCase();
  if (d.includes('china') || d.includes('chinese') || d.includes('prc')) return 'China';
  if (d.includes('russia') || d.includes('russian') || d.includes('gru') || d.includes('fsb')) return 'Russia';
  if (d.includes('north korea') || d.includes('dprk') || d.includes('lazarus')) return 'North Korea';
  if (d.includes('iran') || d.includes('iranian') || d.includes('irgc')) return 'Iran';
  if (d.includes('vietnam')) return 'Vietnam';
  if (d.includes('india')) return 'India';
  if (d.includes('pakistan')) return 'Pakistan';
  if (d.includes('israel')) return 'Israel';
  return 'Unknown';
}

function extractMotivation(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('espionage') || d.includes('intelligence')) return 'Espionage';
  if (d.includes('financial') || d.includes('money') || d.includes('profit')) return 'Financial';
  if (d.includes('destruct') || d.includes('sabotage') || d.includes('wiper')) return 'Destructive';
  if (d.includes('hacktiv')) return 'Hacktivism';
  return 'Espionage';
}

export async function GET() {
  try {
    if (mitreCache && Date.now() - mitreCache.ts < CACHE_TTL) {
      return NextResponse.json({ ...mitreCache.data, cached: true, timestamp: new Date().toISOString() });
    }
    const data = await fetchMitreData();
    if (!data) return NextResponse.json({ error: 'Failed to fetch MITRE data' }, { status: 500 });
    mitreCache = { data, ts: Date.now() };
    return NextResponse.json({ ...data, cached: false, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
