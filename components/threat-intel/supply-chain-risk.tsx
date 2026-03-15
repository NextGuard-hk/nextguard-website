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
  complianceStatus: string[];
  dataAccess: string;
  contractExpiry: string;
}

const scrStyles = `
  .scr-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #8b5cf644; position: relative; overflow: hidden; margin-bottom: 16px; }
  .scr-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #8b5cf6, #ec4899, #f59e0b); }
  .scr-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .scr-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #8b5cf622; border: 1px solid #8b5cf644; color: #a78bfa; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .scr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
  .scr-vendor { background: #12122a; border-radius: 10px; padding: 14px; border: 1px solid #2a2a4a; transition: all 0.2s; cursor: pointer; }
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
  .scr-issues { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .scr-issue { padding: 2px 8px; border-radius: 4px; font-size: 9px; background: #ef444415; border: 1px solid #ef444433; color: #fca5a5; }
  .scr-summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
  .scr-sum-item { background: #12122a; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #2a2a4a; }
  .scr-sum-num { font-size: 20px; font-weight: 700; }
  .scr-sum-label { font-size: 9px; color: #888; text-transform: uppercase; margin-top: 2px; }
  .scr-compliance { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .scr-comp-tag { padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: 600; }
  .scr-comp-pass { background: #22c55e22; border: 1px solid #22c55e44; color: #86efac; }
  .scr-comp-fail { background: #ef444422; border: 1px solid #ef444444; color: #fca5a5; }
  .scr-detail { background: #0a0a1a; border-radius: 8px; padding: 12px; margin-top: 8px; border: 1px solid #1a1a3a; }
  .scr-detail-row { display: flex; justify-content: space-between; font-size: 10px; padding: 4px 0; border-bottom: 1px solid #1a1a3a; }
  .scr-detail-label { color: #888; }
  .scr-detail-value { color: #e0e0e0; font-weight: 500; }
  .scr-risk-bar { height: 4px; border-radius: 2px; background: #1a1a3a; margin-top: 8px; overflow: hidden; }
  .scr-risk-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease; }
  .scr-filter-bar { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .scr-filter-btn { padding: 4px 10px; border-radius: 6px; font-size: 10px; border: 1px solid #2a2a4a; background: #12122a; color: #888; cursor: pointer; transition: all 0.2s; }
  .scr-filter-btn:hover, .scr-filter-active { background: #8b5cf622; border-color: #8b5cf6; color: #a78bfa; }
`;

const MOCK_VENDORS: Vendor[] = [
  { name: 'CloudFlare CDN', riskScore: 15, riskLevel: 'low', category: 'Infrastructure', lastAssessed: '2d ago', issues: [], breachHistory: 0, complianceStatus: ['SOC2', 'ISO27001', 'GDPR'], dataAccess: 'CDN/Edge Only', contractExpiry: 'Dec 2027' },
  { name: 'AWS Services', riskScore: 22, riskLevel: 'low', category: 'Cloud Provider', lastAssessed: '1d ago', issues: ['Minor config drift'], breachHistory: 0, complianceStatus: ['SOC2', 'ISO27001', 'HIPAA', 'FedRAMP'], dataAccess: 'Full Infrastructure', contractExpiry: 'Mar 2028' },
  { name: 'Okta SSO', riskScore: 45, riskLevel: 'medium', category: 'Identity', lastAssessed: '5d ago', issues: ['Past breach 2023', 'Pending MFA update'], breachHistory: 1, complianceStatus: ['SOC2', 'ISO27001'], dataAccess: 'Auth/Identity Data', contractExpiry: 'Jun 2026' },
  { name: 'SolarWinds IT', riskScore: 78, riskLevel: 'high', category: 'IT Management', lastAssessed: '3d ago', issues: ['Supply chain attack history', 'Slow patching'], breachHistory: 2, complianceStatus: ['SOC2'], dataAccess: 'Network Monitoring', contractExpiry: 'Sep 2026' },
  { name: 'Legacy CRM Vendor', riskScore: 92, riskLevel: 'critical', category: 'SaaS', lastAssessed: '14d ago', issues: ['EOL software', 'No SOC2', 'Unencrypted API'], breachHistory: 3, complianceStatus: [], dataAccess: 'Customer PII', contractExpiry: 'Jan 2026' },
  { name: 'Vercel Hosting', riskScore: 18, riskLevel: 'low', category: 'Hosting', lastAssessed: '1d ago', issues: [], breachHistory: 0, complianceStatus: ['SOC2', 'GDPR'], dataAccess: 'App Deployment', contractExpiry: 'Nov 2027' },
  { name: 'Stripe Payments', riskScore: 12, riskLevel: 'low', category: 'Payments', lastAssessed: '1d ago', issues: [], breachHistory: 0, complianceStatus: ['SOC2', 'PCI-DSS', 'GDPR'], dataAccess: 'Payment Processing', contractExpiry: 'Apr 2028' },
  { name: 'Twilio Comms', riskScore: 55, riskLevel: 'medium', category: 'Communications', lastAssessed: '7d ago', issues: ['API key rotation overdue'], breachHistory: 1, complianceStatus: ['SOC2', 'ISO27001'], dataAccess: 'Contact Info', contractExpiry: 'Aug 2026' },
];

