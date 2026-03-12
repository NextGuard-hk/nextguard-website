// components/threat-intel/pyramid-of-pain.tsx
// David Bianco's Pyramid of Pain visualization
'use client';
import React, { useState, useEffect } from 'react';

const popStyles = `
  .pop-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; }
  .pop-card h3 { color: #e0e0e0; margin: 0 0 16px 0; font-size: 15px; }
  .pop-pyramid { display: flex; flex-direction: column; align-items: center; gap: 2px; }
  .pop-layer { display: flex; align-items: center; justify-content: center; border-radius: 4px; padding: 10px; text-align: center; position: relative; cursor: pointer; transition: all 0.2s; }
  .pop-layer:hover { filter: brightness(1.3); transform: scale(1.02); }
  .pop-layer-label { font-size: 12px; font-weight: 600; color: #fff; }
  .pop-layer-count { font-size: 10px; color: rgba(255,255,255,0.7); margin-left: 8px; font-family: monospace; }
  .pop-layer-bar { position: absolute; left: 0; top: 0; height: 100%; border-radius: 4px; opacity: 0.15; }
  .pop-desc { font-size: 10px; color: #888; text-align: center; margin-top: 12px; }
`;

const LAYERS = [
  { key: 'ttps', label: 'TTPs', color: '#ef4444', width: '30%', pain: 'Tough!' },
  { key: 'tools', label: 'Tools', color: '#f97316', width: '42%', pain: 'Challenging' },
  { key: 'network', label: 'Network/Host Artifacts', color: '#eab308', width: '54%', pain: 'Annoying' },
  { key: 'domain', label: 'Domain Names', color: '#84cc16', width: '66%', pain: 'Simple' },
  { key: 'ipv4', label: 'IP Addresses', color: '#22d3ee', width: '78%', pain: 'Easy' },
  { key: 'hash', label: 'Hash Values', color: '#60a5fa', width: '90%', pain: 'Trivial' },
];

export default function PyramidOfPain() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/threat-intel/stats')
      .then(r => r.json())
      .then(d => {
        const byType: Record<string, number> = {};
        (d.by_type || []).forEach((t: any) => {
          const type = (t.type || '').toLowerCase();
          if (type.includes('hash') || type === 'md5' || type === 'sha1' || type === 'sha256') byType.hash = (byType.hash || 0) + t.count;
          else if (type.includes('ip') || type === 'ipv4' || type === 'ipv6') byType.ipv4 = (byType.ipv4 || 0) + t.count;
          else if (type.includes('domain') || type === 'hostname') byType.domain = (byType.domain || 0) + t.count;
          else if (type.includes('url') || type.includes('uri')) byType.network = (byType.network || 0) + t.count;
          else if (type.includes('mutex') || type.includes('registry') || type.includes('file')) byType.tools = (byType.tools || 0) + t.count;
          else byType.ttps = (byType.ttps || 0) + t.count;
        });
        setCounts(byType);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = Object.values(counts).reduce((s, c) => s + c, 0);

  return (
    <>
      <style>{popStyles}</style>
      <div className="pop-card">
        <h3>Pyramid of Pain</h3>
        {loading ? <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>Loading...</div> : (
          <div className="pop-pyramid">
            {LAYERS.map(l => {
              const count = counts[l.key] || 0;
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
              return (
                <div key={l.key} className="pop-layer" style={{ width: l.width, background: l.color + '33', borderLeft: `3px solid ${l.color}` }}>
                  <span className="pop-layer-label">{l.label}</span>
                  <span className="pop-layer-count">{count.toLocaleString()} ({pct}%)</span>
                  <div style={{ position: 'absolute', right: 8, fontSize: 9, color: l.color, opacity: 0.8 }}>{l.pain}</div>
                </div>
              );
            })}
          </div>
        )}
        <div className="pop-desc">Higher layers = harder for attackers to change = more valuable intel</div>
      </div>
    </>
  );
}
