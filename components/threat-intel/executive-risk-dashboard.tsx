// components/threat-intel/executive-risk-dashboard.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useThreatIntelData } from '@/lib/threat-intel-context';

const erdStyles = `
.erd-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #6366f144; position: relative; overflow: hidden; margin-bottom: 16px; }
.erd-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #6366f1, #8b5cf6, #a855f7); }
.erd-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 8px; }
.erd-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
.erd-score-ring { width: 140px; height: 140px; margin: 0 auto 16px; position: relative; }
.erd-score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.erd-score-ring circle { fill: none; stroke-width: 10; stroke-linecap: round; }
.erd-score-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
.erd-score-num { font-size: 36px; font-weight: 800; line-height: 1; }
.erd-score-label { font-size: 10px; color: #888; text-transform: uppercase; margin-top: 4px; }
.erd-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
.erd-metric { background: #12122a; border-radius: 10px; padding: 12px; border: 1px solid #2a2a4a; text-align: center; }
.erd-metric-value { font-size: 22px; font-weight: 700; line-height: 1.2; }
.erd-metric-label { font-size: 9px; color: #888; text-transform: uppercase; margin-top: 4px; }
.erd-categories { display: flex; flex-direction: column; gap: 10px; }
.erd-cat { background: #12122a; border-radius: 10px; padding: 12px; border: 1px solid #2a2a4a; cursor: pointer; }
.erd-cat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.erd-cat-name { color: #e0e0e0; font-size: 12px; font-weight: 600; }
.erd-cat-score { font-size: 14px; font-weight: 700; }
.erd-cat-bar { height: 4px; background: #1a1a3a; border-radius: 2px; overflow: hidden; }
.erd-cat-fill { height: 100%; border-radius: 2px; transition: width 0.5s; }
.erd-loading { text-align: center; color: #666; padding: 40px; font-size: 13px; }
.erd-src { font-size: 9px; color: #555; text-align: right; margin-top: 10px; }
@media (max-width: 480px) { .erd-metrics { grid-template-columns: repeat(2, 1fr); } }
`;

function getColor(s: number) { return s >= 80 ? '#22c55e' : s >= 60 ? '#f59e0b' : '#ef4444'; }
function getLabel(s: number) { return s >= 80 ? 'Good' : s >= 60 ? 'Moderate' : 'Critical'; }

