// components/threat-intel/incident-war-room.tsx
'use client';
import React, { useState } from 'react';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'investigating' | 'contained' | 'resolved';
  assignee: string;
  created: string;
  updated: string;
  iocs: number;
  source: string;
  mttr?: string;
  affectedAssets: number;
  events: { time: string; actor: string; action: string }[];
}

const warRoomStyles = `
  .warroom-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #ef444444; position: relative; overflow: hidden; margin-bottom: 16px; }
  .warroom-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981); }
  .warroom-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .warroom-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #ef444422; border: 1px solid #ef444444; color: #ef4444; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .warroom-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: warPulse 1.5s ease-in-out infinite; }
  @keyframes warPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
  .warroom-incidents { display: flex; flex-direction: column; gap: 10px; margin-bottom: 14px; }
  .warroom-incident { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; cursor: pointer; transition: all 0.2s; }
  .warroom-incident:hover { border-color: #ef4444; }
  .warroom-incident-active { border-color: #ef444466; }
  .warroom-incident-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
  .warroom-incident-title { color: #e0e0e0; font-size: 13px; font-weight: 600; margin: 0; }
  .warroom-sev { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .warroom-sev-critical { background: #ef444433; color: #fca5a5; }
  .warroom-sev-high { background: #f59e0b33; color: #fbbf24; }
  .warroom-sev-medium { background: #3b82f633; color: #93c5fd; }
  .warroom-sev-low { background: #22c55e33; color: #86efac; }
  .warroom-meta { display: flex; gap: 12px; color: #666; font-size: 10px; flex-wrap: wrap; }
  .warroom-meta span { color: #aaa; }
  .warroom-timeline { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; }
  .warroom-timeline-title { color: #e0e0e0; font-size: 13px; font-weight: 600; margin: 0 0 10px 0; }
  .warroom-event { display: flex; gap: 10px; padding: 6px 0; border-bottom: 1px solid #1a1a3a; font-size: 11px; }
  .warroom-event-time { color: #666; min-width: 60px; font-family: monospace; font-size: 10px; }
  .warroom-event-actor { color: #22d3ee; min-width: 80px; }
  .warroom-event-action { color: #c0c0c0; }
  .warroom-status { padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 600; }
  .warroom-status-active { background: #ef444422; color: #ef4444; }
  .warroom-status-investigating { background: #f59e0b22; color: #eab308; }
  .warroom-status-contained { background: #3b82f622; color: #60a5fa; }
  .warroom-status-resolved { background: #22c55e22; color: #22c55e; }
  .warroom-actions { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
  .warroom-action-btn { padding: 3px 8px; border-radius: 4px; font-size: 9px; border: 1px solid #2a2a4a; background: #0a0a1a; color: #a78bfa; cursor: pointer; transition: all 0.2s; }
  .warroom-action-btn:hover { background: #8b5cf622; border-color: #8b5cf6; }
  .warroom-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
  .warroom-stat { background: #12122a; border-radius: 8px; padding: 8px; text-align: center; border: 1px solid #2a2a4a; }
  .warroom-stat-num { font-size: 18px; font-weight: 700; }
  .warroom-stat-label { font-size: 8px; color: #888; text-transform: uppercase; }
`;

const MOCK_INCIDENTS: Incident[] = [
  { id: 'INC-2024-001', title: 'Ransomware Attack - Finance Dept', severity: 'critical', status: 'active', assignee: 'SOC Team Alpha', created: '14 Mar 2026 08:30', updated: '5 min ago', iocs: 23, source: 'EDR', mttr: undefined, affectedAssets: 12, events: [
    { time: '08:30', actor: 'System', action: 'EDR alert triggered - suspicious encryption activity detected' },
    { time: '08:32', actor: 'SOAR', action: 'Auto-isolated 3 endpoints in Finance subnet' },
    { time: '08:35', actor: 'Analyst-1', action: 'Confirmed ransomware variant: LockBit 3.0' },
    { time: '08:40', actor: 'SOAR', action: 'Blocked C2 domain: evil-c2.example.com across all firewalls' },
    { time: '08:45', actor: 'Analyst-2', action: 'Forensic image collection initiated on 3 hosts' },
  ]},
  { id: 'INC-2024-002', title: 'Credential Stuffing - Web Portal', severity: 'high', status: 'investigating', assignee: 'SOC Team Beta', created: '14 Mar 2026 06:15', updated: '20 min ago', iocs: 8, source: 'WAF', mttr: undefined, affectedAssets: 3, events: [
    { time: '06:15', actor: 'WAF', action: '500+ failed login attempts from 12 IPs detected' },
    { time: '06:20', actor: 'SOAR', action: 'Auto-blocked source IPs and enriched via threat intel' },
    { time: '06:30', actor: 'Analyst-3', action: 'Reviewing compromised accounts list' },
  ]},
  { id: 'INC-2024-003', title: 'Data Exfiltration Attempt - R&D', severity: 'critical', status: 'contained', assignee: 'SOC Team Alpha', created: '13 Mar 2026 22:00', updated: '2h ago', iocs: 15, source: 'DLP', mttr: '4h 15m', affectedAssets: 5, events: [
    { time: '22:00', actor: 'DLP', action: 'Large file transfer to external cloud storage detected' },
    { time: '22:05', actor: 'SOAR', action: 'Blocked upload and quarantined endpoint' },
    { time: '22:15', actor: 'Analyst-1', action: 'Insider threat investigation opened' },
  ]},
  { id: 'INC-2024-004', title: 'Phishing Campaign - Executive Team', severity: 'high', status: 'resolved', assignee: 'SOC Team Beta', created: '12 Mar 2026 14:00', updated: '1d ago', iocs: 6, source: 'Email Gateway', mttr: '2h 30m', affectedAssets: 8, events: [
    { time: '14:00', actor: 'Email GW', action: 'Spear-phishing emails targeting C-suite detected' },
    { time: '14:10', actor: 'SOAR', action: 'Quarantined 8 emails, extracted 6 IOCs' },
    { time: '14:30', actor: 'Analyst-2', action: 'Confirmed BEC attempt, alerted legal team' },
  ]},
];

