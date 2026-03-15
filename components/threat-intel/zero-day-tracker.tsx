// components/threat-intel/zero-day-tracker.tsx
'use client';

import React, { useState } from 'react';

interface ZeroDay {
  id: string;
  cveId: string;
  name: string;
  vendor: string;
  product: string;
  severity: 'critical' | 'high' | 'medium';
  cvssScore: number;
  dateDiscovered: string;
  status: 'active' | 'mitigated' | 'patched';
  exploitInWild: boolean;
  ransomwareUse: boolean;
  description: string;
  affectedVersions: string;
  mitigation: string;
  attribution: string;
}

const mockZeroDays: ZeroDay[] = [
  { id: 'ZD-001', cveId: 'CVE-2025-21388', name: 'Exchange ProxyNotShell RCE', vendor: 'Microsoft', product: 'Exchange Server', severity: 'critical', cvssScore: 9.8, dateDiscovered: '2025-03-10', status: 'active', exploitInWild: true, ransomwareUse: true, description: 'Critical RCE vulnerability in Exchange Server OWA module exploited by nation-state actors.', affectedVersions: 'Exchange 2019 CU12-CU14', mitigation: 'Apply KB5035234; disable OWA if not needed', attribution: 'APT28 / Fancy Bear' },
  { id: 'ZD-002', cveId: 'CVE-2025-20198', name: 'Linux Kernel Privilege Escalation', vendor: 'Linux', product: 'Kernel', severity: 'critical', cvssScore: 9.1, dateDiscovered: '2025-03-08', status: 'mitigated', exploitInWild: true, ransomwareUse: false, description: 'Use-after-free in netfilter subsystem allowing local privilege escalation to root.', affectedVersions: 'Kernel 6.1-6.7', mitigation: 'Update to kernel 6.7.3+; apply vendor patches', attribution: 'Unknown' },
  { id: 'ZD-003', cveId: 'CVE-2025-19876', name: 'Chrome V8 Type Confusion', vendor: 'Google', product: 'Chrome', severity: 'critical', cvssScore: 9.6, dateDiscovered: '2025-03-12', status: 'patched', exploitInWild: true, ransomwareUse: false, description: 'Type confusion in V8 JavaScript engine allowing remote code execution via crafted webpage.', affectedVersions: 'Chrome < 123.0.6312.86', mitigation: 'Update to Chrome 123.0.6312.86+', attribution: 'Candiru / Commercial Spyware' },
  { id: 'ZD-004', cveId: 'CVE-2025-17234', name: 'Cisco ASA Authentication Bypass', vendor: 'Cisco', product: 'ASA Firewall', severity: 'critical', cvssScore: 9.4, dateDiscovered: '2025-03-05', status: 'active', exploitInWild: true, ransomwareUse: true, description: 'Authentication bypass in Cisco ASA VPN allowing unauthorized remote access to internal networks.', affectedVersions: 'ASA 9.16-9.18', mitigation: 'Apply Cisco advisory cisco-sa-asa-auth-bypass; restrict VPN access', attribution: 'Sandworm' },
  { id: 'ZD-005', cveId: 'CVE-2025-16543', name: 'Fortinet FortiOS SSL-VPN RCE', vendor: 'Fortinet', product: 'FortiGate', severity: 'critical', cvssScore: 9.3, dateDiscovered: '2025-02-28', status: 'mitigated', exploitInWild: true, ransomwareUse: true, description: 'Heap overflow in FortiOS SSL-VPN allowing pre-authentication remote code execution.', affectedVersions: 'FortiOS 7.2.0-7.2.6', mitigation: 'Upgrade to FortiOS 7.2.7+; disable SSL-VPN if unused', attribution: 'APT41 / Double Dragon' },
  { id: 'ZD-006', cveId: 'CVE-2025-15432', name: 'Ivanti Connect Secure SSRF', vendor: 'Ivanti', product: 'Connect Secure', severity: 'high', cvssScore: 8.2, dateDiscovered: '2025-03-01', status: 'patched', exploitInWild: true, ransomwareUse: false, description: 'Server-side request forgery in Ivanti Connect Secure allowing access to internal resources.', affectedVersions: 'ICS 22.x before 22.7R2.1', mitigation: 'Apply Ivanti patch 22.7R2.1; run integrity checker', attribution: 'UNC5325 / China-nexus' },
];

