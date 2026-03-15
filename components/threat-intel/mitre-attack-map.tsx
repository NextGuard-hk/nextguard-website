// components/threat-intel/mitre-attack-map.tsx
'use client';

import React, { useState } from 'react';

interface Technique {
  id: string;
  name: string;
  tactic: string;
  platforms: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  detections: number;
  groups: string[];
}

interface TacticData {
  id: string;
  name: string;
  shortname: string;
  techniques: Technique[];
}

const mockTactics: TacticData[] = [
  { id: 'TA0001', name: 'Initial Access', shortname: 'initial-access', techniques: [
    { id: 'T1566', name: 'Phishing', tactic: 'Initial Access', platforms: ['Windows','macOS','Linux'], severity: 'critical', detections: 2847, groups: ['APT29','APT28','Lazarus'] },
    { id: 'T1190', name: 'Exploit Public-Facing App', tactic: 'Initial Access', platforms: ['Windows','Linux'], severity: 'high', detections: 1523, groups: ['APT41','OilRig'] },
    { id: 'T1078', name: 'Valid Accounts', tactic: 'Initial Access', platforms: ['Windows','macOS','Linux','Cloud'], severity: 'high', detections: 1891, groups: ['APT29','Sandworm'] },
  ]},
  { id: 'TA0002', name: 'Execution', shortname: 'execution', techniques: [
    { id: 'T1059', name: 'Command & Scripting Interpreter', tactic: 'Execution', platforms: ['Windows','macOS','Linux'], severity: 'critical', detections: 3421, groups: ['APT41','Lazarus','APT28'] },
    { id: 'T1204', name: 'User Execution', tactic: 'Execution', platforms: ['Windows','macOS'], severity: 'high', detections: 1245, groups: ['Lazarus','Kimsuky'] },
  ]},
  { id: 'TA0003', name: 'Persistence', shortname: 'persistence', techniques: [
    { id: 'T1053', name: 'Scheduled Task/Job', tactic: 'Persistence', platforms: ['Windows','Linux','macOS'], severity: 'high', detections: 987, groups: ['OilRig','APT29'] },
    { id: 'T1547', name: 'Boot or Logon Autostart', tactic: 'Persistence', platforms: ['Windows','macOS','Linux'], severity: 'medium', detections: 756, groups: ['APT28','Turla'] },
  ]},
  { id: 'TA0004', name: 'Privilege Escalation', shortname: 'priv-esc', techniques: [
    { id: 'T1068', name: 'Exploitation for Privilege Escalation', tactic: 'Privilege Escalation', platforms: ['Windows','Linux'], severity: 'critical', detections: 643, groups: ['Sandworm','APT41'] },
  ]},
  { id: 'TA0005', name: 'Defense Evasion', shortname: 'defense-evasion', techniques: [
    { id: 'T1027', name: 'Obfuscated Files or Information', tactic: 'Defense Evasion', platforms: ['Windows','macOS','Linux'], severity: 'high', detections: 2156, groups: ['APT29','APT41','Lazarus'] },
    { id: 'T1070', name: 'Indicator Removal', tactic: 'Defense Evasion', platforms: ['Windows','Linux'], severity: 'high', detections: 1432, groups: ['APT41','Sandworm'] },
  ]},
  { id: 'TA0006', name: 'Credential Access', shortname: 'cred-access', techniques: [
    { id: 'T1003', name: 'OS Credential Dumping', tactic: 'Credential Access', platforms: ['Windows','Linux'], severity: 'critical', detections: 1876, groups: ['APT28','APT29','Lazarus'] },
  ]},
  { id: 'TA0010', name: 'Exfiltration', shortname: 'exfiltration', techniques: [
    { id: 'T1048', name: 'Exfiltration Over Alternative Protocol', tactic: 'Exfiltration', platforms: ['Windows','Linux','macOS'], severity: 'critical', detections: 892, groups: ['APT29','OilRig'] },
    { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'Exfiltration', platforms: ['Windows','Linux','macOS'], severity: 'high', detections: 1234, groups: ['APT41','Turla'] },
  ]},
  { id: 'TA0040', name: 'Impact', shortname: 'impact', techniques: [
    { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', platforms: ['Windows','Linux'], severity: 'critical', detections: 567, groups: ['Sandworm','Lazarus'] },
    { id: 'T1485', name: 'Data Destruction', tactic: 'Impact', platforms: ['Windows','Linux'], severity: 'critical', detections: 234, groups: ['Sandworm'] },
  ]},
];

const styles = `
  .mitre-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .mitre-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
  .mitre-title { color: #e0e0e0; font-size: 20px; font-weight: 700; }
  .mitre-stats { display: flex; gap: 16px; }
  .mitre-stat { background: #12122a; border-radius: 8px; padding: 8px 16px; text-align: center; }
  .mitre-stat-num { font-size: 20px; font-weight: 700; color: #a78bfa; }
  .mitre-stat-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .mitre-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
  .mitre-tactic { background: linear-gradient(135deg, #0f172a 0%, #1a1040 100%); border: 1px solid #2d2d5e; border-radius: 12px; padding: 14px; }
  .mitre-tactic-name { color: #a78bfa; font-size: 13px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
  .mitre-tactic-id { color: #666; font-size: 10px; margin-bottom: 10px; }
  .mitre-tech { background: #12122a; border: 1px solid #1a1a3e; border-radius: 8px; padding: 8px 10px; margin-bottom: 6px; cursor: pointer; transition: border-color 0.2s; }
  .mitre-tech:hover { border-color: #7c3aed; }
  .mitre-tech-header { display: flex; justify-content: space-between; align-items: center; }
  .mitre-tech-name { color: #e0e0e0; font-size: 12px; font-weight: 500; }
  .mitre-tech-id { color: #666; font-size: 10px; }
  .mitre-sev { padding: 1px 8px; border-radius: 10px; font-size: 9px; font-weight: 600; text-transform: uppercase; }
  .mitre-sev-critical { background: #ef4444; color: #fff; }
  .mitre-sev-high { background: #f59e0b; color: #000; }
  .mitre-sev-medium { background: #3b82f6; color: #fff; }
  .mitre-sev-low { background: #22c55e; color: #000; }
  .mitre-tech-meta { display: flex; gap: 8px; margin-top: 4px; font-size: 10px; color: #888; }
  .mitre-tech-detail { margin-top: 8px; padding-top: 8px; border-top: 1px solid #2d2d5e; }
  .mitre-tech-groups { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
  .mitre-group-tag { background: #1e1e3f; color: #a78bfa; padding: 1px 6px; border-radius: 6px; font-size: 10px; }
  .mitre-platform-tag { background: #1a2a1a; color: #4ade80; padding: 1px 6px; border-radius: 6px; font-size: 10px; }
`;

export default function MitreAttackMap() {
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  const totalTechniques = mockTactics.reduce((s, t) => s + t.techniques.length, 0);
  const totalDetections = mockTactics.reduce((s, t) => s + t.techniques.reduce((ss, tt) => ss + tt.detections, 0), 0);

  return (
    <div className="mitre-container">
      <style>{styles}</style>
      <div className="mitre-header">
        <h3 className="mitre-title">MITRE ATT&CK Coverage</h3>
        <div className="mitre-stats">
          <div className="mitre-stat"><div className="mitre-stat-num">{mockTactics.length}</div><div className="mitre-stat-label">Tactics</div></div>
          <div className="mitre-stat"><div className="mitre-stat-num">{totalTechniques}</div><div className="mitre-stat-label">Techniques</div></div>
          <div className="mitre-stat"><div className="mitre-stat-num">{totalDetections.toLocaleString()}</div><div className="mitre-stat-label">Detections</div></div>
        </div>
      </div>
      <div className="mitre-grid">
        {mockTactics.map(tactic => (
          <div key={tactic.id} className="mitre-tactic">
            <div className="mitre-tactic-name">{tactic.name}</div>
            <div className="mitre-tactic-id">{tactic.id} | {tactic.techniques.length} techniques</div>
            {tactic.techniques.map(tech => (
              <div key={tech.id} className="mitre-tech" onClick={() => setExpandedTech(expandedTech === tech.id ? null : tech.id)}>
                <div className="mitre-tech-header">
                  <span className="mitre-tech-name">{tech.name}</span>
                  <span className={`mitre-sev mitre-sev-${tech.severity}`}>{tech.severity}</span>
                </div>
                <div className="mitre-tech-meta">
                  <span className="mitre-tech-id">{tech.id}</span>
                  <span>{tech.detections.toLocaleString()} detections</span>
                </div>
                {expandedTech === tech.id && (
                  <div className="mitre-tech-detail">
                    <div style={{color:'#888',fontSize:10,textTransform:'uppercase',fontWeight:600}}>Platforms</div>
                    <div className="mitre-tech-groups" style={{marginBottom:8}}>
                      {tech.platforms.map(p => <span key={p} className="mitre-platform-tag">{p}</span>)}
                    </div>
                    <div style={{color:'#888',fontSize:10,textTransform:'uppercase',fontWeight:600}}>Associated Groups</div>
                    <div className="mitre-tech-groups">
                      {tech.groups.map(g => <span key={g} className="mitre-group-tag">{g}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
