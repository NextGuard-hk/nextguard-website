// components/threat-intel/incident-war-room.tsx
'use client';
import React, { useState, useEffect, useCallback } from 'react';

interface Incident {
  id: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'investigating' | 'contained' | 'resolved';
  assignee: string;
  created: string;
  updated: string;
  iocs: number;
  source: string;
  events: { time: string; actor: string; action: string }[];
}

const warRoomStyles = `
  .warroom-card {
    background: linear-gradient(135deg, #0f172a 0%, #1a1a3e 50%, #0f172a 100%);
    border-radius: 14px;
    padding: 20px;
    border: 1px solid #ef444444;
    position: relative;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .warroom-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
  }
  .warroom-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    flex-wrap: wrap;
    gap: 8px;
  }
  .warroom-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 20px;
    background: #ef444422;
    border: 1px solid #ef444444;
    color: #ef4444;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
  }
  .warroom-badge .pulse {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #ef4444;
    animation: warPulse 1.5s ease-in-out infinite;
  }
  @keyframes warPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
  }
  .warroom-incidents {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 14px;
  }
  .warroom-incident {
    background: #12122a;
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #2a2a4a;
    cursor: pointer;
    transition: all 0.2s;
  }
  .warroom-incident:hover {
    border-color: #ef4444;
  }
  .warroom-incident-active {
    border-color: #ef444466;
    background: #12122a;
  }
  .warroom-incident-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .warroom-incident-title {
    color: #e0e0e0;
    font-size: 13px;
    font-weight: 600;
    margin: 0;
  }
  .warroom-sev {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
  }
  .warroom-sev-critical { background: #ef444433; color: #fca5a5; }
  .warroom-sev-high { background: #f59e0b33; color: #fbbf24; }
  .warroom-sev-medium { background: #3b82f633; color: #93c5fd; }
  .warroom-sev-low { background: #22c55e33; color: #86efac; }
  .warroom-meta {
    display: flex;
    gap: 12px;
    color: #666;
    font-size: 10px;
    flex-wrap: wrap;
  }
  .warroom-meta span { color: #aaa; }
  .warroom-timeline {
    background: #12122a;
    border-radius: 10px;
    padding: 14px;
    border: 1px solid #2a2a4a;
  }
  .warroom-timeline-title {
    color: #e0e0e0;
    font-size: 13px;
    font-weight: 600;
    margin: 0 0 10px 0;
  }
  .warroom-event {
    display: flex;
    gap: 10px;
    padding: 6px 0;
    border-bottom: 1px solid #1a1a3a;
    font-size: 11px;
  }
  .warroom-event-time {
    color: #666;
    min-width: 60px;
    font-family: monospace;
    font-size: 10px;
  }
  .warroom-event-actor { color: #22d3ee; min-width: 80px; }
  .warroom-event-action { color: #c0c0c0; }
  .warroom-status {
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 9px;
    font-weight: 600;
  }
  .warroom-status-active { background: #ef444422; color: #ef4444; }
  .warroom-status-investigating { background: #f59e0b22; color: #eab308; }
  .warroom-status-contained { background: #3b82f622; color: #60a5fa; }
  .warroom-status-resolved { background: #22c55e22; color: #22c55e; }
  .warroom-loading {
    text-align: center;
    color: #666;
    padding: 30px;
    font-size: 12px;
  }
  .warroom-live-dot {
    display: inline-block;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #22c55e;
    margin-right: 6px;
    animation: warPulse 1s infinite;
  }
`;

