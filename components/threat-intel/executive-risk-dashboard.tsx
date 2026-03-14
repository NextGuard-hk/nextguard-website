// components/threat-intel/executive-risk-dashboard.tsx
'use client';
import React, { useState } from 'react';

interface RiskMetric {
  label: string;
  value: number;
  max: number;
  trend: 'up' | 'down' | 'stable';
  delta: string;
  color: string;
}

interface RiskCategory {
  name: string;
  score: number;
  items: { label: string; status: 'critical' | 'warning' | 'good'; detail: string }[];
}

const erdStyles = `
  .erd-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #6366f144; position: relative; overflow: hidden; margin-bottom: 16px; }
  .erd-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7); }
  .erd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
  .erd-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .erd-score-ring { width: 140px; height: 140px; margin: 0 auto 16px; position: relative; }
  .erd-score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
  .erd-score-ring circle { fill: none; stroke-width: 10; stroke-linecap: round; }
  .erd-score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
  .erd-score-num { font-size: 36px; font-weight: 800; line-height: 1; }
  .erd-score-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
  .erd-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
  .erd-metric { background: #12122a; border-radius: 10px; padding: 12px; border: 1px solid #2a2a4a; text-align: center; }
  .erd-metric-value { font-size: 22px; font-weight: 700; line-height: 1.2; }
  .erd-metric-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px; }
  .erd-metric-delta { font-size: 9px; margin-top: 2px; }
  .erd-categories { display: flex; flex-direction: column; gap: 10px; }
  .erd-cat { background: #12122a; border-radius: 10px; padding: 12px; border: 1px solid #2a2a4a; }
  .erd-cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .erd-cat-name { color: #e0e0e0; font-size: 12px; font-weight: 600; }
  .erd-cat-score { font-size: 14px; font-weight: 700; }
  .erd-cat-bar { height: 4px; background: #1a1a3a; border-radius: 2px; overflow: hidden; margin-bottom: 8px; }
  .erd-cat-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
  .erd-cat-items { display: flex; flex-direction: column; gap: 4px; }
  .erd-cat-item { display: flex; justify-content: space-between; align-items: center; font-size: 10px; padding: 3px 0; }
  .erd-cat-item-label { color: #aaa; }
  .erd-cat-item-status { padding: 1px 6px; border-radius: 3px; font-size: 8px; font-weight: 600; text-transform: uppercase; }
  .erd-status-critical { background: #ef444422; color: #ef4444; }
  .erd-status-warning { background: #f59e0b22; color: #f59e0b; }
  .erd-status-good { background: #22c55e22; color: #22c55e; }
  .erd-timeline { display: flex; justify-content: space-between; margin-top: 14px; padding-top: 14px; border-top: 1px solid #2a2a4a; }
  .erd-tl-item { text-align: center; }
  .erd-tl-dot { width: 8px; height: 8px; border-radius: 50%; margin: 0 auto 4px; }
  .erd-tl-date { font-size: 8px; color: #666; }
  .erd-tl-score { font-size: 10px; font-weight: 600; }
  @media (max-width: 480px) { .erd-metrics { grid-template-columns: repeat(2, 1fr); } }
`;

const RISK_SCORE = 72;
const METRICS: RiskMetric[] = [
  { label: 'MTTD', value: 4.2, max: 60, trend: 'down', delta: '-18%', color: '#22c55e' },
  { label: 'MTTR', value: 12, max: 120, trend: 'down', delta: '-25%', color: '#22c55e' },
  { label: 'Coverage', value: 94, max: 100, trend: 'up', delta: '+3%', color: '#3b82f6' },
  { label: 'False Pos', value: 2.1, max: 100, trend: 'down', delta: '-42%', color: '#22c55e' },
  { label: 'Incidents', value: 3, max: 50, trend: 'stable', delta: '0%', color: '#f59e0b' },
  { label: 'SLA Met', value: 98, max: 100, trend: 'up', delta: '+1%', color: '#22c55e' },
];

