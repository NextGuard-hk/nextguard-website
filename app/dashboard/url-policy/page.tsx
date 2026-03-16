'use client';
import React, { useState } from 'react';
import { URL_TAXONOMY } from '@/lib/url-categories';

type PolicyAction = 'Allow' | 'Alert' | 'Warn' | 'Block' | 'Isolate';

const ACTION_COLORS: Record<string, string> = {
  Allow: '#00cc66', Alert: '#ffaa00', Warn: '#ffaa00', Block: '#ff4444', Isolate: '#aa44ff',
};
const ACTION_BG: Record<string, string> = {
  Allow: '#00cc6622', Alert: '#ffaa0022', Warn: '#ffaa0022', Block: '#ff444422', Isolate: '#aa44ff22',
};

const GROUPS = [...new Set(Object.values(URL_TAXONOMY).map((c: any) => c.group))];

interface EvalResult {
  url: string; domain: string; action: string; confidence: number;
  categorySource: string; categories: string[]; primaryCategory: string;
  group: string | null; defaultAction: string | null;
  threatIntel: { isMalicious: boolean; riskLevel: string; threatType: string | null };
  dbCategoryMatch: string | null; evalMs: number; timestamp: string;
}

export default function URLPolicyPage() {
  const [testUrl, setTestUrl] = useState('');
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchUrls, setBatchUrls] = useState('');
  const [batchResults, setBatchResults] = useState<EvalResult[]>([]);
  const [activeTab, setActiveTab] = useState<'test' | 'batch' | 'taxonomy'>('test');

  async function testPolicy() {
    if (!testUrl.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/url-policy/evaluate?url=${encodeURIComponent(testUrl.trim())}`);
      const data = await res.json();
      setEvalResult(data);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function testBatch() {
    const urls = batchUrls.split('\n').map(u => u.trim()).filter(Boolean);
    if (!urls.length) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/url-policy/evaluate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls }),
      });
      const data = await res.json();
      setBatchResults(data.results || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div style={{minHeight:'100vh',background:'#0a0a0f',color:'#e0e0e0',padding:'24px'}}>
      <div style={{maxWidth:1200,margin:'0 auto'}}>
        <h1 style={{fontSize:28,fontWeight:700,marginBottom:8,background:'linear-gradient(90deg,#00d4ff,#7b61ff)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          URL Policy Engine
        </h1>
        <p style={{color:'#888',marginBottom:24,fontSize:14}}>3-Layer Classification: Static Taxonomy + Database (132K+ domains) + Threat Intelligence</p>

        {/* Tabs */}
        <div style={{display:'flex',gap:8,marginBottom:24}}>
          {(['test','batch','taxonomy'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{padding:'8px 20px',borderRadius:8,border:'none',cursor:'pointer',fontSize:14,fontWeight:600,
                background: activeTab === tab ? '#7b61ff' : '#1a1a2e',
                color: activeTab === tab ? '#fff' : '#888',
              }}>
              {tab === 'test' ? 'Single URL Test' : tab === 'batch' ? 'Batch Evaluation' : 'Category Taxonomy'}
            </button>
          ))}
        </div>

        {/* Single URL Test */}
        {activeTab === 'test' && (
          <div>
            <div style={{display:'flex',gap:8,marginBottom:16}}>
              <input value={testUrl} onChange={e => setTestUrl(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && testPolicy()}
                placeholder="Enter URL to evaluate (e.g. pornhub.com, bet365.com, google.com)"
                style={{flex:1,padding:'12px 16px',borderRadius:8,border:'1px solid #333',background:'#111',color:'#fff',fontSize:15}} />
              <button onClick={testPolicy} disabled={loading}
                style={{padding:'12px 24px',borderRadius:8,border:'none',background:'#7b61ff',color:'#fff',fontWeight:600,cursor:'pointer',fontSize:14}}>
                {loading ? 'Evaluating...' : 'Evaluate'}
              </button>
            </div>

            {evalResult && (
              <div style={{background:'#111',borderRadius:12,border:'1px solid #222',overflow:'hidden'}}>
                {/* Header */}
                <div style={{padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',
                  borderBottom:'1px solid #222',background:ACTION_BG[evalResult.action] || '#111'}}>
                  <div>
                    <span style={{fontSize:18,fontWeight:700}}>{evalResult.domain}</span>
                    <span style={{marginLeft:12,padding:'4px 12px',borderRadius:20,fontSize:13,fontWeight:600,
                      background:ACTION_BG[evalResult.action],color:ACTION_COLORS[evalResult.action],
                      border:`1px solid ${ACTION_COLORS[evalResult.action]}44`}}>
                      {evalResult.action}
                    </span>
                  </div>
                  <span style={{fontSize:12,color:'#666'}}>{evalResult.evalMs}ms</span>
                </div>
                {/* Details grid */}
                <div style={{padding:20,display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                  <DetailCard label="Primary Category" value={evalResult.primaryCategory} />
                  <DetailCard label="Confidence" value={`${evalResult.confidence}%`} />
                  <DetailCard label="Category Source" value={evalResult.categorySource} />
                  <DetailCard label="Group" value={evalResult.group || 'N/A'} />
                  <DetailCard label="All Categories" value={evalResult.categories.join(', ')} />
                  <DetailCard label="DB Match" value={evalResult.dbCategoryMatch || 'None'} />
                  <DetailCard label="Threat Intel" value={
                    evalResult.threatIntel.isMalicious ? `MALICIOUS (${evalResult.threatIntel.riskLevel})` : 'Clean'
                  } highlight={evalResult.threatIntel.isMalicious} />
                  <DetailCard label="Default Action" value={evalResult.defaultAction || 'N/A'} />
                </div>
              </div>
            )}

            {/* Quick test buttons */}
            <div style={{marginTop:16}}>
              <p style={{color:'#666',fontSize:12,marginBottom:8}}>Quick test:</p>
              <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                {['pornhub.com','bet365.com','google.com','facebook.com','coinbase.com','nordvpn.com',
                  'github.com','zoom.us','netflix.com','torproject.org','paypal.com','kali.org',
                  'chatgpt.com','booking.com','hsbc.com','hkjc.com'].map(url => (
                  <button key={url} onClick={() => { setTestUrl(url); setTimeout(() => {
                    fetch(`/api/v1/url-policy/evaluate?url=${url}`).then(r => r.json()).then(setEvalResult);
                  }, 0); }}
                    style={{padding:'4px 10px',borderRadius:6,border:'1px solid #333',background:'#1a1a2e',
                      color:'#aaa',fontSize:11,cursor:'pointer'}}>
                    {url}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Batch Evaluation */}
        {activeTab === 'batch' && (
          <div>
            <textarea value={batchUrls} onChange={e => setBatchUrls(e.target.value)}
              placeholder="Enter URLs (one per line, max 50)\npornhub.com\ngoogle.com\nbet365.com"
              style={{width:'100%',minHeight:120,padding:12,borderRadius:8,border:'1px solid #333',
                background:'#111',color:'#fff',fontSize:14,fontFamily:'monospace',resize:'vertical'}} />
            <button onClick={testBatch} disabled={loading}
              style={{marginTop:8,padding:'10px 24px',borderRadius:8,border:'none',background:'#7b61ff',
                color:'#fff',fontWeight:600,cursor:'pointer'}}>
              {loading ? 'Processing...' : 'Batch Evaluate'}
            </button>
            {batchResults.length > 0 && (
              <div style={{marginTop:16,overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                  <thead>
                    <tr style={{borderBottom:'1px solid #333'}}>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>Domain</th>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>Action</th>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>Category</th>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>Confidence</th>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>Source</th>
                      <th style={{padding:8,textAlign:'left',color:'#888'}}>ms</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchResults.map((r, i) => (
                      <tr key={i} style={{borderBottom:'1px solid #1a1a2e'}}>
                        <td style={{padding:8,fontFamily:'monospace'}}>{r.domain}</td>
                        <td style={{padding:8}}>
                          <span style={{padding:'2px 8px',borderRadius:4,fontSize:12,fontWeight:600,
                            color:ACTION_COLORS[r.action],background:ACTION_BG[r.action]}}>{r.action}</span>
                        </td>
                        <td style={{padding:8}}>{r.primaryCategory}</td>
                        <td style={{padding:8}}>{r.confidence}%</td>
                        <td style={{padding:8,color:'#666'}}>{r.categorySource}</td>
                        <td style={{padding:8,color:'#666'}}>{r.evalMs}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Taxonomy View */}
        {activeTab === 'taxonomy' && (
          <div>
            {GROUPS.map(group => (
              <div key={group} style={{marginBottom:24}}>
                <h3 style={{fontSize:16,fontWeight:600,color:'#7b61ff',marginBottom:8,borderBottom:'1px solid #222',paddingBottom:4}}>{group}</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:8}}>
                  {Object.entries(URL_TAXONOMY)
                    .filter(([,v]: any) => v.group === group)
                    .map(([id, cat]: any) => (
                      <div key={id} style={{padding:'10px 14px',borderRadius:8,background:'#111',border:'1px solid #222',fontSize:13}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                          <span style={{fontWeight:600}}>{cat.name}</span>
                          <span style={{padding:'2px 8px',borderRadius:4,fontSize:11,fontWeight:600,
                            color:ACTION_COLORS[cat.defaultAction],background:ACTION_BG[cat.defaultAction]}}>
                            {cat.defaultAction}
                          </span>
                        </div>
                        <p style={{color:'#666',fontSize:11,marginTop:4}}>{cat.description}</p>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{background:'#0d0d15',padding:'10px 14px',borderRadius:8,border:'1px solid #1a1a2e'}}>
      <div style={{fontSize:11,color:'#666',marginBottom:4}}>{label}</div>
      <div style={{fontSize:14,fontWeight:600,color: highlight ? '#ff4444' : '#e0e0e0'}}>{value}</div>
    </div>
  );
}
