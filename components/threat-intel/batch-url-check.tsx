'use client';
import React, { useState } from 'react';

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
          threatScore: data.threat_score ?? 0,
          riskLabel: data.risk_label || 'clean',
          scoreBreakdown: data.score_breakdown || null,
          categories: data.categories || [],
          sources: sources.length > 0 ? sources : (data.sources_hit || []),
          categorySource: data.category_source || 'unknown',
        });
      } catch {
        batchResults.push({
          domain: url,
          verdict: 'Error',
          riskLevel: 'unknown',
          threatScore: 0,
          riskLabel: 'unknown',
          scoreBreakdown: null,
          categories: [],
          sources: [],
          categorySource: 'error',
          error: 'Failed to fetch',
        });
      }
      setProgress(Math.round(((i + 1) / urls.length) * 100));
      setResults([...batchResults]);
    }
    setLoading(false);
  };

  const exportCSV = () => {
    const header = 'Domain,Verdict,Threat Score,Risk Label,Risk Level,Categories,Category Source,Sources';
    const rows = results.map((r) =>
      [
        r.domain,
        r.verdict,
        r.threatScore,
        r.riskLabel,
        r.riskLevel,
        r.categories.join('; '),
        r.categorySource,
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

  const getScoreColor = (score: number) => {
    if (score >= 86) return '#ff4444';
    if (score >= 61) return '#ff6600';
    if (score >= 36) return '#ffaa00';
    if (score >= 16) return '#f0e040';
    return '#00cc66';
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

  const getSourceBadgeColor = (src: string) => {
    switch (src) {
      case 'manual-override': return '#da3633';
      case 'cloudflare-radar': return '#f78166';
      case 'live-osint': return '#3fb950';
      case 'heuristic': return '#8b949e';
      default: return '#6e7681';
    }
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case 'manual-override': return 'Manual Override';
      case 'cloudflare-radar': return 'Cloudflare Radar';
      case 'live-osint': return 'Live OSINT';
      case 'turso-url-categories': return 'DB Override';
      case 'turso-indicators': return 'Turso DB';
      case 'heuristic': return 'Heuristic';
      default: return src;
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
          boxSizing: 'border-box' as const,
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
                {['Domain', 'Verdict', 'Threat Score', 'Risk Level', 'Categories', 'Category Source', 'Sources'].map((h) => (
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '60px', height: '8px', background: '#21262d', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${r.threatScore}%`, height: '100%', background: getScoreColor(r.threatScore), borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>
                      <span style={{ color: getScoreColor(r.threatScore), fontWeight: 700, fontSize: '14px', minWidth: '24px' }}>
                        {r.threatScore}
                      </span>
                      <span style={{ color: '#6e7681', fontSize: '11px' }}>
                        {r.riskLabel}
                      </span>
                    </div>
                    {r.scoreBreakdown && (
                      <div style={{ fontSize: '10px', color: '#484f58', marginTop: '2px' }}>
                        IOC:{r.scoreBreakdown.ioc_match} Cat:{r.scoreBreakdown.category_risk} Dom:{r.scoreBreakdown.domain_signals} Conf:{r.scoreBreakdown.confidence_boost}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ color: getRiskColor(r.riskLevel), fontWeight: 500 }}>
                      {r.riskLevel}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: '#8b949e' }}>
                    {r.categories.join(', ') || '-'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      background: getSourceBadgeColor(r.categorySource),
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}>
                      {getSourceLabel(r.categorySource)}
                    </span>
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
