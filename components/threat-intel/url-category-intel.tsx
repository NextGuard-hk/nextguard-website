// components/threat-intel/url-category-intel.tsx
'use client';

import React, { useState } from 'react';

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
  name: string;
  count: number;
  blocked: number;
  risk: 'critical' | 'high' | 'medium' | 'low' | 'safe';
  color: string;
}

const mockCategories: URLCategory[] = [
  { name: 'Malware / C2', count: 2847, blocked: 2847, risk: 'critical', color: '#ef4444' },
  { name: 'Phishing / Credential Theft', count: 1923, blocked: 1923, risk: 'critical', color: '#ef4444' },
  { name: 'Ransomware Infrastructure', count: 456, blocked: 456, risk: 'critical', color: '#dc2626' },
  { name: 'Cryptomining', count: 312, blocked: 312, risk: 'high', color: '#f97316' },
  { name: 'Spam / Scam', count: 5621, blocked: 4890, risk: 'high', color: '#f97316' },
  { name: 'Adult Content', count: 1245, blocked: 1245, risk: 'medium', color: '#eab308' },
  { name: 'Gambling', count: 892, blocked: 892, risk: 'medium', color: '#eab308' },
  { name: 'Social Media', count: 15420, blocked: 0, risk: 'low', color: '#22c55e' },
  { name: 'Business / SaaS', count: 42180, blocked: 0, risk: 'safe', color: '#06b6d4' },
  { name: 'News / Media', count: 8930, blocked: 0, risk: 'safe', color: '#06b6d4' },
  { name: 'Streaming / Entertainment', count: 6710, blocked: 340, risk: 'low', color: '#22c55e' },
  { name: 'Uncategorized', count: 1847, blocked: 423, risk: 'medium', color: '#eab308' },
];

const mockURLEntries: URLEntry[] = [
  { url: 'https://malware-c2.evil.ru/callback', domain: 'evil.ru', category: 'Malware / C2', subCategory: 'Command & Control', riskScore: 99, action: 'block', source: 'web-proxy', confidence: 98, lastSeen: '2 min ago', hitCount: 847, tags: ['APT29', 'cobalt-strike'] },
  { url: 'https://secure-login-verify.phish.cc/office365', domain: 'phish.cc', category: 'Phishing / Credential Theft', subCategory: 'Credential Harvesting', riskScore: 97, action: 'block', source: 'email-gateway', confidence: 96, lastSeen: '5 min ago', hitCount: 1203, tags: ['O365-phish', 'BEC'] },
  { url: 'https://crypto-pay.ransom.io/decrypt', domain: 'ransom.io', category: 'Ransomware Infrastructure', subCategory: 'Payment Portal', riskScore: 99, action: 'block', source: 'web-proxy', confidence: 99, lastSeen: '12 min ago', hitCount: 23, tags: ['lockbit', 'ransomware'] },
  { url: 'https://coinhive-clone.mining.xyz/start', domain: 'mining.xyz', category: 'Cryptomining', subCategory: 'Browser Mining', riskScore: 78, action: 'block', source: 'web-proxy', confidence: 92, lastSeen: '1 hr ago', hitCount: 456, tags: ['cryptojacking'] },
  { url: 'https://free-iphone-winner.spam.net/claim', domain: 'spam.net', category: 'Spam / Scam', subCategory: 'Prize Scam', riskScore: 85, action: 'block', source: 'email-gateway', confidence: 94, lastSeen: '30 min ago', hitCount: 2341, tags: ['scam', 'social-engineering'] },
  { url: 'https://drive.google.com/shared/project-docs', domain: 'google.com', category: 'Business / SaaS', subCategory: 'Cloud Storage', riskScore: 5, action: 'allow', source: 'web-proxy', confidence: 99, lastSeen: '1 min ago', hitCount: 18420, tags: ['trusted', 'saas'] },
  { url: 'https://github.com/nextguard-hk/repo', domain: 'github.com', category: 'Business / SaaS', subCategory: 'Developer Tools', riskScore: 3, action: 'allow', source: 'web-proxy', confidence: 99, lastSeen: 'now', hitCount: 9210, tags: ['trusted', 'devops'] },
  { url: 'https://unknown-domain-xyz.cc/path', domain: 'unknown-domain-xyz.cc', category: 'Uncategorized', subCategory: 'Unknown', riskScore: 65, action: 'warn', source: 'dns-filter', confidence: 45, lastSeen: '3 hr ago', hitCount: 12, tags: ['new-domain', 'suspicious'] },
];

