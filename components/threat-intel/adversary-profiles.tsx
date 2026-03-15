// components/threat-intel/adversary-profiles.tsx
'use client';

import React, { useState } from 'react';

interface AdversaryGroup {
  id: string;
  name: string;
  aliases: string[];
  origin: string;
  motivation: string;
  targetSectors: string[];
  techniques: string[];
  software: string[];
  threatLevel: 'critical' | 'high' | 'medium' | 'low';
  lastActive: string;
  description: string;
  campaigns: number;
}

const mockGroups: AdversaryGroup[] = [
  { id: 'G0016', name: 'APT29 (Cozy Bear)', aliases: ['Cozy Bear','NOBELIUM','Midnight Blizzard'], origin: 'Russia', motivation: 'Espionage', targetSectors: ['Government','Defense','Technology','Healthcare'], techniques: ['T1566-Phishing','T1059-Command Shell','T1071-Web Protocols','T1027-Obfuscation','T1083-File Discovery'], software: ['Cobalt Strike','SUNBURST','TEARDROP','MimiKatz'], threatLevel: 'critical', lastActive: '2025-03-10', description: 'State-sponsored threat group attributed to Russian intelligence services, known for sophisticated supply chain attacks.', campaigns: 47 },
  { id: 'G0007', name: 'APT28 (Fancy Bear)', aliases: ['Fancy Bear','Sofacy','Pawn Storm','Sednit'], origin: 'Russia', motivation: 'Espionage / Disruption', targetSectors: ['Government','Military','Media','Energy'], techniques: ['T1190-Exploit Public App','T1078-Valid Accounts','T1560-Archive Data','T1048-Exfiltration'], software: ['X-Agent','Zebrocy','LoJax','Drovorub'], threatLevel: 'critical', lastActive: '2025-03-08', description: 'Russian military intelligence group targeting NATO countries and political organizations.', campaigns: 63 },
  { id: 'G0096', name: 'APT41 (Double Dragon)', aliases: ['Double Dragon','Winnti','Barium'], origin: 'China', motivation: 'Espionage / Financial', targetSectors: ['Technology','Gaming','Healthcare','Telecom'], techniques: ['T1195-Supply Chain','T1059-PowerShell','T1070-Indicator Removal','T1105-Remote File Copy'], software: ['ShadowPad','PlugX','Winnti Backdoor','Cobalt Strike'], threatLevel: 'high', lastActive: '2025-02-28', description: 'Chinese state-sponsored group conducting both espionage and financially motivated operations.', campaigns: 38 },
  { id: 'G0032', name: 'Lazarus Group', aliases: ['HIDDEN COBRA','Zinc','Labyrinth Chollima'], origin: 'North Korea', motivation: 'Financial / Espionage', targetSectors: ['Finance','Cryptocurrency','Defense','Entertainment'], techniques: ['T1566-Spearphishing','T1204-User Execution','T1486-Data Encrypted','T1565-Data Manipulation'], software: ['BLINDINGCAN','DTrack','FastCash','AppleJeus'], threatLevel: 'critical', lastActive: '2025-03-12', description: 'North Korean state-sponsored group known for destructive attacks and cryptocurrency theft.', campaigns: 72 },
  { id: 'G0049', name: 'OilRig (APT34)', aliases: ['APT34','Helix Kitten','Crambus'], origin: 'Iran', motivation: 'Espionage', targetSectors: ['Energy','Government','Finance','Telecom'], techniques: ['T1133-External Remote','T1053-Scheduled Task','T1003-Credential Dump','T1114-Email Collection'], software: ['RDAT','Karkoff','SideTwist','BondUpdater'], threatLevel: 'high', lastActive: '2025-02-15', description: 'Iranian threat group targeting Middle Eastern organizations with focus on energy sector.', campaigns: 29 },
  { id: 'G0100', name: 'Sandworm', aliases: ['Voodoo Bear','IRIDIUM','Electrum'], origin: 'Russia', motivation: 'Disruption / Sabotage', targetSectors: ['Energy','Government','Infrastructure','Transportation'], techniques: ['T1498-Network DoS','T1485-Data Destruction','T1562-Impair Defenses','T1569-System Services'], software: ['NotPetya','Industroyer','CaddyWiper','BlackEnergy'], threatLevel: 'critical', lastActive: '2025-03-05', description: 'Russian military intelligence unit responsible for destructive cyberattacks against critical infrastructure.', campaigns: 34 },
];

