// components/threat-intel/url-category-intel.tsx
'use client';

import React, { useState, useEffect } from 'react';

interface URLEntry {
  url: string;
  domain: string;
  category: string;
  subCategory: string;
  riskScore: number;
  action: 'allow' | 'block' | 'warn' | 'monitor';
  source: 'web-proxy' | 'email-gateway' | 'dns-filter';
  confidence: number;
  lastSeen: string;
  hitCount: number;
  tags: string[];
}

interface URLCategory {
  id: string;
  name: string;
  description: string;
  count: number;
  blocked: number;
  risk: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  color: string;
  proxyPolicy: 'block' | 'allow' | 'warn' | 'monitor';
  emailPolicy: 'block' | 'allow' | 'warn' | 'sandbox';
}

interface SyncEvent {
  time: string;
  event: string;
  affected: number;
  modules: string[];
  impact: 'critical' | 'high' | 'medium' | 'info';
}
const mockCategories: URLCategory[] = [
  { id: 'mal-c2', name: 'Malware / C2', description: 'Command & Control servers, malware distribution', count: 2847, blocked: 2847, risk: 'critical', color: '#ef4444', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'phish', name: 'Phishing / Credential Theft', description: 'Fake login pages, credential harvesting', count: 1923, blocked: 1923, risk: 'critical', color: '#ef4444', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'ransom', name: 'Ransomware Infrastructure', description: 'Payment portals, decryption services', count: 456, blocked: 456, risk: 'critical', color: '#dc2626', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'crypto', name: 'Cryptomining', description: 'Browser-based miners, pool servers', count: 312, blocked: 312, risk: 'high', color: '#f97316', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'spam', name: 'Spam / Scam', description: 'Prize scams, advance fee fraud, fake notifications', count: 5621, blocked: 4890, risk: 'high', color: '#f97316', proxyPolicy: 'warn', emailPolicy: 'block' },
  { id: 'adult', name: 'Adult Content', description: 'Explicit material, adult entertainment', count: 1245, blocked: 1245, risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'gambling', name: 'Gambling', description: 'Online casinos, sports betting, gambling sites', count: 892, blocked: 892, risk: 'medium', color: '#eab308', proxyPolicy: 'block', emailPolicy: 'block' },
  { id: 'social', name: 'Social Media', description: 'Social networks, messaging platforms', count: 15420, blocked: 0, risk: 'low', color: '#22c55e', proxyPolicy: 'allow', emailPolicy: 'allow' },
  { id: 'saas', name: 'Business / SaaS', description: 'Enterprise software, cloud productivity tools', count: 42180, blocked: 0, risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
  { id: 'news', name: 'News / Media', description: 'News sites, blogs, online publications', count: 8930, blocked: 0, risk: 'safe', color: '#06b6d4', proxyPolicy: 'allow', emailPolicy: 'allow' },
  { id: 'stream', name: 'Streaming / Entertainment', description: 'Video/audio streaming, gaming platforms', count: 6710, blocked: 340, risk: 'low', color: '#22c55e', proxyPolicy: 'monitor', emailPolicy: 'allow' },
  { id: 'uncat', name: 'Uncategorized', description: 'New or unknown domains pending AI classification', count: 1847, blocked: 423, risk: 'medium', color: '#eab308', proxyPolicy: 'warn', emailPolicy: 'sandbox' },
];
const mockURLEntries: URLEntry[] = [
  { url: 'https://malware-c2.evil.ru/beacon', domain: 'evil.ru', category: 'Malware / C2', subCategory: 'C2 Beacon', riskScore: 99, action: 'block', source: 'web-proxy', confidence: 98, lastSeen: '2 min ago', hitCount: 847, tags: ['APT29', 'cobalt-strike'] },
  { url: 'https://office365-login.phish.cc/auth', domain: 'phish.cc', category: 'Phishing / Credential Theft', subCategory: 'Credential Harvesting', riskScore: 97, action: 'block', source: 'email-gateway', confidence: 96, lastSeen: '5 min ago', hitCount: 1203, tags: ['O365-phish', 'BEC'] },
  { url: 'https://ransom-payment.ransom.io/btc', domain: 'ransom.io', category: 'Ransomware Infrastructure', subCategory: 'Payment Portal', riskScore: 99, action: 'block', source: 'web-proxy', confidence: 99, lastSeen: '12 min ago', hitCount: 23, tags: ['lockbit', 'ransomware'] },
  { url: 'https://coinhive.mining.xyz/worker.js', domain: 'mining.xyz', category: 'Cryptomining', subCategory: 'Browser Mining', riskScore: 78, action: 'block', source: 'web-proxy', confidence: 92, lastSeen: '1 hr ago', hitCount: 456, tags: ['cryptojacking'] },
  { url: 'https://free-gift-amazon.scam.net/claim', domain: 'scam.net', category: 'Spam / Scam', subCategory: 'Prize Scam', riskScore: 85, action: 'block', source: 'email-gateway', confidence: 94, lastSeen: '30 min ago', hitCount: 2341, tags: ['scam', 'social-engineering'] },
  { url: 'https://drive.google.com/file/d/shared', domain: 'google.com', category: 'Business / SaaS', subCategory: 'Cloud Storage', riskScore: 5, action: 'allow', source: 'web-proxy', confidence: 99, lastSeen: '1 min ago', hitCount: 18420, tags: ['trusted', 'saas'] },
  { url: 'https://github.com/nextguard-hk/repo', domain: 'github.com', category: 'Business / SaaS', subCategory: 'Developer Tools', riskScore: 3, action: 'allow', source: 'web-proxy', confidence: 99, lastSeen: 'now', hitCount: 9210, tags: ['trusted', 'devops'] },
  { url: 'https://new-startup-xyz.io/login', domain: 'new-startup-xyz.io', category: 'Uncategorized', subCategory: 'Unknown', riskScore: 65, action: 'warn', source: 'dns-filter', confidence: 45, lastSeen: '3 hr ago', hitCount: 12, tags: ['new-domain', 'suspicious'] },
  { url: 'https://netflix.com/browse', domain: 'netflix.com', category: 'Streaming / Entertainment', subCategory: 'Video Streaming', riskScore: 5, action: 'monitor', source: 'web-proxy', confidence: 99, lastSeen: '5 min ago', hitCount: 4521, tags: ['streaming', 'entertainment'] },
];

const mockSyncEvents: SyncEvent[] = [
  { time: '14:32:01', event: 'Category update: 847 new Phishing domains added from PhishTank feed', affected: 847, modules: ['Web Proxy', 'Email Gateway', 'DNS Filter'], impact: 'high' },
  { time: '14:28:15', event: 'AI reclassified 23 domains from Uncategorized to Malware/C2', affected: 23, modules: ['Web Proxy', 'Email Gateway'], impact: 'critical' },
  { time: '14:15:44', event: 'VirusTotal batch scan completed - 12 new IOCs confirmed malicious', affected: 12, modules: ['Web Proxy', 'DNS Filter'], impact: 'high' },
  { time: '13:58:22', event: 'Policy sync: Gambling category policy updated across all modules', affected: 892, modules: ['Web Proxy', 'Email Gateway'], impact: 'medium' },
  { time: '13:45:10', event: 'New domain age check: 134 domains flagged as newly registered (<30 days)', affected: 134, modules: ['DNS Filter'], impact: 'medium' },
  { time: '13:30:00', event: 'Scheduled feed refresh: OTX, CIRCL, ISAC feeds synchronized', affected: 15428, modules: ['Web Proxy', 'Email Gateway', 'DNS Filter'], impact: 'info' },
];
const styles = `
  .uci-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-radius: 12px; }
  .uci-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
  .uci-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0; }
  .uci-subtitle { font-size: 13px; color: #888; margin-top: 4px; }
  .uci-sync-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .uci-shared-banner { background: linear-gradient(135deg, #1a1a3e 0%, #0d1a2e 100%); border: 1px solid #6366f1; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .uci-shared-title { font-size: 13px; font-weight: 600; color: #a5b4fc; margin-bottom: 8px; }
  .uci-shared-desc { font-size: 12px; color: #888; line-height: 1.5; margin-bottom: 12px; }
  .uci-source-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .uci-source-card { background: #0a0a1a; border-radius: 8px; padding: 10px 12px; text-align: center; border: 1px solid #1e1e3a; }
  .uci-source-name { font-size: 11px; color: #888; margin-bottom: 4px; }
  .uci-source-val { font-size: 18px; font-weight: 700; }
  .uci-source-desc { font-size: 10px; color: #666; margin-top: 2px; }
  .uci-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }
  .uci-stat { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 14px 16px; }
  .uci-stat-value { font-size: 22px; font-weight: 700; }
  .uci-stat-label { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .uci-lookup { display: flex; gap: 8px; margin-bottom: 20px; }
  .uci-lookup input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2a4a; background: #12122a; color: #fff; font-size: 13px; outline: none; }
  .uci-lookup input:focus { border-color: #6366f1; }
  .uci-lookup button { padding: 10px 20px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
  .uci-filter-row { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; }
  .uci-filter-btn { padding: 5px 12px; border-radius: 6px; border: 1px solid #2a2a4a; background: #12122a; color: #ccc; font-size: 11px; cursor: pointer; }
  .uci-filter-btn.active { background: #1a1a3e; border-color: #6366f1; color: #a5b4fc; }
  .uci-grid { display: grid; grid-template-columns: 300px 1fr; gap: 20px; }
  .uci-categories { background: #12122a; border-radius: 10px; border: 1px solid #1e1e3a; overflow: hidden; }
  .uci-cat-header { padding: 12px 16px; border-bottom: 1px solid #1e1e3a; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .uci-cat-item { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid #0a0a1a; cursor: pointer; gap: 8px; transition: background 0.2s; }
  .uci-cat-item:hover, .uci-cat-item.selected { background: #1a1a3e; }
  .uci-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .uci-cat-name { font-size: 12px; flex: 1; }
  .uci-cat-count { font-size: 11px; color: #888; }
  .uci-policy-row { display: flex; gap: 4px; margin-left: 4px; }
  .uci-policy-badge { padding: 1px 5px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .uci-detail { background: #12122a; border-radius: 10px; border: 1px solid #1e1e3a; overflow: hidden; }
  .uci-detail-hdr { padding: 12px 16px; border-bottom: 1px solid #1e1e3a; display: flex; justify-content: space-between; align-items: center; }
  .uci-detail-title { font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .uci-url-row { padding: 10px 16px; border-bottom: 1px solid #0a0a1a; cursor: pointer; }
  .uci-url-row:hover { background: #12122a; }
  .uci-url-main { display: flex; align-items: center; gap: 8px; }
  .uci-url-text { font-size: 11px; font-family: monospace; color: #7c7caf; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .uci-url-badges { display: flex; gap: 5px; flex-shrink: 0; }
  .uci-badge { padding: 1px 6px; border-radius: 3px; font-size: 9px; font-weight: 700; text-transform: uppercase; }
  .uci-url-expand { margin-top: 10px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; padding-top: 8px; border-top: 1px solid #1a1a2e; }
  .uci-exp-item { font-size: 10px; }
  .uci-exp-lbl { color: #555; display: block; margin-bottom: 1px; }
  .uci-exp-val { color: #ccc; }
  .uci-tags { display: flex; gap: 3px; flex-wrap: wrap; margin-top: 5px; }
  .uci-tag { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .uci-ai-badge { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(168,85,247,0.1); color: #a855f7; border: 1px solid rgba(168,85,247,0.2); }
  .uci-sync-log { background: #0d0d1a; border: 1px solid #1e1e3a; border-radius: 10px; overflow: hidden; margin-top: 20px; }
  .uci-sync-header { padding: 12px 16px; border-bottom: 1px solid #1e1e3a; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center; }
  .uci-sync-row { display: grid; grid-template-columns: 70px 1fr 80px; border-bottom: 1px solid #0a0a1a; padding: 10px 16px; gap: 12px; }
  .uci-sync-time { font-size: 10px; font-family: monospace; color: #555; flex-shrink: 0; margin-top: 2px; }
  .uci-sync-event { font-size: 11px; color: #ccc; line-height: 1.4; }
  .uci-sync-modules { display: flex; gap: 4px; margin-top: 4px; flex-wrap: wrap; }
  .uci-sync-mod { font-size: 9px; padding: 1px 5px; border-radius: 3px; background: rgba(99,102,241,0.1); color: #818cf8; }
  .uci-pm-header { padding: 12px 16px; border-bottom: 1px solid #1e1e3a; font-size: 12px; font-weight: 600; color: #888; }
  .uci-pm-row { display: grid; grid-template-columns: 200px 1fr 1fr 1fr 80px; gap: 0; border-bottom: 1px solid #0a0a1a; }
  .uci-pm-row-header { background: #080818; color: #666; }
  .uci-pm-cell { padding: 10px 12px; display: flex; align-items: center; font-size: 11px; border-right: 1px solid #0a0a1a; }
  .uci-pm-cell:last-child { border-right: none; }
  .uci-accuracy-panel { background: linear-gradient(135deg, #0a0a1a 0%, #0d1a0d 100%); border: 1px solid #1e3a1e; border-radius: 10px; padding: 16px; margin-top: 20px; }
  .uci-acc-title { font-size: 13px; font-weight: 700; color: #86efac; margin-bottom: 12px; }
  .uci-acc-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .uci-acc-item { background: rgba(0,0,0,0.3); border-radius: 7px; padding: 10px; text-align: center; }
  .uci-acc-val { font-size: 18px; font-weight: 700; }
  .uci-acc-lbl { font-size: 9px; color: #666; margin-top: 2px; text-transform: uppercase; }
  .uci-result { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .uci-result-danger { border-color: #ef4444; }
  .uci-result-warn { border-color: #eab308; }
  .uci-result-safe { border-color: #22c55e; }
  .uci-url-list { background: #12122a; border-radius: 10px; border: 1px solid #1e1e3a; overflow: hidden; }
  .uci-url-hdr { padding: 12px 16px; border-bottom: 1px solid #1e1e3a; font-size: 12px; font-weight: 600; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
`;
const actionColor: Record<string, string> = { block: '#ef4444', allow: '#22c55e', warn: '#eab308', monitor: '#6366f1', sandbox: '#a855f7' };
const actionBg: Record<string, string> = { block: 'rgba(239,68,68,0.1)', allow: 'rgba(34,197,94,0.1)', warn: 'rgba(234,179,8,0.1)', monitor: 'rgba(99,102,241,0.1)', sandbox: 'rgba(168,85,247,0.1)' };
const impactColor: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', info: '#6366f1' };

export default function URLCategoryIntel() {
  const [selectedCat, setSelectedCat] = useState('all');
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState<URLEntry | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [syncPulse, setSyncPulse] = useState(true);
  const [activeTab, setActiveTab] = useState<'urls' | 'policy' | 'sync'>('urls');

  useEffect(() => {
    const t = setInterval(() => setSyncPulse(p => !p), 3000);
    return () => clearInterval(t);
  }, []);

  const handleLookup = () => {
    const found = mockURLEntries.find(u =>
      u.domain.toLowerCase().includes(lookupInput.toLowerCase()) ||
      u.url.toLowerCase().includes(lookupInput.toLowerCase())
    );
    setLookupResult(found || null);
    setLookupChecked(true);
  };

  const sourceLabel = (s: string) => s === 'web-proxy' ? 'Web Proxy' : s === 'email-gateway' ? 'Email GW' : 'DNS Filter';
  const sourceClass = (s: string) => s === 'web-proxy' ? 'rgba(6,182,212,0.15)' : s === 'email-gateway' ? 'rgba(168,85,247,0.15)' : 'rgba(34,197,94,0.15)';
  const sourceTextColor = (s: string) => s === 'web-proxy' ? '#06b6d4' : s === 'email-gateway' ? '#a855f7' : '#22c55e';
  const riskColor = (score: number) => score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e';

  const filteredEntries = mockURLEntries.filter(e => {
    const catOk = selectedCat === 'all' || e.category === selectedCat;
    const srcOk = sourceFilter === 'all' || e.source === sourceFilter;
    const riskOk = riskFilter === 'all' || (
      riskFilter === 'critical' ? e.riskScore >= 90 :
      riskFilter === 'high' ? e.riskScore >= 70 && e.riskScore < 90 :
      riskFilter === 'medium' ? e.riskScore >= 40 && e.riskScore < 70 :
      e.riskScore < 40
    );
    return catOk && srcOk && riskOk;
  });

  const totalURLs = mockCategories.reduce((a, c) => a + c.count, 0);
  const totalBlocked = mockCategories.reduce((a, c) => a + c.blocked, 0);
  const criticalCount = mockCategories.filter(c => c.risk === 'critical').reduce((a, c) => a + c.count, 0);
  const policyMismatches = mockCategories.filter(c => c.proxyPolicy !== c.emailPolicy).length;

  const policyBadge = (action: string) => (
    <span className="uci-policy-badge" style={{ color: actionColor[action], background: actionBg[action] }}>{action}</span>
  );

  return (
    <div className="uci-container">
      <style>{styles}</style>
      <div className="uci-header">
        <div>
          <h3 className="uci-title">URL Category Intelligence</h3>
          <div className="uci-subtitle">Used by Web Proxy &amp; Email Gateway — Shared classification database</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: syncPulse ? '#22c55e' : '#16a34a', display: 'inline-block', transition: 'background 0.5s' }}></span>
          <span style={{ fontSize: 11, color: '#888' }}>Live Sync Active</span>
        </div>
      </div>

      <div className="uci-shared-banner">
        <div className="uci-shared-title">Shared Data Source: Web Proxy + Email Gateway + DNS Filter</div>
        <div className="uci-shared-desc">All URL categorization data is shared across NextGuard Web Proxy, Email Gateway, and DNS Filter modules. Accurate classification is critical — misclassification affects all enforcement points simultaneously.</div>
        <div className="uci-source-grid">
          {[{ label: 'Web Proxy', desc: 'HTTP/HTTPS traffic filtering', count: '67,842', color: '#06b6d4' },
            { label: 'Email Gateway', desc: 'URL scanning in emails', count: '23,156', color: '#a855f7' },
            { label: 'DNS Filter', desc: 'DNS-level domain blocking', count: '12,389', color: '#22c55e' }].map(p => (
            <div key={p.label} className="uci-source-card">
              <div className="uci-source-name">{p.label}</div>
              <div className="uci-source-val" style={{ color: p.color }}>{p.count}</div>
              <div className="uci-source-desc">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="uci-stats">
        <div className="uci-stat"><div className="uci-stat-value" style={{ color: '#6366f1' }}>{totalURLs.toLocaleString()}</div><div className="uci-stat-label">Total Categorized URLs</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{ color: '#ef4444' }}>{totalBlocked.toLocaleString()}</div><div className="uci-stat-label">Blocked URLs</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{ color: '#f97316' }}>{criticalCount.toLocaleString()}</div><div className="uci-stat-label">Critical Threats</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{ color: '#eab308' }}>{policyMismatches}</div><div className="uci-stat-label">Policy Mismatches</div></div>
      </div>

      <div className="uci-lookup">
        <input placeholder="Lookup URL or domain (e.g., evil.ru, phish.cc)" value={lookupInput}
          onChange={e => setLookupInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()} />
        <button onClick={handleLookup}>Classify</button>
      </div>

      {lookupChecked && (
        <div className={`uci-result ${lookupResult ? (lookupResult.riskScore >= 70 ? 'uci-result-danger' : lookupResult.riskScore >= 40 ? 'uci-result-warn' : 'uci-result-safe') : 'uci-result-warn'}`}>
          {lookupResult ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{lookupResult.domain}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <span className="uci-badge" style={{ color: sourceTextColor(lookupResult.source), background: sourceClass(lookupResult.source) }}>{sourceLabel(lookupResult.source)}</span>
                  <span className="uci-badge" style={{ color: actionColor[lookupResult.action], background: actionBg[lookupResult.action] }}>{lookupResult.action}</span>
                </div>
              </div>
              <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#7c7caf', marginBottom: 10 }}>{lookupResult.url}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 11 }}>
                <div><span style={{ color: '#555' }}>Category: </span><span style={{ color: '#ccc' }}>{lookupResult.category}</span></div>
                <div><span style={{ color: '#555' }}>Risk Score: </span><span style={{ color: riskColor(lookupResult.riskScore), fontWeight: 700 }}>{lookupResult.riskScore}/100</span></div>
                <div><span style={{ color: '#555' }}>Confidence: </span><span style={{ color: '#ccc' }}>{lookupResult.confidence}%</span></div>
                <div><span style={{ color: '#555' }}>Source: </span><span style={{ color: '#ccc' }}>{sourceLabel(lookupResult.source)}</span></div>
                <div><span style={{ color: '#555' }}>Hit Count: </span><span style={{ color: '#ccc' }}>{lookupResult.hitCount.toLocaleString()}</span></div>
                <div><span style={{ color: '#555' }}>Last Seen: </span><span style={{ color: '#ccc' }}>{lookupResult.lastSeen}</span></div>
              </div>
            </>
          ) : (
            <div>
              <div style={{ fontWeight: 600, color: '#eab308', marginBottom: 4 }}>URL Not Found in Database</div>
              <div style={{ fontSize: 12, color: '#888' }}>This URL/domain has not been categorized. Submitting for AI classification.</div>
            </div>
          )}
        </div>
      )}
      <div className="uci-filter-row">
        {['all', 'critical', 'high', 'medium', 'low'].map(r => (
          <button key={r} className={`uci-filter-btn ${riskFilter === r ? 'active' : ''}`} onClick={() => setRiskFilter(r)}>
            {r === 'all' ? 'All Risk' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
        <span style={{ borderLeft: '1px solid #2a2a4a', margin: '0 4px' }}></span>
        {['all', 'web-proxy', 'email-gateway', 'dns-filter'].map(s => (
          <button key={s} className={`uci-filter-btn ${sourceFilter === s ? 'active' : ''}`} onClick={() => setSourceFilter(s)}>
            {s === 'all' ? 'All Sources' : sourceLabel(s)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['urls', 'policy', 'sync'] as const).map(tab => (
          <button key={tab} className={`uci-filter-btn ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab === 'urls' ? 'URL Entries' : tab === 'policy' ? 'Policy Matrix' : 'Sync Log'}
          </button>
        ))}
      </div>

      {activeTab === 'urls' && (
        <div className="uci-grid">
          <div className="uci-categories">
            <div className="uci-cat-header">Categories ({mockCategories.length})</div>
            <div className={`uci-cat-item ${selectedCat === 'all' ? 'selected' : ''}`} onClick={() => setSelectedCat('all')}>
              <span className="uci-cat-dot" style={{ background: '#6366f1' }}></span>
              <span className="uci-cat-name">All Categories</span>
              <span className="uci-cat-count">{totalURLs.toLocaleString()}</span>
            </div>
            {mockCategories.map(cat => (
              <div key={cat.id} className={`uci-cat-item ${selectedCat === cat.name ? 'selected' : ''}`} onClick={() => setSelectedCat(cat.name)}>
                <span className="uci-cat-dot" style={{ background: cat.color }}></span>
                <span className="uci-cat-name">{cat.name}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="uci-cat-count">{cat.count.toLocaleString()}</span>
                  <div className="uci-policy-row">
                    {policyBadge(cat.proxyPolicy)}
                    {policyBadge(cat.emailPolicy)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="uci-url-list">
            <div className="uci-url-hdr">URL Entries ({filteredEntries.length})</div>
            {filteredEntries.map(entry => (
              <div key={entry.url} className="uci-url-row" onClick={() => setExpandedUrl(expandedUrl === entry.url ? null : entry.url)}>
                <div className="uci-url-main">
                  <span className="uci-url-text">{entry.url}</span>
                  <div className="uci-url-badges">
                    <span className="uci-badge" style={{ color: sourceTextColor(entry.source), background: sourceClass(entry.source) }}>{sourceLabel(entry.source)}</span>
                    <span className="uci-badge" style={{ color: actionColor[entry.action], background: actionBg[entry.action] }}>{entry.action}</span>
                    <span className="uci-badge" style={{ color: riskColor(entry.riskScore), background: 'rgba(0,0,0,0.3)' }}>{entry.riskScore}</span>
                  </div>
                </div>
                {expandedUrl === entry.url && (
                  <>
                    <div className="uci-url-expand">
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Category</span><span className="uci-exp-val">{entry.category}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Sub-Category</span><span className="uci-exp-val">{entry.subCategory}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Domain</span><span className="uci-exp-val">{entry.domain}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Risk Score</span><span className="uci-exp-val" style={{ color: riskColor(entry.riskScore), fontWeight: 700 }}>{entry.riskScore}/100</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Confidence</span><span className="uci-exp-val">{entry.confidence}%</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Hit Count</span><span className="uci-exp-val">{entry.hitCount.toLocaleString()}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Last Seen</span><span className="uci-exp-val">{entry.lastSeen}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Source</span><span className="uci-exp-val">{sourceLabel(entry.source)}</span></div>
                      <div className="uci-exp-item"><span className="uci-exp-lbl">Action</span><span className="uci-exp-val" style={{ color: actionColor[entry.action] }}>{entry.action}</span></div>
                    </div>
                    <div className="uci-tags">
                      {entry.tags.map(t => <span key={t} className="uci-tag">{t}</span>)}
                      <span className="uci-ai-badge">AI Classified</span>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'policy' && (
        <div className="uci-categories" style={{ borderRadius: 10, overflow: 'hidden' }}>
          <div className="uci-pm-header">Policy Matrix — Web Proxy vs Email Gateway</div>
          <div className="uci-pm-row uci-pm-row-header">
            <div className="uci-pm-cell">Category</div>
            <div className="uci-pm-cell">Risk Level</div>
            <div className="uci-pm-cell">Web Proxy Policy</div>
            <div className="uci-pm-cell">Email GW Policy</div>
            <div className="uci-pm-cell">Status</div>
          </div>
          {mockCategories.map(cat => (
            <div key={cat.id} className="uci-pm-row">
              <div className="uci-pm-cell" style={{ gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: cat.color, display: 'inline-block', flexShrink: 0 }}></span>
                <span style={{ fontSize: 11 }}>{cat.name}</span>
              </div>
              <div className="uci-pm-cell">
                <span style={{ fontSize: 10, color: cat.color, fontWeight: 700, textTransform: 'uppercase' }}>{cat.risk}</span>
              </div>
              <div className="uci-pm-cell">{policyBadge(cat.proxyPolicy)}</div>
              <div className="uci-pm-cell">{policyBadge(cat.emailPolicy)}</div>
              <div className="uci-pm-cell">
                {cat.proxyPolicy === cat.emailPolicy
                  ? <span style={{ fontSize: 10, color: '#22c55e' }}>✓ Aligned</span>
                  : <span style={{ fontSize: 10, color: '#f97316', fontWeight: 700 }}>! Mismatch</span>
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'sync' && (
        <div className="uci-sync-log">
          <div className="uci-sync-header">
            <span>Sync Events Log</span>
            <span style={{ fontSize: 10, color: syncPulse ? '#22c55e' : '#888' }}>● Live</span>
          </div>
          {mockSyncEvents.map((ev, i) => (
            <div key={i} className="uci-sync-row">
              <div className="uci-sync-time">{ev.time}</div>
              <div>
                <div className="uci-sync-event">{ev.event}</div>
                <div className="uci-sync-modules">
                  {ev.modules.map(m => <span key={m} className="uci-sync-mod">{m}</span>)}
                  <span style={{ fontSize: 9, color: '#888', marginLeft: 4 }}>{ev.affected.toLocaleString()} affected</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 3, color: impactColor[ev.impact], background: `${impactColor[ev.impact]}20`, fontWeight: 700, textTransform: 'uppercase' }}>{ev.impact}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="uci-accuracy-panel">
        <div className="uci-acc-title">Classification Accuracy Impact</div>
        <div className="uci-acc-grid">
          <div className="uci-acc-item"><div className="uci-acc-val" style={{ color: '#06b6d4' }}>67,842</div><div className="uci-acc-lbl">Web Proxy Decisions</div></div>
          <div className="uci-acc-item"><div className="uci-acc-val" style={{ color: '#a855f7' }}>23,156</div><div className="uci-acc-lbl">Email URLs Scanned</div></div>
          <div className="uci-acc-item"><div className="uci-acc-val" style={{ color: '#22c55e' }}>0.03%</div><div className="uci-acc-lbl">False Positive Rate</div></div>
          <div className="uci-acc-item"><div className="uci-acc-val" style={{ color: '#6366f1' }}>99.97%</div><div className="uci-acc-lbl">Classification Accuracy</div></div>
        </div>
      </div>
    </div>
  );
}
