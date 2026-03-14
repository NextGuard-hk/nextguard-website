// components/threat-intel/supply-chain-risk.tsx
'use client';
import React, { useState } from 'react';

interface Vendor {
  name: string;
  riskScore: number;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  lastAssessed: string;
  issues: string[];
  breachHistory: number;
}

const scrStyles = `
  .scr-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #8b5cf644; position: relative; overflow: hidden; margin-bottom: 16px; }
  .scr-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b); }
  .scr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .scr-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #8b5cf622; border: 1px solid #8b5cf644; color: #a78bfa; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .scr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .scr-vendor { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; transition: all 0.2s; }
  .scr-vendor:hover { border-color: #8b5cf6; transform: translateY(-1px); }
  .scr-vendor-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .scr-vendor-name { color: #e0e0e0; font-size: 13px; font-weight: 600; }
  .scr-score { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; }
  .scr-score-critical { background: #ef444433; color: #fca5a5; border: 2px solid #ef4444; }
  .scr-score-high { background: #f59e0b33; color: #fbbf24; border: 2px solid #f59e0b; }
  .scr-score-medium { background: #3b82f633; color: #93c5fd; border: 2px solid #3b82f6; }
  .scr-score-low { background: #22c55e33; color: #86efac; border: 2px solid #22c55e; }
  .scr-meta { color: #666; font-size: 10px; margin-bottom: 8px; }
  .scr-meta span { color: #aaa; }
  .scr-issues { display: flex; flex-wrap: wrap; gap: 4px; }
  .scr-issue { padding: 2px 8px; border-radius: 4px; font-size: 9px; background: #ef444415; border: 1px solid #ef444433; color: #fca5a5; }
  .scr-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .scr-sum-item { background: #12122a; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #2a2a4a; }
  .scr-sum-num { font-size: 20px; font-weight: 700; }
  .scr-sum-label { font-size: 9px; color: #888; text-transform: uppercase; margin-top: 2px; }
`;

const MOCK_VENDORS: Vendor[] = [
  { name: 'CloudFlare CDN', riskScore: 15, riskLevel: 'low', category: 'Infrastructure', lastAssessed: '2d ago', issues: [], breachHistory: 0 },
  { name: 'AWS Services', riskScore: 22, riskLevel: 'low', category: 'Cloud Provider', lastAssessed: '1d ago', issues: ['Minor config drift'], breachHistory: 0 },
  { name: 'Okta SSO', riskScore: 45, riskLevel: 'medium', category: 'Identity', lastAssessed: '5d ago', issues: ['Past breach 2023', 'Pending MFA update'], breachHistory: 1 },
  { name: 'SolarWinds IT', riskScore: 78, riskLevel: 'high', category: 'IT Management', lastAssessed: '3d ago', issues: ['Supply chain attack history', 'Slow patching'], breachHistory: 2 },
  { name: 'Legacy CRM Vendor', riskScore: 92, riskLevel: 'critical', category: 'SaaS', lastAssessed: '14d ago', issues: ['EOL software', 'No SOC2', 'Unencrypted API'], breachHistory: 3 },
  { name: 'Vercel Hosting', riskScore: 18, riskLevel: 'low', category: 'Hosting', lastAssessed: '1d ago', issues: [], breachHistory: 0 },
];

export default function SupplyChainRisk() {
  const [vendors] = useState<Vendor[]>(MOCK_VENDORS);
  const critical = vendors.filter(v => v.riskLevel === 'critical').length;
  const high = vendors.filter(v => v.riskLevel === 'high').length;
  const avgScore = Math.round(vendors.reduce((a, b) => a + b.riskScore, 0) / vendors.length);

  return (
    <>
      <style>{scrStyles}</style>
      <div className="scr-card">
        <div className="scr-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 4px 0', fontSize: '16px' }}>Supply Chain Risk Monitor</h3>
            <p style={{ color: '#888', margin: 0, fontSize: '11px' }}>Third-Party Vendor Risk Assessment</p>
          </div>
          <div className="scr-badge">Supply Chain</div>
        </div>

        <div className="scr-summary">
          <div className="scr-sum-item"><div className="scr-sum-num" style={{ color: '#a78bfa' }}>{vendors.length}</div><div className="scr-sum-label">Vendors</div></div>
          <div className="scr-sum-item"><div className="scr-sum-num" style={{ color: '#ef4444' }}>{critical}</div><div className="scr-sum-label">Critical</div></div>
          <div className="scr-sum-item"><div className="scr-sum-num" style={{ color: '#f59e0b' }}>{high}</div><div className="scr-sum-label">High Risk</div></div>
          <div className="scr-sum-item"><div className="scr-sum-num" style={{ color: avgScore > 50 ? '#f59e0b' : '#22c55e' }}>{avgScore}</div><div className="scr-sum-label">Avg Score</div></div>
        </div>

        <div className="scr-grid">
          {vendors.sort((a, b) => b.riskScore - a.riskScore).map((v, i) => (
            <div key={i} className="scr-vendor">
              <div className="scr-vendor-header">
                <span className="scr-vendor-name">{v.name}</span>
                <div className={`scr-score scr-score-${v.riskLevel}`}>{v.riskScore}</div>
              </div>
              <div className="scr-meta">
                Category: <span>{v.category}</span> | Assessed: <span>{v.lastAssessed}</span> | Breaches: <span>{v.breachHistory}</span>
              </div>
              {v.issues.length > 0 && (
                <div className="scr-issues">
                  {v.issues.map((issue, j) => <span key={j} className="scr-issue">{issue}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
