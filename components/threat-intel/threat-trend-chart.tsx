// components/threat-intel/threat-trend-chart.tsx
'use client';
import React, { useState, useEffect } from 'react';
interface TrendPoint { date: string; added: number; }
const chartStyles = `
  .trend-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; }
  .trend-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .trend-header h3 { color: #e0e0e0; margin: 0; font-size: 15px; }
  .trend-tabs { display: flex; gap: 4px; }
  .trend-tab { padding: 4px 12px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 11px; cursor: pointer; }
  .trend-tab-active { background: #22c55e22; border-color: #22c55e44; color: #22c55e; }
  .trend-svg { width: 100%; height: 200px; }
  .trend-legend { display: flex; gap: 16px; margin-top: 8px; justify-content: center; }
  .trend-legend-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #888; }
  .trend-legend-dot { width: 8px; height: 8px; border-radius: 50%; }
`;
export default function ThreatTrendChart() {
  const [data, setData] = useState<TrendPoint[]>([]);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/v1/threat-intel/stats?days=${days}`)
      .then(r => r.json())
      .then(d => { setData(d.trend?.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [days]);
  const maxVal = Math.max(...data.map(d => d.added), 1);
  const w = 800, h = 180, pad = 30;
  const pw = (w - pad * 2) / Math.max(data.length - 1, 1);
  const points = data.map((d, i) => ({ x: pad + i * pw, y: h - pad - ((d.added / maxVal) * (h - pad * 2)), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 ? linePath + ` L ${points[points.length - 1].x} ${h - pad} L ${pad} ${h - pad} Z` : '';
  const avgLine = data.length > 0 ? h - pad - ((data.reduce((s, d) => s + d.added, 0) / data.length / maxVal) * (h - pad * 2)) : h - pad;
  return (
    <>
      <style>{chartStyles}</style>
      <div className="trend-card">
        <div className="trend-header">
          <h3>IOC Ingestion Trend</h3>
          <div className="trend-tabs">
            {[7, 30, 90].map(d => (
              <button key={d} className={`trend-tab ${days === d ? 'trend-tab-active' : ''}`} onClick={() => setDays(d)}>{d}d</button>
            ))}
          </div>
        </div>
        {loading ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>Loading...</div>
        : data.length === 0 ? <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No data</div>
        : (
          <svg viewBox={`0 0 ${w} ${h}`} className="trend-svg">
            {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => <line key={i} x1={pad} y1={pad + pct * (h - pad * 2)} x2={w - pad} y2={pad + pct * (h - pad * 2)} stroke="#222" strokeWidth="1" />)}
            <defs><linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#22c55e" /><stop offset="100%" stopColor="#22c55e" stopOpacity="0" /></linearGradient></defs>
            <path d={areaPath} fill="url(#trendGrad)" opacity="0.3" />
            <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2" />
            <line x1={pad} y1={avgLine} x2={w - pad} y2={avgLine} stroke="#eab308" strokeWidth="1" strokeDasharray="4 4" />
            {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r="3" fill="#22c55e" stroke="#0a0a1a" strokeWidth="1.5" />)}
            {points.filter((_, i) => i % Math.max(1, Math.floor(points.length / 7)) === 0).map((p, i) => <text key={i} x={p.x} y={h - 8} fill="#666" fontSize="9" textAnchor="middle" fontFamily="monospace">{p.date?.slice(5)}</text>)}
            {[0, 0.5, 1].map((pct, i) => <text key={i} x={pad - 6} y={pad + pct * (h - pad * 2) + 3} fill="#666" fontSize="9" textAnchor="end" fontFamily="monospace">{Math.round(maxVal * (1 - pct))}</text>)}
          </svg>
        )}
        <div className="trend-legend">
          <div className="trend-legend-item"><div className="trend-legend-dot" style={{ background: '#22c55e' }} />IOCs Added</div>
          <div className="trend-legend-item"><div className="trend-legend-dot" style={{ background: '#eab308' }} />Average</div>
        </div>
      </div>
    </>
  );
}
