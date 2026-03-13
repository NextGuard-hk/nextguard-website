// components/threat-intel/ai-threat-brief.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface BriefData {
  title: string;
  summary: string;
  key_findings: string[];
  risk_assessment: string;
  recommended_actions: string[];
  regional_focus: string;
}

const briefStyles = `
  .ai-brief-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #6366f155; position: relative; overflow: hidden; margin-bottom: 16px; }
  .ai-brief-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #a78bfa, #22d3ee); }
  .ai-brief-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .ai-brief-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #6366f122; border: 1px solid #6366f144; color: #a78bfa; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .ai-brief-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #a78bfa; animation: aiBriefPulse 2s ease-in-out infinite; }
  @keyframes aiBriefPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .ai-brief-title { color: #e0e0e0; font-size: 17px; font-weight: 700; margin: 0 0 8px 0; }
  .ai-brief-summary { color: #b0b0c8; font-size: 13px; line-height: 1.6; margin-bottom: 14px; }
  .ai-brief-sections { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .ai-brief-section { background: #12122a88; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; }
  .ai-brief-section h4 { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px 0; }
  .ai-brief-section li { color: #c8c8e0; font-size: 12px; line-height: 1.5; padding: 2px 0; list-style: none; }
  .ai-brief-section li::before { content: '> '; color: #6366f1; }
  .ai-brief-risk { background: #ef444415; border: 1px solid #ef444433; border-radius: 8px; padding: 10px 12px; color: #fca5a5; font-size: 12px; margin-top: 12px; display: flex; align-items: center; gap: 8px; }
  .ai-brief-regional { color: #22d3ee; font-size: 11px; margin-top: 10px; padding: 8px 12px; background: #22d3ee10; border-radius: 6px; border: 1px solid #22d3ee22; }
  .ai-brief-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; flex-wrap: wrap; gap: 8px; }
  .ai-brief-time { color: #555; font-size: 10px; }
  .ai-brief-actions { display: flex; gap: 6px; }
  .ai-brief-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 10px; cursor: pointer; transition: all 0.2s; }
  .ai-brief-btn:hover { border-color: #6366f1; color: #a78bfa; }
  .ai-brief-btn-regen { background: #6366f122; border-color: #6366f144; color: #a78bfa; }
  .ai-brief-loading { display: flex; align-items: center; justify-content: center; padding: 30px; color: #888; font-size: 13px; gap: 10px; }
  .ai-brief-loading .spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #a78bfa; border-radius: 50%; animation: aiBriefSpin 0.8s linear infinite; }
  @keyframes aiBriefSpin { to { transform: rotate(360deg); } }
  @media (max-width: 600px) { .ai-brief-sections { grid-template-columns: 1fr; } .ai-brief-card { padding: 14px; } }
`;

export default function AIThreatBrief() {
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState('');
  const [collapsed, setCollapsed] = useState(false);

  const fetchBrief = async (force = false) => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/v1/threat-intel/ai-brief', { method: force ? 'POST' : 'GET' });
      const data = await res.json();
      if (data.success) {
        const b = data.data.brief || (data.data.text ? JSON.parse(data.data.text) : data.data);
        setBrief(b);
        setGeneratedAt(data.data.generatedAt || new Date().toISOString());
      } else { setError(data.error || 'Failed to generate brief'); }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  useEffect(() => { fetchBrief(); }, []);

  const handleCopy = () => {
    if (!brief) return;
    const text = ['AI Threat Brief - ' + brief.title, '', brief.summary, '', 'Key Findings:', ...brief.key_findings.map(f => '- ' + f), '', 'Risk: ' + brief.risk_assessment, '', 'Actions:', ...brief.recommended_actions.map(a => '- ' + a), '', brief.regional_focus ? 'APAC: ' + brief.regional_focus : ''].join('\n');
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <style>{briefStyles}</style>
      <div className="ai-brief-card">
        <div className="ai-brief-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="ai-brief-badge"><span className="pulse" /> AI Threat Brief</span>
            <span style={{ color: '#555', fontSize: '10px' }}>Powered by Perplexity + DeepSeek</span>
          </div>
          <button className="ai-brief-btn" onClick={() => setCollapsed(!collapsed)} style={{ fontSize: '12px' }}>
            {collapsed ? 'Expand' : 'Collapse'}
          </button>
        </div>
        {loading && (<div className="ai-brief-loading"><div className="spinner" />Generating AI threat intelligence brief...</div>)}
        {error && !loading && (<div style={{ color: '#ef4444', fontSize: '12px', padding: '10px' }}>Warning: {error}<button className="ai-brief-btn" onClick={() => fetchBrief(true)} style={{ marginLeft: '10px' }}>Retry</button></div>)}
        {brief && !loading && !collapsed && (
          <>
            <h3 className="ai-brief-title">{brief.title}</h3>
            <div className="ai-brief-summary">{brief.summary}</div>
            <div className="ai-brief-sections">
              <div className="ai-brief-section">
                <h4>Key Findings</h4>
                <ul style={{ margin: 0, padding: 0 }}>{(brief.key_findings || []).map((f, i) => (<li key={i}>{f}</li>))}</ul>
              </div>
              <div className="ai-brief-section">
                <h4>Recommended Actions</h4>
                <ul style={{ margin: 0, padding: 0 }}>{(brief.recommended_actions || []).map((a, i) => (<li key={i}>{a}</li>))}</ul>
              </div>
            </div>
            {brief.risk_assessment && (<div className="ai-brief-risk"><span style={{ fontSize: '16px' }}>!</span><span>{brief.risk_assessment}</span></div>)}
            {brief.regional_focus && (<div className="ai-brief-regional"><strong>APAC Focus:</strong> {brief.regional_focus}</div>)}
            <div className="ai-brief-footer">
              <span className="ai-brief-time">Generated: {generatedAt ? new Date(generatedAt).toLocaleString() : '-'}</span>
              <div className="ai-brief-actions">
                <button className="ai-brief-btn" onClick={handleCopy}>Copy to Report</button>
                <button className="ai-brief-btn ai-brief-btn-regen" onClick={() => fetchBrief(true)}>Regenerate</button>
              </div>
            </div>
          </>
        )}
        {brief && !loading && collapsed && (<div style={{ color: '#b0b0c8', fontSize: '12px' }}><strong>{brief.title}</strong> - {brief.summary?.slice(0, 100)}...</div>)}
      </div>
    </>
  );
}
