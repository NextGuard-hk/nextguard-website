'use client';
import React, { useState, useEffect } from 'react';
import { URL_TAXONOMY } from '@/lib/url-categories';

type PolicyAction = 'Allow' | 'Alert' | 'Block';
interface CategoryPolicy { catId: number; action: PolicyAction; }

const ACTION_COLORS: Record<PolicyAction, string> = {
  Allow: '#00cc66',
  Alert: '#ffaa00',
  Block: '#ff4444',
};

const ACTION_BG: Record<PolicyAction, string> = {
  Allow: '#00cc6622',
  Alert: '#ffaa0022',
  Block: '#ff444422',
};

const GROUPS = [...new Set(Object.values(URL_TAXONOMY).map(c => c.group))];

const DEFAULT_POLICIES: Record<number, PolicyAction> = {};
Object.entries(URL_TAXONOMY).forEach(([id, c]) => {
  DEFAULT_POLICIES[Number(id)] = c.defaultAction as PolicyAction;
});

export default function UrlPolicyPage() {
  const [policies, setPolicies] = useState<Record<number, PolicyAction>>(DEFAULT_POLICIES);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [saved, setSaved] = useState(false);
  const [testUrl, setTestUrl] = useState('');
  const [testResult, setTestResult] = useState<{ categories: string[]; action: PolicyAction; verdict: string; score: number } | null>(null);
  const [testing, setTesting] = useState(false);

  const setAction = (catId: number, action: PolicyAction) => {
    setPolicies(prev => ({ ...prev, [catId]: action }));
    setSaved(false);
  };

  const setGroupAction = (group: string, action: PolicyAction) => {
    const updates: Record<number, PolicyAction> = {};
    Object.entries(URL_TAXONOMY).forEach(([id, c]) => {
      if (c.group === group) updates[Number(id)] = action;
    });
    setPolicies(prev => ({ ...prev, ...updates }));
    setSaved(false);
  };

  const resetDefaults = () => {
    setPolicies({ ...DEFAULT_POLICIES });
    setSaved(false);
  };

  const savePolicy = () => {
    try {
      localStorage.setItem('ng_url_policies', JSON.stringify(policies));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {}
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ng_url_policies');
      if (stored) setPolicies(JSON.parse(stored));
    } catch {}
  }, []);

  const testUrlPolicy = async () => {
    if (!testUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/v1/url-policy/evaluate?url=${encodeURIComponent(testUrl)}`);
      if (res.ok) {
        const data = await res.json();
        const cats: string[] = data.categories || [];
        const actionPriority: Record<string, number> = { Block: 3, Alert: 2, Allow: 1 };
        const highestAction = cats.reduce((best: PolicyAction, cat: string) => {
          const catEntry = Object.entries(URL_TAXONOMY).find(([,c]) => c.name.toLowerCase() === cat.toLowerCase() || c.slug.toLowerCase() === cat.toLowerCase());
          const catId = catEntry ? Number(catEntry[0]) : -1;
          const action = catId > 0 ? (policies[catId] || 'Allow') : 'Allow';
          return (actionPriority[action] || 0) > (actionPriority[best] || 0) ? action as PolicyAction : best;
        }, 'Allow' as PolicyAction);
        setTestResult({ categories: cats, action: highestAction, verdict: data.verdict || 'unknown', score: data.threat_score ?? 0 });
      }
    } catch {}
    setTesting(false);
  };

  const filteredCategories = Object.entries(URL_TAXONOMY).filter(([, c]) =>
    selectedGroup === 'All' || c.group === selectedGroup
  );

  const counts = { Allow: 0, Alert: 0, Block: 0 };
  Object.values(policies).forEach(a => { counts[a] = (counts[a] || 0) + 1; });

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', padding: '24px 16px' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '6px' }}>URL Filtering Policy</h1>
          <p style={{ color: '#8b949e', fontSize: '13px' }}>Configure Allow / Alert / Block actions for each URL category. Changes apply to all policy evaluations.</p>
        </div>

        {/* Summary badges */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['Allow', 'Alert', 'Block'] as PolicyAction[]).map(a => (
            <div key={a} style={{ background: ACTION_BG[a], border: `1px solid ${ACTION_COLORS[a]}55`, borderRadius: '8px', padding: '10px 16px', textAlign: 'center' }}>
              <div style={{ color: ACTION_COLORS[a], fontSize: '20px', fontWeight: 700 }}>{counts[a]}</div>
              <div style={{ color: ACTION_COLORS[a], fontSize: '11px', fontWeight: 600 }}>{a}</div>
            </div>
          ))}
          <div style={{ flex: 1 }} />
          <button onClick={resetDefaults} style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: '6px', padding: '8px 14px', cursor: 'pointer', fontSize: '12px' }}>Reset Defaults</button>
          <button onClick={savePolicy} style={{ background: saved ? '#238636' : '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>
            {saved ? '✓ Saved' : 'Save Policy'}
          </button>
        </div>

        {/* URL Test */}
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#8b949e', marginBottom: '10px' }}>TEST URL AGAINST POLICY</div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input
              value={testUrl}
              onChange={e => setTestUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && testUrlPolicy()}
              placeholder="Enter a URL to test..."
              style={{ flex: 1, minWidth: '200px', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#e0e0e0', padding: '8px 12px', fontSize: '13px', fontFamily: 'monospace' }}
            />
            <button onClick={testUrlPolicy} disabled={testing} style={{ background: testing ? '#21262d' : '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 18px', cursor: testing ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>
              {testing ? 'Testing...' : 'Test'}
            </button>
          </div>
          {testResult && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ background: ACTION_BG[testResult.action], border: `1px solid ${ACTION_COLORS[testResult.action]}`, color: ACTION_COLORS[testResult.action], padding: '3px 14px', borderRadius: '20px', fontWeight: 700, fontSize: '13px' }}>
                {testResult.action}
              </span>
              <span style={{ color: '#8b949e', fontSize: '12px' }}>{testResult.verdict} | Score: {testResult.score}</span>
              <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                {testResult.categories.map((c, i) => (
                  <span key={i} style={{ background: '#21262d', color: '#8b949e', padding: '2px 8px', borderRadius: '10px', fontSize: '11px' }}>{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Group filter */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
          {['All', ...GROUPS].map(g => (
            <button key={g} onClick={() => setSelectedGroup(g)} style={{ background: selectedGroup === g ? '#1f6feb' : '#21262d', color: selectedGroup === g ? '#fff' : '#8b949e', border: 'none', borderRadius: '20px', padding: '4px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: selectedGroup === g ? 600 : 400 }}>{g}</button>
          ))}
        </div>

        {/* Group bulk actions */}
        {selectedGroup !== 'All' && (
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ color: '#8b949e', fontSize: '12px' }}>Set all in <strong style={{ color: '#e6edf3' }}>{selectedGroup}</strong>:</span>
            {(['Allow', 'Alert', 'Block'] as PolicyAction[]).map(a => (
              <button key={a} onClick={() => setGroupAction(selectedGroup, a)} style={{ background: ACTION_BG[a], color: ACTION_COLORS[a], border: `1px solid ${ACTION_COLORS[a]}55`, borderRadius: '6px', padding: '3px 12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>{a}</button>
            ))}
          </div>
        )}

        {/* Category list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredCategories.map(([id, cat]) => {
            const catId = Number(id);
            const action = policies[catId] || 'Allow';
            const isChanged = action !== (cat.defaultAction as PolicyAction);
            return (
              <div key={catId} style={{ background: '#161b22', border: `1px solid ${isChanged ? '#1f6feb33' : '#21262d'}`, borderRadius: '6px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: '#e6edf3', fontSize: '13px', fontWeight: 600 }}>{cat.name}</span>
                    <span style={{ color: '#484f58', fontSize: '11px', background: '#21262d', padding: '1px 6px', borderRadius: '4px' }}>{cat.group}</span>
                    {isChanged && <span style={{ color: '#1f6feb', fontSize: '10px' }}>modified</span>}
                  </div>
                  <div style={{ color: '#6e7681', fontSize: '11px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.description}</div>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {(['Allow', 'Alert', 'Block'] as PolicyAction[]).map(a => (
                    <button key={a} onClick={() => setAction(catId, a)} style={{ background: action === a ? ACTION_BG[a] : 'transparent', color: action === a ? ACTION_COLORS[a] : '#484f58', border: `1px solid ${action === a ? ACTION_COLORS[a] + '55' : '#30363d'}`, borderRadius: '5px', padding: '3px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: action === a ? 700 : 400 }}>{a}</button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
