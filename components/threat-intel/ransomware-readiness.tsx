// components/threat-intel/ransomware-readiness.tsx
'use client';
import React from 'react';

interface ReadinessCategory {
  id: string;
  name: string;
  score: number;
  maxScore: number;
  status: 'strong' | 'moderate' | 'weak' | 'critical';
  findings: string[];
}

const rrStyles = `
.rr-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a2a1a 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #22c55e44;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.rr-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #22c55e, #10b981, #06b6d4);
}
.rr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.rr-overall {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  padding: 14px;
  background: #12122a;
  border-radius: 10px;
  border: 1px solid #2a2a4a;
  flex-wrap: wrap;
}
.rr-score-circle {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 800;
  flex-shrink: 0;
}
.rr-categories { display: flex; flex-direction: column; gap: 8px; }
.rr-cat {
  padding: 10px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
}
.rr-cat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  flex-wrap: wrap;
  gap: 4px;
}
.rr-cat-name { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.rr-cat-score { font-size: 11px; font-weight: 700; font-family: monospace; }
.rr-bar-bg {
  height: 6px;
  background: #1a1a3e;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
}
.rr-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s;
}
.rr-finding {
  font-size: 9px;
  color: #888;
  padding: 2px 0;
  display: flex;
  align-items: center;
  gap: 4px;
}
.rr-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.rr-status-strong { background: #22c55e33; color: #22c55e; }
.rr-status-moderate { background: #f59e0b33; color: #f59e0b; }
.rr-status-weak { background: #ef444433; color: #ef4444; }
.rr-status-critical { background: #dc262633; color: #dc2626; }
.rr-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #22c55e22;
  border: 1px solid #22c55e44;
  color: #22c55e;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
`;

const CATEGORIES: ReadinessCategory[] = [
  { id: 'C-001', name: 'Backup & Recovery', score: 92, maxScore: 100, status: 'strong', findings: ['\u2713 Immutable backups enabled', '\u2713 Air-gapped backup verified', '\u2713 Recovery tested within 4hr RTO'] },
  { id: 'C-002', name: 'Endpoint Protection', score: 85, maxScore: 100, status: 'strong', findings: ['\u2713 EDR deployed 98% endpoints', '\u26A0 3 endpoints missing latest agent', '\u2713 Behavioral detection active'] },
  { id: 'C-003', name: 'Network Segmentation', score: 68, maxScore: 100, status: 'moderate', findings: ['\u2713 Microsegmentation on critical assets', '\u26A0 Flat network in dev environment', '\u2717 No east-west traffic monitoring'] },
  { id: 'C-004', name: 'Email Security', score: 78, maxScore: 100, status: 'moderate', findings: ['\u2713 DMARC enforced', '\u2713 Advanced phishing filter active', '\u26A0 User training overdue for 12 users'] },
  { id: 'C-005', name: 'Privilege Management', score: 55, maxScore: 100, status: 'weak', findings: ['\u26A0 14 over-privileged accounts', '\u2717 No PAM solution deployed', '\u2713 MFA enforced org-wide'] },
  { id: 'C-006', name: 'Incident Response Plan', score: 90, maxScore: 100, status: 'strong', findings: ['\u2713 IR playbook updated Q1 2026', '\u2713 Tabletop exercise completed', '\u2713 Legal & PR contacts current'] },
];

export default function RansomwareReadiness() {
  const overallScore = Math.round(CATEGORIES.reduce((a, b) => a + b.score, 0) / CATEGORIES.length);
  const getColor = (score: number) => score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';

  return (
    <>
      <style>{rrStyles}</style>
      <div className="rr-card">
        <div className="rr-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Ransomware Readiness Assessment</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Organizational Resilience Against Ransomware Attacks</p>
          </div>
          <span className="rr-badge">NIST CSF Aligned</span>
        </div>

        <div className="rr-overall">
          <div className="rr-score-circle" style={{ background: `conic-gradient(${getColor(overallScore)} ${overallScore * 3.6}deg, #1a1a3e ${overallScore * 3.6}deg)`, color: getColor(overallScore) }}>
            {overallScore}
          </div>
          <div>
            <div style={{ color: '#e0e0e0', fontSize: 14, fontWeight: 700 }}>Overall Readiness: {overallScore}%</div>
            <div style={{ color: '#888', fontSize: 10, marginTop: 2 }}>
              {overallScore >= 80 ? 'Strong posture - maintain current controls' : overallScore >= 60 ? 'Moderate - address gaps in segmentation & PAM' : 'Weak - immediate remediation required'}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 9, color: '#22c55e' }}>{CATEGORIES.filter(c => c.status === 'strong').length} Strong</span>
              <span style={{ fontSize: 9, color: '#f59e0b' }}>{CATEGORIES.filter(c => c.status === 'moderate').length} Moderate</span>
              <span style={{ fontSize: 9, color: '#ef4444' }}>{CATEGORIES.filter(c => c.status === 'weak').length} Weak</span>
            </div>
          </div>
        </div>

        <div className="rr-categories">
          {CATEGORIES.map(cat => (
            <div key={cat.id} className="rr-cat">
              <div className="rr-cat-header">
                <span className="rr-cat-name">{cat.name}</span>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className="rr-cat-score" style={{ color: getColor(cat.score) }}>{cat.score}/{cat.maxScore}</span>
                  <span className={`rr-status rr-status-${cat.status}`}>{cat.status}</span>
                </div>
              </div>
              <div className="rr-bar-bg">
                <div className="rr-bar-fill" style={{ width: `${cat.score}%`, background: getColor(cat.score) }} />
              </div>
              {cat.findings.map((f, i) => (
                <div key={i} className="rr-finding">{f}</div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
