// components/threat-intel/live-activity-feed.tsx
// Real-time activity stream for SOC analysts
'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface ActivityItem {
  id: string;
  type: 'alert' | 'block' | 'ingest' | 'query' | 'conflict';
  message: string;
  timestamp: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
  ioc?: string;
}

const feedStyles = `
  .laf-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; max-height: 400px; overflow: hidden; display: flex; flex-direction: column; }
  .laf-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px; }
  .laf-header h3 { color: #e0e0e0; margin: 0; font-size: 15px; }
  .laf-filters { display: flex; gap: 4px; flex-wrap: wrap; }
  .laf-filter { padding: 3px 10px; border-radius: 12px; border: 1px solid #333; background: transparent; color: #888; font-size: 10px; cursor: pointer; }
  .laf-filter-active { background: #22c55e22; border-color: #22c55e44; color: #22c55e; }
  .laf-list { overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 6px; }
  .laf-item { display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px; border-radius: 6px; background: #12122a; font-size: 12px; animation: laf-fadein 0.3s ease; }
  @keyframes laf-fadein { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
  .laf-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
  .laf-msg { color: #ccc; flex: 1; line-height: 1.4; }
  .laf-msg strong { color: #e0e0e0; }
  .laf-time { color: #666; font-size: 10px; font-family: monospace; white-space: nowrap; }
  .laf-ioc { color: #60a5fa; font-family: monospace; font-size: 11px; word-break: break-all; }
  .laf-live { display: inline-flex; align-items: center; gap: 4px; }
  .laf-live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: laf-pulse 1.5s infinite; }
  @keyframes laf-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
`;

const TYPE_COLORS: Record<string, string> = { alert: '#ef4444', block: '#f97316', ingest: '#22c55e', query: '#60a5fa', conflict: '#eab308' };
const SEV_COLORS: Record<string, string> = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#60a5fa', info: '#666' };

export default function LiveActivityFeed() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [paused, setPaused] = useState(false);

  const fetchActivity = useCallback(async () => {
    if (paused) return;
    try {
      const [lookupRes, healthRes] = await Promise.allSettled([
        fetch('/api/v1/threat-intel/stats').then(r => r.json()),
        fetch('/api/v1/threat-intel/health').then(r => r.json()),
      ]);
      const newItems: ActivityItem[] = [];
      const now = new Date().toISOString();
      if (healthRes.status === 'fulfilled') {
        const h = healthRes.value;
        newItems.push({ id: `health-${Date.now()}`, type: 'ingest', message: `Platform: ${h.status || 'unknown'}. DB: ${h.probe_ms || 0}ms`, timestamp: now });
      }
      if (lookupRes.status === 'fulfilled') {
        const s = lookupRes.value;
        const lookups = s.lookup_performance_24h?.total_lookups || 0;
        const threats = s.lookup_performance_24h?.threats_detected || 0;
        if (lookups > 0) newItems.push({ id: `lookup-${Date.now()}`, type: 'query', message: `24h: ${lookups} lookups, ${threats} threats`, timestamp: now });
        const total = s.overview?.active_indicators || 0;
        if (total > 0) newItems.push({ id: `total-${Date.now()}`, type: 'ingest', message: `Active IOCs: ${total.toLocaleString()}`, timestamp: now });
        const crit = s.overview?.severity_breakdown?.critical || 0;
        if (crit > 0) newItems.push({ id: `crit-${Date.now()}`, type: 'alert', message: `${crit} critical IOCs`, timestamp: now, severity: 'critical' });
      }
      setItems(prev => [...newItems, ...prev].slice(0, 50));
    } catch {}
  }, [paused]);

  useEffect(() => { fetchActivity(); const t = setInterval(fetchActivity, 30000); return () => clearInterval(t); }, [fetchActivity]);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  return (
    <>
      <style>{feedStyles}</style>
      <div className="laf-card">
        <div className="laf-header">
          <h3><span className="laf-live"><span className="laf-live-dot" /> Live Activity</span></h3>
          <div className="laf-filters">
            {['all', 'alert', 'ingest', 'query', 'block'].map(f => (
              <button key={f} className={`laf-filter ${filter === f ? 'laf-filter-active' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
            <button className="laf-filter" onClick={() => setPaused(!paused)} style={paused ? { color: '#ef4444', borderColor: '#ef444444' } : {}}>{paused ? 'Resume' : 'Pause'}</button>
          </div>
        </div>
        <div className="laf-list">
          {filtered.length === 0 ? (
            <div style={{ color: '#666', textAlign: 'center', padding: 20 }}>No activity yet</div>
          ) : filtered.map(item => (
            <div key={item.id} className="laf-item">
              <div className="laf-dot" style={{ background: item.severity ? SEV_COLORS[item.severity] : TYPE_COLORS[item.type] }} />
              <div className="laf-msg">
                <strong>[{item.type.toUpperCase()}]</strong> {item.message}
                {item.ioc && <div className="laf-ioc">{item.ioc}</div>}
              </div>
              <span className="laf-time">{new Date(item.timestamp).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
