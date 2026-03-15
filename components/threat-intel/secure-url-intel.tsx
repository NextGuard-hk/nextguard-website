// components/threat-intel/secure-url-intel.tsx
// NextGuard Secure URL Intelligence Dashboard v2.0
// Real-time scanning via /api/v1/threat-intel/secure-scan & /lookup
// Shared enforcement: Web Proxy + Email Gateway + DNS Filter
'use client';

import React, { useState, useEffect } from 'react';

interface ScanResult {
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
  phishingScore: number;
  malwareScore: number;
  categories: string[];
  scanEngine: string[];
  source: string;
  policyAction: string;
  threatFamily?: string;
}

interface ScanResponse {
  success: boolean;
  scan: ScanResult;
  scan_ms: number;
  ioc_match: boolean;
  ioc_feeds: string[];
  shared_enforcement: { web_proxy: string; email_gateway: string; dns_filter: string };
}

const statusColor: Record<string, string> = { safe: '#22c55e', malicious: '#ef4444', suspicious: '#eab308', unknown: '#888' };
const statusBg: Record<string, string> = { safe: 'rgba(34,197,94,0.1)', malicious: 'rgba(239,68,68,0.1)', suspicious: 'rgba(234,179,8,0.1)', unknown: 'rgba(136,136,136,0.1)' };
const actionColor: Record<string, string> = { block: '#ef4444', allow: '#22c55e', warn: '#eab308' };

