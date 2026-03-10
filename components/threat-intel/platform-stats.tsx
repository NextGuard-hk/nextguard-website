// components/threat-intel/platform-stats.tsx
// Live Platform Statistics Dashboard Component
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

const CARD_STYLE: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: '12px',
  padding: '16px',
  border: '1px solid #333',
};

const STAT_NUM: React.CSSProperties = {
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '4px 0',
  fontFamily: 'monospace',
};

export default function PlatformStats() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

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

  useEffect(() => { fetchData(); const t = setInterval(fetchData, 60000); return () => clearInterval(t); }, []);

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Status Header */}
      <div style={{ ...CARD_STYLE, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '10px', height: '10px', borderRadius: '50%',
            background: statusColor, boxShadow: `0 0 8px ${statusColor}`,
          }} />
          <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '14px' }}>
            {health?.status === 'healthy' ? 'OPERATIONAL' : loading ? 'LOADING...' : 'DEGRADED'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#666', fontSize: '11px' }}>DB: {probeMs}ms</span>
          <button onClick={fetchData} style={{
            padding: '2px 8px', borderRadius: '4px', border: '1px solid #444',
            background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer',
          }}>Refresh</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={CARD_STYLE}>
          <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Total IOCs</div>
          <div style={{ ...STAT_NUM, color: '#60a5fa' }}>{totalIOCs.toLocaleString()}</div>
          <div style={{ color: '#555', fontSize: '10px' }}>Active indicators in DB</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Active Feeds</div>
          <div style={{ ...STAT_NUM, color: '#22c55e' }}>{activeFeeds}</div>
          <div style={{ color: '#555', fontSize: '10px' }}>Threat intel sources</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>Lookups (24h)</div>
          <div style={{ ...STAT_NUM, color: '#a78bfa' }}>{lookups24h}</div>
          <div style={{ color: '#555', fontSize: '10px' }}>Queries processed</div>
        </div>
        <div style={CARD_STYLE}>
          <div style={{ color: '#888', fontSize: '11px', textTransform: 'uppercase' }}>DB Latency</div>
          <div style={{ ...STAT_NUM, color: probeMs < 2000 ? '#22c55e' : probeMs < 4000 ? '#eab308' : '#ef4444' }}>
            {probeMs < 1000 ? `${probeMs}ms` : `${(probeMs/1000).toFixed(1)}s`}
          </div>
          <div style={{ color: '#555', fontSize: '10px' }}>Turso round-trip</div>
        </div>
      </div>

      {/* Risk Distribution */}
      {Object.keys(riskData).length > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold', marginBottom: '12px' }}>
            Risk Distribution
          </div>
          {Object.entries(riskData).sort((a, b) => (b[1] as number) - (a[1] as number)).map(([level, count]) => {
            const colors: Record<string, string> = {
              known_malicious: '#ef4444', high_risk: '#f97316',
              medium_risk: '#eab308', low_risk: '#60a5fa',
              clean: '#22c55e', unknown: '#666',
            };
            const pct = totalIOCs > 0 ? ((count as number) / totalIOCs * 100) : 0;
            return (
              <div key={level} style={{ marginBottom: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '2px' }}>
                  <span style={{ color: colors[level] || '#888' }}>{level.replace(/_/g, ' ')}</span>
                  <span style={{ color: '#888' }}>{(count as number).toLocaleString()} ({pct.toFixed(1)}%)</span>
                </div>
                <div style={{ height: '4px', background: '#222', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(pct, 100)}%`, background: colors[level] || '#888', borderRadius: '2px' }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Top Feeds */}
      {Object.keys(feedData).length > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            Feed Breakdown
          </div>
          {Object.entries(feedData).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([feed, count]) => (
            <div key={feed} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px' }}>
              <span style={{ color: '#aaa' }}>{feed}</span>
              <span style={{ color: '#60a5fa', fontFamily: 'monospace' }}>{(count as number).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {/* Most Queried IOCs */}
      {topHits.length > 0 && (
        <div style={CARD_STYLE}>
          <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
            Most Queried IOCs
          </div>
          {topHits.slice(0, 5).map((h, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px' }}>
              <span style={{ color: '#ef4444', fontFamily: 'monospace' }}>{h.value}</span>
              <span style={{ color: '#888' }}>{h.hits} hits</span>
            </div>
          ))}
        </div>
      )}

      {/* Last Refresh */}
      <div style={{ textAlign: 'center', color: '#555', fontSize: '10px' }}>
        Last refresh: {lastRefresh || 'loading...'}
      </div>
    </div>
  );
}
