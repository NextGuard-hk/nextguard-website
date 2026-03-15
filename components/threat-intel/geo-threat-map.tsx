// components/threat-intel/geo-threat-map.tsx
'use client';

import React, { useState } from 'react';

interface CountryThreat {
  country: string;
  code: string;
  groups: number;
  techniques: number;
  topGroups: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  attacks24h: number;
  targetSectors: string[];
}

const mockData: CountryThreat[] = [
  { country: 'China', code: 'CN', groups: 41, techniques: 287, topGroups: ['APT41','APT10','Mustang Panda','Hafnium'], severity: 'critical', attacks24h: 1847, targetSectors: ['Technology','Government','Defense'] },
  { country: 'Russia', code: 'RU', groups: 38, techniques: 256, topGroups: ['APT29','APT28','Sandworm','Turla'], severity: 'critical', attacks24h: 1523, targetSectors: ['Government','Energy','Military'] },
  { country: 'North Korea', code: 'KP', groups: 12, techniques: 134, topGroups: ['Lazarus','Kimsuky','Andariel'], severity: 'high', attacks24h: 892, targetSectors: ['Finance','Cryptocurrency','Defense'] },
  { country: 'Iran', code: 'IR', groups: 18, techniques: 156, topGroups: ['OilRig','Charming Kitten','MuddyWater'], severity: 'high', attacks24h: 634, targetSectors: ['Energy','Government','Telecom'] },
  { country: 'Vietnam', code: 'VN', groups: 5, techniques: 67, topGroups: ['APT32','Ocean Lotus'], severity: 'medium', attacks24h: 213, targetSectors: ['Government','Media','Manufacturing'] },
  { country: 'India', code: 'IN', groups: 4, techniques: 45, topGroups: ['SideWinder','Patchwork'], severity: 'medium', attacks24h: 178, targetSectors: ['Government','Defense'] },
  { country: 'Pakistan', code: 'PK', groups: 3, techniques: 38, topGroups: ['Transparent Tribe','SideCopy'], severity: 'medium', attacks24h: 145, targetSectors: ['Government','Military'] },
  { country: 'Israel', code: 'IL', groups: 3, techniques: 52, topGroups: ['Unit 8200','Candiru'], severity: 'medium', attacks24h: 98, targetSectors: ['Telecom','Government'] },
  { country: 'Brazil', code: 'BR', groups: 2, techniques: 23, topGroups: ['Prilex','Grandoreiro'], severity: 'low', attacks24h: 67, targetSectors: ['Finance','Retail'] },
  { country: 'Turkey', code: 'TR', groups: 2, techniques: 19, topGroups: ['StrongPity','Sea Turtle'], severity: 'low', attacks24h: 43, targetSectors: ['Government','Telecom'] },
];

const styles = `
  .geo-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .geo-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
  .geo-title { color: #e0e0e0; font-size: 20px; font-weight: 700; }
  .geo-stats { display: flex; gap: 16px; }
  .geo-stat { background: #12122a; border-radius: 8px; padding: 8px 16px; text-align: center; }
  .geo-stat-num { font-size: 20px; font-weight: 700; color: #a78bfa; }
  .geo-stat-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .geo-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .geo-filter { padding: 4px 12px; border-radius: 12px; border: 1px solid #333; background: transparent; color: #ccc; cursor: pointer; font-size: 12px; }
  .geo-filter.active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
  .geo-table { width: 100%; border-collapse: collapse; }
  .geo-table th { text-align: left; padding: 10px 12px; color: #888; font-size: 11px; text-transform: uppercase; border-bottom: 1px solid #2d2d5e; }
  .geo-table td { padding: 10px 12px; border-bottom: 1px solid #1a1a3e; color: #e0e0e0; font-size: 13px; }
  .geo-table tr { cursor: pointer; transition: background 0.2s; }
  .geo-table tr:hover { background: #1a1040; }
  .geo-sev { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .geo-sev-critical { background: #ef4444; color: #fff; }
  .geo-sev-high { background: #f59e0b; color: #000; }
  .geo-sev-medium { background: #3b82f6; color: #fff; }
  .geo-sev-low { background: #22c55e; color: #000; }
  .geo-bar-bg { background: #1a1a3e; border-radius: 4px; height: 6px; width: 100px; }
  .geo-bar { border-radius: 4px; height: 6px; }
  .geo-groups { display: flex; gap: 4px; flex-wrap: wrap; }
  .geo-group-tag { background: #1e1e3f; color: #a78bfa; padding: 1px 6px; border-radius: 6px; font-size: 10px; }
  .geo-detail { background: #0f172a; border: 1px solid #2d2d5e; border-radius: 8px; padding: 16px; margin: 8px 0; }
  .geo-detail-sectors { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
  .geo-sector-tag { background: #1a1a2e; color: #f59e0b; padding: 2px 8px; border-radius: 6px; font-size: 11px; }
`;