const CATEGORIES: RiskCategory[] = [
  { name: 'Endpoint Protection', score: 88, items: [
    { label: 'EDR Coverage', status: 'good', detail: '98% endpoints' },
    { label: 'Patch Compliance', status: 'warning', detail: '89% patched' },
    { label: 'AV Signatures', status: 'good', detail: 'Updated 2h ago' },
  ]},
  { name: 'Network Security', score: 75, items: [
    { label: 'Firewall Rules', status: 'good', detail: '1,247 active' },
    { label: 'IDS/IPS', status: 'warning', detail: '3 bypasses detected' },
    { label: 'DNS Filtering', status: 'good', detail: '99.7% filtered' },
  ]},
  { name: 'Identity & Access', score: 62, items: [
    { label: 'MFA Adoption', status: 'warning', detail: '78% enabled' },
    { label: 'Privileged Access', status: 'critical', detail: '12 over-provisioned' },
    { label: 'SSO Coverage', status: 'good', detail: '95% apps' },
  ]},
  { name: 'Data Protection', score: 81, items: [
    { label: 'DLP Policies', status: 'good', detail: '47 active' },
    { label: 'Encryption', status: 'good', detail: 'AES-256 everywhere' },
    { label: 'Classification', status: 'warning', detail: '72% classified' },
  ]},
];

const HISTORY = [
  { date: 'Jan', score: 58, color: '#ef4444' },
  { date: 'Feb', score: 63, color: '#f59e0b' },
  { date: 'Mar', score: 65, color: '#f59e0b' },
  { date: 'Apr', score: 68, color: '#f59e0b' },
  { date: 'May', score: 72, color: '#22c55e' },
  { date: 'Now', score: 72, color: '#22c55e' },
];

function getScoreColor(score: number) {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
}

function getScoreLabel(score: number) {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Moderate';
  return 'Critical';
}

export default function ExecutiveRiskDashboard() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const scoreColor = getScoreColor(RISK_SCORE);
  const circumference = 2 * Math.PI * 58;
  const offset = circumference - (RISK_SCORE / 100) * circumference;

  return (
    <>
      <style>{erdStyles}</style>
      <div className="erd-card">
        <div className="erd-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>Executive Risk Dashboard</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Enterprise Security Posture Overview</p>
          </div>
          <div className="erd-badge" style={{ background: `${scoreColor}22`, border: `1px solid ${scoreColor}44`, color: scoreColor }}>
            {getScoreLabel(RISK_SCORE)} Posture
          </div>
        </div>

        <div className="erd-score-ring">
          <svg viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="58" stroke="#1a1a3a" />
            <circle cx="65" cy="65" r="58" stroke={scoreColor} strokeDasharray={circumference} strokeDashoffset={offset} />
          </svg>
          <div className="erd-score-value">
            <div className="erd-score-num" style={{ color: scoreColor }}>{RISK_SCORE}</div>
            <div className="erd-score-label">Risk Score</div>
          </div>
        </div>

        <div className="erd-metrics">
          {METRICS.map(m => (
            <div key={m.label} className="erd-metric">
              <div className="erd-metric-value" style={{ color: m.color }}>{m.value}{m.label === 'Coverage' || m.label === 'SLA Met' || m.label === 'False Pos' ? '%' : m.label === 'MTTD' ? 'min' : m.label === 'MTTR' ? 'min' : ''}</div>
              <div className="erd-metric-label">{m.label}</div>
              <div className="erd-metric-delta" style={{ color: m.trend === 'down' && m.label !== 'Coverage' ? '#22c55e' : m.trend === 'up' ? '#22c55e' : '#f59e0b' }}>
                {m.trend === 'down' ? '↓' : m.trend === 'up' ? '↑' : '→'} {m.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="erd-categories">
          {CATEGORIES.map(cat => (
            <div key={cat.name} className="erd-cat" onClick={() => setExpanded(expanded === cat.name ? null : cat.name)} style={{ cursor: 'pointer' }}>
              <div className="erd-cat-header">
                <span className="erd-cat-name">{cat.name}</span>
                <span className="erd-cat-score" style={{ color: getScoreColor(cat.score) }}>{cat.score}/100</span>
              </div>
              <div className="erd-cat-bar">
                <div className="erd-cat-fill" style={{ width: `${cat.score}%`, background: getScoreColor(cat.score) }} />
              </div>
              {expanded === cat.name && (
                <div className="erd-cat-items">
                  {cat.items.map(item => (
                    <div key={item.label} className="erd-cat-item">
                      <span className="erd-cat-item-label">{item.label}: {item.detail}</span>
                      <span className={`erd-cat-item-status erd-status-${item.status}`}>{item.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="erd-timeline">
          {HISTORY.map(h => (
            <div key={h.date} className="erd-tl-item">
              <div className="erd-tl-dot" style={{ background: h.color }} />
              <div className="erd-tl-score" style={{ color: h.color }}>{h.score}</div>
              <div className="erd-tl-date">{h.date}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
