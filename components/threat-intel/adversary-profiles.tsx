// components/threat-intel/adversary-profiles.tsx
'use client';
import React, { useState } from 'react';

interface Adversary {
  name: string; alias: string[]; origin: string; motivation: string;
  sophistication: 'high' | 'medium' | 'low'; active: boolean;
  targets: string[]; ttps: string[]; lastSeen: string; campaigns: number;
}

const apStyles = `
  .ap-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #f4364444; position: relative; overflow: hidden; margin-bottom: 16px; }
  .ap-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #f43644, #ec4899, #8b5cf6); }
  .ap-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .ap-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #f4364422; border: 1px solid #f4364444; color: #f43644; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .ap-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
  .ap-profile { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; transition: all 0.2s; }
  .ap-profile:hover { border-color: #f43644; }
  .ap-name { color: #e0e0e0; font-size: 14px; font-weight: 700; margin: 0 0 2px 0; }
  .ap-alias { color: #888; font-size: 10px; margin: 0 0 8px 0; }
  .ap-info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; margin-bottom: 8px; }
  .ap-info-item { font-size: 10px; color: #666; }
  .ap-info-item span { color: #c0c0c0; }
  .ap-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
  .ap-tag { padding: 2px 8px; border-radius: 4px; font-size: 9px; background: #1a1a3e; border: 1px solid #2a2a4a; color: #888; }
  .ap-tag-ttp { background: #8b5cf615; border-color: #8b5cf633; color: #a78bfa; }
  .ap-tag-target { background: #ef444415; border-color: #ef444433; color: #fca5a5; }
  .ap-active-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 4px; }
  .ap-active-true { background: #ef4444; animation: apBlink 1.5s infinite; }
  .ap-active-false { background: #444; }
  @keyframes apBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

const ADVERSARIES: Adversary[] = [
  { name: 'APT41 (Double Dragon)', alias: ['Barium', 'Winnti'], origin: 'China', motivation: 'Espionage / Financial', sophistication: 'high', active: true, targets: ['Healthcare', 'Telecom', 'Gaming'], ttps: ['T1059', 'T1071', 'T1560', 'T1190'], lastSeen: '12h ago', campaigns: 47 },
  { name: 'Lazarus Group', alias: ['Hidden Cobra', 'Zinc'], origin: 'North Korea', motivation: 'Financial / Espionage', sophistication: 'high', active: true, targets: ['Finance', 'Crypto', 'Defense'], ttps: ['T1566', 'T1055', 'T1105', 'T1486'], lastSeen: '2d ago', campaigns: 62 },
  { name: 'FIN7', alias: ['Carbon Spider', 'Sangria Tempest'], origin: 'Russia', motivation: 'Financial', sophistication: 'high', active: true, targets: ['Retail', 'Hospitality', 'Finance'], ttps: ['T1566.001', 'T1059.001', 'T1071.001'], lastSeen: '5d ago', campaigns: 38 },
  { name: 'Volt Typhoon', alias: ['Vanguard Panda'], origin: 'China', motivation: 'Espionage / Pre-positioning', sophistication: 'high', active: true, targets: ['Critical Infrastructure', 'Government', 'Telecom'], ttps: ['T1190', 'T1133', 'T1078'], lastSeen: '1d ago', campaigns: 15 },
];

export default function AdversaryProfiles() {
  const [adversaries] = useState<Adversary[]>(ADVERSARIES);
  return (
    <>
      <style>{apStyles}</style>
      <div className="ap-card">
        <div className="ap-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>Adversary Intelligence Profiles</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Threat Actor Tracking & TTPs</p>
          </div>
          <div className="ap-badge">\u26A0 {adversaries.filter(a => a.active).length} Active Groups</div>
        </div>

        <div className="ap-grid">
          {adversaries.map((a, i) => (
            <div key={i} className="ap-profile">
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <span className={`ap-active-dot ap-active-${a.active}`} />
                <h4 className="ap-name">{a.name}</h4>
              </div>
              <p className="ap-alias">AKA: {a.alias.join(', ')}</p>
              <div className="ap-info">
                <div className="ap-info-item">Origin: <span>{a.origin}</span></div>
                <div className="ap-info-item">Motive: <span>{a.motivation}</span></div>
                <div className="ap-info-item">Campaigns: <span>{a.campaigns}</span></div>
                <div className="ap-info-item">Last Seen: <span>{a.lastSeen}</span></div>
              </div>
              <div className="ap-tags">
                {a.targets.map((t, j) => <span key={`t${j}`} className="ap-tag ap-tag-target">{t}</span>)}
                {a.ttps.map((t, j) => <span key={`p${j}`} className="ap-tag ap-tag-ttp">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