const styles = `
  .adversary-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .adversary-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
  .adversary-title { color: #e0e0e0; font-size: 20px; font-weight: 700; }
  .adversary-stats { display: flex; gap: 16px; }
  .adversary-stat { background: #12122a; border-radius: 8px; padding: 8px 16px; text-align: center; }
  .adversary-stat-num { font-size: 20px; font-weight: 700; color: #a78bfa; }
  .adversary-stat-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .adversary-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .adversary-filter { padding: 4px 12px; border-radius: 12px; border: 1px solid #333; background: transparent; color: #ccc; cursor: pointer; font-size: 12px; }
  .adversary-filter.active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
  .adversary-search { width: 100%; padding: 8px 12px; background: #12122a; border: 1px solid #333; border-radius: 8px; color: #e0e0e0; font-size: 14px; margin-bottom: 16px; }
  .adversary-card { background: linear-gradient(135deg, #0f172a 0%, #1a1040 100%); border: 1px solid #2d2d5e; border-radius: 12px; padding: 16px; margin-bottom: 12px; cursor: pointer; transition: border-color 0.2s; }
  .adversary-card:hover { border-color: #7c3aed; }
  .adversary-card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
  .adversary-name { color: #e0e0e0; font-size: 16px; font-weight: 600; }
  .adversary-origin { color: #888; font-size: 12px; margin-top: 2px; }
  .adversary-level { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .adversary-level-critical { background: #ef4444; color: #fff; }
  .adversary-level-high { background: #f59e0b; color: #000; }
  .adversary-level-medium { background: #3b82f6; color: #fff; }
  .adversary-level-low { background: #22c55e; color: #000; }
  .adversary-aliases { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .adversary-alias { background: #1e1e3f; color: #a78bfa; padding: 2px 8px; border-radius: 8px; font-size: 11px; }
  .adversary-meta { display: flex; gap: 16px; font-size: 12px; color: #888; margin-bottom: 8px; }
  .adversary-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid #2d2d5e; }
  .adversary-desc { color: #aaa; font-size: 13px; line-height: 1.5; margin-bottom: 12px; }
  .adversary-tags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
  .adversary-tag { background: #1a1a3e; color: #7c3aed; padding: 2px 8px; border-radius: 6px; font-size: 11px; border: 1px solid #2d2d5e; }
  .adversary-software-tag { background: #1a2a1a; color: #4ade80; padding: 2px 8px; border-radius: 6px; font-size: 11px; border: 1px solid #2d4d2e; }
  .adversary-sectors { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .adversary-sector { background: #1a1a2e; color: #f59e0b; padding: 2px 8px; border-radius: 6px; font-size: 11px; }
  .adversary-section-label { color: #888; font-size: 11px; text-transform: uppercase; margin-bottom: 6px; font-weight: 600; }
`;

export default function AdversaryProfiles() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState('all');

  const origins = ['all', ...Array.from(new Set(mockGroups.map(g => g.origin)))];

  const filtered = mockGroups.filter(g => {
    const matchSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()));
    const matchOrigin = originFilter === 'all' || g.origin === originFilter;
    return matchSearch && matchOrigin;
  });

  const criticalCount = mockGroups.filter(g => g.threatLevel === 'critical').length;
  const totalCampaigns = mockGroups.reduce((s, g) => s + g.campaigns, 0);

  return (
    <div className="adversary-container">
      <style>{styles}</style>
      <div className="adversary-header">
        <h3 className="adversary-title">Adversary Profiles</h3>
        <div className="adversary-stats">
          <div className="adversary-stat"><div className="adversary-stat-num">{mockGroups.length}</div><div className="adversary-stat-label">Groups</div></div>
          <div className="adversary-stat"><div className="adversary-stat-num">{criticalCount}</div><div className="adversary-stat-label">Critical</div></div>
          <div className="adversary-stat"><div className="adversary-stat-num">{totalCampaigns}</div><div className="adversary-stat-label">Campaigns</div></div>
        </div>
      </div>
      <input className="adversary-search" placeholder="Search groups or aliases..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="adversary-filters">
        {origins.map(o => (
          <button key={o} className={`adversary-filter ${originFilter === o ? 'active' : ''}`} onClick={() => setOriginFilter(o)}>{o === 'all' ? 'All Origins' : o}</button>
        ))}
      </div>
      {filtered.map(group => (
        <div key={group.id} className="adversary-card" onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}>
          <div className="adversary-card-header">
            <div>
              <div className="adversary-name">{group.name}</div>
              <div className="adversary-origin">{group.origin} | {group.motivation} | {group.id}</div>
            </div>
            <span className={`adversary-level adversary-level-${group.threatLevel}`}>{group.threatLevel}</span>
          </div>
          <div className="adversary-aliases">
            {group.aliases.map(a => <span key={a} className="adversary-alias">{a}</span>)}
          </div>
          <div className="adversary-meta">
            <span>{group.techniques.length} techniques</span>
            <span>{group.software.length} tools</span>
            <span>{group.campaigns} campaigns</span>
            <span>Last active: {group.lastActive}</span>
          </div>
          {expandedId === group.id && (
            <div className="adversary-detail">
              <p className="adversary-desc">{group.description}</p>
              <div className="adversary-section-label">Target Sectors</div>
              <div className="adversary-sectors">
                {group.targetSectors.map(s => <span key={s} className="adversary-sector">{s}</span>)}
              </div>
              <div style={{marginTop:12}}><div className="adversary-section-label">MITRE Techniques</div></div>
              <div className="adversary-tags">
                {group.techniques.map(t => <span key={t} className="adversary-tag">{t}</span>)}
              </div>
              <div style={{marginTop:8}}><div className="adversary-section-label">Software / Tools</div></div>
              <div className="adversary-tags">
                {group.software.map(s => <span key={s} className="adversary-software-tag">{s}</span>)}
              </div>
            </div>
          )}
        </div>
      ))}
      {filtered.length === 0 && <div style={{textAlign:'center',color:'#888',padding:24}}>No adversary groups found</div>}
    </div>
  );
}
