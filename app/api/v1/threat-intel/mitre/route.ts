// app/api/v1/threat-intel/mitre/route.ts
import { NextRequest, NextResponse } from 'next/server';

const CACHE_TTL = 3600000;
let mitreCache: { data: any; ts: number } | null = null;

const MITRE_STIX_URL = 'https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json';

async function fetchMitreData() {
  try {
    const res = await fetch(MITRE_STIX_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data = await res.json();
    const objects = data.objects || [];

    const tactics = objects
      .filter((o: any) => o.type === 'x-mitre-tactic')
      .map((t: any) => ({
        id: t.external_references?.[0]?.external_id,
        name: t.name,
        shortname: t.x_mitre_shortname
      }));

    const techniques = objects
      .filter((o: any) => o.type === 'attack-pattern' && !o.revoked && !o.x_mitre_deprecated)
      .map((t: any) => ({
        id: t.external_references?.[0]?.external_id || '',
        name: t.name,
        stixId: t.id,
        tactic: (t.kill_chain_phases || []).map((p: any) => p.phase_name),
        platforms: t.x_mitre_platforms || [],
        isSubtechnique: t.x_mitre_is_subtechnique || false,
        description: (t.description || '').slice(0, 200),
      }))
      .filter((t: any) => t.id);

    const software = objects
      .filter((o: any) => (o.type === 'malware' || o.type === 'tool') && !o.revoked)
      .map((s: any) => ({
        id: s.external_references?.[0]?.external_id || '',
        name: s.name,
        stixId: s.id,
        type: s.type,
      }));

    const relationships = objects
      .filter((o: any) => o.type === 'relationship' && o.relationship_type === 'uses' && !o.revoked);

    const groups = objects
      .filter((o: any) => o.type === 'intrusion-set' && !o.revoked)
      .map((g: any) => {
        const extRef = g.external_references?.[0];
        const groupStixId = g.id;
        const usedTechIds = relationships
          .filter((r: any) => r.source_ref === groupStixId)
          .map((r: any) => r.target_ref);
        const groupTechniques = techniques
          .filter((t: any) => usedTechIds.includes(t.stixId))
          .map((t: any) => t.id)
          .slice(0, 30);
        const groupSoftware = software
          .filter((s: any) => usedTechIds.includes(s.stixId))
          .map((s: any) => s.name)
          .slice(0, 15);
        return {
          id: extRef?.external_id || g.id,
          name: g.name,
          aliases: g.aliases || [],
          description: g.description || '',
          techniques: groupTechniques,
          software: groupSoftware,
          created: g.created,
          modified: g.modified,
          references: (g.external_references || []).map((r: any) => ({ source_name: r.source_name, url: r.url })),
        };
      })
      .sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime());

    return { tactics, techniques: techniques.slice(0, 300), groups, totalTechniques: techniques.length, totalGroups: groups.length };
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    if (mitreCache && Date.now() - mitreCache.ts < CACHE_TTL) {
      const type = request.nextUrl.searchParams.get('type');
      if (type === 'groups') {
        return NextResponse.json({ groups: mitreCache.data.groups, lastUpdated: new Date(mitreCache.data.ts || Date.now()).toISOString(), cached: true });
      }
      return NextResponse.json({ ...mitreCache.data, cached: true, timestamp: new Date().toISOString() });
    }

    const data = await fetchMitreData();
    if (!data) return NextResponse.json({ error: 'Failed to fetch MITRE data' }, { status: 500 });

    mitreCache = { data, ts: Date.now() };

    const type = request.nextUrl.searchParams.get('type');
    if (type === 'groups') {
      return NextResponse.json({ groups: data.groups, lastUpdated: new Date().toISOString(), cached: false });
    }
    return NextResponse.json({ ...data, cached: false, timestamp: new Date().toISOString() });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
