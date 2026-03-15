// components/threat-intel/secure-url-intel.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface SecureURLEntry {
  url: string;
  domain: string;
  status: 'safe' | 'malicious' | 'suspicious' | 'unknown';
  sslValid: boolean;
  sslIssuer: string;
  sslExpiry: string;
  redirectChain: string[];
  finalDestination: string;
  contentType: string;
  reputation: number;
  firstSeen: string;
  lastScanned: string;
  scanEngine: string[];
  phishingScore: number;
  malwareScore: number;
  source: 'web-proxy' | 'email-gateway' | 'api-scan';
  policyAction: 'allow' | 'block' | 'warn' | 'sandbox';
  category: string;
  threatFamily?: string;
}

const mockSecureURLs: SecureURLEntry[] = [
  { url: 'https://login.microsoftonline.com/oauth2/authorize', domain: 'microsoftonline.com', status: 'safe', sslValid: true, sslIssuer: 'DigiCert Inc', sslExpiry: '2026-08-15', redirectChain: [], finalDestination: 'https://login.microsoftonline.com/oauth2/authorize', contentType: 'text/html', reputation: 99, firstSeen: '2019-01-15', lastScanned: '2 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'Google Safe Browsing'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow', category: 'Business / SaaS' },
  { url: 'https://secure-login-msft.phishsite.cc/oauth', domain: 'phishsite.cc', status: 'malicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-06-01', redirectChain: ['https://bit.ly/3xABC', 'https://redir.phishsite.cc/go'], finalDestination: 'https://secure-login-msft.phishsite.cc/oauth', contentType: 'text/html', reputation: 2, firstSeen: '2 hours ago', lastScanned: '5 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'PhishTank'], phishingScore: 97, malwareScore: 12, source: 'email-gateway', policyAction: 'block', category: 'Phishing', threatFamily: 'O365-BEC' },
  { url: 'https://download.suspicious-sw.xyz/update.exe', domain: 'suspicious-sw.xyz', status: 'malicious', sslValid: false, sslIssuer: 'Self-Signed', sslExpiry: 'N/A', redirectChain: ['https://cdn-mirror.suspicious-sw.xyz/r'], finalDestination: 'https://download.suspicious-sw.xyz/update.exe', contentType: 'application/octet-stream', reputation: 5, firstSeen: '6 hours ago', lastScanned: '10 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'ClamAV'], phishingScore: 15, malwareScore: 94, source: 'web-proxy', policyAction: 'block', category: 'Malware / C2', threatFamily: 'Dropper' },
  { url: 'https://new-startup-site.io/about', domain: 'new-startup-site.io', status: 'unknown', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-09-20', redirectChain: [], finalDestination: 'https://new-startup-site.io/about', contentType: 'text/html', reputation: 40, firstSeen: '1 day ago', lastScanned: '30 min ago', scanEngine: ['NextGuard AI'], phishingScore: 25, malwareScore: 10, source: 'web-proxy', policyAction: 'warn', category: 'Uncategorized' },
  { url: 'https://drive.google.com/file/d/shared-doc', domain: 'google.com', status: 'safe', sslValid: true, sslIssuer: 'Google Trust Services', sslExpiry: '2026-12-01', redirectChain: [], finalDestination: 'https://drive.google.com/file/d/shared-doc', contentType: 'text/html', reputation: 99, firstSeen: '2010-03-01', lastScanned: '1 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'Google Safe Browsing'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow', category: 'Business / SaaS' },
  { url: 'https://payment-gateway.ransom-pay.ru/btc', domain: 'ransom-pay.ru', status: 'malicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-04-10', redirectChain: ['https://tor2web.proxy/redirect'], finalDestination: 'https://payment-gateway.ransom-pay.ru/btc', contentType: 'text/html', reputation: 1, firstSeen: '4 hours ago', lastScanned: '15 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'AlienVault OTX'], phishingScore: 45, malwareScore: 88, source: 'api-scan', policyAction: 'block', category: 'Ransomware Infrastructure', threatFamily: 'LockBit' },
  { url: 'https://docs.github.com/en/rest', domain: 'github.com', status: 'safe', sslValid: true, sslIssuer: 'DigiCert Inc', sslExpiry: '2026-11-15', redirectChain: [], finalDestination: 'https://docs.github.com/en/rest', contentType: 'text/html', reputation: 99, firstSeen: '2015-06-01', lastScanned: '3 min ago', scanEngine: ['VirusTotal', 'NextGuard AI'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow', category: 'Business / SaaS' },
  { url: 'https://free-gift-card.scam.net/claim-now', domain: 'scam.net', status: 'suspicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-07-05', redirectChain: ['https://t.co/abc123', 'https://redirect.scam.net/go'], finalDestination: 'https://free-gift-card.scam.net/claim-now', contentType: 'text/html', reputation: 15, firstSeen: '12 hours ago', lastScanned: '20 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'PhishTank'], phishingScore: 82, malwareScore: 18, source: 'email-gateway', policyAction: 'sandbox', category: 'Spam / Scam', threatFamily: 'PrizeFraud' },
];
const styles = `
  .sui-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-radius: 12px; }
  .sui-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
  .sui-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0; }
  .sui-subtitle { font-size: 13px; color: #888; margin-top: 4px; }
  .sui-shared-note { background: linear-gradient(135deg, #1a1a3e 0%, #0d1a2e 100%); border: 1px solid #6366f1; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .sui-shared-title { font-size: 13px; font-weight: 600; color: #a5b4fc; margin-bottom: 6px; }
  .sui-shared-desc { font-size: 12px; color: #888; line-height: 1.5; }
  .sui-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .sui-stat { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 14px 16px; }
  .sui-stat-value { font-size: 22px; font-weight: 700; }
  .sui-stat-label { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .sui-scan-input { display: flex; gap: 8px; margin-bottom: 20px; }
  .sui-scan-input input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2a4a; background: #12122a; color: #fff; font-size: 13px; outline: none; }
  .sui-scan-input input:focus { border-color: #6366f1; }
  .sui-scan-input button { padding: 10px 20px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
  .sui-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap; }
  .sui-filter-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid #2a2a4a; background: #12122a; color: #ccc; font-size: 11px; cursor: pointer; }
  .sui-filter-btn.active { background: #1a1a3e; border-color: #6366f1; color: #a5b4fc; }
  .sui-card { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; margin-bottom: 10px; overflow: hidden; cursor: pointer; }
  .sui-card:hover { border-color: #2a2a5a; }
  .sui-card-header { padding: 12px 16px; display: flex; align-items: center; gap: 10px; }
  .sui-status-icon { font-size: 14px; flex-shrink: 0; }
  .sui-card-url { font-size: 11px; font-family: monospace; color: #7c7caf; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sui-card-badges { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
  .sui-badge { padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .sui-detail { padding: 12px 16px; border-top: 1px solid #1a1a2e; }
  .sui-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .sui-detail-item { font-size: 11px; }
  .sui-detail-label { color: #555; display: block; margin-bottom: 2px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
  .sui-detail-value { color: #ccc; }
  .sui-score-bar { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .sui-score-track { flex: 1; height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden; }
  .sui-score-fill { height: 100%; border-radius: 2px; }
  .sui-redirect { background: #0a0a1a; border-radius: 6px; padding: 8px 12px; margin-top: 8px; border: 1px solid #1a1a2e; }
  .sui-redirect-title { font-size: 10px; color: #666; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px; }
  .sui-redirect-step { font-size: 10px; font-family: monospace; color: #f97316; padding: 2px 0; }
  .sui-redirect-final { font-size: 10px; font-family: monospace; color: '#22c55e'; padding: 2px 0; }
  .sui-engines { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .sui-engine-tag { padding: 1px 6px; border-radius: 3px; font-size: 9px; background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .sui-threat-family { padding: 1px 6px; border-radius: 3px; font-size: 9px; background: rgba(239,68,68,0.1); color: #f87171; border: 1px solid rgba(239,68,68,0.2); }
  .sui-scan-result { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .sui-scan-result-danger { border-color: #ef4444; }
  .sui-scan-result-warn { border-color: #eab308; }
  .sui-scan-result-safe { border-color: #22c55e; }
`;
const statusColor: Record<string, string> = { safe: '#22c55e', malicious: '#ef4444', suspicious: '#eab308', unknown: '#9ca3af' };
const statusBg: Record<string, string> = { safe: 'rgba(34,197,94,0.1)', malicious: 'rgba(239,68,68,0.1)', suspicious: 'rgba(234,179,8,0.1)', unknown: 'rgba(156,163,175,0.1)' };
const actionColor: Record<string, string> = { allow: '#22c55e', block: '#ef4444', warn: '#eab308', sandbox: '#a855f7' };
const actionBg: Record<string, string> = { allow: 'rgba(34,197,94,0.1)', block: 'rgba(239,68,68,0.1)', warn: 'rgba(234,179,8,0.1)', sandbox: 'rgba(168,85,247,0.1)' };
const statusIcon: Record<string, string> = { safe: '\u2705', malicious: '\ud83d\udea8', suspicious: '\u26a0\ufe0f', unknown: '\u2753' };
const sourceColor: Record<string, string> = { 'web-proxy': '#06b6d4', 'email-gateway': '#a855f7', 'api-scan': '#6366f1' };
const sourceBg: Record<string, string> = { 'web-proxy': 'rgba(6,182,212,0.1)', 'email-gateway': 'rgba(168,85,247,0.1)', 'api-scan': 'rgba(99,102,241,0.1)' };

export default function SecureURLIntel() {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<SecureURLEntry | null>(null);
  const [scanChecked, setScanChecked] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [scanPulse, setScanPulse] = useState(true);

  useEffect(() => {
    const t = setInterval(() => setScanPulse(p => !p), 2500);
    return () => clearInterval(t);
  }, []);

  const handleScan = () => {
    const found = mockSecureURLs.find(u =>
      u.domain.toLowerCase().includes(scanInput.toLowerCase()) ||
      u.url.toLowerCase().includes(scanInput.toLowerCase())
    );
    setScanResult(found || null);
    setScanChecked(true);
  };

  const sourceLabel = (s: string) => s === 'web-proxy' ? 'Web Proxy' : s === 'email-gateway' ? 'Email GW' : 'API Scan';
  const scoreColor = (v: number) => v >= 80 ? '#ef4444' : v >= 50 ? '#f97316' : v >= 20 ? '#eab308' : '#22c55e';

  const filtered = mockSecureURLs.filter(e => {
    const stOk = statusFilter === 'all' || e.status === statusFilter;
    const srcOk = sourceFilter === 'all' || e.source === sourceFilter;
    return stOk && srcOk;
  });

  const safeCount = mockSecureURLs.filter(e => e.status === 'safe').length;
  const malCount = mockSecureURLs.filter(e => e.status === 'malicious').length;
  const susCount = mockSecureURLs.filter(e => e.status === 'suspicious').length;
  const unkCount = mockSecureURLs.filter(e => e.status === 'unknown').length;
  const blockedCount = mockSecureURLs.filter(e => e.policyAction === 'block').length;

  return (
    <div className="sui-container">
      <style>{styles}</style>
      <div className="sui-header">
        <div>
          <h3 className="sui-title">Secure URL Intelligence</h3>
          <div className="sui-subtitle">Real-time URL security verification for Web Proxy &amp; Email Gateway</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: scanPulse ? '#22c55e' : '#16a34a', display: 'inline-block', transition: 'background 0.5s' }}></span>
          <span style={{ fontSize: 11, color: '#888' }}>Real-time Scanning</span>
        </div>
      </div>

      <div className="sui-shared-note">
        <div className="sui-shared-title">Unified URL Security Engine</div>
        <div className="sui-shared-desc">Every URL passing through NextGuard Web Proxy and Email Gateway is scanned in real-time. SSL certificates, redirect chains, reputation scores, and content analysis ensure accurate threat detection. Misclassification directly impacts all traffic enforcement.</div>
      </div>

      <div className="sui-stats">
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#22c55e' }}>{safeCount}</div><div className="sui-stat-label">Safe URLs</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#ef4444' }}>{malCount}</div><div className="sui-stat-label">Malicious</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#eab308' }}>{susCount}</div><div className="sui-stat-label">Suspicious</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#9ca3af' }}>{unkCount}</div><div className="sui-stat-label">Unknown</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#ef4444' }}>{blockedCount}</div><div className="sui-stat-label">Blocked</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{ color: '#6366f1' }}>{mockSecureURLs.length}</div><div className="sui-stat-label">Total Scanned</div></div>
      </div>

      <div className="sui-scan-input">
        <input placeholder="Scan URL for security analysis (e.g., phishsite.cc, ransom-pay.ru)" value={scanInput}
          onChange={e => setScanInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan()} />
        <button onClick={handleScan}>Scan URL</button>
      </div>
      {scanChecked && (
        <div className={`sui-scan-result ${scanResult ? (scanResult.reputation < 30 ? 'sui-scan-result-danger' : scanResult.reputation < 60 ? 'sui-scan-result-warn' : 'sui-scan-result-safe') : 'sui-scan-result-warn'}`}>
          {scanResult ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>{statusIcon[scanResult.status]}</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{scanResult.domain}</span>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <span className="sui-badge" style={{ color: statusColor[scanResult.status], background: statusBg[scanResult.status] }}>{scanResult.status}</span>
                  <span className="sui-badge" style={{ color: actionColor[scanResult.policyAction], background: actionBg[scanResult.policyAction] }}>{scanResult.policyAction}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c7caf', marginBottom: 10 }}>{scanResult.url}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: '#555' }}>SSL: </span><span style={{ color: scanResult.sslValid ? '#22c55e' : '#ef4444' }}>{scanResult.sslValid ? 'Valid' : 'Invalid'} ({scanResult.sslIssuer})</span></div>
                <div><span style={{ color: '#555' }}>Reputation: </span><span style={{ color: scanResult.reputation > 70 ? '#22c55e' : scanResult.reputation > 30 ? '#eab308' : '#ef4444', fontWeight: 700 }}>{scanResult.reputation}/100</span></div>
                <div><span style={{ color: '#555' }}>Content: </span><span style={{ color: '#ccc' }}>{scanResult.contentType}</span></div>
                <div><span style={{ color: '#555' }}>Phishing: </span><span style={{ color: scoreColor(scanResult.phishingScore) }}>{scanResult.phishingScore}%</span></div>
                <div><span style={{ color: '#555' }}>Malware: </span><span style={{ color: scoreColor(scanResult.malwareScore) }}>{scanResult.malwareScore}%</span></div>
                <div><span style={{ color: '#555' }}>Source: </span><span style={{ color: '#ccc' }}>{sourceLabel(scanResult.source)}</span></div>
              </div>
              {scanResult.redirectChain.length > 0 && (
                <div className="sui-redirect">
                  <div className="sui-redirect-title">Redirect Chain ({scanResult.redirectChain.length} hops)</div>
                  {scanResult.redirectChain.map((r, i) => <div key={i} className="sui-redirect-step">{i + 1}. {r}</div>)}
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#22c55e', paddingTop: 2 }}>{scanResult.redirectChain.length + 1}. {scanResult.finalDestination} (final)</div>
                </div>
              )}
              <div className="sui-engines" style={{ marginTop: 8 }}>
                {scanResult.scanEngine.map(e => <span key={e} className="sui-engine-tag">{e}</span>)}
                {scanResult.threatFamily && <span className="sui-threat-family">{scanResult.threatFamily}</span>}
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: '#eab308', marginBottom: 4 }}>URL Not in Database</div>
              <div style={{ fontSize: 12, color: '#888' }}>Submitting for real-time analysis...</div>
            </div>
          )}
        </div>
      )}

      <div className="sui-filters">
        {['all', 'safe', 'malicious', 'suspicious', 'unknown'].map(s => (
          <button key={s} className={`sui-filter-btn ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
        <span style={{ borderLeft: '1px solid #2a2a4a', margin: '0 4px' }}></span>
        {['all', 'web-proxy', 'email-gateway', 'api-scan'].map(s => (
          <button key={s} className={`sui-filter-btn ${sourceFilter === s ? 'active' : ''}`} onClick={() => setSourceFilter(s)}>
            {s === 'all' ? 'All Sources' : sourceLabel(s)}
          </button>
        ))}
      </div>

      {filtered.map(entry => (
        <div key={entry.url} className="sui-card" onClick={() => setExpandedUrl(expandedUrl === entry.url ? null : entry.url)}>
          <div className="sui-card-header">
            <span className="sui-status-icon">{statusIcon[entry.status]}</span>
            <span className="sui-card-url">{entry.url}</span>
            <div className="sui-card-badges">
              <span className="sui-badge" style={{ color: entry.sslValid ? '#22c55e' : '#ef4444', background: entry.sslValid ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)' }}>{entry.sslValid ? 'SSL OK' : 'SSL FAIL'}</span>
              <span className="sui-badge" style={{ color: sourceColor[entry.source], background: sourceBg[entry.source] }}>{sourceLabel(entry.source)}</span>
              <span className="sui-badge" style={{ color: statusColor[entry.status], background: statusBg[entry.status] }}>{entry.status}</span>
              <span className="sui-badge" style={{ color: actionColor[entry.policyAction], background: actionBg[entry.policyAction] }}>{entry.policyAction}</span>
            </div>
          </div>
          {expandedUrl === entry.url && (
            <div className="sui-detail">
              <div className="sui-detail-grid">
                <div className="sui-detail-item"><span className="sui-detail-label">Domain</span><span className="sui-detail-value">{entry.domain}</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">SSL Certificate</span><span className="sui-detail-value" style={{ color: entry.sslValid ? '#22c55e' : '#ef4444' }}>{entry.sslValid ? 'Valid' : 'Invalid'} - {entry.sslIssuer} (exp: {entry.sslExpiry})</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">Content Type</span><span className="sui-detail-value">{entry.contentType}</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">Reputation</span><span className="sui-detail-value" style={{ color: entry.reputation > 70 ? '#22c55e' : entry.reputation > 30 ? '#eab308' : '#ef4444', fontWeight: 700 }}>{entry.reputation}/100</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">Category</span><span className="sui-detail-value">{entry.category}</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">First Seen</span><span className="sui-detail-value">{entry.firstSeen}</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">Last Scanned</span><span className="sui-detail-value">{entry.lastScanned}</span></div>
                <div className="sui-detail-item"><span className="sui-detail-label">Source</span><span className="sui-detail-value">{sourceLabel(entry.source)}</span></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div><span style={{ fontSize: 10, color: '#555' }}>Phishing Score</span>
                  <div className="sui-score-bar"><div className="sui-score-track"><div className="sui-score-fill" style={{ width: `${entry.phishingScore}%`, background: scoreColor(entry.phishingScore) }}></div></div><span style={{ fontSize: 10, color: scoreColor(entry.phishingScore) }}>{entry.phishingScore}%</span></div>
                </div>
                <div><span style={{ fontSize: 10, color: '#555' }}>Malware Score</span>
                  <div className="sui-score-bar"><div className="sui-score-track"><div className="sui-score-fill" style={{ width: `${entry.malwareScore}%`, background: scoreColor(entry.malwareScore) }}></div></div><span style={{ fontSize: 10, color: scoreColor(entry.malwareScore) }}>{entry.malwareScore}%</span></div>
                </div>
              </div>
              {entry.redirectChain.length > 0 && (
                <div className="sui-redirect">
                  <div className="sui-redirect-title">Redirect Chain ({entry.redirectChain.length} hops)</div>
                  {entry.redirectChain.map((r, i) => <div key={i} className="sui-redirect-step">{i + 1}. {r}</div>)}
                  <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#22c55e', paddingTop: 2 }}>{entry.redirectChain.length + 1}. {entry.finalDestination} (final)</div>
                </div>
              )}
              <div className="sui-engines">
                {entry.scanEngine.map(e => <span key={e} className="sui-engine-tag">{e}</span>)}
                {entry.threatFamily && <span className="sui-threat-family">{entry.threatFamily}</span>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
