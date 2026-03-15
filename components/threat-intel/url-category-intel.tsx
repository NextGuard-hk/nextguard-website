// components/threat-intel/url-category-intel.tsx
// NextGuard URL Category Intelligence Dashboard v2.0
// Real-time data from Turso DB via /api/v1/threat-intel/categories & /lookup
// Shared classification: Web Proxy + Email Gateway + DNS Filter
'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface URLCategory {
  id: string;
  name: string;
  description: string;
  count: number;
  blocked: number;
  risk: string;
  color: string;
  proxyPolicy: string;
  emailPolicy: string;
  lastUpdated?: string;
}

interface LookupResult {
  indicator: string;
  verdict: string;
  risk_level: string;
  confidence: number;
  threat_score: number;
  risk_label: string;
  categories: string[];
  sources_hit: string[];
  engine: string;
  category_source: string;
  lookup_ms: number;
}

interface SyncEvent {
  time: string;
  event: string;
  affected: number;
  modules: string[];
  impact: 'critical' | 'high' | 'medium' | 'info';
}

const actionColor: Record<string, string> = { block: '#ef4444', allow: '#22c55e', warn: '#eab308', monitor: '#6366f1', sandbox: '#a855f7' };
const actionBg: Record<string, string> = { block: 'rgba(239,68,68,0.1)', allow: 'rgba(34,197,94,0.1)', warn: 'rgba(234,179,8,0.1)', monitor: 'rgba(99,102,241,0.1)', sandbox: 'rgba(168,85,247,0.1)' };
const impactColor: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', info: '#6366f1' };

