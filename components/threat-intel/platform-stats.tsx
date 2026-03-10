// components/threat-intel/platform-stats.tsx
// Phase 7 — Responsive Platform Statistics Dashboard
'use client';
import React, { useState, useEffect } from 'react';

interface HealthData {
  status: string;
  probe_ms: number;
  checks: {
    db: {
      status: string;
      total_indicators: number;
      active_feeds: number;
      lookups_last_24h: number;
      last_updated: string;
    };
  };
}

interface StatsData {
  byRiskLevel: Record<string, number>;
  byFeed: Record<string, number>;
  lookupsLast24h: number;
  topHitIndicators: Array<{ value: string; hits: number }>;
}

const psStyles = `
  .ps-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; }
  .ps-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .ps-kpi-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
  .ps-kpi { background: #12122a; border-radius: 8px; padding: 12px; border: 1px solid #2a2a4a; }
  .ps-kpi-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .ps-kpi-value { font-size: 28px; font-weight: bold; margin: 4px 0; font-family: monospace; }
  .ps-kpi-sub { font-size: 10px; color: #666; }
  .ps-section { margin-top: 16px; }
  .ps-section h4 { color: #e0e0e0; font-size: 13px; margin: 0 0 8px 0; }
  .ps-bar-row { display: flex; justify-content: space-between; align-items: center; padding: 3px 0; font-size: 12px; }
  .ps-bar-label { color: #aaa; text-transform: capitalize; }
  .ps-bar-value { color: #e0e0e0; font-family: monospace; font-size: 11px; }
  .ps-refresh { font-size: 11px; color: #666; text-align: center; margin-top: 12px; }
  @media (max-width: 480px) {
    .ps-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; }
    .ps-kpi-value { font-size: 22px; }
    .ps-kpi { padding: 10px; }
  }
`;

export default function PlatformStats() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hRes, sRes] = await Promise.allSettled([
        fetch('/api/v1/threat-intel/health').then(r => r.json()),
        fetch('/api/v1/threat-intel/stats').then(r => r.json()),
      ]);
      if (hRes.status === 'fulfilled') setHealth(hRes.value);
      if (sRes.status === 'fulfilled') setStats(sRes.value);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 60000);
    return () => clearInterval(t);
  }, []);

  const db = health?.checks?.db;
  const totalIOCs = db?.total_indicators || 0;
  const activeFeeds = db?.active_feeds || 0;
  const lookups24h = stats?.lookupsLast24h || db?.lookups_last_24h || 0;
  const probeMs = health?.probe_ms || 0;
  const statusColor = health?.status === 'healthy' ? '#22c55e' : '#ef4444';
  const riskData = stats?.byRiskLevel || {};
  const feedData = stats?.byFeed || {};
  const topHits = stats?.topHitIndicators || [];

  return (
    <>
      <style>{psStyles}</style>
      <div className="ps-card">
        {/* Status Header */}
        <div className="ps-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '13px' }}>
              {health?.status === 'healthy' ? 'OPERATIONAL' : loading ? 'LOADING...' : 'DEGRADED'}
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#666', fontSize: '11px' }}>DB: {probeMs}ms</span>
            <button onClick={fetchData} disabled={loading} style={{
              padding: '2px 8px', borderRadius: '4px', border: '1px solid #444',
              background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer',
            }}>Refresh</button>
          </span>
        </div>

        {/* KPI Cards */}
        <div className="ps-kpi-grid">
          <div className="ps-kpi">
            <div className="ps-kpi-label">Total IOCs</div>
            <div className="ps-kpi-value" style={{ color: '#22c55e' }}>{totalIOCs.toLocaleString()}</div>
            <div className="ps-kpi-sub">Active indicators in DB</div>
          </div>
          <div className="ps-kpi">
            <div className="ps-kpi-label">Active Feeds</div>
            <div className="ps-kpi-value" style={{ color: '#60a5fa' }}>{activeFeeds}</div>
            <div className="ps-kpi-sub">Threat intel sources</div>
          </div>
          <div className="ps-kpi">
            <div className="ps-kpi-label">Lookups (24h)</div>
            <div className="ps-kpi-value" style={{ color: '#eab308' }}>{lookups24h}</div>
            <div className="ps-kpi-sub">Queries processed</div>
          </div>
          <div className="ps-kpi">
            <div className="ps-kpi-label">DB Latency</div>
            <div className="ps-kpi-value" style={{ color: '#a78bfa' }}>
              {probeMs < 1000 ? `${probeMs}ms` : `${(probeMs/1000).toFixed(1)}s`}
            </div>
            <div className="ps-kpi-sub">Turso round-trip</div>
          </div>
        </div>

        {/* Risk Distribution */}
        {Object.keys(riskData).length > 0 && (
          <div className="ps-section">
            <h4>Risk Distribution</h4>
            {Object.entries(riskData).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([level, count]) => {
              const colors: Record<string, string> = {
                known_malicious: '#ef4444', high_risk: '#f97316', medium_risk: '#eab308',
                low_risk: '#60a5fa', clean: '#22c55e', unknown: '#666',
              };
              const pct = totalIOCs > 0 ? ((count as number) / totalIOCs * 100) : 0;
              return (
                <div key={level} className="ps-bar-row">
                  <span className="ps-bar-label">{level.replace(/_/g, ' ')}</span>
                  <span className="ps-bar-value" style={{ color: colors[level] || '#888' }}>
                    {(count as number).toLocaleString()} ({pct.toFixed(1)}%)
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Top Feeds */}
        {Object.keys(feedData).length > 0 && (
          <div className="ps-section">
            <h4>Feed Breakdown</h4>
            {Object.entries(feedData).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([feed, count]) => (
              <div key={feed} className="ps-bar-row">
                <span className="ps-bar-label">{feed}</span>
                <span className="ps-bar-value">{(count as number).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}

        {/* Most Queried IOCs */}
        {topHits.length > 0 && (
          <div className="ps-section">
            <h4>Most Queried IOCs</h4>
            {topHits.slice(0, 5).map((h, i) => (
              <div key={i} className="ps-bar-row">
                <span style={{ color: '#e0e0e0', fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>{h.value}</span>
                <span className="ps-bar-value">{h.hits} hits</span>
              </div>
            ))}
          </div>
        )}

        <div className="ps-refresh">Last refresh: {lastRefresh || 'loading...'}</div>
      </div>
    </>
  );
}
