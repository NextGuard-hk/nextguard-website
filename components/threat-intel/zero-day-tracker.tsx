// components/threat-intel/zero-day-tracker.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: string;
}

const zdStyles = `
.zd-card { background: linear-gradient(135deg, #0f172a 0%, #2a1a1a 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #dc262644; position: relative; overflow: hidden; margin-bottom: 16px; }
.zd-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #dc2626, #ef4444, #f87171); }
.zd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
.zd-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #dc262622; border: 1px solid #dc262644; color: #dc2626; font-size: 10px; font-weight: 600; text-transform: uppercase; }
.zd-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #dc2626; animation: zdPulse 1s ease-in-out infinite; }
@keyframes zdPulse { 0%,100% { opacity:1; } 50% { opacity:0.2; } }
.zd-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 14px; }
.zd-stat { background: #12122a; border-radius: 8px; padding: 10px; text-align: center; border: 1px solid #2a2a4a; }
.zd-stat-num { font-size: 20px; font-weight: 700; color: #dc2626; }
.zd-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
.zd-vulns { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.zd-vuln { padding: 10px 12px; background: #12122a; border-radius: 8px; border: 1px solid #2a2a4a; }
.zd-vuln-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
.zd-vuln-name { color: #e0e0e0; font-size: 11px; font-weight: 600; }
.zd-cve-link { color: #60a5fa; text-decoration: none; font-size: 10px; font-family: monospace; }
.zd-cve-link:hover { text-decoration: underline; }
.zd-ransomware { padding: 2px 8px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; background: #dc262633; color: #ef4444; }
.zd-ransomware-no { background: #22c55e22; color: #22c55e; }
.zd-meta { font-size: 10px; color: #666; margin-top: 4px; }
.zd-loading { text-align: center; color: #666; padding: 40px; font-size: 13px; }
.zd-src { font-size: 9px; color: #555; text-align: right; margin-top: 8px; }
@media (max-width: 480px) { .zd-stats { grid-template-columns: repeat(2, 1fr); } }
`;

export default function ZeroDayTracker() {
  const [vulns, setVulns] = useState<KEVEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json')
      .then(r => r.json())
      .then(data => {
        const sorted = (data.vulnerabilities || [])
          .sort((a: KEVEntry, b: KEVEntry) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
          .slice(0, 20);
        setVulns(sorted);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const ransomwareCount = vulns.filter(v => v.knownRansomwareCampaignUse === 'Known').length;
  const recentCount = vulns.filter(v => {
    const added = new Date(v.dateAdded);
    const week = new Date(); week.setDate(week.getDate() - 7);
    return added >= week;
  }).length;

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Today';
    if (days === 1) return '1d ago';
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  return (
    <>
      <style>{zdStyles}</style>
      <div className="zd-card">
        <div className="zd-header">
          <div>
            <h3 style={{ color: '#e0e0e0', margin: 0, fontSize: 15 }}>CISA Known Exploited Vulnerabilities</h3>
            <p style={{ color: '#888', fontSize: 11, margin: '4px 0 0' }}>Real-time data from CISA KEV Catalog</p>
          </div>
          <span className="zd-badge"><span className="pulse" /> LIVE</span>
        </div>

        <div className="zd-stats">
          <div className="zd-stat"><div className="zd-stat-num">{vulns.length}</div><div className="zd-stat-label">Latest KEVs</div></div>
          <div className="zd-stat"><div className="zd-stat-num">{recentCount}</div><div className="zd-stat-label">Added This Week</div></div>
          <div className="zd-stat"><div className="zd-stat-num">{ransomwareCount}</div><div className="zd-stat-label">Ransomware</div></div>
          <div className="zd-stat"><div className="zd-stat-num">24/7</div><div className="zd-stat-label">Monitoring</div></div>
        </div>

        {loading ? (
          <div className="zd-loading">Loading CISA KEV data...</div>
        ) : error ? (
          <div className="zd-loading" style={{ color: '#ef4444' }}>{error}</div>
        ) : (
          <div className="zd-vulns">
            {vulns.map(v => (
              <div key={v.cveID} className="zd-vuln">
                <div className="zd-vuln-header">
                  <span className="zd-vuln-name">{v.vulnerabilityName}</span>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <a href={`https://nvd.nist.gov/vuln/detail/${v.cveID}`} target="_blank" rel="noopener noreferrer" className="zd-cve-link">{v.cveID}</a>
                    <span className={`zd-ransomware ${v.knownRansomwareCampaignUse !== 'Known' ? 'zd-ransomware-no' : ''}`}>
                      {v.knownRansomwareCampaignUse === 'Known' ? 'Ransomware' : 'No Ransomware'}
                    </span>
                  </div>
                </div>
                <div className="zd-meta">
                  {v.vendorProject} {v.product} | Added: {timeAgo(v.dateAdded)} | Due: {v.dueDate}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="zd-src">Source: CISA Known Exploited Vulnerabilities Catalog</div>
      </div>
    </>
  );
}
