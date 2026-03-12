'use client';

import React, { useState } from 'react';

interface BatchResult {
  domain: string;
  verdict: string;
  riskLevel: string;
  categories: string[];
  sources: string[];
  error?: string;
}

export default function BatchUrlCheck() {
  const [input, setInput] = useState('');
  const [results, setResults] = useState<BatchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleBatchCheck = async () => {
    const urls = input
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0);
    if (urls.length === 0) return;
    setLoading(true);
    setResults([]);
    setProgress(0);
    const batchResults: BatchResult[] = [];
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      try {
        const res = await fetch(
          `/api/v1/threat-intel/lookup?indicator=${encodeURIComponent(url)}`
        );
        const data = await res.json();
        const sources = (data.source_details || [])
          .filter((s: { hit: boolean }) => s.hit)
          .map((s: { name: string }) => s.name);
        batchResults.push({
          domain: url,
          verdict: data.verdict || 'Unknown',
          riskLevel: data.risk_level || 'unknown',
          categories: data.categories || [],
          sources: sources.length > 0 ? sources : (data.sources_hit || []),
        });
      } catch {
        batchResults.push({
          domain: url,
          verdict: 'Error',
          riskLevel: 'unknown',
          categories: [],
          sources: [],
          error: 'Failed to fetch',
        });
      }
      setProgress(Math.round(((i + 1) / urls.length) * 100));
      setResults([...batchResults]);
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const header = 'Domain,Verdict,Risk Level,Categories,Sources';
    const rows = results.map((r) =>
      [
        r.domain,
        r.verdict,
        r.riskLevel,
        r.categories.join('; '),
        r.sources.join('; '),
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'batch-url-check.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'malicious': return '#ff4444';
      case 'suspicious': return '#ffaa00';
      case 'clean': return '#00cc66';
      default: return '#888888';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical': return '#ff4444';
      case 'high': return '#ff6600';
      case 'medium': return '#ffaa00';
      case 'low': return '#00cc66';
      case 'clean': return '#00cc66';
      default: return '#888888';
    }
  };

  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #21262d',
      borderRadius: '8px',
      padding: '24px',
      color: '#e0e0e0',
    }}>
      <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
        Batch URL Check
      </h2>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter URLs to check, one per line..."
        rows={6}
        style={{
          width: '100%',
          background: '#161b22',
          border: '1px solid #30363d',
          borderRadius: '6px',
          color: '#e0e0e0',
          padding: '12px',
          fontSize: '13px',
          fontFamily: 'monospace',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px', alignItems: 'center' }}>
        <button
          onClick={handleBatchCheck}
          disabled={loading}
          style={{
            background: loading ? '#21262d' : '#238636',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '8px 20px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          {loading ? `Checking... ${progress}%` : 'Check URLs'}
        </button>
        {results.length > 0 && (
          <button
            onClick={exportCSV}
            style={{
              background: '#1f6feb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 20px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Export CSV
          </button>
        )}
        {results.length > 0 && (
          <span style={{ color: '#888', fontSize: '13px' }}>
            {results.length} result{results.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      {results.length > 0 && (
        <div style={{ marginTop: '20px', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d' }}>
                {['Domain', 'Verdict', 'Risk Level', 'Categories', 'Sources'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: '#8b949e', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #161b22' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace' }}>{r.domain}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: getVerdictColor(r.verdict), fontWeight: 600 }}>
                      {r.verdict}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: getRiskColor(r.riskLevel), fontWeight: 500 }}>
                      {r.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#8b949e' }}>
                    {r.categories.join(', ') || '-'}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#8b949e' }}>
                    {r.error ? <span style={{ color: '#ff4444' }}>{r.error}</span> : r.sources.join(', ') || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
