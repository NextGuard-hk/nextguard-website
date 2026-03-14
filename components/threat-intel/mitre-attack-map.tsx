// components/threat-intel/mitre-attack-map.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface Technique {
  id: string;
  name: string;
  tactic: string[];
  platforms: string[];
}

interface TacticData {
  id: string;
  name: string;
  shortname: string;
  techniques: Technique[];
}

const mapStyles = `
.mitre-card { background: #1a1a2e; border-radius: 14px; padding: 16px; border: 1px solid #333; margin-bottom: 16px; }
.mitre-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
.mitre-header h3 { color: #e0e0e0; margin: 0; font-size: 15px; }
.mitre-src { font-size: 9px; color: #555; padding: 3px 8px; border-radius: 10px; border: 1px solid #333; }
.mitre-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; }
.mitre-tactic { background: #12122a; border-radius: 8px; border: 1px solid #2a2a4a; overflow: hidden; }
.mitre-tactic-header { padding: 8px; background: #1e1e3a; text-align: center; border-bottom: 1px solid #2a2a4a; }
.mitre-tactic-name { font-size: 9px; font-weight: 700; color: #60a5fa; text-transform: uppercase; letter-spacing: 0.5px; }
.mitre-tactic-count { font-size: 8px; color: #666; margin-top: 2px; }
.mitre-techs { padding: 4px; max-height: 300px; overflow-y: auto; }
.mitre-tech { padding: 3px 6px; margin: 2px 0; border-radius: 3px; font-size: 8px; color: #aaa; cursor: default; transition: background 0.15s; display: flex; justify-content: space-between; gap: 4px; }
.mitre-tech:hover { background: #2a2a5a; color: #e0e0e0; }
.mitre-tech-id { color: #666; font-family: monospace; font-size: 7px; flex-shrink: 0; }
.mitre-loading { text-align: center; color: #666; padding: 40px; font-size: 13px; }
.mitre-stats { display: flex; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.mitre-stat { background: #12122a; border-radius: 6px; padding: 6px 12px; border: 1px solid #2a2a4a; text-align: center; }
.mitre-stat-num { font-size: 16px; font-weight: 700; color: #60a5fa; }
.mitre-stat-label { font-size: 8px; color: #888; text-transform: uppercase; }
`;

const TACTIC_ORDER = ['reconnaissance','resource-development','initial-access','execution','persistence','privilege-escalation','defense-evasion','credential-access','discovery','lateral-movement','collection','command-and-control','exfiltration','impact'];

export default function MitreAttackMap() {
  const [tactics, setTactics] = useState<TacticData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalTechniques, setTotalTechniques] = useState(0);

  useEffect(() => {
    fetch('/api/v1/threat-intel/mitre')
      .then(r => r.json())
      .then(data => {
        const tacticsList = data.tactics || [];
        const techniques = data.techniques || [];
        setTotalTechniques(data.totalTechniques || techniques.length);
        const mapped: TacticData[] = tacticsList
          .sort((a: any, b: any) => TACTIC_ORDER.indexOf(a.shortname) - TACTIC_ORDER.indexOf(b.shortname))
          .map((t: any) => ({
            ...t,
            techniques: techniques
              .filter((tech: any) => tech.tactic?.includes(t.shortname))
              .slice(0, 25),
          }));
        setTactics(mapped);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{mapStyles}</style>
      <div className="mitre-card">
        <div className="mitre-header">
          <h3>MITRE ATT&CK Matrix</h3>
          <span className="mitre-src">Source: MITRE ATT&CK STIX</span>
        </div>
        <div className="mitre-stats">
          <div className="mitre-stat"><div className="mitre-stat-num">{tactics.length}</div><div className="mitre-stat-label">Tactics</div></div>
          <div className="mitre-stat"><div className="mitre-stat-num">{totalTechniques}</div><div className="mitre-stat-label">Techniques</div></div>
        </div>
        {loading ? (
          <div className="mitre-loading">Loading MITRE ATT&CK data...</div>
        ) : (
          <div className="mitre-grid">
            {tactics.map(tactic => (
              <div key={tactic.id} className="mitre-tactic">
                <div className="mitre-tactic-header">
                  <div className="mitre-tactic-name">{tactic.name}</div>
                  <div className="mitre-tactic-count">{tactic.techniques.length} techniques</div>
                </div>
                <div className="mitre-techs">
                  {tactic.techniques.map(tech => (
                    <div key={tech.id} className="mitre-tech">
                      <span>{tech.name}</span>
                      <span className="mitre-tech-id">{tech.id}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
