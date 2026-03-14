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
  .warroom-incident-active { border-color: #ef444466; background: #12122a; }
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
`;

const MOCK_INCIDENTS: Incident[] = [
  { id: 'INC-2024-001', title: 'Ransomware Attack - Finance Dept', severity: 'critical', status: 'active', assignee: 'SOC Team Alpha', created: '14 Mar 2026 08:30', updated: '5 min ago', iocs: 23, events: [
    { time: '08:30', actor: 'System', action: 'EDR alert triggered - suspicious encryption activity detected' },
    { time: '08:32', actor: 'SOAR', action: 'Auto-isolated 3 endpoints in Finance subnet' },
    { time: '08:35', actor: 'Analyst-1', action: 'Confirmed ransomware variant: LockBit 3.0' },
    { time: '08:40', actor: 'SOAR', action: 'Blocked C2 domain: evil-c2.example.com across all firewalls' },
    { time: '08:45', actor: 'Analyst-2', action: 'Forensic image collection initiated on 3 hosts' },
  ]},
  { id: 'INC-2024-002', title: 'Credential Stuffing - Web Portal', severity: 'high', status: 'investigating', assignee: 'SOC Team Beta', created: '14 Mar 2026 06:15', updated: '20 min ago', iocs: 8, events: [
    { time: '06:15', actor: 'WAF', action: '500+ failed login attempts from 12 IPs detected' },
    { time: '06:20', actor: 'SOAR', action: 'Auto-blocked source IPs and enriched via threat intel' },
    { time: '06:30', actor: 'Analyst-3', action: 'Reviewing compromised accounts list' },
  ]},
  { id: 'INC-2024-003', title: 'Data Exfiltration Attempt - R&D', severity: 'critical', status: 'contained', assignee: 'SOC Team Alpha', created: '13 Mar 2026 22:00', updated: '2h ago', iocs: 15, events: [
    { time: '22:00', actor: 'DLP', action: 'Large file transfer to external cloud storage detected' },
    { time: '22:05', actor: 'SOAR', action: 'Blocked upload and quarantined endpoint' },
    { time: '22:15', actor: 'Analyst-1', action: 'Insider threat investigation opened' },
  ]},
];

export default function IncidentWarRoom() {
  const [incidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [selected, setSelected] = useState<string>(MOCK_INCIDENTS[0].id);
  const active = incidents.find(i => i.id === selected);
  return (
    <>
      <style>{warRoomStyles}</style>
      <div className="warroom-card">
        <div className="warroom-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>Incident Response War Room</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Real-time Collaborative Investigation</p>
          </div>
          <div className="warroom-badge"><span className="pulse" /> {incidents.filter(i => i.status === 'active').length} Active</div>
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
                <span>Assignee: <span>{inc.assignee}</span></span>
                <span>IOCs: <span>{inc.iocs}</span></span>
                <span>Updated: <span>{inc.updated}</span></span>
              </div>
            </div>
          ))}
        </div>
        {active && (
          <div className="warroom-timeline">
            <h4 style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600, margin: '0 0 10px 0' }}>Timeline: {active.id}</h4>
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
