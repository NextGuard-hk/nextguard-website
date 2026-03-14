// components/threat-intel/threat-correlation-engine.tsx
'use client';
import React, { useState } from 'react';

interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  sources: string[];
  matches: number;
  lastTriggered: string;
  status: 'active' | 'disabled';
}

interface CorrelationEvent {
  id: string;
  ruleId: string;
  ruleName: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  iocs: string[];
  killChainPhase: string;
  timestamp: string;
  confidence: number;
  details: string;
}

const corrStyles = `
.corr-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #f59e0b44;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.corr-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6);
}
.corr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.corr-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #f59e0b22;
  border: 1px solid #f59e0b44;
  color: #f59e0b;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.corr-badge .pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #f59e0b;
  animation: corrPulse 2s ease-in-out infinite;
}
@keyframes corrPulse {
  0%,100% { opacity:1; } 50% { opacity:0.3; }
}
.corr-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.corr-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.corr-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #f59e0b;
}
.corr-stat-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
.corr-events {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 14px;
}
.corr-event {
  background: #12122a;
  border-radius: 10px;
  padding: 12px;
  border: 1px solid #2a2a4a;
  cursor: pointer;
  transition: all 0.2s;
}
.corr-event:hover {
  border-color: #f59e0b;
}
.corr-event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.corr-event-name {
  color: #e0e0e0;
  font-size: 12px;
  font-weight: 600;
}
.corr-sev {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
}
.corr-sev-critical { background: #ef444433; color: #fca5a5; }
.corr-sev-high { background: #f59e0b33; color: #fbbf24; }
.corr-sev-medium { background: #3b82f633; color: #93c5fd; }
.corr-sev-low { background: #22c55e33; color: #86efac; }
.corr-meta {
  display: flex;
  gap: 12px;
  color: #666;
  font-size: 10px;
  flex-wrap: wrap;
}
.corr-meta span { color: #aaa; }
.corr-iocs {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.corr-ioc {
  padding: 2px 6px;
  border-radius: 3px;
  font-size: 9px;
  background: #1a1a3e;
  border: 1px solid #2a2a4a;
  color: #60a5fa;
  font-family: monospace;
}
.corr-chain {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 8px;
  flex-wrap: wrap;
}
.corr-chain-step {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 9px;
  background: #f59e0b15;
  border: 1px solid #f59e0b33;
  color: #f59e0b;
}
.corr-chain-arrow { color: #444; font-size: 10px; }
.corr-rules {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}
.corr-rule {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
  flex-wrap: wrap;
  gap: 4px;
}
.corr-rule-name {
  color: #c0c0c0;
  font-size: 11px;
  font-weight: 600;
}
.corr-rule-meta {
  display: flex;
  gap: 8px;
  align-items: center;
}
.corr-conf {
  font-size: 10px;
  font-weight: 600;
}
@media (max-width: 480px) {
  .corr-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_RULES: CorrelationRule[] = [
  { id: 'CR-001', name: 'APT Lateral Movement Chain', description: 'Detects correlated indicators of lateral movement across multiple hosts', severity: 'critical', confidence: 95, sources: ['EDR', 'Firewall', 'AD Logs'], matches: 23, lastTriggered: '5 min ago', status: 'active' },
  { id: 'CR-002', name: 'Credential Harvesting Pattern', description: 'Correlates password spray attempts with dark web credential dumps', severity: 'high', confidence: 88, sources: ['WAF', 'Dark Web', 'IAM'], matches: 156, lastTriggered: '12 min ago', status: 'active' },
  { id: 'CR-003', name: 'C2 Beacon Detection', description: 'Identifies periodic beaconing patterns to known C2 infrastructure', severity: 'critical', confidence: 92, sources: ['DNS', 'Proxy', 'TI Feed'], matches: 8, lastTriggered: '1h ago', status: 'active' },
  { id: 'CR-004', name: 'Supply Chain Compromise', description: 'Correlates anomalous package updates with known compromised libraries', severity: 'high', confidence: 78, sources: ['SBOM', 'TI Feed', 'CI/CD'], matches: 3, lastTriggered: '4h ago', status: 'active' },
  { id: 'CR-005', name: 'Data Staging Detection', description: 'Identifies data collection and staging before exfiltration', severity: 'medium', confidence: 72, sources: ['DLP', 'EDR', 'UEBA'], matches: 45, lastTriggered: '30m ago', status: 'active' },
];

const MOCK_EVENTS: CorrelationEvent[] = [
  { id: 'CE-001', ruleId: 'CR-001', ruleName: 'APT Lateral Movement Chain', severity: 'critical', iocs: ['192.168.1.45', 'mimikatz.exe', 'pass-the-hash'], killChainPhase: 'Lateral Movement', timestamp: '14:23:45', confidence: 95, details: 'Correlated 3 IOCs across EDR + Firewall + AD indicating active lateral movement in Finance subnet' },
  { id: 'CE-002', ruleId: 'CR-003', ruleName: 'C2 Beacon Detection', severity: 'critical', iocs: ['evil-c2.example.com', '185.220.101.42'], killChainPhase: 'Command & Control', timestamp: '14:18:30', confidence: 92, details: 'Periodic DNS beaconing every 60s to known Cobalt Strike C2 from endpoint WS-FIN-023' },
  { id: 'CE-003', ruleId: 'CR-002', ruleName: 'Credential Harvesting Pattern', severity: 'high', iocs: ['admin@corp.com', 'spray_attack_IPs'], killChainPhase: 'Credential Access', timestamp: '14:10:15', confidence: 88, details: 'Password spray from 12 IPs correlated with dark web credential dump from last week' },
  { id: 'CE-004', ruleId: 'CR-005', ruleName: 'Data Staging Detection', severity: 'medium', iocs: ['staging_dir', 'rar_compression'], killChainPhase: 'Collection', timestamp: '13:55:00', confidence: 72, details: 'Unusual data compression and staging detected on endpoint WS-RD-007 matching exfiltration pattern' },
];

const KILL_CHAIN = ['Recon', 'Weaponize', 'Delivery', 'Exploit', 'Install', 'C2', 'Actions'];

export default function ThreatCorrelationEngine() {
  const [tab, setTab] = useState<'events' | 'rules'>('events');
  const [selectedEvent, setSelectedEvent] = useState<string | null>(MOCK_EVENTS[0].id);
  const activeEvent = MOCK_EVENTS.find(e => e.id === selectedEvent);
  const totalMatches = MOCK_RULES.reduce((a, b) => a + b.matches, 0);
  const criticalEvents = MOCK_EVENTS.filter(e => e.severity === 'critical').length;
  const avgConfidence = Math.round(MOCK_RULES.reduce((a, b) => a + b.confidence, 0) / MOCK_RULES.length);

  return (
    <>
      <style>{corrStyles}</style>
      <div className="corr-card">
        <div className="corr-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Threat Correlation Engine</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Automated Multi-Source IOC Correlation</p>
          </div>
          <div className="corr-badge"><span className="pulse" /> CORRELATING</div>
        </div>

        <div className="corr-stats">
          <div className="corr-stat"><div className="corr-stat-num">{MOCK_RULES.length}</div><div className="corr-stat-label">Rules</div></div>
          <div className="corr-stat"><div className="corr-stat-num">{totalMatches}</div><div className="corr-stat-label">Matches</div></div>
          <div className="corr-stat"><div className="corr-stat-num" style={{ color: '#ef4444' }}>{criticalEvents}</div><div className="corr-stat-label">Critical</div></div>
          <div className="corr-stat"><div className="corr-stat-num">{avgConfidence}%</div><div className="corr-stat-label">Avg Conf</div></div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['events', 'rules'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className="corr-chain-step" style={tab === t ? { background: '#f59e0b33', borderColor: '#f59e0b' } : {}}>
              {t === 'events' ? 'Correlation Events' : 'Correlation Rules'}
            </button>
          ))}
        </div>

        {tab === 'events' && (
          <div className="corr-events">
            {MOCK_EVENTS.map(ev => (
              <div key={ev.id} className={`corr-event ${selectedEvent === ev.id ? 'corr-event-active' : ''}`} onClick={() => setSelectedEvent(ev.id)} style={selectedEvent === ev.id ? { borderColor: '#f59e0b66' } : {}}>
                <div className="corr-event-header">
                  <span className="corr-event-name">{ev.ruleName}</span>
                  <span className={`corr-sev corr-sev-${ev.severity}`}>{ev.severity}</span>
                </div>
                <div className="corr-meta">
                  <span>Phase: <span>{ev.killChainPhase}</span></span>
                  <span>Conf: <span>{ev.confidence}%</span></span>
                  <span>Time: <span>{ev.timestamp}</span></span>
                </div>
                <div className="corr-iocs">
                  {ev.iocs.map((ioc, i) => <span key={i} className="corr-ioc">{ioc}</span>)}
                </div>
                {selectedEvent === ev.id && (
                  <p style={{ color: '#aaa', fontSize: 10, marginTop: 8, lineHeight: 1.5, margin: '8px 0 0 0' }}>{ev.details}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'rules' && (
          <div className="corr-rules">
            {MOCK_RULES.map(rule => (
              <div key={rule.id} className="corr-rule">
                <div>
                  <div className="corr-rule-name">{rule.id}: {rule.name}</div>
                  <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{rule.sources.join(' + ')} | {rule.matches} matches | Last: {rule.lastTriggered}</div>
                </div>
                <div className="corr-rule-meta">
                  <span className={`corr-sev corr-sev-${rule.severity}`}>{rule.severity}</span>
                  <span className="corr-conf" style={{ color: rule.confidence >= 90 ? '#22c55e' : rule.confidence >= 75 ? '#f59e0b' : '#ef4444' }}>{rule.confidence}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #2a2a4a' }}>
          <div style={{ color: '#888', fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Kill Chain Coverage</div>
          <div className="corr-chain">
            {KILL_CHAIN.map((phase, i) => (
              <React.Fragment key={phase}>
                {i > 0 && <span className="corr-chain-arrow">→</span>}
                <span className="corr-chain-step" style={MOCK_EVENTS.some(e => e.killChainPhase.toLowerCase().includes(phase.toLowerCase().slice(0, 3))) ? { background: '#ef444433', borderColor: '#ef4444', color: '#ef4444' } : {}}>{phase}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
