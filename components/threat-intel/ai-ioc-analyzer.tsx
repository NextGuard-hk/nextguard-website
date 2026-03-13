// components/threat-intel/ai-ioc-analyzer.tsx
'use client';
import React, { useState } from 'react';

interface AIAnalysis {
  what_is_this: string;
  why_risky: string[];
  threat_category: string;
  confidence: string;
  mitre_ttps: string[];
  suggested_actions: { action: string; priority: string; detail: string }[];
  false_positive_assessment: string;
  ticket_note: string;
}

interface AIIOCAnalyzerProps {
  ioc: string;
  ioc_type: string;
  enrichment: any;
}

const analyzerStyles = `
  .ai-analyzer { background: linear-gradient(135deg, #0f172a, #1a1a3e); border-radius: 12px; border: 1px solid #6366f144; overflow: hidden; margin-top: 12px; }
  .ai-analyzer-trigger { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 12px; background: #6366f118; border: none; color: #a78bfa; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .ai-analyzer-trigger:hover { background: #6366f130; }
  .ai-analyzer-content { padding: 16px; }
  .ai-analyzer-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 24px; color: #888; font-size: 12px; }
  .ai-analyzer-loading .spin { width: 16px; height: 16px; border: 2px solid #333; border-top-color: #a78bfa; border-radius: 50%; animation: aiSpin 0.7s linear infinite; }
  @keyframes aiSpin { to { transform: rotate(360deg); } }
  .ai-section { margin-bottom: 14px; }
  .ai-section-title { color: #888; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; font-weight: 600; }
  .ai-section-text { color: #c8c8e0; font-size: 12px; line-height: 1.6; }
  .ai-risk-reasons { list-style: none; padding: 0; margin: 0; }
  .ai-risk-reasons li { color: #fca5a5; font-size: 12px; padding: 3px 0; }
  .ai-risk-reasons li::before { content: 'Warning '; }
  .ai-ttp-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #ef444422; color: #ef4444; font-size: 10px; margin: 2px; font-family: monospace; }
  .ai-action-card { background: #12122a; border-radius: 8px; padding: 10px 12px; border: 1px solid #2a2a4a; margin-bottom: 6px; display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
  .ai-action-priority { padding: 1px 8px; border-radius: 4px; font-size: 9px; font-weight: bold; white-space: nowrap; flex-shrink: 0; }
  .ai-action-priority.high { background: #ef444422; color: #ef4444; }
  .ai-action-priority.medium { background: #eab30822; color: #eab308; }
  .ai-action-priority.low { background: #22c55e22; color: #22c55e; }
  .ai-fp-box { background: #22c55e10; border: 1px solid #22c55e22; border-radius: 6px; padding: 8px 12px; color: #86efac; font-size: 11px; }
  .ai-ticket-box { background: #12122a; border: 1px solid #2a2a4a; border-radius: 8px; padding: 12px; position: relative; }
  .ai-ticket-text { color: #b0b0c8; font-size: 11px; line-height: 1.6; font-family: monospace; white-space: pre-wrap; }
  .ai-ticket-copy { position: absolute; top: 8px; right: 8px; padding: 2px 8px; border-radius: 4px; border: 1px solid #333; background: transparent; color: #888; font-size: 10px; cursor: pointer; }
  .ai-ticket-copy:hover { border-color: #6366f1; color: #a78bfa; }
  .ai-meta-row { display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 10px; border-top: 1px solid #2a2a4a; flex-wrap: wrap; gap: 6px; }
  .ai-model-badge { padding: 2px 8px; border-radius: 10px; font-size: 9px; background: #6366f122; color: #a78bfa; border: 1px solid #6366f133; }
  .ai-cat-badge { padding: 3px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; }
  .ai-conf-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; }
  @media (max-width: 600px) { .ai-analyzer-content { padding: 12px; } .ai-action-card { flex-direction: column; } }
`;

function getConfColor(conf: string) {
  const c = conf?.toLowerCase();
  if (c === 'high') return { bg: '#ef444422', color: '#ef4444' };
  if (c === 'medium') return { bg: '#eab30822', color: '#eab308' };
  return { bg: '#22c55e22', color: '#22c55e' };
}
function getCatColor(cat: string) {
  const c = cat?.toLowerCase() || '';
  if (c.includes('phishing') || c.includes('malware') || c.includes('c2')) return { bg: '#ef444422', color: '#ef4444' };
  if (c.includes('spam') || c.includes('suspicious')) return { bg: '#eab30822', color: '#eab308' };
  if (c.includes('benign') || c.includes('clean')) return { bg: '#22c55e22', color: '#22c55e' };
  return { bg: '#6366f122', color: '#a78bfa' };
}

