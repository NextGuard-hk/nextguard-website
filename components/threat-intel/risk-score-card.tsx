// components/threat-intel/risk-score-card.tsx
// Phase 7 — Responsive Risk Score Visualization Card
'use client';

import React from 'react';

interface RiskScoreCardProps {
  score: number;
  level: 'critical' | 'high' | 'medium' | 'low' | 'info';
  ioc: string;
  iocType: string;
  queriedAt: string;
}

const levelConfig = {
  critical: { color: '#ef4444', bg: '#fef2f2', border: '#fecaca', label: 'CRITICAL' },
  high: { color: '#f97316', bg: '#fff7ed', border: '#fed7aa', label: 'HIGH' },
  medium: { color: '#eab308', bg: '#fefce8', border: '#fef08a', label: 'MEDIUM' },
  low: { color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0', label: 'LOW' },
  info: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', label: 'INFO' },
};

const rscStyles = `
  .rsc-card { background: #1a1a2e; border-radius: 12px; padding: 24px; margin-bottom: 12px; }
  .rsc-layout { display: flex; align-items: center; gap: 20px; }
  .rsc-score-wrap { position: relative; width: 100px; height: 100px; flex-shrink: 0; }
  .rsc-details { flex: 1; min-width: 0; }
  .rsc-level { display: inline-block; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 6px; }
  .rsc-ioc { color: #e0e0e0; font-size: 16px; font-weight: bold; font-family: monospace; word-break: break-all; margin-bottom: 4px; }
  .rsc-meta { color: #888; font-size: 12px; }
  @media (max-width: 480px) {
    .rsc-card { padding: 16px; }
    .rsc-layout { flex-direction: column; text-align: center; }
    .rsc-score-wrap { width: 80px; height: 80px; }
    .rsc-ioc { font-size: 14px; }
  }
`;

export default function RiskScoreCard({ score, level, ioc, iocType, queriedAt }: RiskScoreCardProps) {
  const config = levelConfig[level];
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <>
      <style>{rscStyles}</style>
      <div className="rsc-card" style={{ border: `2px solid ${config.color}33` }}>
        <div className="rsc-layout">
          {/* Circular Score */}
          <div className="rsc-score-wrap">
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                stroke={config.color}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 50 50)"
              />
            </svg>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '24px', fontWeight: 'bold',
              color: config.color, fontFamily: 'monospace',
            }}>
              {score}
            </div>
          </div>

          {/* Details */}
          <div className="rsc-details">
            <span className="rsc-level" style={{
              background: `${config.color}22`,
              color: config.color,
            }}>{config.label}</span>
            <div className="rsc-ioc">{ioc}</div>
            <div className="rsc-meta">Type: {iocType}</div>
            <div className="rsc-meta">{queriedAt}</div>
          </div>
        </div>
      </div>
    </>
  );
}
