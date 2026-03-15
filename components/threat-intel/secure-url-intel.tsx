// components/threat-intel/secure-url-intel.tsx
'use client';

import React, { useState } from 'react';

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
}

const mockSecureURLs: SecureURLEntry[] = [
  { url: 'https://login.microsoftonline.com/oauth2/authorize', domain: 'microsoftonline.com', status: 'safe', sslValid: true, sslIssuer: 'DigiCert Inc', sslExpiry: '2026-08-15', redirectChain: [], finalDestination: 'https://login.microsoftonline.com/oauth2/authorize', contentType: 'text/html', reputation: 99, firstSeen: '2019-01-15', lastScanned: '2 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'Google Safe Browsing'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow' },
  { url: 'https://secure-login-msft.phishsite.cc/oauth', domain: 'phishsite.cc', status: 'malicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-06-01', redirectChain: ['https://bit.ly/3xABC', 'https://redir.phishsite.cc/go'], finalDestination: 'https://secure-login-msft.phishsite.cc/oauth', contentType: 'text/html', reputation: 2, firstSeen: '2 hours ago', lastScanned: '5 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'PhishTank'], phishingScore: 97, malwareScore: 12, source: 'email-gateway', policyAction: 'block' },
  { url: 'https://download.suspicious-sw.xyz/update.exe', domain: 'suspicious-sw.xyz', status: 'malicious', sslValid: false, sslIssuer: 'Self-Signed', sslExpiry: 'N/A', redirectChain: ['https://cdn-mirror.suspicious-sw.xyz/r'], finalDestination: 'https://download.suspicious-sw.xyz/update.exe', contentType: 'application/octet-stream', reputation: 5, firstSeen: '6 hours ago', lastScanned: '10 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'ClamAV'], phishingScore: 15, malwareScore: 94, source: 'web-proxy', policyAction: 'block' },
  { url: 'https://new-startup-site.io/about', domain: 'new-startup-site.io', status: 'unknown', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-09-20', redirectChain: [], finalDestination: 'https://new-startup-site.io/about', contentType: 'text/html', reputation: 40, firstSeen: '1 day ago', lastScanned: '30 min ago', scanEngine: ['NextGuard AI'], phishingScore: 25, malwareScore: 10, source: 'web-proxy', policyAction: 'warn' },
  { url: 'https://drive.google.com/file/d/shared-doc', domain: 'google.com', status: 'safe', sslValid: true, sslIssuer: 'Google Trust Services', sslExpiry: '2026-12-01', redirectChain: [], finalDestination: 'https://drive.google.com/file/d/shared-doc', contentType: 'text/html', reputation: 99, firstSeen: '2010-03-01', lastScanned: '1 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'Google Safe Browsing'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow' },
  { url: 'https://payment-gateway.ransom-pay.ru/btc', domain: 'ransom-pay.ru', status: 'malicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-04-10', redirectChain: ['https://tor2web.proxy/redirect'], finalDestination: 'https://payment-gateway.ransom-pay.ru/btc', contentType: 'text/html', reputation: 1, firstSeen: '4 hours ago', lastScanned: '15 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'AlienVault OTX'], phishingScore: 45, malwareScore: 88, source: 'api-scan', policyAction: 'block' },
  { url: 'https://docs.github.com/en/rest', domain: 'github.com', status: 'safe', sslValid: true, sslIssuer: 'DigiCert Inc', sslExpiry: '2026-11-15', redirectChain: [], finalDestination: 'https://docs.github.com/en/rest', contentType: 'text/html', reputation: 99, firstSeen: '2015-06-01', lastScanned: '3 min ago', scanEngine: ['VirusTotal', 'NextGuard AI'], phishingScore: 0, malwareScore: 0, source: 'web-proxy', policyAction: 'allow' },
  { url: 'https://free-gift-card.scam.net/claim-now', domain: 'scam.net', status: 'suspicious', sslValid: true, sslIssuer: "Let's Encrypt", sslExpiry: '2026-07-05', redirectChain: ['https://t.co/abc123', 'https://redirect.scam.net/go'], finalDestination: 'https://free-gift-card.scam.net/claim-now', contentType: 'text/html', reputation: 15, firstSeen: '12 hours ago', lastScanned: '20 min ago', scanEngine: ['VirusTotal', 'NextGuard AI', 'PhishTank'], phishingScore: 82, malwareScore: 18, source: 'email-gateway', policyAction: 'sandbox' },
];

const styles = `
  .sui-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-radius: 12px; }
  .sui-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
  .sui-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0; }
  .sui-subtitle { font-size: 13px; color: #888; margin-top: 4px; }
  .sui-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .sui-stat { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 16px; }
  .sui-stat-value { font-size: 24px; font-weight: 700; }
  .sui-stat-label { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .sui-scan-input { display: flex; gap: 8px; margin-bottom: 20px; }
  .sui-scan-input input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2a4a; background: #12122a; color: #fff; font-size: 13px; outline: none; }
  .sui-scan-input input:focus { border-color: #6366f1; }
  .sui-scan-input button { padding: 10px 20px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
  .sui-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .sui-filter-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #2a2a4a; background: #12122a; color: #ccc; font-size: 12px; cursor: pointer; transition: all 0.2s; }
  .sui-filter-btn:hover, .sui-filter-btn.active { background: #1a1a3e; border-color: #6366f1; color: #fff; }
  .sui-card { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; margin-bottom: 12px; overflow: hidden; transition: border-color 0.2s; cursor: pointer; }
  .sui-card:hover { border-color: #2a2a5a; }
  .sui-card-header { padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .sui-card-url { font-size: 12px; font-family: monospace; color: #8b8baf; word-break: break-all; flex: 1; }
  .sui-card-badges { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
  .sui-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .sui-badge-safe { background: rgba(34,197,94,0.15); color: #22c55e; }
  .sui-badge-malicious { background: rgba(239,68,68,0.15); color: #ef4444; }
  .sui-badge-suspicious { background: rgba(234,179,8,0.15); color: #eab308; }
  .sui-badge-unknown { background: rgba(156,163,175,0.15); color: #9ca3af; }
  .sui-badge-allow { background: rgba(34,197,94,0.15); color: #22c55e; }
  .sui-badge-block { background: rgba(239,68,68,0.15); color: #ef4444; }
  .sui-badge-warn { background: rgba(234,179,8,0.15); color: #eab308; }
  .sui-badge-sandbox { background: rgba(168,85,247,0.15); color: #a855f7; }
  .sui-badge-proxy { background: rgba(6,182,212,0.15); color: #06b6d4; }
  .sui-badge-email { background: rgba(168,85,247,0.15); color: #a855f7; }
  .sui-badge-api { background: rgba(99,102,241,0.15); color: #6366f1; }
  .sui-ssl-ok { color: #22c55e; }
  .sui-ssl-bad { color: #ef4444; }
  .sui-detail { padding: 0 16px 14px; border-top: 1px solid #1a1a2e; }
  .sui-detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
  .sui-detail-item { font-size: 11px; }
  .sui-detail-label { color: #666; display: block; margin-bottom: 2px; }
  .sui-detail-value { color: #ccc; }
  .sui-redirect { background: #0a0a1a; border-radius: 6px; padding: 8px 12px; margin-top: 8px; }
  .sui-redirect-title { font-size: 11px; color: #888; margin-bottom: 4px; }
  .sui-redirect-chain { font-size: 11px; font-family: monospace; color: #f97316; }
  .sui-engines { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 6px; }
  .sui-engine-tag { padding: 1px 6px; border-radius: 3px; font-size: 10px; background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .sui-score-bar { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
  .sui-score-track { flex: 1; height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden; }
  .sui-score-fill { height: 100%; border-radius: 2px; }
  .sui-score-label { font-size: 10px; color: #888; min-width: 28px; text-align: right; }
  .sui-shared-note { background: linear-gradient(135deg, #1a1a3e 0%, #12122a 100%); border: 1px solid #6366f1; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .sui-shared-title { font-size: 14px; font-weight: 600; color: #a5b4fc; margin-bottom: 6px; }
  .sui-shared-desc { font-size: 12px; color: #888; line-height: 1.5; }
`;

export default function SecureURLIntel() {
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState('');
  const [scanResult, setScanResult] = useState<SecureURLEntry | null>(null);
  const [scanChecked, setScanChecked] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const handleScan = () => {
    const found = mockSecureURLs.find(u =>
      u.domain.toLowerCase().includes(scanInput.toLowerCase()) ||
      u.url.toLowerCase().includes(scanInput.toLowerCase())
    );
    setScanResult(found || null);
    setScanChecked(true);
  };

  const sourceLabel = (s: string) => s === 'web-proxy' ? 'Web Proxy' : s === 'email-gateway' ? 'Email GW' : 'API Scan';
  const sourceClass = (s: string) => s === 'web-proxy' ? 'sui-badge-proxy' : s === 'email-gateway' ? 'sui-badge-email' : 'sui-badge-api';
  const statusIcon = (s: string) => s === 'safe' ? '\u2705' : s === 'malicious' ? '\ud83d\udea8' : s === 'suspicious' ? '\u26a0\ufe0f' : '\u2753';

  const filtered = mockSecureURLs.filter(e => {
    const stMatch = statusFilter === 'all' || e.status === statusFilter;
    const srcMatch = sourceFilter === 'all' || e.source === sourceFilter;
    return stMatch && srcMatch;
  });

  const safeCount = mockSecureURLs.filter(e => e.status === 'safe').length;
  const malCount = mockSecureURLs.filter(e => e.status === 'malicious').length;
  const susCount = mockSecureURLs.filter(e => e.status === 'suspicious').length;
  const unkCount = mockSecureURLs.filter(e => e.status === 'unknown').length;

  const scoreColor = (v: number) => v >= 80 ? '#ef4444' : v >= 50 ? '#f97316' : v >= 20 ? '#eab308' : '#22c55e';

  return (
    <div className="sui-container">
      <style>{styles}</style>
      <div className="sui-header">
        <div>
          <h3 className="sui-title">Secure URL Intelligence</h3>
          <div className="sui-subtitle">Real-time URL security verification for Web Proxy & Email Gateway</div>
        </div>
      </div>

      <div className="sui-shared-note">
        <div className="sui-shared-title">Unified URL Security Engine</div>
        <div className="sui-shared-desc">
          Every URL passing through NextGuard Web Proxy and Email Gateway is scanned in real-time.
          SSL certificates, redirect chains, reputation scores, and content analysis ensure accurate threat detection.
          Misclassification directly impacts all traffic enforcement — both HTTP/HTTPS browsing and email link protection.
        </div>
      </div>

      <div className="sui-stats">
        <div className="sui-stat"><div className="sui-stat-value" style={{color:'#22c55e'}}>{safeCount}</div><div className="sui-stat-label">Safe URLs</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{color:'#ef4444'}}>{malCount}</div><div className="sui-stat-label">Malicious</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{color:'#eab308'}}>{susCount}</div><div className="sui-stat-label">Suspicious</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{color:'#9ca3af'}}>{unkCount}</div><div className="sui-stat-label">Unknown</div></div>
        <div className="sui-stat"><div className="sui-stat-value" style={{color:'#06b6d4'}}>{mockSecureURLs.length}</div><div className="sui-stat-label">Total Scanned</div></div>
      </div>

      <div className="sui-scan-input">
        <input placeholder="Scan URL for security analysis (e.g., phishsite.cc)" value={scanInput} onChange={e => setScanInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} />
        <button onClick={handleScan}>Scan URL</button>
      </div>

      {scanChecked && (
        <div className={`sui-shared-note`} style={{borderColor: scanResult ? (scanResult.status === 'safe' ? '#22c55e' : scanResult.status === 'malicious' ? '#ef4444' : '#eab308') : '#eab308', marginBottom:20}}>
          {scanResult ? (
            <div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:15,fontWeight:700}}>{statusIcon(scanResult.status)} {scanResult.domain}</div>
                <div style={{display:'flex',gap:6}}>
                  <span className={`sui-badge sui-badge-${scanResult.status}`}>{scanResult.status}</span>
                  <span className={`sui-badge sui-badge-${scanResult.policyAction}`}>{scanResult.policyAction}</span>
                </div>
              </div>
              <div style={{fontSize:11,color:'#888',marginBottom:10,fontFamily:'monospace'}}>{scanResult.url}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,fontSize:11}}>
                <div><span style={{color:'#666'}}>SSL:</span> <span className={scanResult.sslValid ? 'sui-ssl-ok' : 'sui-ssl-bad'}>{scanResult.sslValid ? 'Valid' : 'Invalid'} ({scanResult.sslIssuer})</span></div>
                <div><span style={{color:'#666'}}>Reputation:</span> <span style={{color:scanResult.reputation > 70 ? '#22c55e' : scanResult.reputation > 30 ? '#eab308' : '#ef4444',fontWeight:700}}>{scanResult.reputation}/100</span></div>
                <div><span style={{color:'#666'}}>Content:</span> <span style={{color:'#ccc'}}>{scanResult.contentType}</span></div>
                <div><span style={{color:'#666'}}>Phishing:</span> <span style={{color:scoreColor(scanResult.phishingScore),fontWeight:700}}>{scanResult.phishingScore}%</span></div>
                <div><span style={{color:'#666'}}>Malware:</span> <span style={{color:scoreColor(scanResult.malwareScore),fontWeight:700}}>{scanResult.malwareScore}%</span></div>
                <div><span style={{color:'#666'}}>Source:</span> <span className={`sui-badge ${sourceClass(scanResult.source)}`}>{sourceLabel(scanResult.source)}</span></div>
              </div>
              {scanResult.redirectChain.length > 0 && (
                <div className="sui-redirect" style={{marginTop:8}}>
                  <div className="sui-redirect-title">Redirect Chain ({scanResult.redirectChain.length} hops)</div>
                  {scanResult.redirectChain.map((r,i) => <div key={i} className="sui-redirect-chain">{i+1}. {r}</div>)}
                  <div className="sui-redirect-chain" style={{color:'#ef4444'}}>{scanResult.redirectChain.length+1}. {scanResult.finalDestination} (final)</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:14,fontWeight:600,color:'#eab308'}}>URL Not in Database</div>
              <div style={{fontSize:12,color:'#888',marginTop:4}}>Submitting for real-time analysis...</div>
            </div>
          )}
        </div>
      )}

      <div className="sui-filters">
        <button className={`sui-filter-btn ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>All Status</button>
        <button className={`sui-filter-btn ${statusFilter === 'safe' ? 'active' : ''}`} onClick={() => setStatusFilter('safe')}>Safe</button>
        <button className={`sui-filter-btn ${statusFilter === 'malicious' ? 'active' : ''}`} onClick={() => setStatusFilter('malicious')}>Malicious</button>
        <button className={`sui-filter-btn ${statusFilter === 'suspicious' ? 'active' : ''}`} onClick={() => setStatusFilter('suspicious')}>Suspicious</button>
        <button className={`sui-filter-btn ${statusFilter === 'unknown' ? 'active' : ''}`} onClick={() => setStatusFilter('unknown')}>Unknown</button>
        <span style={{color:'#333',margin:'0 4px'}}>|</span>
        <button className={`sui-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>All Sources</button>
        <button className={`sui-filter-btn ${sourceFilter === 'web-proxy' ? 'active' : ''}`} onClick={() => setSourceFilter('web-proxy')}>Web Proxy</button>
        <button className={`sui-filter-btn ${sourceFilter === 'email-gateway' ? 'active' : ''}`} onClick={() => setSourceFilter('email-gateway')}>Email GW</button>
        <button className={`sui-filter-btn ${sourceFilter === 'api-scan' ? 'active' : ''}`} onClick={() => setSourceFilter('api-scan')}>API Scan</button>
      </div>

      {filtered.map(entry => (
        <div key={entry.url} className="sui-card" style={{borderColor: entry.status === 'malicious' ? 'rgba(239,68,68,0.3)' : entry.status === 'suspicious' ? 'rgba(234,179,8,0.3)' : undefined}} onClick={() => setExpandedUrl(expandedUrl === entry.url ? null : entry.url)}>
          <div className="sui-card-header">
            <div style={{fontSize:13,marginRight:8}}>{statusIcon(entry.status)}</div>
            <div className="sui-card-url">{entry.url}</div>
            <div className="sui-card-badges">
              <span className={entry.sslValid ? 'sui-ssl-ok' : 'sui-ssl-bad'} style={{fontSize:11}}>{entry.sslValid ? '\ud83d\udd12' : '\u26a0\ufe0f'}</span>
              <span className={`sui-badge ${sourceClass(entry.source)}`}>{sourceLabel(entry.source)}</span>
              <span className={`sui-badge sui-badge-${entry.status}`}>{entry.status}</span>
              <span className={`sui-badge sui-badge-${entry.policyAction}`}>{entry.policyAction}</span>
            </div>
          </div>
          {expandedUrl === entry.url && (
            <div className="sui-detail">
              <div className="sui-detail-grid">
                <div className="sui-detail-item">
                  <span className="sui-detail-label">Domain</span>
                  <span className="sui-detail-value">{entry.domain}</span>
                </div>
                <div className="sui-detail-item">
                  <span className="sui-detail-label">SSL Certificate</span>
                  <span className={`sui-detail-value ${entry.sslValid ? 'sui-ssl-ok' : 'sui-ssl-bad'}`}>{entry.sslValid ? 'Valid' : 'Invalid'} — {entry.sslIssuer} (exp: {entry.sslExpiry})</span>
                </div>
                <div className="sui-detail-item">
                  <span className="sui-detail-label">Content Type</span>
                  <span className="sui-detail-value">{entry.contentType}</span>
                </div>
                <div className="sui-detail-item">
                  <span className="sui-detail-label">Reputation Score</span>
                  <span className="sui-detail-value" style={{color:entry.reputation > 70 ? '#22c55e' : entry.reputation > 30 ? '#eab308' : '#ef4444', fontWeight:700}}>{entry.reputation}/100</span>
                </div>
                <div className="sui-detail-item">
                  <span className="sui-detail-label">First Seen</span>
                  <span className="sui-detail-value">{entry.firstSeen}</span>
                </div>
                <div className="sui-detail-item">
                  <span className="sui-detail-label">Last Scanned</span>
                  <span className="sui-detail-value">{entry.lastScanned}</span>
                </div>
              </div>
              <div style={{marginTop:10}}>
                <div style={{fontSize:11,color:'#666',marginBottom:4}}>Phishing Score</div>
                <div className="sui-score-bar"><div className="sui-score-track"><div className="sui-score-fill" style={{width:`${entry.phishingScore}%`,background:scoreColor(entry.phishingScore)}} /></div><div className="sui-score-label">{entry.phishingScore}%</div></div>
              </div>
              <div style={{marginTop:6}}>
                <div style={{fontSize:11,color:'#666',marginBottom:4}}>Malware Score</div>
                <div className="sui-score-bar"><div className="sui-score-track"><div className="sui-score-fill" style={{width:`${entry.malwareScore}%`,background:scoreColor(entry.malwareScore)}} /></div><div className="sui-score-label">{entry.malwareScore}%</div></div>
              </div>
              {entry.redirectChain.length > 0 && (
                <div className="sui-redirect">
                  <div className="sui-redirect-title">Redirect Chain ({entry.redirectChain.length} hops)</div>
                  {entry.redirectChain.map((r,i) => <div key={i} className="sui-redirect-chain">{i+1}. {r}</div>)}
                  <div className="sui-redirect-chain" style={{color:'#ef4444'}}>{entry.redirectChain.length+1}. {entry.finalDestination} (final)</div>
                </div>
              )}
              <div className="sui-engines">
                {entry.scanEngine.map(e => <span key={e} className="sui-engine-tag">{e}</span>)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
