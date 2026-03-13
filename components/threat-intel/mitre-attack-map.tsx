// components/threat-intel/mitre-attack-map.tsx
'use client';
import React, { useState } from 'react';

const TACTICS = [
  { id: 'TA0043', name: 'Reconnaissance', techniques: [
    { id: 'T1595', name: 'Active Scanning', count: 12, severity: 'high' },
    { id: 'T1592', name: 'Gather Victim Host Info', count: 5, severity: 'medium' },
    { id: 'T1589', name: 'Gather Victim Identity', count: 3, severity: 'low' },
  ]},
  { id: 'TA0001', name: 'Initial Access', techniques: [
    { id: 'T1566', name: 'Phishing', count: 28, severity: 'critical' },
    { id: 'T1190', name: 'Exploit Public App', count: 15, severity: 'critical' },
    { id: 'T1133', name: 'External Remote Svc', count: 8, severity: 'high' },
    { id: 'T1078', name: 'Valid Accounts', count: 6, severity: 'high' },
  ]},
  { id: 'TA0002', name: 'Execution', techniques: [
    { id: 'T1059', name: 'Command & Script', count: 22, severity: 'critical' },
    { id: 'T1204', name: 'User Execution', count: 14, severity: 'high' },
    { id: 'T1203', name: 'Exploitation for Exec', count: 7, severity: 'high' },
  ]},
  { id: 'TA0003', name: 'Persistence', techniques: [
    { id: 'T1053', name: 'Scheduled Task/Job', count: 9, severity: 'high' },
    { id: 'T1547', name: 'Boot/Logon Autostart', count: 6, severity: 'medium' },
    { id: 'T1136', name: 'Create Account', count: 4, severity: 'medium' },
  ]},
  { id: 'TA0005', name: 'Defense Evasion', techniques: [
    { id: 'T1027', name: 'Obfuscated Files', count: 18, severity: 'high' },
    { id: 'T1070', name: 'Indicator Removal', count: 11, severity: 'high' },
    { id: 'T1036', name: 'Masquerading', count: 8, severity: 'medium' },
  ]},
  { id: 'TA0006', name: 'Credential Access', techniques: [
    { id: 'T1110', name: 'Brute Force', count: 16, severity: 'high' },
    { id: 'T1003', name: 'OS Credential Dump', count: 7, severity: 'critical' },
  ]},
  { id: 'TA0007', name: 'Discovery', techniques: [
    { id: 'T1046', name: 'Network Svc Scanning', count: 20, severity: 'medium' },
    { id: 'T1082', name: 'System Info Discovery', count: 10, severity: 'low' },
  ]},
  { id: 'TA0008', name: 'Lateral Movement', techniques: [
    { id: 'T1021', name: 'Remote Services', count: 5, severity: 'high' },
    { id: 'T1570', name: 'Lateral Tool Transfer', count: 3, severity: 'medium' },
  ]},
  { id: 'TA0009', name: 'Collection', techniques: [
    { id: 'T1005', name: 'Data from Local Sys', count: 4, severity: 'medium' },
    { id: 'T1114', name: 'Email Collection', count: 6, severity: 'high' },
  ]},
  { id: 'TA0011', name: 'C2', techniques: [
    { id: 'T1071', name: 'Application Layer', count: 25, severity: 'critical' },
    { id: 'T1573', name: 'Encrypted Channel', count: 12, severity: 'high' },
    { id: 'T1105', name: 'Ingress Tool Transfer', count: 9, severity: 'high' },
  ]},
  { id: 'TA0010', name: 'Exfiltration', techniques: [
    { id: 'T1041', name: 'Exfil Over C2', count: 8, severity: 'critical' },
    { id: 'T1567', name: 'Exfil Over Web Svc', count: 5, severity: 'high' },
  ]},
  { id: 'TA0040', name: 'Impact', techniques: [
    { id: 'T1486', name: 'Data Encrypted', count: 3, severity: 'critical' },
    { id: 'T1489', name: 'Service Stop', count: 2, severity: 'medium' },
  ]},
];

