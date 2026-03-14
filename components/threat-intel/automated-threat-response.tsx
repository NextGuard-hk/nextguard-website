// components/threat-intel/automated-threat-response.tsx
'use client';
import React, { useState } from 'react';

interface ResponseRule {
  id: string;
  name: string;
  trigger: string;
  action: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'paused' | 'testing';
  executions: number;
  lastTriggered: string;
  avgResponseTime: string;
}

interface ResponseEvent {
  id: string;
  rule: string;
  threat: string;
  action: string;
  status: 'completed' | 'in_progress' | 'failed' | 'blocked';
  timestamp: string;
  duration: string;
}

const atrStyles = `
.atr-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a2e 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #ef444444;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.atr-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #ef4444, #f59e0b, #ef4444);
}
.atr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.atr-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.atr-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.atr-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #ef4444;
}
.atr-stat-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
.atr-rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.atr-rule {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
  flex-wrap: wrap;
  gap: 6px;
}
.atr-rule-name {
  color: #e0e0e0;
  font-size: 11px;
  font-weight: 600;
}
.atr-sev {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.atr-sev-critical { background: #ef444433; color: #ef4444; }
.atr-sev-high { background: #f59e0b33; color: #f59e0b; }
.atr-sev-medium { background: #3b82f633; color: #3b82f6; }
.atr-sev-low { background: #22c55e33; color: #22c55e; }
.atr-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.atr-status-active { background: #22c55e22; color: #22c55e; }
.atr-status-paused { background: #f59e0b22; color: #f59e0b; }
.atr-status-testing { background: #3b82f622; color: #60a5fa; }
.atr-events {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}
.atr-event {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #12122a;
  border-radius: 6px;
  border: 1px solid #2a2a4a;
  font-size: 10px;
  flex-wrap: wrap;
  gap: 4px;
}
.atr-evt-completed { color: #22c55e; }
.atr-evt-in_progress { color: #3b82f6; }
.atr-evt-failed { color: #ef4444; }
.atr-evt-blocked { color: #f59e0b; }
.atr-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #ef444422;
  border: 1px solid #ef444444;
  color: #ef4444;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.atr-badge .pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #ef4444;
  animation: atrPulse 1.5s ease-in-out infinite;
}
@keyframes atrPulse {
  0%,100% { opacity:1; } 50% { opacity:0.3; }
}
@media (max-width: 480px) {
  .atr-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_RULES: ResponseRule[] = [
  { id: 'R-001', name: 'Auto-Block C2 IPs', trigger: 'C2 IP detected in traffic', action: 'Block IP + Isolate endpoint', severity: 'critical', status: 'active', executions: 847, lastTriggered: '2 min ago', avgResponseTime: '0.8s' },
  { id: 'R-002', name: 'Quarantine Malware Hash', trigger: 'Known malware hash match', action: 'Quarantine file + Alert SOC', severity: 'critical', status: 'active', executions: 1243, lastTriggered: '5 min ago', avgResponseTime: '1.2s' },
  { id: 'R-003', name: 'Block Phishing Domain', trigger: 'Phishing URL accessed', action: 'Block domain + Reset credentials', severity: 'high', status: 'active', executions: 562, lastTriggered: '12 min ago', avgResponseTime: '0.5s' },
  { id: 'R-004', name: 'Lateral Movement Alert', trigger: 'Abnormal lateral movement', action: 'Isolate host + Capture traffic', severity: 'high', status: 'testing', executions: 23, lastTriggered: '1 hr ago', avgResponseTime: '2.1s' },
  { id: 'R-005', name: 'Data Exfil Prevention', trigger: 'Large outbound transfer detected', action: 'Throttle + DLP scan + Alert', severity: 'medium', status: 'active', executions: 189, lastTriggered: '30 min ago', avgResponseTime: '1.8s' },
];

const MOCK_EVENTS: ResponseEvent[] = [
  { id: 'E-001', rule: 'Auto-Block C2 IPs', threat: '185.220.101.42', action: 'Blocked + Endpoint isolated', status: 'completed', timestamp: '03:58', duration: '0.7s' },
  { id: 'E-002', rule: 'Quarantine Malware Hash', threat: 'trojan.gen.2.exe', action: 'File quarantined', status: 'completed', timestamp: '03:55', duration: '1.1s' },
  { id: 'E-003', rule: 'Block Phishing Domain', threat: 'login-secure-bank.tk', action: 'Domain blocked enterprise-wide', status: 'completed', timestamp: '03:48', duration: '0.4s' },
  { id: 'E-004', rule: 'Lateral Movement Alert', threat: 'WKS-0142 abnormal SMB', action: 'Host isolation pending approval', status: 'blocked', timestamp: '03:30', duration: 'N/A' },
  { id: 'E-005', rule: 'Data Exfil Prevention', threat: '2.4GB upload to mega.nz', action: 'Transfer throttled + DLP scanning', status: 'in_progress', timestamp: '03:22', duration: '12.3s' },
];

export default function AutomatedThreatResponse() {
  const [tab, setTab] = useState<'rules' | 'events'>('rules');
  const totalExec = MOCK_RULES.reduce((a, b) => a + b.executions, 0);
  const activeRules = MOCK_RULES.filter(r => r.status === 'active').length;

  return (
    <>
      <style>{atrStyles}</style>
      <div className="atr-card">
        <div className="atr-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Automated Threat Response</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Real-time Automated Incident Response Engine</p>
          </div>
          <span className="atr-badge"><span className="pulse" /> ATR ACTIVE</span>
        </div>

        <div className="atr-stats">
          <div className="atr-stat"><div className="atr-stat-num">{activeRules}</div><div className="atr-stat-label">Active Rules</div></div>
          <div className="atr-stat"><div className="atr-stat-num">{totalExec.toLocaleString()}</div><div className="atr-stat-label">Executions</div></div>
          <div className="atr-stat"><div className="atr-stat-num" style={{ color: '#22c55e' }}>0.9s</div><div className="atr-stat-label">Avg Response</div></div>
          <div className="atr-stat"><div className="atr-stat-num" style={{ color: '#f59e0b' }}>99.7%</div><div className="atr-stat-label">Success Rate</div></div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['rules', 'events'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid', borderColor: tab === t ? '#ef4444' : '#333', background: tab === t ? '#ef444422' : 'transparent', color: tab === t ? '#ef4444' : '#888', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              {t === 'rules' ? 'Response Rules' : 'Recent Events'}
            </button>
          ))}
        </div>

        {tab === 'rules' && (
          <div className="atr-rules">
            {MOCK_RULES.map(rule => (
              <div key={rule.id} className="atr-rule">
                <div>
                  <div className="atr-rule-name">{rule.name}</div>
                  <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>Trigger: {rule.trigger}</div>
                  <div style={{ color: '#555', fontSize: 9 }}>Action: {rule.action} | Exec: {rule.executions} | Avg: {rule.avgResponseTime}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`atr-sev atr-sev-${rule.severity}`}>{rule.severity}</span>
                  <span className={`atr-status atr-status-${rule.status}`}>{rule.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'events' && (
          <div className="atr-events">
            {MOCK_EVENTS.map(evt => (
              <div key={evt.id} className="atr-event">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`atr-evt-${evt.status}`} style={{ fontSize: 9, fontWeight: 700 }}>
                    {evt.status === 'completed' ? '\u2713' : evt.status === 'in_progress' ? '\u25CB' : evt.status === 'blocked' ? '\u26A0' : '\u2717'} {evt.status.toUpperCase()}
                  </span>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>{evt.threat}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{evt.rule}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span style={{ color: '#888', fontSize: 9 }}>{evt.duration}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{evt.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
