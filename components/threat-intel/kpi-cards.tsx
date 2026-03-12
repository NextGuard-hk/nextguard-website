// components/threat-intel/kpi-cards.tsx
// Enterprise KPI Cards — uses shared ThreatIntel context (no independent API calls)
'use client';
import React from 'react';
import { useThreatIntelData } from '@/lib/threat-intel-context';

const kpiStyles = `
  .kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
  .kpi-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; position: relative; overflow: hidden; transition: border-color 0.2s; }
  .kpi-card:hover { border-color: #555; }
  .kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }
  .kpi-value { font-size: 28px; font-weight: 700; font-family: 'SF Mono', monospace; margin-bottom: 4px; }
  .kpi-icon { font-size: 18px; position: absolute; top: 14px; right: 14px; opacity: 0.3; }
  @media (max-width: 1200px) { .kpi-grid { grid-template-columns: repeat(3, 1fr); } }
  @media (max-width: 600px) { .kpi-grid { grid-template-columns: repeat(2, 1fr); } .kpi-value { font-size: 22px; } }
`;

export default function KPICards() {
  const { health, stats, loading } = useThreatIntelData();

  if (loading && !health && !stats) {
    return (
      <>
        <style>{kpiStyles}</style>
        <div className="kpi-grid">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="kpi-card" style={{ height: 90, opacity: 0.5 }}>
              <div className="kpi-label">Loading...</div>
            </div>
          ))}
        </div>
      </>
    );
  }

  const db = health?.checks?.db;
  const totalIOCs = Number(stats?.overview?.active_indicators || db?.total_indicators || 0);
  const highConf = Number(stats?.overview?.high_confidence || 0);
  const newLast24h = Number(stats?.trend?.data?.slice(-1)[0]?.added || 0);
  const feedHealth = stats?.feeds ? Math.round((Number(stats.feeds.active) / Math.max(Number(stats.feeds.total), 1)) * 100) : (db?.active_feeds ? 85 : 0);
  const threatActors = Number(stats?.overview?.severity_breakdown?.critical || 0) + Number(stats?.overview?.severity_breakdown?.high || 0);
  const avgLatency = Number(health?.probe_ms || 0);
  const highConfPct = totalIOCs > 0 ? Math.round((highConf / totalIOCs) * 100) : 0;

  const cards = [
    { label: 'Total IOCs', value: totalIOCs.toLocaleString(), color: '#22c55e', icon: '\uD83D\uDEE1' },
    { label: 'New (24h)', value: newLast24h.toLocaleString(), color: '#60a5fa', icon: '+' },
    { label: 'Feed Health', value: `${feedHealth}%`, color: feedHealth >= 80 ? '#22c55e' : feedHealth >= 50 ? '#eab308' : '#ef4444', icon: '\uD83D\uDCE1' },
    { label: 'High Risk IOCs', value: threatActors.toLocaleString(), color: '#ef4444', icon: '\u26A0' },
    { label: 'Avg Latency', value: avgLatency < 1000 ? `${avgLatency}ms` : `${(avgLatency / 1000).toFixed(1)}s`, color: '#a78bfa', icon: '\u26A1' },
    { label: 'High Conf %', value: `${highConfPct}%`, color: '#eab308', icon: '\uD83C\uDFAF' },
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
          </div>
        ))}
      </div>
    </>
  );
}
