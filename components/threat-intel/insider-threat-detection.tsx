// components/threat-intel/insider-threat-detection.tsx
'use client';
import React, { useState } from 'react';

interface InsiderAlert {
  id: string;
  user: string;
  department: string;
  riskScore: number;
  behavior: string;
  category: 'data_exfil' | 'privilege_abuse' | 'policy_violation' | 'anomalous_access' | 'resignation_risk';
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'investigating' | 'confirmed' | 'dismissed' | 'monitoring';
  timestamp: string;
  indicators: string[];
}

const itdStyles = `
.itd-card {
  background: linear-gradient(135deg, #0f172a 0%, #2a1a2a 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #f59e0b44;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.itd-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b);
}
.itd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.itd-badge {
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
.itd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.itd-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.itd-stat-num { font-size: 20px; font-weight: 700; color: #f59e0b; }
.itd-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.itd-alerts { display: flex; flex-direction: column; gap: 8px; }
.itd-alert {
  padding: 10px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
}
.itd-alert-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.itd-user { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.itd-risk-score {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  font-size: 11px;
  font-weight: 800;
}
.itd-cat {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  background: #f59e0b22;
  color: #f59e0b;
}
.itd-sev {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.itd-sev-critical { background: #ef444433; color: #ef4444; }
.itd-sev-high { background: #f59e0b33; color: #f59e0b; }
.itd-sev-medium { background: #3b82f633; color: #3b82f6; }
.itd-sev-low { background: #22c55e33; color: #22c55e; }
.itd-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.itd-status-investigating { background: #3b82f622; color: #60a5fa; }
.itd-status-confirmed { background: #ef444422; color: #ef4444; }
.itd-status-dismissed { background: #64748b22; color: #94a3b8; }
.itd-status-monitoring { background: #f59e0b22; color: #f59e0b; }
.itd-indicator {
  font-size: 9px;
  color: #888;
  padding: 1px 0;
}
@media (max-width: 480px) {
  .itd-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_ALERTS: InsiderAlert[] = [
  { id: 'IT-001', user: 'J. Chen (Engineering)', department: 'R&D', riskScore: 92, behavior: 'Mass download of source code repos + USB transfer', category: 'data_exfil', severity: 'critical', status: 'investigating', timestamp: '03:45', indicators: ['Downloaded 14GB from internal Git', 'USB device connected after hours', 'Resignation notice filed 2 days ago'] },
  { id: 'IT-002', user: 'M. Wong (Finance)', department: 'Finance', riskScore: 78, behavior: 'Accessing unauthorized financial records', category: 'privilege_abuse', severity: 'high', status: 'investigating', timestamp: '03:20', indicators: ['Accessed 42 records outside normal scope', 'After-hours access pattern', 'Queried executive salary data'] },
  { id: 'IT-003', user: 'S. Patel (Sales)', department: 'Sales', riskScore: 65, behavior: 'Bulk export of customer contact database', category: 'data_exfil', severity: 'medium', status: 'monitoring', timestamp: '02:55', indicators: ['Exported 8,200 customer records', 'Sent to personal email', 'LinkedIn profile updated recently'] },
  { id: 'IT-004', user: 'A. Kim (IT Admin)', department: 'IT', riskScore: 45, behavior: 'Multiple failed privilege escalation attempts', category: 'anomalous_access', severity: 'medium', status: 'dismissed', timestamp: '02:10', indicators: ['3 failed sudo attempts', 'Normal troubleshooting pattern', 'Ticket #4521 confirms legitimate'] },
  { id: 'IT-005', user: 'R. Liu (Marketing)', department: 'Marketing', riskScore: 58, behavior: 'Accessing sensitive product roadmap documents', category: 'policy_violation', severity: 'low', status: 'monitoring', timestamp: '01:30', indicators: ['Viewed 6 restricted documents', 'No download detected', 'May need access review'] },
];

export default function InsiderThreatDetection() {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high'>('all');
  const criticalCount = MOCK_ALERTS.filter(a => a.severity === 'critical').length;
  const investigating = MOCK_ALERTS.filter(a => a.status === 'investigating').length;
  const filtered = filter === 'all' ? MOCK_ALERTS : MOCK_ALERTS.filter(a => a.severity === filter);
  const getRiskColor = (score: number) => score >= 80 ? '#ef4444' : score >= 60 ? '#f59e0b' : score >= 40 ? '#3b82f6' : '#22c55e';

  return (
    <>
      <style>{itdStyles}</style>
      <div className="itd-card">
        <div className="itd-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Insider Threat Detection</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>UEBA-Powered Insider Risk Analytics</p>
          </div>
          <span className="itd-badge">UEBA Active</span>
        </div>

        <div className="itd-stats">
          <div className="itd-stat"><div className="itd-stat-num">{MOCK_ALERTS.length}</div><div className="itd-stat-label">Active Alerts</div></div>
          <div className="itd-stat"><div className="itd-stat-num" style={{ color: '#ef4444' }}>{criticalCount}</div><div className="itd-stat-label">Critical</div></div>
          <div className="itd-stat"><div className="itd-stat-num" style={{ color: '#3b82f6' }}>{investigating}</div><div className="itd-stat-label">Investigating</div></div>
          <div className="itd-stat"><div className="itd-stat-num" style={{ color: '#22c55e' }}>1,247</div><div className="itd-stat-label">Users Monitored</div></div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['all', 'critical', 'high'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid', borderColor: filter === f ? '#f59e0b' : '#333', background: filter === f ? '#f59e0b22' : 'transparent', color: filter === f ? '#f59e0b' : '#888', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              {f === 'all' ? 'All Alerts' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <div className="itd-alerts">
          {filtered.map(alert => (
            <div key={alert.id} className="itd-alert">
              <div className="itd-alert-header">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="itd-risk-score" style={{ background: `${getRiskColor(alert.riskScore)}22`, color: getRiskColor(alert.riskScore), border: `2px solid ${getRiskColor(alert.riskScore)}44` }}>
                    {alert.riskScore}
                  </div>
                  <div>
                    <span className="itd-user">{alert.user}</span>
                    <div style={{ color: '#666', fontSize: 9 }}>{alert.behavior}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span className="itd-cat">{alert.category.replace('_', ' ')}</span>
                  <span className={`itd-sev itd-sev-${alert.severity}`}>{alert.severity}</span>
                  <span className={`itd-status itd-status-${alert.status}`}>{alert.status}</span>
                </div>
              </div>
              <div style={{ marginTop: 4 }}>
                {alert.indicators.map((ind, i) => (
                  <div key={i} className="itd-indicator">{'\u2022'} {ind}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