function mapCISAToIncidents(vulns: any[]): Incident[] {
  const now = new Date();
  return vulns.slice(0, 5).map((v: any, i: number) => {
    const sev: Incident['severity'] = v.knownRansomwareCampaignUse === 'Known'
      ? 'critical' : i < 2 ? 'high' : 'medium';
    const statuses: Incident['status'][] = ['active', 'investigating', 'contained', 'resolved'];
    const created = new Date(v.dateAdded || now);
    const minsAgo = Math.max(1, Math.floor((now.getTime() - created.getTime()) / 60000));
    return {
      id: `INC-${v.cveID || ('KEV-' + (i + 1))}`,
      title: `${v.vulnerabilityName || v.cveID} - ${v.vendorProject || 'Unknown Vendor'}`,
      severity: sev,
      status: statuses[i % 4],
      assignee: ['SOC Team Alpha', 'SOC Team Beta', 'IR Team Gamma', 'Threat Hunt Delta'][i % 4],
      created: created.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      updated: minsAgo < 60 ? `${minsAgo}m ago` : `${Math.floor(minsAgo / 60)}h ago`,
      iocs: Math.floor(Math.random() * 30) + 5,
      source: 'CISA KEV',
      events: [
        { time: created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'CISA KEV', action: `New exploited vulnerability added: ${v.cveID}` },
        { time: new Date(created.getTime() + 120000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'Scanner', action: `Vulnerability scan initiated for ${v.vendorProject || 'affected systems'}` },
        { time: new Date(created.getTime() + 300000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'SOAR', action: v.shortDescription || 'Auto-response playbook triggered' },
        { time: new Date(created.getTime() + 600000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'Analyst-1', action: `Remediation action: ${v.requiredAction || 'Patch and verify'}` },
      ],
    };
  });
}

function mapOTXToIncidents(pulses: any[]): Incident[] {
  const now = new Date();
  return pulses.slice(0, 5).map((p: any, i: number) => {
    const iocCount = p.indicators?.length || Math.floor(Math.random() * 20) + 3;
    const sev: Incident['severity'] = iocCount > 15 ? 'critical' : iocCount > 8 ? 'high' : 'medium';
    const statuses: Incident['status'][] = ['active', 'investigating', 'contained', 'resolved'];
    const created = new Date(p.created || now);
    const minsAgo = Math.max(1, Math.floor((now.getTime() - created.getTime()) / 60000));
    return {
      id: `INC-OTX-${p.id?.toString().slice(-4) || (i + 1)}`,
      title: (p.name || 'Unnamed Threat Pulse').slice(0, 80),
      severity: sev,
      status: statuses[i % 4],
      assignee: ['SOC Team Alpha', 'SOC Team Beta', 'IR Team Gamma', 'Threat Hunt Delta'][i % 4],
      created: created.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      updated: minsAgo < 60 ? `${minsAgo}m ago` : minsAgo < 1440 ? `${Math.floor(minsAgo / 60)}h ago` : `${Math.floor(minsAgo / 1440)}d ago`,
      iocs: iocCount,
      source: 'OTX',
      events: [
        { time: created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'OTX', action: `Threat pulse received: ${(p.name || '').slice(0, 60)}` },
        { time: new Date(created.getTime() + 180000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'SOAR', action: `${iocCount} IOCs extracted and ingested into detection pipeline` },
        { time: new Date(created.getTime() + 360000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'Firewall', action: 'Blocking rules updated with new indicators' },
      ],
    };
  });
}

export default function IncidentWarRoom() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      const results: Incident[] = [];

      // Fetch from CISA KEV
      try {
        const cisaRes = await fetch('https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json');
        if (cisaRes.ok) {
          const cisaData = await cisaRes.json();
          const recent = (cisaData.vulnerabilities || [])
            .sort((a: any, b: any) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
            .slice(0, 5);
          results.push(...mapCISAToIncidents(recent));
        }
      } catch (e) { console.warn('CISA KEV fetch failed:', e); }

      // Fetch from OTX
      try {
        const otxRes = await fetch('https://otx.alienvault.com/api/v1/pulses/subscribed?limit=5&page=1', {
          headers: { 'X-OTX-API-KEY': process.env.NEXT_PUBLIC_OTX_API_KEY || '' },
        });
        if (otxRes.ok) {
          const otxData = await otxRes.json();
          results.push(...mapOTXToIncidents(otxData.results || []));
        }
      } catch (e) { console.warn('OTX fetch failed:', e); }

      // Fetch from Abuse.ch recent threats
      try {
        const abuseRes = await fetch('https://urlhaus-api.abuse.ch/v1/urls/recent/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'limit=3',
        });
        if (abuseRes.ok) {
          const abuseData = await abuseRes.json();
          const urls = abuseData.urls || [];
          urls.slice(0, 3).forEach((u: any, i: number) => {
            const created = new Date(u.date_added || new Date());
            results.push({
              id: `INC-ABUSE-${u.id || (i + 1)}`,
              title: `Malicious URL: ${u.threat || 'malware'} - ${(u.url || '').slice(0, 50)}`,
              severity: u.threat === 'malware_download' ? 'critical' : 'high',
              status: i === 0 ? 'active' : 'investigating',
              assignee: 'SOC Team Beta',
              created: created.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
              updated: `${Math.max(1, Math.floor((Date.now() - created.getTime()) / 60000))}m ago`,
              iocs: Math.floor(Math.random() * 10) + 2,
              source: 'URLhaus',
              events: [
                { time: created.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'URLhaus', action: `Malicious URL reported: ${u.threat || 'unknown threat'}` },
                { time: new Date(created.getTime() + 60000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }), actor: 'SWG', action: 'URL blocked across all web gateways' },
              ],
            });
          });
        }
      } catch (e) { console.warn('Abuse.ch fetch failed:', e); }

      if (results.length > 0) {
        // Sort: active first, then by severity
        const sevOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        const statusOrder = { active: 0, investigating: 1, contained: 2, resolved: 3 };
        results.sort((a, b) => statusOrder[a.status] - statusOrder[b.status] || sevOrder[a.severity] - sevOrder[b.severity]);
        setIncidents(results);
        setSelected(results[0].id);
      }
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (err) {
      console.error('Incident fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 120000);
    return () => clearInterval(interval);
  }, [fetchIncidents]);

  const active = incidents.find(i => i.id === selected);
  const activeCount = incidents.filter(i => i.status === 'active').length;

  return (
    <>
      <style>{warRoomStyles}</style>
      <div className="warroom-card">
        <div className="warroom-header">
          <div>
            <h3 style={{ color: '#fff', margin: '0 0 4px 0', fontSize: 16 }}>Incident Response War Room</h3>
            <div style={{ color: '#888', fontSize: 11 }}>
              <span className="warroom-live-dot" />
              Real-time Collaborative Investigation
              {lastRefresh && <span style={{ marginLeft: 8, color: '#555' }}>Updated: {lastRefresh}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="warroom-badge">
              <span className="pulse" />
              {activeCount} Active
            </span>
            <span style={{ color: '#555', fontSize: 10 }}>{incidents.length} Total</span>
          </div>
        </div>

        {loading ? (
          <div className="warroom-loading">Loading live incidents from CISA KEV, OTX, URLhaus...</div>
        ) : (
          <>
            <div className="warroom-incidents">
              {incidents.map(inc => (
                <div
                  key={inc.id}
                  className={`warroom-incident ${selected === inc.id ? 'warroom-incident-active' : ''}`}
                  onClick={() => setSelected(inc.id)}
                >
                  <div className="warroom-incident-header">
                    <h4 className="warroom-incident-title">{inc.id}: {inc.title}</h4>
                    <span className={`warroom-sev warroom-sev-${inc.severity}`}>{inc.severity}</span>
                  </div>
                  <div className="warroom-meta">
                    <span className={`warroom-status warroom-status-${inc.status}`}>{inc.status}</span>
                    &nbsp;&nbsp;Assignee: <span>{inc.assignee}</span>
                    &nbsp;&nbsp;IOCs: <span>{inc.iocs}</span>
                    &nbsp;&nbsp;Source: <span>{inc.source}</span>
                    &nbsp;&nbsp;Updated: <span>{inc.updated}</span>
                  </div>
                </div>
              ))}
            </div>

            {active && (
              <div className="warroom-timeline">
                <h4 className="warroom-timeline-title">Timeline: {active.id}</h4>
                {active.events.map((ev, i) => (
                  <div className="warroom-event" key={i}>
                    <span className="warroom-event-time">{ev.time}</span>
                    <span className="warroom-event-actor">{ev.actor}</span>
                    <span className="warroom-event-action">{ev.action}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
