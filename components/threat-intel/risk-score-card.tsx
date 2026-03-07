// components/threat-intel/risk-score-card.tsx
// Phase 5 — Risk Score Visualization Card
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

export default function RiskScoreCard({ score, level, ioc, iocType, queriedAt }: RiskScoreCardProps) {
  const config = levelConfig[level];
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: '12px',
      padding: '24px',
      border: `2px solid ${config.color}33`,
      minWidth: '280px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {/* Circular Score */}
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="#333" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="45"
              fill="none"
              stroke={config.color}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '24px', fontWeight: 'bold', color: config.color,
          }}>
            {score}
          </div>
        </div>

        {/* Details */}
        <div>
          <div style={{
            display: 'inline-block',
            padding: '2px 10px',
            borderRadius: '4px',
            backgroundColor: `${config.color}22`,
            color: config.color,
            fontSize: '12px',
            fontWeight: 'bold',
            marginBottom: '8px',
          }}>
            {config.label}
          </div>
          <div style={{ color: '#e0e0e0', fontSize: '14px', fontFamily: 'monospace' }}>{ioc}</div>
          <div style={{ color: '#888', fontSize: '12px', marginTop: '4px' }}>Type: {iocType}</div>
          <div style={{ color: '#666', fontSize: '11px', marginTop: '2px' }}>{queriedAt}</div>
        </div>
      </div>
    </div>
  );
}
