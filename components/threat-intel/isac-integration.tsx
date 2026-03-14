// components/threat-intel/isac-integration.tsx
'use client';
import React, { useState } from 'react';

interface ISACFeed {
  id: string;
  name: string;
  type: 'isac' | 'cert' | 'government' | 'commercial';
  status: 'connected' | 'syncing' | 'error' | 'pending';
  lastSync: string;
  iocCount: number;
  sharedCount: number;
  trustLevel: 'high' | 'medium' | 'low';
  sector: string;
}

interface SharedIndicator {
  id: string;
  ioc: string;
  type: string;
  source: string;
  direction: 'received' | 'shared';
  timestamp: string;
  tlp: 'RED' | 'AMBER' | 'GREEN' | 'WHITE';
}

const isacStyles = `
.isac-card {
  background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%);
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #3b82f644;
  position: relative;
  overflow: hidden;
  margin-bottom: 16px;
}
.isac-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  background: linear-gradient(90deg, #3b82f6, #06b6d4, #8b5cf6);
}
.isac-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.isac-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 20px;
  background: #3b82f622;
  border: 1px solid #3b82f644;
  color: #3b82f6;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
}
.isac-badge .pulse {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #3b82f6;
  animation: isacPulse 2s ease-in-out infinite;
}
@keyframes isacPulse {
  0%,100% { opacity:1; } 50% { opacity:0.3; }
}
.isac-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}
.isac-stat {
  background: #12122a;
  border-radius: 8px;
  padding: 10px;
  text-align: center;
  border: 1px solid #2a2a4a;
}
.isac-stat-num {
  font-size: 20px;
  font-weight: 700;
  color: #3b82f6;
}
.isac-stat-label {
  font-size: 9px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 2px;
}
.isac-feeds {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.isac-feed {
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
.isac-feed-name {
  color: #e0e0e0;
  font-size: 11px;
  font-weight: 600;
}
.isac-feed-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.isac-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}
.isac-status-connected { background: #22c55e22; color: #22c55e; }
.isac-status-syncing { background: #3b82f622; color: #60a5fa; }
.isac-status-error { background: #ef444422; color: #ef4444; }
.isac-status-pending { background: #64748b22; color: #94a3b8; }
.isac-tlp {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 8px;
  font-weight: 700;
}
.isac-tlp-RED { background: #ef444433; color: #ef4444; }
.isac-tlp-AMBER { background: #f59e0b33; color: #f59e0b; }
.isac-tlp-GREEN { background: #22c55e33; color: #22c55e; }
.isac-tlp-WHITE { background: #e2e8f033; color: #e2e8f0; }
.isac-indicators {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 14px;
}
.isac-indicator {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background: #12122a;
  border-radius: 6px;
  border: 1px solid #2a2a4a;
  font-size: 10px;
  flex-wrap: wrap;
  gap: 4px;
}
.isac-dir-received { color: #22c55e; }
.isac-dir-shared { color: #3b82f6; }
@media (max-width: 480px) {
  .isac-stats { grid-template-columns: repeat(2, 1fr); }
}
`;

const MOCK_FEEDS: ISACFeed[] = [
  { id: 'F-001', name: 'FS-ISAC (Financial)', type: 'isac', status: 'connected', lastSync: '2 min ago', iocCount: 12450, sharedCount: 342, trustLevel: 'high', sector: 'Financial Services' },
  { id: 'F-002', name: 'HKCERT', type: 'cert', status: 'connected', lastSync: '5 min ago', iocCount: 8920, sharedCount: 128, trustLevel: 'high', sector: 'Government' },
  { id: 'F-003', name: 'US-CERT / CISA', type: 'government', status: 'syncing', lastSync: '15 min ago', iocCount: 45600, sharedCount: 0, trustLevel: 'high', sector: 'Government' },
  { id: 'F-004', name: 'APAC Threat Alliance', type: 'commercial', status: 'connected', lastSync: '8 min ago', iocCount: 23100, sharedCount: 567, trustLevel: 'medium', sector: 'Multi-Sector' },
  { id: 'F-005', name: 'Health-ISAC', type: 'isac', status: 'pending', lastSync: 'Never', iocCount: 0, sharedCount: 0, trustLevel: 'medium', sector: 'Healthcare' },
];

