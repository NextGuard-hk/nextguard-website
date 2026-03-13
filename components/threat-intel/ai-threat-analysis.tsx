// components/threat-intel/ai-threat-analysis.tsx
'use client';
import React, { useState } from 'react';

interface ThreatAnalysisResult {
  threat_landscape: string;
  risk_level: string;
  key_indicators: string[];
  attack_vectors: string[];
  mitre_mapping: string[];
  recommendations: string[];
  confidence: string;
}

const analysisStyles = `
  .ai-analysis-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #6366f155; position: relative; overflow: hidden; margin-bottom: 16px; }
  .ai-analysis-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6); }
  .ai-analysis-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .ai-analysis-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #f59e0b22; border: 1px solid #f59e0b44; color: #fbbf24; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .ai-analysis-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #fbbf24; animation: analysisFlash 2s ease-in-out infinite; }
  @keyframes analysisFlash { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .ai-analysis-input-row { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; }
  .ai-analysis-select { background: #12122a; border: 1px solid #2a2a4a; border-radius: 8px; padding: 8px 12px; color: #c8c8e0; font-size: 12px; outline: none; flex: 1; min-width: 120px; }
  .ai-analysis-select:focus { border-color: #f59e0b; }
  .ai-analysis-btn { padding: 8px 16px; border-radius: 8px; border: 1px solid #f59e0b44; background: #f59e0b22; color: #fbbf24; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .ai-analysis-btn:hover { background: #f59e0b33; border-color: #f59e0b; }
  .ai-analysis-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .ai-analysis-result { margin-top: 14px; }
  .ai-analysis-section { background: #12122a88; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; margin-bottom: 10px; }
  .ai-analysis-section h4 { color: #fbbf24; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; }
  .ai-analysis-section p { color: #c8c8e0; font-size: 12px; line-height: 1.6; margin: 0; }
  .ai-analysis-section li { color: #c8c8e0; font-size: 12px; line-height: 1.5; padding: 2px 0; list-style: none; }
  .ai-analysis-section li::before { content: '▸ '; color: #f59e0b; }
  .ai-analysis-risk-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
  .risk-critical { background: #ef444433; color: #fca5a5; border: 1px solid #ef444455; }
  .risk-high { background: #f59e0b33; color: #fbbf24; border: 1px solid #f59e0b55; }
  .risk-medium { background: #3b82f633; color: #93c5fd; border: 1px solid #3b82f655; }
  .risk-low { background: #22c55e33; color: #86efac; border: 1px solid #22c55e55; }
  .ai-analysis-loading { display: flex; align-items: center; justify-content: center; padding: 30px; color: #888; font-size: 13px; gap: 10px; }
  .ai-analysis-loading .spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #fbbf24; border-radius: 50%; animation: analysisSpin 0.8s linear infinite; }
  @keyframes analysisSpin { to { transform: rotate(360deg); } }
  .ai-analysis-mitre { display: flex; flex-wrap: wrap; gap: 4px; }
  .ai-analysis-mitre-tag { background: #8b5cf622; border: 1px solid #8b5cf644; color: #c4b5fd; padding: 2px 8px; border-radius: 4px; font-size: 10px; }
`;

export default function AIThreatAnalysis() {
  const [analysisType, setAnalysisType] = useState('landscape');
  const [timeRange, setTimeRange] = useState('7d');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/threat-intel/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ioc: `${analysisType}_analysis`,
          ioc_type: 'analysis_request',
          enrichment: { analysisType, timeRange, requestType: 'threat_landscape' },
        }),
      });
      const data = await res.json();
      if (data.success) {
        const a = data.data.analysis;
        setResult({
          threat_landscape: a.what_is_this || '',
          risk_level: a.confidence || 'Medium',
          key_indicators: a.why_risky || [],
          attack_vectors: a.suggested_actions?.map((s: any) => s.action) || [],
          mitre_mapping: a.mitre_ttps || [],
          recommendations: a.suggested_actions?.map((s: any) => `[${s.priority}] ${s.action}: ${s.detail}`) || [],
          confidence: a.confidence || 'Medium',
        });
      } else {
        setError(data.error || 'Analysis failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const getRiskClass = (level: string) => {
    const l = level.toLowerCase();
    if (l.includes('critical')) return 'risk-critical';
    if (l.includes('high')) return 'risk-high';
    if (l.includes('medium')) return 'risk-medium';
    return 'risk-low';
  };

  return (
    <>
      <style>{analysisStyles}</style>
      <div className="ai-analysis-card">
        <div className="ai-analysis-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ai-analysis-badge"><span className="pulse" /> AI Threat Analysis</span>
            <span style={{ color: '#555', fontSize: '10px' }}>Deep Intelligence Engine</span>
          </div>
        </div>

        <div className="ai-analysis-input-row">
          <select className="ai-analysis-select" value={analysisType} onChange={e => setAnalysisType(e.target.value)}>
            <option value="landscape">Threat Landscape</option>
            <option value="apt">APT Group Activity</option>
            <option value="malware">Malware Trends</option>
            <option value="vulnerability">Vulnerability Analysis</option>
            <option value="apac">APAC Regional Threats</option>
          </select>
          <select className="ai-analysis-select" value={timeRange} onChange={e => setTimeRange(e.target.value)}>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
          <button className="ai-analysis-btn" onClick={runAnalysis} disabled={loading}>
            {loading ? 'Analyzing...' : 'Run Analysis'}
          </button>
        </div>

        {loading && (
          <div className="ai-analysis-loading"><div className="spinner" />Running deep threat analysis...</div>
        )}

        {error && !loading && (
          <div style={{ color: '#ef4444', fontSize: '12px', padding: '10px' }}>
            Error: {error}
            <button className="ai-analysis-btn" onClick={runAnalysis} style={{ marginLeft: '10px', fontSize: '10px' }}>Retry</button>
          </div>
        )}

        {result && !loading && (
          <div className="ai-analysis-result">
            <div className="ai-analysis-section">
              <h4>Threat Landscape Assessment <span className={`ai-analysis-risk-badge ${getRiskClass(result.risk_level)}`}>{result.risk_level}</span></h4>
              <p>{result.threat_landscape}</p>
            </div>

            {result.key_indicators.length > 0 && (
              <div className="ai-analysis-section">
                <h4>Key Risk Indicators</h4>
                <ul style={{ margin: 0, padding: 0 }}>
                  {result.key_indicators.map((k, i) => <li key={i}>{k}</li>)}
                </ul>
              </div>
            )}

            {result.mitre_mapping.length > 0 && (
              <div className="ai-analysis-section">
                <h4>MITRE ATT&CK Mapping</h4>
                <div className="ai-analysis-mitre">
                  {result.mitre_mapping.map((t, i) => <span key={i} className="ai-analysis-mitre-tag">{t}</span>)}
                </div>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="ai-analysis-section">
                <h4>Recommendations</h4>
                <ul style={{ margin: 0, padding: 0 }}>
                  {result.recommendations.map((r, i) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