const mitreStyles = `
  .mitre-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #8b5cf644; position: relative; overflow: hidden; }
  .mitre-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8b5cf6, #6366f1, #22d3ee); }
  .mitre-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .mitre-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #8b5cf622; border: 1px solid #8b5cf644; color: #c4b5fd; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .mitre-grid { display: flex; gap: 4px; overflow-x: auto; padding-bottom: 8px; }
  .mitre-tactic { min-width: 110px; flex-shrink: 0; }
  .mitre-tactic-header { background: #8b5cf622; border: 1px solid #8b5cf633; border-radius: 6px 6px 0 0; padding: 6px 8px; text-align: center; }
  .mitre-tactic-name { color: #c4b5fd; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
  .mitre-tactic-id { color: #666; font-size: 8px; margin-top: 1px; }
  .mitre-techniques { display: flex; flex-direction: column; gap: 2px; margin-top: 2px; }
  .mitre-tech { padding: 5px 6px; border-radius: 4px; cursor: pointer; transition: all 0.2s; border: 1px solid transparent; }
  .mitre-tech:hover { border-color: #8b5cf644; transform: scale(1.02); }
  .mitre-tech-name { font-size: 8px; color: #e0e0e0; line-height: 1.3; }
  .mitre-tech-meta { display: flex; justify-content: space-between; margin-top: 2px; }
  .mitre-tech-id { font-size: 7px; color: #888; }
  .mitre-tech-count { font-size: 7px; font-weight: 600; }
  .mitre-sev-critical { background: #ef444422; }
  .mitre-sev-critical .mitre-tech-count { color: #fca5a5; }
  .mitre-sev-high { background: #f59e0b1a; }
  .mitre-sev-high .mitre-tech-count { color: #fbbf24; }
  .mitre-sev-medium { background: #3b82f61a; }
  .mitre-sev-medium .mitre-tech-count { color: #93c5fd; }
  .mitre-sev-low { background: #22c55e1a; }
  .mitre-sev-low .mitre-tech-count { color: #86efac; }
  .mitre-legend { display: flex; gap: 12px; margin-top: 12px; justify-content: center; flex-wrap: wrap; }
  .mitre-legend-item { display: flex; align-items: center; gap: 4px; font-size: 9px; color: #888; }
  .mitre-legend-dot { width: 8px; height: 8px; border-radius: 2px; }
  .mitre-tooltip { position: fixed; background: #1a1a3e; border: 1px solid #8b5cf644; border-radius: 8px; padding: 10px; z-index: 1000; max-width: 220px; pointer-events: none; }
  .mitre-tooltip h5 { color: #c4b5fd; font-size: 11px; margin: 0 0 4px 0; }
  .mitre-tooltip p { color: #888; font-size: 10px; margin: 0; }
`;

export default function MitreAttackMap() {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; tech: any } | null>(null);
  const totalTechniques = TACTICS.reduce((s, t) => s + t.techniques.length, 0);
  const totalDetections = TACTICS.reduce((s, t) => s + t.techniques.reduce((ss, tt) => ss + tt.count, 0), 0);

  return (
    <>
      <style>{mitreStyles}</style>
      <div className="mitre-card">
        <div className="mitre-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="mitre-badge">MITRE ATT&CK Coverage</span>
            <span style={{ color: '#555', fontSize: '10px' }}>{totalTechniques} techniques • {totalDetections} detections</span>
          </div>
        </div>

        <div className="mitre-grid">
          {TACTICS.map(tactic => (
            <div key={tactic.id} className="mitre-tactic">
              <div className="mitre-tactic-header">
                <div className="mitre-tactic-name">{tactic.name}</div>
                <div className="mitre-tactic-id">{tactic.id}</div>
              </div>
              <div className="mitre-techniques">
                {tactic.techniques.map(tech => (
                  <div
                    key={tech.id}
                    className={`mitre-tech mitre-sev-${tech.severity}`}
                    onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, tech })}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    <div className="mitre-tech-name">{tech.name}</div>
                    <div className="mitre-tech-meta">
                      <span className="mitre-tech-id">{tech.id}</span>
                      <span className="mitre-tech-count">{tech.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mitre-legend">
          <div className="mitre-legend-item"><div className="mitre-legend-dot" style={{ background: '#ef4444' }} />Critical</div>
          <div className="mitre-legend-item"><div className="mitre-legend-dot" style={{ background: '#f59e0b' }} />High</div>
          <div className="mitre-legend-item"><div className="mitre-legend-dot" style={{ background: '#3b82f6' }} />Medium</div>
          <div className="mitre-legend-item"><div className="mitre-legend-dot" style={{ background: '#22c55e' }} />Low</div>
        </div>

        {tooltip && (
          <div className="mitre-tooltip" style={{ left: tooltip.x + 10, top: tooltip.y - 60 }}>
            <h5>{tooltip.tech.id} — {tooltip.tech.name}</h5>
            <p>{tooltip.tech.count} detections • Severity: {tooltip.tech.severity}</p>
          </div>
        )}
      </div>
    </>
  );
}
