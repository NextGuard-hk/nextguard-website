// components/threat-intel/platform-stats.tsx
// Phase 7 — Responsive Platform Statistics — uses shared context
'use client';
import React from 'react';
import { useThreatIntelData } from '@/lib/threat-intel-context';

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
  @media (max-width: 480px) { .ps-kpi-grid { grid-template-columns: 1fr 1fr; gap: 8px; } .ps-kpi-value { font-size: 22px; } .ps-kpi { padding: 10px; } }
`;

export default function PlatformStats() {
  const { health, stats, loading, lastRefresh, refresh } = useThreatIntelData();

  const db = health?.checks?.db;
  const totalIOCs = Number(stats?.overview?.active_indicators || db?.total_indicators || 0);
  const activeFeeds = Number(stats?.feeds?.active || db?.active_feeds || 0);
  const lookups24h = Number(stats?.lookup_performance_24h?.total_lookups || db?.lookups_last_24h || 0);
  const probeMs = Number(health?.probe_ms || 0);
  const statusColor = health?.status === 'healthy' ? '#22c55e' : '#ef4444';

  // Risk distribution from by_category
  const riskData = (stats?.by_category || []).reduce((acc: Record<string, number>, c: any) => {
    acc[c.category] = c.count;
    return acc;
  }, {} as Record<string, number>);

  // Feed breakdown from by_feed
  const feedData = (stats?.by_feed || []).reduce((acc: Record<string, number>, f: any) => {
    acc[f.feed] = f.active;
    return acc;
  }, {} as Record<string, number>);

  return (
    <>
      <style>{psStyles}</style>
      <div className="ps-card">
        <div className="ps-header">
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor }} />
            <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '13px' }}>
              {health?.status === 'healthy' ? 'OPERATIONAL' : loading ? 'LOADING...' : 'DEGRADED'}
            </span>
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#666', fontSize: '11px' }}>DB: {probeMs}ms</span>
            <button onClick={refresh} disabled={loading} style={{ padding: '2px 8px', borderRadius: '4px', border: '1px solid #444', background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer' }}>Refresh</button>
          </span>
        </div>
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
              {probeMs < 1000 ? `${probeMs}ms` : `${(probeMs / 1000).toFixed(1)}s`}
            </div>
            <div className="ps-kpi-sub">Turso round-trip</div>
          </div>
        </div>
        {Object.keys(riskData).length > 0 && (
          <div className="ps-section">
            <h4>Risk Distribution</h4>
            {Object.entries(riskData).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([level, count]) => {
              const colors: Record<string, string> = { known_malicious: '#ef4444', high_risk: '#f97316', medium_risk: '#eab308', low_risk: '#60a5fa', clean: '#22c55e', unknown: '#666' };
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
        <div className="ps-refresh">Last refresh: {lastRefresh || 'loading...'}</div>
      </div>
    </>
  );
}