const styles = `
  .zd-container { font-family: -apple-system, BlinkMacSystemFont, sans-serif; }
  .zd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
  .zd-title { color: #e0e0e0; font-size: 20px; font-weight: 700; }
  .zd-stats { display: flex; gap: 12px; }
  .zd-stat { background: #12122a; border-radius: 8px; padding: 8px 14px; text-align: center; }
  .zd-stat-num { font-size: 18px; font-weight: 700; color: #a78bfa; }
  .zd-stat-label { font-size: 10px; color: #888; text-transform: uppercase; }
  .zd-filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .zd-filter { padding: 4px 12px; border-radius: 12px; border: 1px solid #333; background: transparent; color: #ccc; cursor: pointer; font-size: 12px; }
  .zd-filter.active { background: #7c3aed; border-color: #7c3aed; color: #fff; }
  .zd-card { background: linear-gradient(135deg, #0f172a 0%, #1a1040 100%); border: 1px solid #2d2d5e; border-radius: 12px; padding: 14px; margin-bottom: 10px; cursor: pointer; transition: border-color 0.2s; }
  .zd-card:hover { border-color: #7c3aed; }
  .zd-card-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px; }
  .zd-card-name { color: #e0e0e0; font-size: 14px; font-weight: 600; }
  .zd-cve { color: #a78bfa; font-size: 12px; font-weight: 500; }
  .zd-badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
  .zd-sev { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .zd-sev-critical { background: #ef4444; color: #fff; }
  .zd-sev-high { background: #f59e0b; color: #000; }
  .zd-sev-medium { background: #3b82f6; color: #fff; }
  .zd-exploit-tag { background: #ef444433; color: #ef4444; padding: 2px 8px; border-radius: 8px; font-size: 10px; }
  .zd-ransom-tag { background: #f59e0b33; color: #f59e0b; padding: 2px 8px; border-radius: 8px; font-size: 10px; }
  .zd-meta { display: flex; gap: 12px; font-size: 12px; color: #888; flex-wrap: wrap; margin-top: 6px; }
  .zd-status { padding: 2px 8px; border-radius: 8px; font-size: 11px; font-weight: 500; }
  .zd-status-active { background: #ef444422; color: #ef4444; }
  .zd-status-mitigated { background: #f59e0b22; color: #f59e0b; }
  .zd-status-patched { background: #22c55e22; color: #22c55e; }
  .zd-detail { margin-top: 12px; padding-top: 12px; border-top: 1px solid #2d2d5e; }
  .zd-desc { color: #aaa; font-size: 13px; line-height: 1.5; margin-bottom: 10px; }
  .zd-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .zd-detail-item { background: #12122a; border-radius: 8px; padding: 8px 12px; }
  .zd-detail-label { color: #888; font-size: 10px; text-transform: uppercase; font-weight: 600; }
  .zd-detail-value { color: #e0e0e0; font-size: 12px; margin-top: 2px; }
`;

export default function ZeroDayTracker() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const statusOptions = ['all', 'active', 'mitigated', 'patched'];
  const filtered = mockZeroDays.filter(z => statusFilter === 'all' || z.status === statusFilter);
  const activeCount = mockZeroDays.filter(z => z.status === 'active').length;
  const exploitCount = mockZeroDays.filter(z => z.exploitInWild).length;
  const ransomCount = mockZeroDays.filter(z => z.ransomwareUse).length;

  return (
    <div className="zd-container">
      <style>{styles}</style>
      <div className="zd-header">
        <h3 className="zd-title">Zero-Day Tracker</h3>
        <div className="zd-stats">
          <div className="zd-stat"><div className="zd-stat-num">{mockZeroDays.length}</div><div className="zd-stat-label">Zero-Days</div></div>
          <div className="zd-stat"><div className="zd-stat-num" style={{color:'#ef4444'}}>{activeCount}</div><div className="zd-stat-label">Active</div></div>
          <div className="zd-stat"><div className="zd-stat-num">{exploitCount}</div><div className="zd-stat-label">In Wild</div></div>
          <div className="zd-stat"><div className="zd-stat-num">{ransomCount}</div><div className="zd-stat-label">Ransomware</div></div>
        </div>
      </div>
      <div className="zd-filters">
        {statusOptions.map(s => (
          <button key={s} className={`zd-filter ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>{s === 'all' ? 'All Status' : s}</button>
        ))}
      </div>
      {filtered.map(z => (
        <div key={z.id} className="zd-card" onClick={() => setExpandedId(expandedId === z.id ? null : z.id)}>
          <div className="zd-card-top">
            <div>
              <div className="zd-cve">{z.cveId}</div>
              <div className="zd-card-name">{z.name}</div>
            </div>
            <div className="zd-badges">
              {z.exploitInWild && <span className="zd-exploit-tag">In Wild</span>}
              {z.ransomwareUse && <span className="zd-ransom-tag">Ransomware</span>}
              <span className={`zd-sev zd-sev-${z.severity}`}>{z.severity}</span>
            </div>
          </div>
          <div className="zd-meta">
            <span className={`zd-status zd-status-${z.status}`}>{z.status}</span>
            <span>CVSS: {z.cvssScore}</span>
            <span>{z.vendor} - {z.product}</span>
            <span>Discovered: {z.dateDiscovered}</span>
            <span>Attribution: {z.attribution}</span>
          </div>
          {expandedId === z.id && (
            <div className="zd-detail">
              <p className="zd-desc">{z.description}</p>
              <div className="zd-detail-grid">
                <div className="zd-detail-item"><div className="zd-detail-label">Affected Versions</div><div className="zd-detail-value">{z.affectedVersions}</div></div>
                <div className="zd-detail-item"><div className="zd-detail-label">Mitigation</div><div className="zd-detail-value">{z.mitigation}</div></div>
                <div className="zd-detail-item"><div className="zd-detail-label">Attribution</div><div className="zd-detail-value">{z.attribution}</div></div>
                <div className="zd-detail-item"><div className="zd-detail-label">CVSS Score</div><div className="zd-detail-value">{z.cvssScore}/10</div></div>
              </div>
            </div>
          )}
        </div>
      ))}
      {filtered.length === 0 && <div style={{textAlign:'center',color:'#888',padding:24}}>No zero-day vulnerabilities found</div>}
    </div>
  );
}