export default function IncidentWarRoom() {
  const [incidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [selected, setSelected] = useState<string>(MOCK_INCIDENTS[0].id);
  const active = incidents.find(i => i.id === selected);
  const activeCount = incidents.filter(i => i.status === 'active').length;
  const totalIOCs = incidents.reduce((a, b) => a + b.iocs, 0);
  const totalAssets = incidents.reduce((a, b) => a + b.affectedAssets, 0);
  const resolved = incidents.filter(i => i.status === 'resolved').length;

  return (
    <>
      <style>{warRoomStyles}</style>
      <div className="warroom-card">
        <div className="warroom-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>Incident Response War Room</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Real-time Collaborative Investigation</p>
          </div>
          <div className="warroom-badge"><span className="pulse" /> {activeCount} Active</div>
        </div>

        <div className="warroom-stats">
          <div className="warroom-stat"><div className="warroom-stat-num" style={{ color: '#ef4444' }}>{activeCount}</div><div className="warroom-stat-label">Active</div></div>
          <div className="warroom-stat"><div className="warroom-stat-num" style={{ color: '#f59e0b' }}>{totalIOCs}</div><div className="warroom-stat-label">Total IOCs</div></div>
          <div className="warroom-stat"><div className="warroom-stat-num" style={{ color: '#60a5fa' }}>{totalAssets}</div><div className="warroom-stat-label">Assets</div></div>
          <div className="warroom-stat"><div className="warroom-stat-num" style={{ color: '#22c55e' }}>{resolved}</div><div className="warroom-stat-label">Resolved</div></div>
        </div>

        <div className="warroom-incidents">
        {incidents.map(inc => (
          <div key={inc.id} className={`warroom-incident ${selected === inc.id ? 'warroom-incident-active' : ''}`} onClick={() => setSelected(inc.id)}>
            <div className="warroom-incident-header">
              <h4 className="warroom-incident-title">{inc.id}: {inc.title}</h4>
              <span className={`warroom-sev warroom-sev-${inc.severity}`}>{inc.severity}</span>
            </div>
            <div className="warroom-meta">
              <span className={`warroom-status warroom-status-${inc.status}`}>{inc.status}</span>
              Assignee: <span>{inc.assignee}</span>
              IOCs: <span>{inc.iocs}</span>
              Source: <span>{inc.source}</span>
              Assets: <span>{inc.affectedAssets}</span>
              Updated: <span>{inc.updated}</span>
              {inc.mttr && <>MTTR: <span style={{ color: '#22c55e' }}>{inc.mttr}</span></>}
            </div>
            <div className="warroom-actions">
              <button className="warroom-action-btn">Escalate</button>
              <button className="warroom-action-btn">Add IOC</button>
              <button className="warroom-action-btn">Assign</button>
              <button className="warroom-action-btn">Export</button>
            </div>
          </div>
        ))}
        </div>

        {active && (
          <div className="warroom-timeline">
            <h4 className="warroom-timeline-title">Timeline: {active.id}</h4>
            {active.events.map((ev, i) => (
              <div key={i} className="warroom-event">
                <span className="warroom-event-time">{ev.time}</span>
                <span className="warroom-event-actor">{ev.actor}</span>
                <span className="warroom-event-action">{ev.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
