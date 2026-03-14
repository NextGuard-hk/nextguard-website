// components/threat-intel/zero-day-tracker.tsx
'use client';
import React, { useState } from 'react';

interface ZeroDayVuln {
  id: string;
  cve: string;
  name: string;
  vendor: string;
  product: string;
  severity: 'critical' | 'high' | 'medium';
  cvss: number;
  status: 'actively_exploited' | 'poc_available' | 'disclosed' | 'patched';
  discovered: string;
  affected: string;
  exploitMaturity: 'weaponized' | 'poc' | 'theoretical';
}

const zdStyles = `
.zd-card {
  background: linear-gradient(135deg, #0f172a 0%, #2a1a1a 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #dc262644;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.zd-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #dc2626, #ef4444, #f87171);
}
.zd-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.zd-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #dc262622;
  border: 1px solid #dc262644;
  color: #dc2626;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.zd-badge .pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #dc2626;
  animation: zdPulse 1s ease-in-out infinite;
}
@keyframes zdPulse {
  0%,100% { opacity:1; } 50% { opacity:0.2; }
}
.zd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.zd-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.zd-stat-num { font-size: 20px; font-weight: 700; color: #dc2626; }
.zd-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.zd-vulns { display: flex; flex-direction: column; gap: 8px; }
.zd-vuln {
  padding: 10px 12px;
  background: #12122a;
  border-radius: 8px;
  border: 1px solid #2a2a4a;
}
.zd-vuln-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 4px;
}
.zd-vuln-name { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.zd-cvss {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 9px;
  font-weight: 700;
  font-family: monospace;
}
.zd-cvss-crit { background: #dc262633; color: #dc2626; }
.zd-cvss-high { background: #f59e0b33; color: #f59e0b; }
.zd-cvss-med { background: #3b82f633; color: #3b82f6; }
.zd-exploit-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.zd-es-actively_exploited { background: #dc262633; color: #ef4444; animation: zdBlink 2s infinite; }
.zd-es-poc_available { background: #f59e0b33; color: #f59e0b; }
.zd-es-disclosed { background: #3b82f633; color: #60a5fa; }
.zd-es-patched { background: #22c55e33; color: #22c55e; }
@keyframes zdBlink {
  0%,100% { opacity:1; } 50% { opacity:0.6; }
}
.zd-maturity {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.zd-mat-weaponized { background: #dc262622; color: #dc2626; }
.zd-mat-poc { background: #f59e0b22; color: #f59e0b; }
.zd-mat-theoretical { background: #64748b22; color: #94a3b8; }
@media (max-width: 480px) {
  .zd-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_VULNS: ZeroDayVuln[] = [
  { id: 'ZD-001', cve: 'CVE-2026-0001', name: 'Windows RCE via SMBv3', vendor: 'Microsoft', product: 'Windows 11/Server 2025', severity: 'critical', cvss: 9.8, status: 'actively_exploited', discovered: '2 days ago', affected: '~2.1B devices', exploitMaturity: 'weaponized' },
  { id: 'ZD-002', cve: 'CVE-2026-21001', name: 'Chrome V8 Type Confusion', vendor: 'Google', product: 'Chrome < 134.0.6998', severity: 'critical', cvss: 9.6, status: 'actively_exploited', discovered: '12 hours ago', affected: '~3.2B users', exploitMaturity: 'weaponized' },
  { id: 'ZD-003', cve: 'CVE-2026-1550', name: 'Fortinet SSL-VPN Auth Bypass', vendor: 'Fortinet', product: 'FortiOS 7.x', severity: 'critical', cvss: 9.4, status: 'poc_available', discovered: '5 days ago', affected: '~500K devices', exploitMaturity: 'poc' },
  { id: 'ZD-004', cve: 'CVE-2026-3312', name: 'Linux Kernel Privilege Escalation', vendor: 'Linux', product: 'Kernel 6.x', severity: 'high', cvss: 8.8, status: 'disclosed', discovered: '1 week ago', affected: '~80M servers', exploitMaturity: 'theoretical' },
  { id: 'ZD-005', cve: 'CVE-2026-0088', name: 'Cisco IOS XE Web UI RCE', vendor: 'Cisco', product: 'IOS XE 17.x', severity: 'critical', cvss: 10.0, status: 'patched', discovered: '3 weeks ago', affected: '~300K routers', exploitMaturity: 'weaponized' },
];

export default function ZeroDayTracker() {
  const activeExploits = MOCK_VULNS.filter(v => v.status === 'actively_exploited').length;
  const weaponized = MOCK_VULNS.filter(v => v.exploitMaturity === 'weaponized').length;
  const unpatched = MOCK_VULNS.filter(v => v.status !== 'patched').length;

  return (
    <>
      <style>{zdStyles}</style>
      <div className="zd-card">
        <div className="zd-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>Zero-Day Exploit Tracker</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Active Zero-Day Vulnerabilities &amp; Exploit Intelligence</p>
          </div>
          <span className="zd-badge"><span className="pulse" /> {activeExploits} ACTIVE</span>
        </div>

        <div className="zd-stats">
          <div className="zd-stat"><div className="zd-stat-num">{activeExploits}</div><div className="zd-stat-label">Active Exploits</div></div>
          <div className="zd-stat"><div className="zd-stat-num" style={{ color: '#f59e0b' }}>{weaponized}</div><div className="zd-stat-label">Weaponized</div></div>
          <div className="zd-stat"><div className="zd-stat-num" style={{ color: '#ef4444' }}>{unpatched}</div><div className="zd-stat-label">Unpatched</div></div>
          <div className="zd-stat"><div className="zd-stat-num" style={{ color: '#22c55e' }}>24/7</div><div className="zd-stat-label">Monitoring</div></div>
        </div>

        <div className="zd-vulns">
          {MOCK_VULNS.map(v => (
            <div key={v.id} className="zd-vuln">
              <div className="zd-vuln-header">
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="zd-vuln-name">{v.name}</span>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 9 }}>{v.cve}</span>
                </div>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <span className={`zd-cvss ${v.cvss >= 9 ? 'zd-cvss-crit' : v.cvss >= 7 ? 'zd-cvss-high' : 'zd-cvss-med'}`}>CVSS {v.cvss}</span>
                  <span className={`zd-exploit-status zd-es-${v.status}`}>{v.status.replace('_', ' ')}</span>
                  <span className={`zd-maturity zd-mat-${v.exploitMaturity}`}>{v.exploitMaturity}</span>
                </div>
              </div>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                {v.vendor} {v.product} | Affected: {v.affected} | Discovered: {v.discovered}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