const MOCK_INDICATORS: SharedIndicator[] = [
  { id: 'SI-001', ioc: '185.220.101.42', type: 'IPv4', source: 'FS-ISAC', direction: 'received', timestamp: '14:20', tlp: 'AMBER' },
  { id: 'SI-002', ioc: 'evil-payload.exe', type: 'File Hash', source: 'NextGuard', direction: 'shared', timestamp: '14:15', tlp: 'GREEN' },
  { id: 'SI-003', ioc: 'c2.malware-domain.com', type: 'Domain', source: 'HKCERT', direction: 'received', timestamp: '14:10', tlp: 'RED' },
  { id: 'SI-004', ioc: 'CVE-2026-1234', type: 'CVE', source: 'US-CERT', direction: 'received', timestamp: '13:50', tlp: 'WHITE' },
  { id: 'SI-005', ioc: '10.0.0.0/8 scan pattern', type: 'Pattern', source: 'NextGuard', direction: 'shared', timestamp: '13:40', tlp: 'GREEN' },
];

export default function ISACIntegration() {
  const [tab, setTab] = useState<'feeds' | 'shared'>('feeds');
  const totalIOCs = MOCK_FEEDS.reduce((a, b) => a + b.iocCount, 0);
  const totalShared = MOCK_FEEDS.reduce((a, b) => a + b.sharedCount, 0);
  const connectedFeeds = MOCK_FEEDS.filter(f => f.status === 'connected').length;

  return (
    <>
      <style>{isacStyles}</style>
      <div className="isac-card">
        <div className="isac-header">
          <div>
            <h3 style={{ color: '#e0e0e0', fontSize: 15, fontWeight: 700, margin: '0 0 4px 0' }}>ISAC / TAXII Sharing Hub</h3>
            <p style={{ color: '#888', fontSize: 11, margin: 0 }}>Real-time Threat Intelligence Sharing Network</p>
          </div>
          <span className="isac-badge"><span className="pulse" /> STIX/TAXII 2.1</span>
        </div>

        <div className="isac-stats">
          <div className="isac-stat"><div className="isac-stat-num">{connectedFeeds}</div><div className="isac-stat-label">Connected</div></div>
          <div className="isac-stat"><div className="isac-stat-num">{(totalIOCs / 1000).toFixed(1)}K</div><div className="isac-stat-label">IOCs Recv</div></div>
          <div className="isac-stat"><div className="isac-stat-num">{totalShared}</div><div className="isac-stat-label">Shared</div></div>
          <div className="isac-stat"><div className="isac-stat-num" style={{ color: '#22c55e' }}>99.2%</div><div className="isac-stat-label">Uptime</div></div>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['feeds', 'shared'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid', borderColor: tab === t ? '#3b82f6' : '#333', background: tab === t ? '#3b82f622' : 'transparent', color: tab === t ? '#3b82f6' : '#888', fontSize: 10, cursor: 'pointer', fontWeight: 600 }}>
              {t === 'feeds' ? 'Partner Feeds' : 'Shared Indicators'}
            </button>
          ))}
        </div>

        {tab === 'feeds' && (
          <div className="isac-feeds">
            {MOCK_FEEDS.map(feed => (
              <div key={feed.id} className="isac-feed">
                <div>
                  <div className="isac-feed-name">{feed.name}</div>
                  <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{feed.sector} | {feed.iocCount.toLocaleString()} IOCs | Shared: {feed.sharedCount} | Sync: {feed.lastSync}</div>
                </div>
                <div className="isac-feed-meta">
                  <span className={`isac-status isac-status-${feed.status}`}>{feed.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'shared' && (
          <div className="isac-indicators">
            {MOCK_INDICATORS.map(ind => (
              <div key={ind.id} className="isac-indicator">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className={`isac-dir-${ind.direction}`} style={{ fontSize: 9, fontWeight: 700 }}>{ind.direction === 'received' ? '\u2193 RECV' : '\u2191 SENT'}</span>
                  <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontSize: 10 }}>{ind.ioc}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{ind.type}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <span className={`isac-tlp isac-tlp-${ind.tlp}`}>TLP:{ind.tlp}</span>
                  <span style={{ color: '#666', fontSize: 9 }}>{ind.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
