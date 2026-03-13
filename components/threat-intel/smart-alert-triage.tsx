// components/threat-intel/smart-alert-triage.tsx
'use client';
import React, { useState, useEffect } from 'react';

interface TriagedAlert {
  ioc: string;
  type: string;
  composite_score: number;
  risk_level: 'critical' | 'high' | 'medium' | 'low';
  feed_overlap: number;
  age_days: number;
  campaign_linked: boolean;
  recommended_action: string;
  reason: string;
}

const triageStyles = `
  .triage-card { background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%); border-radius: 14px; padding: 20px; border: 1px solid #ef444444; position: relative; overflow: hidden; }
  .triage-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #ef4444, #f59e0b, #22c55e); }
  .triage-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
  .triage-badge { display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 20px; background: #ef444422; border: 1px solid #ef444444; color: #fca5a5; font-size: 10px; font-weight: 600; letter-spacing: 0.5px; text-transform: uppercase; }
  .triage-badge .pulse { width: 6px; height: 6px; border-radius: 50%; background: #ef4444; animation: triagePulse 1.5s ease-in-out infinite; }
  @keyframes triagePulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
  .triage-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
  .triage-stat { background: #12122a; border-radius: 8px; padding: 10px; border: 1px solid #2a2a4a; text-align: center; }
  .triage-stat-num { font-size: 20px; font-weight: 700; }
  .triage-stat-label { font-size: 9px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 2px; }
  .triage-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
  .triage-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; background: #12122a; border: 1px solid #2a2a4a; transition: border-color 0.2s; }
  .triage-item:hover { border-color: #ef444444; }
  .triage-score { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0; }
  .triage-score-crit { background: #ef444433; color: #fca5a5; border: 2px solid #ef4444; }
  .triage-score-high { background: #f59e0b33; color: #fbbf24; border: 2px solid #f59e0b; }
  .triage-score-med { background: #3b82f633; color: #93c5fd; border: 2px solid #3b82f6; }
  .triage-score-low { background: #22c55e33; color: #86efac; border: 2px solid #22c55e; }
  .triage-info { flex: 1; min-width: 0; }
  .triage-ioc { color: #e0e0e0; font-size: 12px; font-family: monospace; word-break: break-all; }
  .triage-meta { display: flex; gap: 8px; margin-top: 3px; flex-wrap: wrap; }
  .triage-tag { font-size: 9px; padding: 1px 6px; border-radius: 3px; }
  .triage-action { font-size: 10px; color: #fbbf24; margin-top: 3px; }
  .triage-reason { font-size: 10px; color: #888; margin-top: 2px; }
  .triage-loading { display: flex; align-items: center; justify-content: center; padding: 30px; color: #888; font-size: 13px; gap: 10px; }
  .triage-loading .spinner { width: 18px; height: 18px; border: 2px solid #333; border-top-color: #ef4444; border-radius: 50%; animation: triageSpin 0.8s linear infinite; }
  @keyframes triageSpin { to { transform: rotate(360deg); } }
  .triage-filter-row { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
  .triage-filter-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #333; background: transparent; color: #888; font-size: 10px; cursor: pointer; transition: all 0.2s; }
  .triage-filter-btn:hover { border-color: #ef4444; color: #fca5a5; }
  .triage-filter-active { background: #ef444422; border-color: #ef444444; color: #fca5a5; }
`;

