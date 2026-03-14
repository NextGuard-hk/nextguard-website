// components/threat-intel/attack-surface-management.tsx
'use client';
import React, { useState } from 'react';

interface Asset {
  id: string;
  name: string;
  type: 'domain' | 'ip' | 'cloud' | 'api' | 'certificate';
  risk: 'critical' | 'high' | 'medium' | 'low';
  exposure: string;
  lastScan: string;
  issues: number;
  status: 'exposed' | 'monitored' | 'secured';
}

const asmStyles = `
.asm-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #8b5cf644;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.asm-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #8b5cf6, #a78bfa, #c4b5fd);
}
.asm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.asm-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #8b5cf622;
  border: 1px solid #8b5cf644;
  color: #8b5cf6;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.asm-stats {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.asm-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.asm-stat-num { font-size: 18px; font-weight: 700; color: #8b5cf6; }
.asm-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.asm-assets { display: flex; flex-direction: column; gap: 8px; }
.asm-asset {
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
.asm-asset-name { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.asm-type {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
  background: #8b5cf622;
  color: #a78bfa;
}
.asm-risk {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.asm-risk-critical { background: #ef444433; color: #ef4444; }
.asm-risk-high { background: #f59e0b33; color: #f59e0b; }
.asm-risk-medium { background: #3b82f633; color: #3b82f6; }
.asm-risk-low { background: #22c55e33; color: #22c55e; }
.asm-status-exposed { color: #ef4444; }
.asm-status-monitored { color: #f59e0b; }
.asm-status-secured { color: #22c55e; }
@media (max-width: 480px) {
  .asm-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_ASSETS: Asset[] = [
  { id: 'A-001', name: 'api.next-guard.com', type: 'api', risk: 'low', exposure: 'Public API', lastScan: '5 min ago', issues: 0, status: 'secured' },
  { id: 'A-002', name: '*.next-guard.com', type: 'domain', risk: 'medium', exposure: '3 subdomains exposed', lastScan: '1 hr ago', issues: 2, status: 'monitored' },
  { id: 'A-003', name: 'AWS ap-east-1 (HK)', type: 'cloud', risk: 'low', exposure: 'S3 + Lambda', lastScan: '30 min ago', issues: 0, status: 'secured' },
  { id: 'A-004', name: '103.152.xxx.0/24', type: 'ip', risk: 'high', exposure: 'Open ports: 22, 443, 8080', lastScan: '2 hr ago', issues: 4, status: 'exposed' },
  { id: 'A-005', name: 'TLS Cert *.next-guard.com', type: 'certificate', risk: 'medium', exposure: 'Expires in 23 days', lastScan: '6 hr ago', issues: 1, status: 'monitored' },
  { id: 'A-006', name: 'Vercel Edge Network', type: 'cloud', risk: 'low', exposure: 'CDN endpoints', lastScan: '15 min ago', issues: 0, status: 'secured' },
  { id: 'A-007', name: 'GitHub Org: NextGuard-hk', type: 'api', risk: 'medium', exposure: '2 public repos', lastScan: '3 hr ago', issues: 1, status: 'monitored' },
];

export default function AttackSurfaceManagement() {
  const totalAssets = MOCK_ASSETS.length;
  const criticalAssets = MOCK_ASSETS.filter(a => a.risk === 'critical' || a.risk === 'high').length;
  const exposed = MOCK_ASSETS.filter(a => a.status === 'exposed').length;
  const totalIssues = MOCK_ASSETS.reduce((a, b) => a + b.issues, 0);
  const secured = MOCK_ASSETS.filter(a => a.status === 'secured').length;

  return (
    <>
      <style>{asmStyles}</style>
      <div className="asm-card">
        <div className="asm-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Attack Surface Management</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>External Attack Surface Discovery &amp; Monitoring</p>
          </div>
          <span className="asm-badge">EASM Active</span>
        </div>

        <div className="asm-stats">
          <div className="asm-stat"><div className="asm-stat-num">{totalAssets}</div><div className="asm-stat-label">Assets</div></div>
          <div className="asm-stat"><div className="asm-stat-num" style={{ color: '#ef4444' }}>{criticalAssets}</div><div className="asm-stat-label">High Risk</div></div>
          <div className="asm-stat"><div className="asm-stat-num" style={{ color: '#f59e0b' }}>{exposed}</div><div className="asm-stat-label">Exposed</div></div>
          <div className="asm-stat"><div className="asm-stat-num" style={{ color: '#ef4444' }}>{totalIssues}</div><div className="asm-stat-label">Issues</div></div>
          <div className="asm-stat"><div className="asm-stat-num" style={{ color: '#22c55e' }}>{secured}</div><div className="asm-stat-label">Secured</div></div>
        </div>

        <div className="asm-assets">
          {MOCK_ASSETS.map(asset => (
            <div key={asset.id} className="asm-asset">
              <div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="asm-asset-name">{asset.name}</span>
                  <span className="asm-type">{asset.type}</span>
                </div>
                <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                  {asset.exposure} | Last scan: {asset.lastScan} | Issues: {asset.issues}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span className={`asm-risk asm-risk-${asset.risk}`}>{asset.risk}</span>
                <span className={`asm-status-${asset.status}`} style={{ fontSize: 9, fontWeight: 700 }}>
                  {asset.status === 'exposed' ? '\u26A0' : asset.status === 'secured' ? '\u2713' : '\u25CB'} {asset.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