export default function SupplyChainRisk() {
  const [vendors] = useState<Vendor[]>(MOCK_VENDORS);
  const [filter, setFilter] = useState<string>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const critical = vendors.filter(v => v.riskLevel === 'critical').length;
  const high = vendors.filter(v => v.riskLevel === 'high').length;
  const avgScore = Math.round(vendors.reduce((a, b) => a + b.riskScore, 0) / vendors.length);

  const filtered = filter === 'all' ? vendors : vendors.filter(v => v.riskLevel === filter);
  const getRiskColor = (s: number) => s >= 80 ? '#ef4444' : s >= 60 ? '#f59e0b' : s >= 40 ? '#3b82f6' : '#22c55e';

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

        <div className="scr-filter-bar">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button key={f} className={`scr-filter-btn ${filter === f ? 'scr-filter-active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${vendors.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${vendors.filter(v => v.riskLevel === f).length})`}
            </button>
          ))}
        </div>

        <div className="scr-grid">
          {filtered.sort((a, b) => b.riskScore - a.riskScore).map((v, i) => (
            <div key={i} className="scr-vendor" onClick={() => setExpanded(expanded === v.name ? null : v.name)}>
              <div className="scr-vendor-header">
                <span className="scr-vendor-name">{v.name}</span>
                <div className={`scr-score scr-score-${v.riskLevel}`}>{v.riskScore}</div>
              </div>
              <div className="scr-risk-bar"><div className="scr-risk-fill" style={{ width: `${v.riskScore}%`, background: getRiskColor(v.riskScore) }} /></div>
              <div className="scr-meta" style={{ marginTop: '6px' }}>Category: <span>{v.category}</span> | Assessed: <span>{v.lastAssessed}</span> | Breaches: <span>{v.breachHistory}</span></div>
              {v.issues.length > 0 && (<div className="scr-issues">{v.issues.map((issue, j) => <span key={j} className="scr-issue">{issue}</span>)}</div>)}
              <div className="scr-compliance">
                {v.complianceStatus.length > 0 ? v.complianceStatus.map((c, j) => <span key={j} className="scr-comp-tag scr-comp-pass">{c}</span>) : <span className="scr-comp-tag scr-comp-fail">No Compliance</span>}
              </div>
              {expanded === v.name && (
                <div className="scr-detail">
                  <div className="scr-detail-row"><span className="scr-detail-label">Data Access Level</span><span className="scr-detail-value">{v.dataAccess}</span></div>
                  <div className="scr-detail-row"><span className="scr-detail-label">Contract Expiry</span><span className="scr-detail-value">{v.contractExpiry}</span></div>
                  <div className="scr-detail-row"><span className="scr-detail-label">Breach Count</span><span className="scr-detail-value" style={{ color: v.breachHistory > 0 ? '#fca5a5' : '#86efac' }}>{v.breachHistory}</span></div>
                  <div className="scr-detail-row" style={{ borderBottom: 'none' }}><span className="scr-detail-label">Recommendation</span><span className="scr-detail-value" style={{ color: '#a78bfa' }}>{v.riskScore >= 80 ? 'Replace vendor' : v.riskScore >= 60 ? 'Remediation required' : v.riskScore >= 40 ? 'Monitor closely' : 'Acceptable risk'}</span></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