export default function SecureURLIntel() {
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResponse[]>([]);
  const [syncPulse, setSyncPulse] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setSyncPulse(p => !p), 3000);
    return () => clearInterval(t);
  }, []);

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    setScanning(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/threat-intel/secure-scan?url=${encodeURIComponent(scanInput.trim())}`);
      if (!res.ok) throw new Error(`Scan failed: ${res.status}`);
      const data: ScanResponse = await res.json();
      setResult(data);
      setScanHistory(prev => [data, ...prev].slice(0, 20));
    } catch (e: any) {
      setError(e.message);
      setResult(null);
    } finally {
      setScanning(false);
    }
  };

  const repColor = (r: number) => r >= 70 ? '#22c55e' : r >= 40 ? '#eab308' : '#ef4444';

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#0a0a0a', color: '#e0e0e0', padding: 24, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' as const, gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>Secure URL Intelligence</h3>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Real-time URL scanning — SSL, redirects, reputation & threat analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: syncPulse ? '#22c55e' : '#166534' }} />
          <span style={{ fontSize: 11, color: '#888' }}>Scanner Active</span>
        </div>
      </div>

      {/* Shared Enforcement Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a3e 0%, #0d1a2e 100%)', border: '1px solid #6366f1', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 8 }}>Shared Enforcement: Web Proxy + Email Gateway + DNS Filter</div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>
          Scan results are enforced across all NextGuard modules. A malicious verdict will trigger blocking on Web Proxy, Email Gateway, and DNS Filter simultaneously.
        </div>
      </div>

      {/* Scan Input */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input placeholder="Enter URL to scan (e.g., https://suspicious-site.xyz/login)" value={scanInput}
          onChange={e => setScanInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleScan()}
          style={{ flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #2a2a4a', background: '#12122a', color: '#fff', fontSize: 13, outline: 'none' }} />
        <button onClick={handleScan} disabled={scanning}
          style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: scanning ? '#4a4a6a' : '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {scanning ? 'Scanning...' : 'Scan URL'}
        </button>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#ef4444' }}>{error}</div>}

      {/* Scan Result */}
      {result && result.scan && (
        <div style={{ background: '#12122a', border: `1px solid ${statusColor[result.scan.status] || '#888'}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{result.scan.domain}</div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c7caf', marginTop: 4 }}>{result.scan.url}</div>
            </div>
            <div style={{ textAlign: 'right' as const }}>
              <span style={{ padding: '4px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' as const, background: statusBg[result.scan.status], color: statusColor[result.scan.status] }}>{result.scan.status}</span>
              <div style={{ fontSize: 10, color: '#555', marginTop: 4 }}>{result.scan_ms}ms</div>
            </div>
          </div>

          {/* Score Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, textAlign: 'center' as const, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: repColor(result.scan.reputation) }}>{result.scan.reputation}</div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' as const }}>Reputation</div>
            </div>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, textAlign: 'center' as const, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: result.scan.phishingScore > 50 ? '#ef4444' : '#22c55e' }}>{result.scan.phishingScore}</div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' as const }}>Phishing Score</div>
            </div>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, textAlign: 'center' as const, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: result.scan.malwareScore > 50 ? '#ef4444' : '#22c55e' }}>{result.scan.malwareScore}</div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' as const }}>Malware Score</div>
            </div>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, textAlign: 'center' as const, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: result.scan.sslValid ? '#22c55e' : '#ef4444' }}>{result.scan.sslValid ? '✓' : '✗'}</div>
              <div style={{ fontSize: 9, color: '#666', textTransform: 'uppercase' as const }}>SSL Valid</div>
            </div>
          </div>

          {/* Details Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 4, textTransform: 'uppercase' as const }}>Categories</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                {result.scan.categories.map(c => <span key={c} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}>{c}</span>)}
              </div>
            </div>
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 4, textTransform: 'uppercase' as const }}>Content Type</div>
              <div style={{ fontSize: 11, color: '#ccc' }}>{result.scan.contentType}</div>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 4, marginTop: 8, textTransform: 'uppercase' as const }}>Final Destination</div>
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#7c7caf', wordBreak: 'break-all' as const }}>{result.scan.finalDestination}</div>
            </div>
          </div>

          {/* Redirect Chain */}
          {result.scan.redirectChain.length > 0 && (
            <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, border: '1px solid #1e1e3a', marginBottom: 16 }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 8, textTransform: 'uppercase' as const }}>Redirect Chain ({result.scan.redirectChain.length} hops)</div>
              {result.scan.redirectChain.map((url, i) => (
                <div key={i} style={{ fontSize: 10, fontFamily: 'monospace', color: '#7c7caf', padding: '2px 0' }}>{i + 1}. {url}</div>
              ))}
              <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#22c55e', padding: '2px 0' }}>→ {result.scan.finalDestination}</div>
            </div>
          )}

          {/* Shared Enforcement */}
          <div style={{ background: '#0a0a1a', borderRadius: 8, padding: 12, border: '1px solid #1e1e3a', marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: '#555', marginBottom: 8, textTransform: 'uppercase' as const }}>Shared Enforcement Actions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {Object.entries(result.shared_enforcement).map(([module, action]) => (
                <div key={module} style={{ textAlign: 'center' as const }}>
                  <div style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>{module.replace('_', ' ').toUpperCase()}</div>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, background: `${actionColor[action] || '#888'}20`, color: actionColor[action] || '#888' }}>{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* IOC Match */}
          {result.ioc_match && (
            <div style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#ef4444', marginBottom: 4 }}>⚠ IOC Match Found</div>
              <div style={{ fontSize: 10, color: '#ccc' }}>Matched in feeds: {result.ioc_feeds.join(', ')}</div>
              {result.scan.threatFamily && <div style={{ fontSize: 10, color: '#f97316', marginTop: 4 }}>{result.scan.threatFamily}</div>}
            </div>
          )}

          {/* Scan Engines */}
          <div style={{ display: 'flex', gap: 4, marginTop: 12, flexWrap: 'wrap' as const }}>
            {result.scan.scanEngine.map(e => <span key={e} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(168,85,247,0.1)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.2)' }}>{e}</span>)}
          </div>
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && (
        <div style={{ background: '#12122a', borderRadius: 10, border: '1px solid #1e1e3a', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e3a', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const }}>Scan History ({scanHistory.length})</div>
          {scanHistory.map((h, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #0a0a1a', gap: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor[h.scan.status], flexShrink: 0 }} />
              <span style={{ fontSize: 11, flex: 1, fontFamily: 'monospace', color: '#7c7caf' }}>{h.scan.domain}</span>
              <span style={{ fontSize: 10, color: repColor(h.scan.reputation) }}>{h.scan.reputation}</span>
              <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, background: statusBg[h.scan.status], color: statusColor[h.scan.status] }}>{h.scan.status}</span>
              <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, background: `${actionColor[h.scan.policyAction] || '#888'}20`, color: actionColor[h.scan.policyAction] || '#888' }}>{h.scan.policyAction}</span>
              <span style={{ fontSize: 10, color: '#555' }}>{h.scan_ms}ms</span>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!result && !scanning && scanHistory.length === 0 && (
        <div style={{ background: '#12122a', borderRadius: 10, border: '1px solid #1e1e3a', padding: 40, textAlign: 'center' as const }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#fff', marginBottom: 8 }}>Enter a URL to Scan</div>
          <div style={{ fontSize: 12, color: '#888', maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
            The scanner will check SSL validity, follow redirect chains, analyze content type, check against IOC databases and URL categories, and determine enforcement actions for Web Proxy, Email Gateway, and DNS Filter.
          </div>
        </div>
      )}
    </div>
  );
}