export default function AIIOCAnalyzer({ ioc, ioc_type, enrichment }: AIIOCAnalyzerProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modelUsed, setModelUsed] = useState('');
  const [open, setOpen] = useState(false);

  const analyze = async () => {
    if (analysis) { setOpen(true); return; }
    setOpen(true); setLoading(true); setError(null);
    try {
      const res = await fetch('/api/v1/threat-intel/ai-analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ioc, ioc_type, enrichment }),
      });
      const data = await res.json();
      if (data.success) { setAnalysis(data.data.analysis); setModelUsed(data.data.model_used || 'Perplexity'); }
      else { setError(data.error || 'Analysis failed'); }
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  };

  const copyTicketNote = () => { if (analysis?.ticket_note) navigator.clipboard.writeText(analysis.ticket_note); };

  return (
    <>
      <style>{analyzerStyles}</style>
      <div className="ai-analyzer">
        {!open && (<button className="ai-analyzer-trigger" onClick={analyze}>Ask AI - Analyze this IOC</button>)}
        {open && (
          <div className="ai-analyzer-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#a78bfa', fontSize: '14px', fontWeight: 700 }}>AI Analysis</span>
                {modelUsed && <span className="ai-model-badge">{modelUsed}</span>}
              </div>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: '1px solid #333', borderRadius: '4px', color: '#888', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}>Close</button>
            </div>
            {loading && (<div className="ai-analyzer-loading"><div className="spin" />Analyzing {ioc} with AI...</div>)}
            {error && !loading && (<div style={{ color: '#ef4444', fontSize: '12px', padding: '8px' }}>Error: {error}<button onClick={() => { setAnalysis(null); analyze(); }} style={{ marginLeft: '8px', color: '#a78bfa', background: 'none', border: '1px solid #6366f144', borderRadius: '4px', padding: '2px 8px', fontSize: '10px', cursor: 'pointer' }}>Retry</button></div>)}
            {analysis && !loading && (
              <>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                  {analysis.threat_category && <span className="ai-cat-badge" style={{ background: getCatColor(analysis.threat_category).bg, color: getCatColor(analysis.threat_category).color }}>{analysis.threat_category}</span>}
                  {analysis.confidence && <span className="ai-conf-badge" style={{ background: getConfColor(analysis.confidence).bg, color: getConfColor(analysis.confidence).color }}>Confidence: {analysis.confidence}</span>}
                </div>
                <div className="ai-section"><h4 className="ai-section-title">What is this?</h4><div className="ai-section-text">{analysis.what_is_this}</div></div>
                {analysis.why_risky?.length > 0 && (<div className="ai-section"><h4 className="ai-section-title">Why is it risky?</h4><ul className="ai-risk-reasons">{analysis.why_risky.map((r, i) => <li key={i}>{r}</li>)}</ul></div>)}
                {analysis.mitre_ttps?.length > 0 && (<div className="ai-section"><h4 className="ai-section-title">MITRE ATT&CK TTPs</h4><div>{analysis.mitre_ttps.map((t, i) => (<span key={i} className="ai-ttp-tag">{t}</span>))}</div></div>)}
                {analysis.suggested_actions?.length > 0 && (<div className="ai-section"><h4 className="ai-section-title">Suggested Actions</h4>{analysis.suggested_actions.map((a, i) => (<div key={i} className="ai-action-card"><div style={{ flex: 1, minWidth: 0 }}><div style={{ color: '#e0e0e0', fontSize: '12px', fontWeight: 600 }}>{a.action}</div><div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>{a.detail}</div></div><span className={`ai-action-priority ${(a.priority || '').toLowerCase()}`}>{a.priority}</span></div>))}</div>)}
                {analysis.false_positive_assessment && (<div className="ai-section"><h4 className="ai-section-title">False Positive Assessment</h4><div className="ai-fp-box">{analysis.false_positive_assessment}</div></div>)}
                {analysis.ticket_note && (<div className="ai-section"><h4 className="ai-section-title">Ready-to-Paste Ticket Note</h4><div className="ai-ticket-box"><button className="ai-ticket-copy" onClick={copyTicketNote}>Copy</button><div className="ai-ticket-text">{analysis.ticket_note}</div></div></div>)}
                <div className="ai-meta-row"><span style={{ color: '#555', fontSize: '10px' }}>Analyzed: {new Date().toLocaleTimeString()}</span><button onClick={() => { setAnalysis(null); analyze(); }} style={{ padding: '3px 10px', borderRadius: '5px', border: '1px solid #6366f144', background: '#6366f118', color: '#a78bfa', fontSize: '10px', cursor: 'pointer' }}>Re-analyze</button></div>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