export default function ExecutiveRiskDashboard() {
  const { health, stats, loading } = useThreatIntelData();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [kevCount, setKevCount] = useState(0);
  const [mitreGroups, setMitreGroups] = useState(0);

  useEffect(() => {
    fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json')
      .then(r => r.json()).then(d => {
        const recent = (d.vulnerabilities || []).filter((v: any) => {
          const a = new Date(v.dateAdded); const w = new Date(); w.setDate(w.getDate() - 30); return a >= w;
        }); setKevCount(recent.length);
      }).catch(() => {});
    fetch('/api/v1/threat-intel/mitre').then(r => r.json()).then(d => setMitreGroups(d.totalGroups || 0)).catch(() => {});
  }, []);

  const db = health?.checks?.db;
  const activeIOCs = Number(stats?.overview?.active_indicators || db?.total_indicators || 0);
  const totalFeeds = Number(stats?.feeds?.total || 15);
  const activeFeeds = Number(stats?.feeds?.active || db?.active_feeds || 0);
  const feedHealth = totalFeeds > 0 ? Math.round((activeFeeds / totalFeeds) * 100) : 0;
  const avgLatency = Number(health?.probe_ms || 0);
  const critIOCs = Number(stats?.overview?.severity_breakdown?.critical || 0);
  const highIOCs = Number(stats?.overview?.severity_breakdown?.high || 0);
  const dbOk = health?.status === 'operational' ? 100 : 60;
  const feedScore = Math.min(feedHealth, 100);
  const latScore = avgLatency < 200 ? 95 : avgLatency < 500 ? 80 : 60;
  const iocScore = activeIOCs > 1000 ? 90 : activeIOCs > 100 ? 75 : activeIOCs > 0 ? 50 : 20;
  const riskScore = Math.round(feedScore * 0.3 + latScore * 0.2 + iocScore * 0.3 + dbOk * 0.2);
  const c = 2 * Math.PI * 58;
  const off = c - (riskScore / 100) * c;
  const sc = getColor(riskScore);

  const metrics = [
    { label: 'Active IOCs', value: activeIOCs.toLocaleString(), color: '#22c55e' },
    { label: 'Feed Health', value: `${feedHealth}%`, color: getColor(feedHealth) },
    { label: 'DB Latency', value: `${avgLatency}ms`, color: avgLatency < 500 ? '#22c55e' : '#f59e0b' },
    { label: 'Critical IOCs', value: critIOCs.toLocaleString(), color: '#ef4444' },
    { label: 'Active KEVs', value: kevCount.toString(), color: '#f59e0b' },
    { label: 'MITRE Groups', value: mitreGroups.toString(), color: '#8b5cf6' },
  ];

  const cats = [
    { name: 'Threat Intel Coverage', score: iocScore, items: [`${activeIOCs.toLocaleString()} active IOCs`, `${activeFeeds}/${totalFeeds} feeds`, `${critIOCs + highIOCs} high-risk`] },
    { name: 'Infrastructure Health', score: Math.round((latScore + dbOk) / 2), items: [`DB: ${avgLatency}ms`, `Status: ${health?.status || 'checking'}`, 'Monitoring: active'] },
    { name: 'Vulnerability Exposure', score: kevCount > 20 ? 50 : kevCount > 10 ? 65 : 85, items: [`${kevCount} CISA KEVs (30d)`, `${mitreGroups} threat groups`, 'Monitoring: enabled'] },
  ];

  if (loading && !health && !stats) return (<><style>{erdStyles}</style><div className="erd-card"><div className="erd-loading">Loading...</div></div></>);

  return (<>
    <style>{erdStyles}</style>
    <div className="erd-card">
      <div className="erd-header">
        <div><h3 style={{ color: '#e0e0e0', margin: 0, fontSize: 15 }}>Executive Risk Dashboard</h3>
          <p style={{ color: '#888', fontSize: 11, margin: '4px 0 0' }}>Live security posture from real data</p></div>
        <span className="erd-badge" style={{ background: `${sc}22`, border: `1px solid ${sc}44`, color: sc }}>{getLabel(riskScore)} Posture</span>
      </div>
      <div className="erd-score-ring">
        <svg viewBox="0 0 128 128"><circle cx="64" cy="64" r="58" stroke="#1a1a3a" /><circle cx="64" cy="64" r="58" stroke={sc} strokeDasharray={c} strokeDashoffset={off} /></svg>
        <div className="erd-score-value"><div className="erd-score-num" style={{ color: sc }}>{riskScore}</div><div className="erd-score-label">Risk Score</div></div>
      </div>
      <div className="erd-metrics">{metrics.map(m => (<div key={m.label} className="erd-metric"><div className="erd-metric-value" style={{ color: m.color }}>{m.value}</div><div className="erd-metric-label">{m.label}</div></div>))}</div>
      <div className="erd-categories">{cats.map(cat => (<div key={cat.name} className="erd-cat" onClick={() => setExpanded(expanded === cat.name ? null : cat.name)}>
        <div className="erd-cat-header"><span className="erd-cat-name">{cat.name}</span><span className="erd-cat-score" style={{ color: getColor(cat.score) }}>{cat.score}/100</span></div>
        <div className="erd-cat-bar"><div className="erd-cat-fill" style={{ width: `${cat.score}%`, background: getColor(cat.score) }} /></div>
        {expanded === cat.name && <div style={{ fontSize: 10, color: '#aaa' }}>{cat.items.map((it, i) => <div key={i} style={{ padding: '2px 0' }}>{it}</div>)}</div>}
      </div>))}</div>
      <div className="erd-src">Data: NextGuard TI API, CISA KEV, MITRE ATT&CK (live)</div>
    </div>
  </>);
}