const styles = `
  .uci-container { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 24px; border-radius: 12px; }
  .uci-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
  .uci-title { font-size: 22px; font-weight: 700; color: #fff; margin: 0; }
  .uci-subtitle { font-size: 13px; color: #888; margin-top: 4px; }
  .uci-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .uci-stat { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 16px; }
  .uci-stat-value { font-size: 24px; font-weight: 700; }
  .uci-stat-label { font-size: 11px; color: #888; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .uci-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .uci-filter-btn { padding: 6px 14px; border-radius: 6px; border: 1px solid #2a2a4a; background: #12122a; color: #ccc; font-size: 12px; cursor: pointer; transition: all 0.2s; }
  .uci-filter-btn:hover, .uci-filter-btn.active { background: #1a1a3e; border-color: #6366f1; color: #fff; }
  .uci-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }
  .uci-categories { background: #12122a; border-radius: 10px; border: 1px solid #1e1e3a; overflow: hidden; }
  .uci-cat-header { padding: 14px 16px; border-bottom: 1px solid #1e1e3a; font-size: 13px; font-weight: 600; color: #fff; }
  .uci-cat-item { display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid #0a0a1a; cursor: pointer; transition: background 0.2s; gap: 10px; }
  .uci-cat-item:hover, .uci-cat-item.selected { background: #1a1a3e; }
  .uci-cat-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .uci-cat-name { font-size: 13px; flex: 1; }
  .uci-cat-count { font-size: 12px; color: #888; }
  .uci-cat-blocked { font-size: 11px; color: #ef4444; margin-left: 6px; }
  .uci-detail { background: #12122a; border-radius: 10px; border: 1px solid #1e1e3a; overflow: hidden; }
  .uci-detail-header { padding: 14px 16px; border-bottom: 1px solid #1e1e3a; display: flex; justify-content: space-between; align-items: center; }
  .uci-detail-title { font-size: 13px; font-weight: 600; color: #fff; }
  .uci-url-row { padding: 12px 16px; border-bottom: 1px solid #0a0a1a; }
  .uci-url-main { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .uci-url-text { font-size: 12px; color: #8b8baf; font-family: monospace; word-break: break-all; flex: 1; }
  .uci-url-meta { display: flex; gap: 6px; align-items: center; flex-shrink: 0; }
  .uci-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
  .uci-badge-block { background: rgba(239,68,68,0.15); color: #ef4444; }
  .uci-badge-allow { background: rgba(34,197,94,0.15); color: #22c55e; }
  .uci-badge-warn { background: rgba(234,179,8,0.15); color: #eab308; }
  .uci-badge-monitor { background: rgba(99,102,241,0.15); color: #6366f1; }
  .uci-badge-proxy { background: rgba(6,182,212,0.15); color: #06b6d4; }
  .uci-badge-email { background: rgba(168,85,247,0.15); color: #a855f7; }
  .uci-badge-dns { background: rgba(34,197,94,0.15); color: #22c55e; }
  .uci-expand { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #1a1a2e; }
  .uci-expand-item { font-size: 11px; }
  .uci-expand-label { color: #666; }
  .uci-expand-value { color: #ccc; margin-left: 4px; }
  .uci-tags { display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; }
  .uci-tag { padding: 1px 6px; border-radius: 3px; font-size: 10px; background: rgba(99,102,241,0.1); color: #818cf8; border: 1px solid rgba(99,102,241,0.2); }
  .uci-risk-bar { width: 60px; height: 4px; background: #1a1a2e; border-radius: 2px; overflow: hidden; }
  .uci-risk-fill { height: 100%; border-radius: 2px; transition: width 0.3s; }
  .uci-lookup { display: flex; gap: 8px; margin-bottom: 20px; }
  .uci-lookup input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #2a2a4a; background: #12122a; color: #fff; font-size: 13px; outline: none; }
  .uci-lookup input:focus { border-color: #6366f1; }
  .uci-lookup button { padding: 10px 20px; border-radius: 8px; border: none; background: #6366f1; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; }
  .uci-lookup button:hover { background: #4f46e5; }
  .uci-result { background: #12122a; border: 1px solid #1e1e3a; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .uci-result-safe { border-color: #22c55e; }
  .uci-result-danger { border-color: #ef4444; }
  .uci-result-warn { border-color: #eab308; }
  .uci-shared-banner { background: linear-gradient(135deg, #1a1a3e 0%, #12122a 100%); border: 1px solid #6366f1; border-radius: 10px; padding: 16px; margin-bottom: 20px; }
  .uci-shared-title { font-size: 14px; font-weight: 600; color: #a5b4fc; margin-bottom: 6px; }
  .uci-shared-desc { font-size: 12px; color: #888; line-height: 1.5; }
  .uci-source-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-top: 12px; }
  .uci-source-card { background: #0a0a1a; border-radius: 8px; padding: 12px; text-align: center; }
  .uci-source-name { font-size: 11px; color: #888; margin-bottom: 4px; }
  .uci-source-value { font-size: 18px; font-weight: 700; }
`;