export default function GeoThreatMap() {
  const [sevFilter, setSevFilter] = useState('all');
  const [expandedCode, setExpandedCode] = useState<string | null>(null);

  const sevOptions = ['all', 'critical', 'high', 'medium', 'low'];
  const filtered = mockData.filter(d => sevFilter === 'all' || d.severity === sevFilter);
  const totalGroups = mockData.reduce((s, d) => s + d.groups, 0);
  const totalAttacks = mockData.reduce((s, d) => s + d.attacks24h, 0);
  const maxAttacks = Math.max(...mockData.map(d => d.attacks24h));

  const barColor = (sev: string) => sev === 'critical' ? '#ef4444' : sev === 'high' ? '#f59e0b' : sev === 'medium' ? '#3b82f6' : '#22c55e';

  return (
    <div className="geo-container">
      <style>{styles}</style>
      <div className="geo-header">
        <h3 className="geo-title">Geo Threat Map</h3>
        <div className="geo-stats">
          <div className="geo-stat"><div className="geo-stat-num">{mockData.length}</div><div className="geo-stat-label">Countries</div></div>
          <div className="geo-stat"><div className="geo-stat-num">{totalGroups}</div><div className="geo-stat-label">Groups</div></div>
          <div className="geo-stat"><div className="geo-stat-num">{totalAttacks.toLocaleString()}</div><div className="geo-stat-label">Attacks/24h</div></div>
        </div>
      </div>
      <div className="geo-filters">
        {sevOptions.map(s => (
          <button key={s} className={`geo-filter ${sevFilter === s ? 'active' : ''}`} onClick={() => setSevFilter(s)}>{s === 'all' ? 'All Severity' : s}</button>
        ))}
      </div>
      <div style={{overflowX:'auto'}}>
        <table className="geo-table">
          <thead><tr><th>Country</th><th>Severity</th><th>Groups</th><th>Techniques</th><th>Attacks/24h</th><th>Top Groups</th></tr></thead>
          <tbody>
            {filtered.map(d => (
              <React.Fragment key={d.code}>
                <tr onClick={() => setExpandedCode(expandedCode === d.code ? null : d.code)}>
                  <td style={{fontWeight:600}}>{d.country} <span style={{color:'#666',fontSize:11}}>({d.code})</span></td>
                  <td><span className={`geo-sev geo-sev-${d.severity}`}>{d.severity}</span></td>
                  <td>{d.groups}</td>
                  <td>{d.techniques}</td>
                  <td>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span>{d.attacks24h.toLocaleString()}</span>
                      <div className="geo-bar-bg"><div className="geo-bar" style={{width:`${(d.attacks24h/maxAttacks)*100}%`,background:barColor(d.severity)}} /></div>
                    </div>
                  </td>
                  <td><div className="geo-groups">{d.topGroups.slice(0,3).map(g => <span key={g} className="geo-group-tag">{g}</span>)}</div></td>
                </tr>
                {expandedCode === d.code && (
                  <tr><td colSpan={6}>
                    <div className="geo-detail">
                      <div style={{color:'#888',fontSize:11,textTransform:'uppercase',marginBottom:6,fontWeight:600}}>All Threat Groups</div>
                      <div className="geo-groups" style={{marginBottom:12}}>{d.topGroups.map(g => <span key={g} className="geo-group-tag">{g}</span>)}</div>
                      <div style={{color:'#888',fontSize:11,textTransform:'uppercase',marginBottom:6,fontWeight:600}}>Target Sectors</div>
                      <div className="geo-detail-sectors">{d.targetSectors.map(s => <span key={s} className="geo-sector-tag">{s}</span>)}</div>
                    </div>
                  </td></tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


export { GeoThreatMap };
