// components/threat-intel/kpi-cards.tsx
// Enterprise KPI Cards for Threat Intel Dashboard
'use client';
import React, { useState, useEffect } from 'react';

interface KPIData {
  totalIOCs: number;
  newLast24h: number;
  feedHealth: number;
  threatActors: number;
  avgQueryLatency: number;
  highConfidencePct: number;
}

const kpiStyles = `
  .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; position: relative; overflow: hidden; transition: border-color 0.2s; }
  .kpi-card:hover { border-color: #555; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 700; font-family: 'SF Mono', monospace; margin-bottom: 4px; }
  .kpi-delta { font-size: 11px; display: flex; align-items: center; gap: 4px; }
  .kpi-delta-up { color: #22c55e; }
  .kpi-delta-down { color: #ef4444; }
  .kpi-icon { font-size: 18px; position: absolute; top: 14px; right: 14px; opacity: 0.3; }
  @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .kpi-value { font-size: 22px; } }
`;

export default function KPICards() {
  const [data, setData] = useState<KPIData | null>(null);
  const [prev, setPrev] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = async () => {
    try {
      const [healthRes, statsRes] = await Promise.allSettled([
        fetch('/api/v1/threat-intel/health').then(r => r.json()),
        fetch('/api/v1/threat-intel/stats').then(r => r.json()),
      ]);
      const health = healthRes.status === 'fulfilled' ? healthRes.value : null;
      const stats = statsRes.status === 'fulfilled' ? statsRes.value : null;
      const db = health?.checks?.db;
      const totalIOCs = Number(stats?.overview?.active_indicators || db?.total_indicators || 0);
      const highConf = Number(stats?.overview?.high_confidence || 0);
      const newData: KPIData = {
        totalIOCs,
        newLast24h: Number(stats?.trend?.data?.slice(-1)[0]?.added || 0),
        feedHealth: stats?.feeds ? Math.round((Number(stats.feeds.active) / Math.max(Number(stats.feeds.total), 1)) * 100) : 0,
        threatActors: Number(stats?.overview?.severity_breakdown?.critical || 0) + Number(stats?.overview?.severity_breakdown?.high || 0),
        avgQueryLatency: Number(health?.probe_ms || 0),
        highConfidencePct: totalIOCs > 0 ? Math.round((highConf / totalIOCs) * 100) : 0,
      };
      if (data) setPrev(data);
      setData(newData);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchKPIs(); const t = setInterval(fetchKPIs, 60000); return () => clearInterval(t); }, []);

  const delta = (curr: number, previous: number | undefined) => {
    if (!previous || previous === 0) return null;
    const pct = ((curr - previous) / previous * 100).toFixed(1);
    const up = curr >= previous;
    return <span className={up ? 'kpi-delta-up' : 'kpi-delta-down'}>{up ? '\u25B2' : '\u25BC'} {Math.abs(Number(pct))}%</span>;
  };

  const cards = data ? [
    { label: 'Total IOCs', value: data.totalIOCs.toLocaleString(), color: '#22c55e', icon: '\uD83D\uDEE1', prev: prev?.totalIOCs },
    { label: 'New (24h)', value: data.newLast24h.toLocaleString(), color: '#60a5fa', icon: '+', prev: prev?.newLast24h },
    { label: 'Feed Health', value: `${data.feedHealth}%`, color: data.feedHealth >= 80 ? '#22c55e' : data.feedHealth >= 50 ? '#eab308' : '#ef4444', icon: '\uD83D\uDCE1', prev: prev?.feedHealth },
    { label: 'High Risk IOCs', value: data.threatActors.toLocaleString(), color: '#ef4444', icon: '\u26A0', prev: prev?.threatActors },
    { label: 'Avg Latency', value: data.avgQueryLatency < 1000 ? `${data.avgQueryLatency}ms` : `${(data.avgQueryLatency/1000).toFixed(1)}s`, color: '#a78bfa', icon: '\u26A1', prev: prev?.avgQueryLatency },
    { label: 'High Conf %', value: `${data.highConfidencePct}%`, color: '#eab308', icon: '\uD83C\uDFAF', prev: prev?.highConfidencePct },
  ] : [];

  if (loading) return <div className="kpi-grid">{[...Array(6)].map((_, i) => <div key={i} className="kpi-card" style={{ height: 90, opacity: 0.5 }}><div className="kpi-label">Loading...</div></div>)}</div>;

  return (
    <>
      <style>{kpiStyles}</style>
      <div className="kpi-grid">
        {cards.map((c, i) => (
          <div key={i} className="kpi-card" style={{ borderTop: `3px solid ${c.color}` }}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value" style={{ color: c.color }}>{c.value}</div>
            <div className="kpi-delta">{delta(Number(String(c.value).replace(/[^0-9.]/g, '')), c.prev)}</div>
          </div>
        ))}
      </div>
    </>
  );
}