export default function URLCategoryIntel() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedUrl, setExpandedUrl] = useState<string | null>(null);
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState<URLEntry | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const handleLookup = () => {
    const found = mockURLEntries.find(u =>
      u.domain.toLowerCase().includes(lookupInput.toLowerCase()) ||
      u.url.toLowerCase().includes(lookupInput.toLowerCase())
    );
    setLookupResult(found || null);
    setLookupChecked(true);
  };

  const sourceLabel = (s: string) => s === 'web-proxy' ? 'Web Proxy' : s === 'email-gateway' ? 'Email GW' : 'DNS Filter';
  const sourceClass = (s: string) => s === 'web-proxy' ? 'uci-badge-proxy' : s === 'email-gateway' ? 'uci-badge-email' : 'uci-badge-dns';

  const filteredEntries = mockURLEntries.filter(e => {
    const catMatch = selectedCategory === 'all' || e.category === selectedCategory;
    const srcMatch = sourceFilter === 'all' || e.source === sourceFilter;
    return catMatch && srcMatch;
  });

  const totalURLs = mockCategories.reduce((a, c) => a + c.count, 0);
  const totalBlocked = mockCategories.reduce((a, c) => a + c.blocked, 0);
  const criticalCount = mockCategories.filter(c => c.risk === 'critical').reduce((a, c) => a + c.count, 0);

  const riskColor = (score: number) => score >= 80 ? '#ef4444' : score >= 60 ? '#f97316' : score >= 40 ? '#eab308' : '#22c55e';

  return (
    <div className="uci-container">
      <style>{styles}</style>
      <div className="uci-header">
        <div>
          <h3 className="uci-title">URL Category Intelligence</h3>
          <div className="uci-subtitle">Used by Web Proxy & Email Gateway — Shared classification database</div>
        </div>
      </div>

      <div className="uci-shared-banner">
        <div className="uci-shared-title">Shared Data Source: Web Proxy + Email Gateway + DNS Filter</div>
        <div className="uci-shared-desc">
          All URL categorization data is shared across NextGuard Web Proxy, Email Gateway, and DNS Filter modules.
          Accurate classification is critical — misclassification affects all enforcement points simultaneously.
        </div>
        <div className="uci-source-grid">
          {[{label:'Web Proxy',desc:'HTTP/HTTPS traffic filtering',count:'67,842',color:'#06b6d4'},
            {label:'Email Gateway',desc:'URL scanning in emails',count:'23,156',color:'#a855f7'},
            {label:'DNS Filter',desc:'DNS-level domain blocking',count:'12,389',color:'#22c55e'}].map(p => (
            <div key={p.label} className="uci-source-card">
              <div className="uci-source-name">{p.label}</div>
              <div className="uci-source-value" style={{color:p.color}}>{p.count}</div>
              <div style={{color:'#666',fontSize:10,marginTop:2}}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="uci-stats">
        <div className="uci-stat"><div className="uci-stat-value" style={{color:'#06b6d4'}}>{totalURLs.toLocaleString()}</div><div className="uci-stat-label">Total Categorized URLs</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{color:'#ef4444'}}>{totalBlocked.toLocaleString()}</div><div className="uci-stat-label">Blocked URLs</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{color:'#f97316'}}>{criticalCount.toLocaleString()}</div><div className="uci-stat-label">Critical Threats</div></div>
        <div className="uci-stat"><div className="uci-stat-value" style={{color:'#22c55e'}}>{mockCategories.length}</div><div className="uci-stat-label">Active Categories</div></div>
      </div>

      <div className="uci-lookup">
        <input placeholder="Lookup URL or domain (e.g., evil.ru, phish.cc)" value={lookupInput} onChange={e => setLookupInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLookup()} />
        <button onClick={handleLookup}>Classify</button>
      </div>

      {lookupChecked && (
        <div className={`uci-result ${lookupResult ? (lookupResult.riskScore >= 70 ? 'uci-result-danger' : lookupResult.riskScore >= 40 ? 'uci-result-warn' : 'uci-result-safe') : 'uci-result-warn'}`}>
          {lookupResult ? (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                <div style={{fontSize:14,fontWeight:600}}>{lookupResult.domain}</div>
                <span className={`uci-badge uci-badge-${lookupResult.action}`}>{lookupResult.action}</span>
              </div>
              <div style={{fontSize:12,color:'#888',marginBottom:8}}>{lookupResult.url}</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8}}>
                <div><span style={{color:'#666',fontSize:11}}>Category:</span> <span style={{fontSize:12}}>{lookupResult.category}</span></div>
                <div><span style={{color:'#666',fontSize:11}}>Risk:</span> <span style={{color:riskColor(lookupResult.riskScore),fontSize:12,fontWeight:700}}>{lookupResult.riskScore}/100</span></div>
                <div><span style={{color:'#666',fontSize:11}}>Confidence:</span> <span style={{fontSize:12}}>{lookupResult.confidence}%</span></div>
                <div><span style={{color:'#666',fontSize:11}}>Source:</span> <span className={`uci-badge ${sourceClass(lookupResult.source)}`}>{sourceLabel(lookupResult.source)}</span></div>
                <div><span style={{color:'#666',fontSize:11}}>Hits:</span> <span style={{fontSize:12}}>{lookupResult.hitCount.toLocaleString()}</span></div>
                <div><span style={{color:'#666',fontSize:11}}>Last Seen:</span> <span style={{fontSize:12}}>{lookupResult.lastSeen}</span></div>
              </div>
            </>
          ) : (
            <div style={{textAlign:'center',padding:8}}>
              <div style={{color:'#eab308',fontSize:14,fontWeight:600}}>URL Not Found in Database</div>
              <div style={{color:'#888',fontSize:12,marginTop:4}}>This URL/domain has not been categorized. It will be submitted for AI classification.</div>
            </div>
          )}
        </div>
      )}

      <div className="uci-filters">
        <button className={`uci-filter-btn ${sourceFilter === 'all' ? 'active' : ''}`} onClick={() => setSourceFilter('all')}>All Sources</button>
        <button className={`uci-filter-btn ${sourceFilter === 'web-proxy' ? 'active' : ''}`} onClick={() => setSourceFilter('web-proxy')}>Web Proxy</button>
        <button className={`uci-filter-btn ${sourceFilter === 'email-gateway' ? 'active' : ''}`} onClick={() => setSourceFilter('email-gateway')}>Email Gateway</button>
        <button className={`uci-filter-btn ${sourceFilter === 'dns-filter' ? 'active' : ''}`} onClick={() => setSourceFilter('dns-filter')}>DNS Filter</button>
      </div>

      <div className="uci-grid">
        <div className="uci-categories">
          <div className="uci-cat-header">URL Categories ({mockCategories.length})</div>
          <div className={`uci-cat-item ${selectedCategory === 'all' ? 'selected' : ''}`} onClick={() => setSelectedCategory('all')}>
            <div className="uci-cat-dot" style={{background:'#6366f1'}} />
            <div className="uci-cat-name">All Categories</div>
            <div className="uci-cat-count">{totalURLs.toLocaleString()}</div>
          </div>
          {mockCategories.map(cat => (
            <div key={cat.name} className={`uci-cat-item ${selectedCategory === cat.name ? 'selected' : ''}`} onClick={() => setSelectedCategory(cat.name)}>
              <div className="uci-cat-dot" style={{background:cat.color}} />
              <div className="uci-cat-name">{cat.name}</div>
              <div className="uci-cat-count">{cat.count.toLocaleString()}</div>
              {cat.blocked > 0 && <div className="uci-cat-blocked">{cat.blocked.toLocaleString()} blocked</div>}
            </div>
          ))}
        </div>

        <div className="uci-detail">
          <div className="uci-detail-header">
            <div className="uci-detail-title">URL Entries ({filteredEntries.length})</div>
          </div>
          {filteredEntries.map(entry => (
            <div key={entry.url} className="uci-url-row" onClick={() => setExpandedUrl(expandedUrl === entry.url ? null : entry.url)} style={{cursor:'pointer'}}>
              <div className="uci-url-main">
                <div className="uci-url-text">{entry.url}</div>
                <div className="uci-url-meta">
                  <span className={`uci-badge ${sourceClass(entry.source)}`}>{sourceLabel(entry.source)}</span>
                  <span className={`uci-badge uci-badge-${entry.action}`}>{entry.action}</span>
                  <div className="uci-risk-bar">
                    <div className="uci-risk-fill" style={{width:`${entry.riskScore}%`,background:riskColor(entry.riskScore)}} />
                  </div>
                </div>
              </div>
              {expandedUrl === entry.url && (
                <>
                  <div className="uci-expand">
                    <div className="uci-expand-item"><span className="uci-expand-label">Category:</span><span className="uci-expand-value">{entry.category}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Sub-Category:</span><span className="uci-expand-value">{entry.subCategory}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Domain:</span><span className="uci-expand-value">{entry.domain}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Risk Score:</span><span className="uci-expand-value" style={{color:riskColor(entry.riskScore),fontWeight:700}}>{entry.riskScore}/100</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Confidence:</span><span className="uci-expand-value">{entry.confidence}%</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Hit Count:</span><span className="uci-expand-value">{entry.hitCount.toLocaleString()}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Last Seen:</span><span className="uci-expand-value">{entry.lastSeen}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Source:</span><span className="uci-expand-value">{sourceLabel(entry.source)}</span></div>
                    <div className="uci-expand-item"><span className="uci-expand-label">Action:</span><span className="uci-expand-value">{entry.action}</span></div>
                  </div>
                  <div className="uci-tags">
                    {entry.tags.map(t => <span key={t} className="uci-tag">{t}</span>)}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:16,background:'#12122a',borderRadius:10,border:'1px solid #1e1e3a',padding:16}}>
        <div style={{fontSize:13,fontWeight:600,color:'#fff',marginBottom:8}}>Classification Accuracy Impact</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div style={{background:'#0a0a1a',borderRadius:8,padding:12}}>
            <div style={{color:'#888',fontSize:11,marginBottom:4}}>Web Proxy Policy Decisions</div>
            <div style={{color:'#06b6d4',fontSize:20,fontWeight:700}}>67,842</div>
            <div style={{color:'#666',fontSize:10}}>Dependent on URL categories</div>
          </div>
          <div style={{background:'#0a0a1a',borderRadius:8,padding:12}}>
            <div style={{color:'#888',fontSize:11,marginBottom:4}}>Email URLs Scanned Today</div>
            <div style={{color:'#a855f7',fontSize:20,fontWeight:700}}>23,156</div>
            <div style={{color:'#666',fontSize:10}}>Links extracted & classified</div>
          </div>
          <div style={{background:'#0a0a1a',borderRadius:8,padding:12}}>
            <div style={{color:'#888',fontSize:11,marginBottom:4}}>False Positive Rate</div>
            <div style={{color:'#22c55e',fontSize:20,fontWeight:700}}>0.03%</div>
            <div style={{color:'#666',fontSize:10}}>Industry-leading accuracy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