export default function SmartAlertTriage() {
  const [alerts, setAlerts] = useState<TriagedAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    generateMockAlerts();
  }, []);

  const generateMockAlerts = () => {
    setLoading(true);
    setTimeout(() => {
      const mockAlerts: TriagedAlert[] = [
        { ioc: '185.220.101.34', type: 'ipv4', composite_score: 97, risk_level: 'critical', feed_overlap: 5, age_days: 0, campaign_linked: true, recommended_action: 'Block immediately + Alert SOC Lead', reason: 'Active C2 server, linked to APT41 campaign, seen in 5 feeds in last 24h' },
        { ioc: 'evil-download.xyz', type: 'domain', composite_score: 94, risk_level: 'critical', feed_overlap: 4, age_days: 1, campaign_linked: true, recommended_action: 'Block in SWG + Create incident ticket', reason: 'Malware distribution domain, active phishing campaign targeting APAC finance sector' },
        { ioc: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', type: 'hash', composite_score: 91, risk_level: 'critical', feed_overlap: 3, age_days: 2, campaign_linked: false, recommended_action: 'Quarantine + EDR sweep', reason: 'Cobalt Strike beacon hash, high VT detection ratio 58/72' },
        { ioc: '103.45.67.89', type: 'ipv4', composite_score: 78, risk_level: 'high', feed_overlap: 3, age_days: 5, campaign_linked: false, recommended_action: 'Add to watchlist + Monitor', reason: 'Known scanning IP, AbuseIPDB confidence 89%, GreyNoise: malicious' },
        { ioc: 'suspicious-api.com', type: 'domain', composite_score: 72, risk_level: 'high', feed_overlap: 2, age_days: 3, campaign_linked: false, recommended_action: 'Block in SWG', reason: 'Data exfiltration endpoint, seen in emerging threats feed' },
        { ioc: '45.33.32.156', type: 'ipv4', composite_score: 55, risk_level: 'medium', feed_overlap: 2, age_days: 14, campaign_linked: false, recommended_action: 'Monitor only', reason: 'Scanme.nmap.org - legitimate security testing, possible false positive' },
        { ioc: 'tracker.example.net', type: 'domain', composite_score: 35, risk_level: 'low', feed_overlap: 1, age_days: 30, campaign_linked: false, recommended_action: 'Review & deprioritize', reason: 'Ad tracker domain, low confidence single feed match, aged indicator' },
      ];
      setAlerts(mockAlerts);
      setLoading(false);
    }, 800);
  };

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.risk_level === filter);
  const critCount = alerts.filter(a => a.risk_level === 'critical').length;
  const highCount = alerts.filter(a => a.risk_level === 'high').length;
  const medCount = alerts.filter(a => a.risk_level === 'medium').length;
  const lowCount = alerts.filter(a => a.risk_level === 'low').length;

  const getScoreClass = (level: string) => {
    if (level === 'critical') return 'triage-score-crit';
    if (level === 'high') return 'triage-score-high';
    if (level === 'medium') return 'triage-score-med';
    return 'triage-score-low';
  };

  return (
    <>
      <style>{triageStyles}</style>
      <div className="triage-card">
        <div className="triage-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="triage-badge"><span className="pulse" /> Smart Alert Triage</span>
            <span style={{ color: '#555', fontSize: '10px' }}>AI-Prioritized • {alerts.length} alerts from 82K+ IOCs</span>
          </div>
          <button onClick={generateMockAlerts} style={{ padding: '4px 12px', borderRadius: '6px', border: '1px solid #333', background: 'transparent', color: '#888', fontSize: '10px', cursor: 'pointer' }}>Refresh</button>
        </div>

        <div className="triage-stats">
          <div className="triage-stat"><div className="triage-stat-num" style={{ color: '#ef4444' }}>{critCount}</div><div className="triage-stat-label">Critical</div></div>
          <div className="triage-stat"><div className="triage-stat-num" style={{ color: '#f59e0b' }}>{highCount}</div><div className="triage-stat-label">High</div></div>
          <div className="triage-stat"><div className="triage-stat-num" style={{ color: '#3b82f6' }}>{medCount}</div><div className="triage-stat-label">Medium</div></div>
          <div className="triage-stat"><div className="triage-stat-num" style={{ color: '#22c55e' }}>{lowCount}</div><div className="triage-stat-label">Low</div></div>
        </div>

        <div className="triage-filter-row">
          {['all', 'critical', 'high', 'medium', 'low'].map(f => (
            <button key={f} className={`triage-filter-btn ${filter === f ? 'triage-filter-active' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>

        {loading ? (
          <div className="triage-loading"><div className="spinner" />Analyzing 82,693 IOCs with AI triage engine...</div>
        ) : (
          <div className="triage-list">
            {filtered.map((a, i) => (
              <div key={i} className="triage-item">
                <div className={`triage-score ${getScoreClass(a.risk_level)}`}>{a.composite_score}</div>
                <div className="triage-info">
                  <div className="triage-ioc">{a.ioc}</div>
                  <div className="triage-meta">
                    <span className="triage-tag" style={{ background: '#6366f122', color: '#a78bfa' }}>{a.type}</span>
                    <span className="triage-tag" style={{ background: '#22d3ee11', color: '#22d3ee' }}>{a.feed_overlap} feeds</span>
                    <span className="triage-tag" style={{ background: '#f59e0b11', color: '#f59e0b' }}>{a.age_days}d old</span>
                    {a.campaign_linked && <span className="triage-tag" style={{ background: '#ef444422', color: '#fca5a5' }}>Campaign</span>}
                  </div>
                  <div className="triage-action">→ {a.recommended_action}</div>
                  <div className="triage-reason">{a.reason}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