export default function URLCategoryIntel() {
  const [categories, setCategories] = useState<URLCategory[]>([]);
  const [totalDomains, setTotalDomains] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCat, setSelectedCat] = useState('all');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupChecked, setLookupChecked] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [riskFilter, setRiskFilter] = useState('all');
  const [syncPulse, setSyncPulse] = useState(true);
  const [activeTab, setActiveTab] = useState<'categories' | 'policy' | 'sync'>('categories');
  const [syncEvents] = useState<SyncEvent[]>([
    { time: new Date().toLocaleTimeString(), event: 'Dashboard loaded - fetching live category data from Turso DB', affected: 0, modules: ['Web Proxy', 'Email Gateway', 'DNS Filter'], impact: 'info' },
  ]);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  // Fetch real category data from API
  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/threat-intel/categories?mode=summary');
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.success && data.categories) {
        setCategories(data.categories);
        setTotalDomains(data.total_domains || 0);
        setLastRefresh(data.timestamp);
        setError(null);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => {
    const t = setInterval(() => setSyncPulse(p => !p), 3000);
    return () => clearInterval(t);
  }, []);
  // Auto-refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(fetchCategories, 300000);
    return () => clearInterval(t);
  }, [fetchCategories]);

  // Real API lookup
  const handleLookup = async () => {
    if (!lookupInput.trim()) return;
    setLookupLoading(true);
    setLookupChecked(false);
    try {
      const res = await fetch(`/api/v1/threat-intel/lookup?indicator=${encodeURIComponent(lookupInput.trim()}&mode=hybrid`);
      if (!res.ok) throw new Error('Lookup failed');
      const data = await res.json();
      setLookupResult(data);
    } catch {
      setLookupResult(null);
    } finally {
      setLookupChecked(true);
      setLookupLoading(false);
    }
  };

  const totalBlocked = categories.reduce((a, c) => a + c.blocked, 0);
  const criticalCount = categories.filter(c => c.risk === 'critical').reduce((a, c) => a + c.count, 0);
  const policyMismatches = categories.filter(c => c.proxyPolicy !== c.emailPolicy).length;

  const filteredCats = categories.filter(c => {
    if (riskFilter === 'all') return true;
    return c.risk === riskFilter;
  });

  const policyBadge = (action: string) => (
    <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, background: actionBg[action] || actionBg.allow, color: actionColor[action] || actionColor.allow }}>{action}</span>
  );

  return (
    <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", background: '#0a0a0a', color: '#e0e0e0', padding: 24, borderRadius: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap' as const, gap: 16 }}>
        <div>
          <h3 style={{ fontSize: 22, fontWeight: 700, color: '#fff', margin: 0 }}>URL Category Intelligence</h3>
          <p style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Used by Web Proxy & Email Gateway — Shared classification database</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: syncPulse ? '#22c55e' : '#166534', marginRight: 4 }} />
          <span style={{ fontSize: 11, color: '#888' }}>Live Sync Active</span>
          <button onClick={fetchCategories} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #2a2a4a', background: '#12122a', color: '#a5b4fc', fontSize: 11, cursor: 'pointer' }}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Shared Data Banner */}
      <div style={{ background: 'linear-gradient(135deg, #1a1a3e 0%, #0d1a2e 100%)', border: '1px solid #6366f1', borderRadius: 10, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#a5b4fc', marginBottom: 8 }}>Shared Data Source: Web Proxy + Email Gateway + DNS Filter</div>
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, marginBottom: 12 }}>
          All URL categorization data is shared across NextGuard Web Proxy, Email Gateway, and DNS Filter modules.
          Accurate classification is critical — misclassification affects all enforcement points simultaneously.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[{ label: 'Web Proxy', desc: 'HTTP/HTTPS filtering', color: '#06b6d4' },
            { label: 'Email Gateway', desc: 'URL scanning in emails', color: '#a855f7' },
            { label: 'DNS Filter', desc: 'DNS-level blocking', color: '#22c55e' }].map(p => (
            <div key={p.label} style={{ background: '#0a0a1a', borderRadius: 8, padding: '10px 12px', textAlign: 'center' as const, border: '1px solid #1e1e3a' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{p.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: p.color }}>{totalDomains > 0 ? totalDomains.toLocaleString() : '—'}</div>
              <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', borderRadius: 8, padding: 12, marginBottom: 16, fontSize: 12, color: '#ef4444' }}>Error: {error}</div>}

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[{ val: totalDomains.toLocaleString(), label: 'Total Categorized', color: '#6366f1' },
          { val: totalBlocked.toLocaleString(), label: 'Blocked URLs', color: '#ef4444' },
          { val: criticalCount.toLocaleString(), label: 'Critical Threats', color: '#f97316' },
          { val: String(policyMismatches), label: 'Policy Mismatches', color: '#eab308' }].map(s => (
          <div key={s.label} style={{ background: '#12122a', border: '1px solid #1e1e3a', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Lookup */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <input placeholder="Lookup URL or domain (e.g., evil.ru)" value={lookupInput}
          onChange={e => setLookupInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLookup()}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #2a2a4a', background: '#12122a', color: '#fff', fontSize: 13, outline: 'none' }} />
        <button onClick={handleLookup} disabled={lookupLoading}
          style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#6366f1', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          {lookupLoading ? 'Scanning...' : 'Classify'}
        </button>
      </div>

      {/* Lookup Result */}
      {lookupChecked && (
        <div style={{ background: '#12122a', border: `1px solid ${lookupResult ? (lookupResult.threat_score >= 60 ? '#ef4444' : lookupResult.threat_score >= 30 ? '#eab308' : '#22c55e') : '#eab308'}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
          {lookupResult ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{lookupResult.indicator}</span>
                <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const,
                  background: lookupResult.verdict === 'malicious' ? 'rgba(239,68,68,0.2)' : lookupResult.verdict === 'suspicious' ? 'rgba(234,179,8,0.2)' : 'rgba(34,197,94,0.2)',
                  color: lookupResult.verdict === 'malicious' ? '#ef4444' : lookupResult.verdict === 'suspicious' ? '#eab308' : '#22c55e'
                }}>{lookupResult.verdict}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
                <div><span style={{ fontSize: 10, color: '#555' }}>Threat Score</span><br /><span style={{ fontSize: 14, fontWeight: 700, color: lookupResult.threat_score >= 60 ? '#ef4444' : lookupResult.threat_score >= 30 ? '#eab308' : '#22c55e' }}>{lookupResult.threat_score}/100</span></div>
                <div><span style={{ fontSize: 10, color: '#555' }}>Categories</span><br /><span style={{ fontSize: 11, color: '#ccc' }}>{lookupResult.categories.join(', ')}</span></div>
                <div><span style={{ fontSize: 10, color: '#555' }}>Engine</span><br /><span style={{ fontSize: 11, color: '#818cf8' }}>{lookupResult.engine}</span></div>
                <div><span style={{ fontSize: 10, color: '#555' }}>Lookup Time</span><br /><span style={{ fontSize: 11, color: '#ccc' }}>{lookupResult.lookup_ms}ms</span></div>
              </div>
              {lookupResult.sources_hit.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 4, flexWrap: 'wrap' as const }}>
                  {lookupResult.sources_hit.map(s => <span key={s} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}>{s}</span>)}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center' as const, padding: 16 }}>
              <div style={{ fontSize: 14, color: '#eab308', marginBottom: 4 }}>URL Not Found in Database</div>
              <div style={{ fontSize: 11, color: '#888' }}>This URL/domain has not been categorized. Submitting for AI classification.</div>
            </div>
          )}
        </div>
      )}

      {/* Filter & Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {['all', 'critical', 'high', 'medium', 'low', 'safe'].map(r => (
          <button key={r} onClick={() => setRiskFilter(r)}
            style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${riskFilter === r ? '#6366f1' : '#2a2a4a'}`, background: riskFilter === r ? '#1a1a3e' : '#12122a', color: riskFilter === r ? '#a5b4fc' : '#ccc', fontSize: 11, cursor: 'pointer' }}>
            {r === 'all' ? 'All Risk' : r.charAt(0).toUpperCase() + r.slice(1)}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['categories', 'policy', 'sync'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{ padding: '6px 16px', borderRadius: 6, border: `1px solid ${activeTab === tab ? '#6366f1' : '#2a2a4a'}`, background: activeTab === tab ? '#1a1a3e' : 'transparent', color: activeTab === tab ? '#a5b4fc' : '#888', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {tab === 'categories' ? 'Categories' : tab === 'policy' ? 'Policy Matrix' : 'Sync Log'}
          </button>
        ))}
      </div>

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <div style={{ background: '#12122a', borderRadius: 10, border: '1px solid #1e1e3a', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e3a', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
            URL Categories ({filteredCats.length}) {loading && ' — Loading...'}
          </div>
          {loading && categories.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' as const, color: '#555' }}>Loading categories from Turso DB...</div>
          ) : filteredCats.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' as const, color: '#555' }}>No categories found. Run category ingestion first.</div>
          ) : filteredCats.map(cat => (
            <div key={cat.id} onClick={() => setSelectedCat(selectedCat === cat.name ? 'all' : cat.name)}
              style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #0a0a1a', cursor: 'pointer', gap: 8, background: selectedCat === cat.name ? '#1a1a3e' : 'transparent' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, flex: 1 }}>{cat.name}</span>
              <span style={{ fontSize: 11, color: '#888', marginRight: 8 }}>{cat.count.toLocaleString()}</span>
              {policyBadge(cat.proxyPolicy)}
              {policyBadge(cat.emailPolicy)}
            </div>
          ))}
        </div>
      )}

      {/* Policy Matrix Tab */}
      {activeTab === 'policy' && (
        <div style={{ background: '#12122a', borderRadius: 10, border: '1px solid #1e1e3a', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e3a', fontSize: 12, fontWeight: 600, color: '#888' }}>Policy Matrix — Web Proxy vs Email Gateway</div>
          <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr 80px', borderBottom: '1px solid #1e1e3a', background: '#080818' }}>
            {['Category', 'Risk Level', 'Web Proxy', 'Email GW', 'Status'].map(h => (
              <div key={h} style={{ padding: '10px 12px', fontSize: 10, color: '#666', fontWeight: 600, textTransform: 'uppercase' as const, borderRight: '1px solid #0a0a1a' }}>{h}</div>
            ))}
          </div>
          {categories.map(cat => (
            <div key={cat.id} style={{ display: 'grid', gridTemplateColumns: '200px 1fr 1fr 1fr 80px', borderBottom: '1px solid #0a0a1a' }}>
              <div style={{ padding: '10px 12px', fontSize: 11, color: '#ccc', borderRight: '1px solid #0a0a1a' }}>{cat.name}</div>
              <div style={{ padding: '10px 12px', fontSize: 11, borderRight: '1px solid #0a0a1a' }}>
                <span style={{ color: cat.color }}>{cat.risk}</span>
              </div>
              <div style={{ padding: '10px 12px', borderRight: '1px solid #0a0a1a' }}>{policyBadge(cat.proxyPolicy)}</div>
              <div style={{ padding: '10px 12px', borderRight: '1px solid #0a0a1a' }}>{policyBadge(cat.emailPolicy)}</div>
              <div style={{ padding: '10px 12px', fontSize: 10 }}>
                {cat.proxyPolicy === cat.emailPolicy
                  ? <span style={{ color: '#22c55e' }}>✓ Aligned</span>
                  : <span style={{ color: '#eab308' }}>! Mismatch</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sync Log Tab */}
      {activeTab === 'sync' && (
        <div style={{ background: '#0d0d1a', border: '1px solid #1e1e3a', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e1e3a', fontSize: 12, fontWeight: 600, color: '#888', display: 'flex', justifyContent: 'space-between' }}>
            <span>Sync Events Log</span>
            <span style={{ color: syncPulse ? '#22c55e' : '#166534', fontSize: 10 }}>● Live</span>
          </div>
          {syncEvents.map((ev, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 80px', borderBottom: '1px solid #0a0a1a', padding: '10px 16px', gap: 12 }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#555' }}>{ev.time}</span>
              <div>
                <div style={{ fontSize: 11, color: '#ccc' }}>{ev.event}</div>
                <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' as const }}>
                  {ev.modules.map(m => <span key={m} style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{m}</span>)}
                </div>
              </div>
              <span style={{ padding: '2px 6px', borderRadius: 3, fontSize: 9, fontWeight: 700, textTransform: 'uppercase' as const, background: `${impactColor[ev.impact]}20`, color: impactColor[ev.impact], alignSelf: 'start' }}>{ev.impact}</span>
            </div>
          ))}
        </div>
      )}

      {/* Accuracy Panel */}
      <div style={{ background: 'linear-gradient(135deg, #0a0a1a 0%, #0d1a0d 100%)', border: '1px solid #1e3a1e', borderRadius: 10, padding: 16, marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#86efac', marginBottom: 12 }}>Classification Accuracy Impact</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[{ val: totalDomains.toLocaleString(), label: 'Total Classified', color: '#06b6d4' },
            { val: categories.length.toString(), label: 'Categories', color: '#a855f7' },
            { val: lastRefresh ? new Date(lastRefresh).toLocaleTimeString() : '—', label: 'Last Refresh', color: '#22c55e' },
            { val: 'Live', label: 'Data Source', color: '#86efac' }].map(a => (
            <div key={a.label} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 7, padding: 10, textAlign: 'center' as const }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: a.color }}>{a.val}</div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2, textTransform: 'uppercase' as const }}>{a.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
