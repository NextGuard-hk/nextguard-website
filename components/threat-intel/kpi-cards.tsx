// components/threat-intel/kpi-cards.tsx
// Enterprise KPI Cards v6.0 — Active vs Historical IOC display
'use client';
import React from 'react';
import { useThreatIntelData } from '@/lib/threat-intel-context';

const kpiStyles = `
  .kpi-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; position: relative; overflow: hidden; transition: border-color 0.2s; }
  .kpi-card:hover { border-color: #555; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 700; font-family: 'SF Mono', monospace; margin-bottom: 4px; }
  .kpi-sub { font-size: 10px; color: #666; margin-top: 2px; }
  .kpi-icon { font-size: 18px; position: absolute; top: 14px; right: 14px; opacity: 0.3; }
  @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(4, 1fr); } }
  @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .kpi-value { font-size: 22px; } }
`;

export default function KPICards() {
  const { health, stats, loading } = useThreatIntelData();

  if (loading && !health && !stats) {
    return (
      <>
        <style>{kpiStyles}</style>
        <div className="kpi-grid">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="kpi-card" style={{ height: 90, opacity: 0.5 }}>
              <div className="kpi-label">Loading...</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const db = health?.checks?.db;
  const activeIOCs = Number(stats?.overview?.active_indicators || db?.total_indicators || 0);
  const historicalTotal = Number(stats?.overview?.total_indicators || db?.historical_total || activeIOCs);
  const highConf = Number(stats?.overview?.high_confidence || 0);
  const newLast24h = Number(stats?.trend?.data?.slice(-1)[0]?.added || 0);
  const totalFeeds = Number(stats?.feeds?.total || 15);
  const activeFeeds = Number(stats?.feeds?.active || db?.active_feeds || 0);
  const feedHealth = totalFeeds > 0 ? Math.round((activeFeeds / totalFeeds) * 100) : 0;
  const threatActors = Number(stats?.overview?.severity_breakdown?.critical || 0) + Number(stats?.overview?.severity_breakdown?.high || 0);
  const avgLatency = Number(health?.probe_ms || 0);
  const highConfPct = activeIOCs > 0 ? Math.round((highConf / activeIOCs) * 100) : 0;

  const cards = [
    { label: 'Active IOCs', value: activeIOCs.toLocaleString(), color: '#22c55e', icon: '\uD83D\uDEE1', sub: `of ${historicalTotal.toLocaleString()} total` },
    { label: 'Intel Corpus', value: historicalTotal.toLocaleString(), color: '#8b5cf6', icon: '\uD83D\uDDC4', sub: 'Historical + Active' },
    { label: 'New (24h)', value: newLast24h.toLocaleString(), color: '#60a5fa', icon: '+', sub: undefined },
    { label: 'Feed Health', value: `${feedHealth}%`, color: feedHealth >= 80 ? '#22c55e' : feedHealth >= 50 ? '#eab308' : '#ef4444', icon: '\uD83D\uDCE1', sub: `${activeFeeds}/${totalFeeds} feeds active` },
    { label: 'High Risk IOCs', value: threatActors.toLocaleString(), color: '#ef4444', icon: '\u26A0', sub: undefined },
    { label: 'Avg Latency', value: avgLatency < 1000 ? `${avgLatency}ms` : `${(avgLatency / 1000).toFixed(1)}s`, color: '#a78bfa', icon: '\u26A1', sub: undefined },
    { label: 'High Conf %', value: `${highConfPct}%`, color: '#eab308', icon: '\uD83C\uDFAF', sub: undefined },
  ];

  return (
    <>
      <style>{kpiStyles}</style>
      <div className="kpi-grid">
        {cards.map((c, i) => (
          <div key={i} className="kpi-card" style={{ borderTop: `3px solid ${c.color}` }}>
            <span className="kpi-icon">{c.icon}</span>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-value" style={{ color: c.color }}>{c.value}</div>
            {c.sub && <div className="kpi-sub">{c.sub}</div>}
          </div>
        ))}
      </div>
    </>
  );
}
