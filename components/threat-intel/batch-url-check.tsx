'use client';
import React, { useState } from 'react';
import { categorizeUrl } from '@/lib/url-categories';

interface BatchResult {
  domain: string;
  verdict: string;
  riskLevel: string;
  threatScore: number;
  riskLabel: string;
  scoreBreakdown: { ioc_match: number; category_risk: number; domain_signals: number; confidence_boost: number } | null;
  categories: string[];
  sources: string[];
  categorySource: string;
  localCategories: string[];
  error?: string;
}

const GROUP_COLORS: Record<string, string> = {
  'Security & Risk': '#ff4444',
  'Infrastructure': '#3b82f6',
  'Business SaaS': '#8b5cf6',
  'Collaboration': '#06b6d4',
  'Storage & Transfer': '#f59e0b',
  'Identity & Access': '#ec4899',
  'AI & Developer': '#10b981',
  'Media & Social': '#f97316',
  'Commerce': '#84cc16',
  'Lifestyle & Regulated': '#ef4444',
};

import { URL_TAXONOMY } from '@/lib/url-categories';
const CATEGORY_TO_GROUP: Record<string, string> = {};
Object.values(URL_TAXONOMY).forEach(c => { CATEGORY_TO_GROUP[c.name] = c.group; });

function getCategoryColor(cat: string): string {
  const group = CATEGORY_TO_GROUP[cat];
  return GROUP_COLORS[group] || '#6e7681';
}

function getDefaultAction(cat: string): string {
  const entry = Object.values(URL_TAXONOMY).find(c => c.name === cat);
  return entry?.defaultAction || 'Allow';
}

function getActionColor(action: string): string {
  switch (action) {
    case 'Block': return '#ff4444';
    case 'Alert': return '#ffaa00';
    case 'Allow': return '#00cc66';
    default: return '#888';
  }
}

export default function BatchUrlCheck() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBatchCheck = async () => {
    const urls = input.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;
    setLoading(true);
    setResults([]);
    setProgress(0);
    const batchResults: BatchResult[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const localCats = categorizeUrl(url);
      try {
        const res = await fetch(`/api/v1/threat-intel/lookup?indicator=${encodeURIComponent(url)}`);
        const data = await res.json();
        const sources = (data.source_details || []).filter((s: { hit: boolean }) => s.hit).map((s: { name: string }) => s.name);
        const apiCats = data.categories || [];
        batchResults.push({
          domain: url,
          verdict: data.verdict || 'Unknown',
          riskLevel: data.risk_level || 'unknown',
          threatScore: data.threat_score ?? 0,
          riskLabel: data.risk_label || 'clean',
          scoreBreakdown: data.score_breakdown || null,
          categories: apiCats.length > 0 ? apiCats : localCats,
          sources: sources.length > 0 ? sources : (data.sources_hit || []),
          categorySource: apiCats.length > 0 ? (data.category_source || 'api') : 'local-taxonomy',
          localCategories: localCats,
        });
      } catch {
        batchResults.push({
          domain: url, verdict: 'Error', riskLevel: 'unknown', threatScore: 0, riskLabel: 'unknown',
          scoreBreakdown: null, categories: localCats, sources: [], categorySource: 'local-taxonomy',
          localCategories: localCats, error: 'Failed to fetch',
        });
      }
      setProgress(Math.round(((i + 1) / urls.length) * 100));
      setResults([...batchResults]);
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const header = 'Domain,Verdict,Threat Score,Risk Label,Categories,Default Action,Category Source,Sources';
    const rows = results.map(r => [
      r.domain, r.verdict, r.threatScore, r.riskLabel,
      r.categories.join('; '),
      r.categories.map(c => getDefaultAction(c)).join('; '),
      r.categorySource, r.sources.join('; '),
    ].join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'batch-url-check.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const getVerdictColor = (v: string) => {
    switch (v.toLowerCase()) {
      case 'malicious': return '#ff4444';
      case 'suspicious': return '#ffaa00';
      case 'clean': return '#00cc66';
      default: return '#888';
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 86) return '#ff4444';
    if (s >= 61) return '#ff6600';
    if (s >= 36) return '#ffaa00';
    if (s >= 16) return '#f0e040';
    return '#00cc66';
  };

  return (
    <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: '12px', padding: '20px' }}>
      <h2 style={{ color: '#e6edf3', fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Batch URL Check</h2>
      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Enter URLs to check, one per line..."
        rows={6}
        style={{ width: '100%', background: '#161b22', border: '1px solid #30363d', borderRadius: '6px', color: '#e0e0e0', padding: '12px', fontSize: '13px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' as const }}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handleBatchCheck} disabled={loading} style={{ background: loading ? '#21262d' : '#238636', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '14px' }}>
          {loading ? `Checking... ${progress}%` : 'Check URLs'}
        </button>
        {results.length > 0 && (
          <button onClick={exportCSV} style={{ background: '#1f6feb', color: '#fff', border: 'none', borderRadius: '6px', padding: '8px 20px', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>Export CSV</button>
        )}
        {results.length > 0 && <span style={{ color: '#888', fontSize: '13px' }}>{results.length} results</span>}
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {results.map((r, i) => (
            <div key={i} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '8px', padding: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ fontFamily: 'monospace', color: '#e6edf3', fontSize: '14px', fontWeight: 600 }}>{r.domain}</span>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ color: getVerdictColor(r.verdict), fontWeight: 700, fontSize: '13px' }}>{r.verdict}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '40px', height: '6px', background: '#21262d', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${r.threatScore}%`, height: '100%', background: getScoreColor(r.threatScore), borderRadius: '3px' }} />
                    </div>
                    <span style={{ color: getScoreColor(r.threatScore), fontWeight: 700, fontSize: '13px' }}>{r.threatScore}</span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                {r.categories.map((cat, j) => {
                  const action = getDefaultAction(cat);
                  return (
                    <span key={j} style={{ background: getCategoryColor(cat) + '22', border: `1px solid ${getCategoryColor(cat)}55`, color: getCategoryColor(cat), padding: '2px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600 }}>
                      {cat}
                    </span>
                  );
                })}
              </div>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '11px', color: '#8b949e' }}>
                {r.categories.length > 0 && (
                  <span>
                    Policy: {[...new Set(r.categories.map(c => getDefaultAction(c)))].map((a, k) => (
                      <span key={k} style={{ color: getActionColor(a), fontWeight: 600 }}>{a} </span>
                    ))}
                  </span>
                )}
                <span>Source: {r.categorySource}</span>
                {r.scoreBreakdown && (
                  <span>IOC:{r.scoreBreakdown.ioc_match} Cat:{r.scoreBreakdown.category_risk} Dom:{r.scoreBreakdown.domain_signals}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
