// app/dashboard/threat-intel/page.tsx
// Phase 7 — Responsive Threat Intelligence Dashboard
'use client';

import React from 'react';
import { useEnrichIOC, useFeedStatus, useInitStatus, useEnrichHistory } from '@/lib/threat-intel-hooks';
import IOCEnrichmentForm from '@/components/threat-intel/ioc-enrichment-form';
import EnrichmentResults from '@/components/threat-intel/enrichment-results';
import FeedStatusPanel from '@/components/threat-intel/feed-status-panel';
import PlatformStats from '@/components/threat-intel/platform-stats';

const responsiveStyles = `
  .ti-dashboard {
    min-height: 100vh;
    background: #0a0a1a;
    padding: 80px 24px 24px 24px;
    color: #e0e0e0;
    max-width: 100%;
    overflow-x: hidden;
    box-sizing: border-box;
  }
  .ti-main-grid {
    display: grid;
    grid-template-columns: 1fr 380px;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
  }
  .ti-left-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .ti-right-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .ti-phase-bar { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
  .ti-header h1 { font-size: 24px; font-weight: bold; margin: 0 0 4px 0; }
  .ti-header p { color: #888; margin: 0; font-size: 14px; }
  .ti-error { background: #2a1a1a; border-radius: 8px; padding: 12px; border: 1px solid #ef444444; color: #ef4444; font-size: 13px; }
  .ti-history-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; }
  .ti-history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
  .ti-history-list { display: flex; flex-direction: column; gap: 8px; }
  .ti-history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border-radius: 6px; background: #12122a; cursor: pointer; flex-wrap: wrap; gap: 4px; }
  .ti-api-card { background: #1a1a2e; border-radius: 12px; padding: 16px; border: 1px solid #333; overflow: hidden; }
  .ti-api-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; flex-wrap: wrap; }
  .ti-api-method { padding: 1px 6px; border-radius: 3px; font-size: 10px; font-weight: bold; font-family: monospace; white-space: nowrap; flex-shrink: 0; }
  .ti-api-path { color: #60a5fa; font-size: 11px; font-family: monospace; word-break: break-all; min-width: 0; }
  .ti-api-desc { color: #666; font-size: 10px; margin-left: auto; white-space: nowrap; }
  @media (max-width: 900px) {
    .ti-main-grid { grid-template-columns: 1fr; }
    .ti-dashboard { padding: 72px 16px 16px 16px; }
  }
  @media (max-width: 480px) {
    .ti-dashboard { padding: 68px 12px 12px 12px; }
    .ti-header h1 { font-size: 20px; }
    .ti-api-desc { display: none; }
    .ti-phase-bar { gap: 6px; }
  }
`;

export default function ThreatIntelDashboard() {
  const { result, loading, error, enrich } = useEnrichIOC();
  const { status: initStatus } = useInitStatus();
  const { history, add, clear } = useEnrichHistory();

  const handleEnrich = async (ioc: string, iocType?: string) => {
    await enrich(ioc, iocType);
  };

  React.useEffect(() => {
    if (result) add(result);
  }, [result, add]);

  return (
    <>
      <style>{responsiveStyles}</style>
      <div className="ti-dashboard">
        {/* Header */}
        <div className="ti-header" style={{ marginBottom: '24px' }}>
          <h1>Threat Intelligence Dashboard</h1>
          <p>
            {initStatus ? `${initStatus.name} v${initStatus.version} — ${initStatus.status}` : 'Loading...'}
          </p>
        </div>

        {/* Phase Status Bar */}
        {initStatus && (
          <div className="ti-phase-bar">
            {Object.entries(initStatus.phases).map(([key, phase]) => (
              <div key={key} style={{
                padding: '4px 12px', borderRadius: '16px',
                background: phase.status === 'completed' ? '#22c55e22' : '#eab30822',
                border: `1px solid ${phase.status === 'completed' ? '#22c55e44' : '#eab30844'}`,
                color: phase.status === 'completed' ? '#22c55e' : '#eab308',
                fontSize: '11px', whiteSpace: 'nowrap',
              }}>
                {phase.status === 'completed' ? '\u2713' : '\u25CB'} {phase.name}
              </div>
            ))}
          </div>
        )}

        {/* Main Layout */}
        <div className="ti-main-grid">
          {/* Left Column */}
          <div className="ti-left-col">
            <IOCEnrichmentForm onEnrich={handleEnrich} loading={loading} />

            {error && <div className="ti-error">{error}</div>}

            {result && <EnrichmentResults result={result} />}

            {/* History */}
            {history.length > 0 && (
              <div className="ti-history-card">
                <div className="ti-history-header">
                  <h3 style={{ color: '#e0e0e0', margin: 0, fontSize: '15px' }}>Recent Lookups</h3>
                  <button onClick={clear} style={{
                    padding: '2px 10px', borderRadius: '4px', border: '1px solid #444',
                    background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer',
                  }}>Clear</button>
                </div>
                <div className="ti-history-list">
                  {history.slice(0, 10).map((h, i) => (
                    <div key={i} className="ti-history-item" onClick={() => enrich(h.ioc, h.ioc_type)}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <span style={{ color: '#e0e0e0', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' }}>{h.ioc}</span>
                        <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>{h.ioc_type}</span>
                      </div>
                      <span style={{
                        padding: '1px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold',
                        flexShrink: 0,
                        background: h.riskLevel === 'critical' ? '#ef444422' : h.riskLevel === 'high' ? '#f9731622' : '#22c55e22',
                        color: h.riskLevel === 'critical' ? '#ef4444' : h.riskLevel === 'high' ? '#f97316' : '#22c55e',
                      }}>
                        {h.riskScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* API Documentation Card */}
            <div className="ti-api-card">
              <h3 style={{ color: '#e0e0e0', margin: '0 0 12px 0', fontSize: '15px' }}>API Endpoints</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {[
                  { method: 'GET', path: '/api/v1/threat-intel/lookup?indicator=...', desc: 'Single IOC lookup' },
                  { method: 'POST', path: '/api/v1/threat-intel/batch-lookup', desc: 'Batch lookup (up to 100)' },
                  { method: 'GET', path: '/api/v1/threat-intel/health', desc: 'Platform health check' },
                  { method: 'GET', path: '/api/v1/threat-intel/stats', desc: 'Threat intel statistics' },
                  { method: 'GET', path: '/api/v1/threat-intel/export?format=csv', desc: 'Export IOCs' },
                ].map((ep, i) => (
                  <div key={i} className="ti-api-row">
                    <span className="ti-api-method" style={{
                      background: ep.method === 'POST' ? '#eab30822' : '#22c55e22',
                      color: ep.method === 'POST' ? '#eab308' : '#22c55e',
                    }}>{ep.method}</span>
                    <span className="ti-api-path">{ep.path}</span>
                    <span className="ti-api-desc">{ep.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar — Platform Stats */}
          <div className="ti-right-col">
            <PlatformStats />
            <FeedStatusPanel />
          </div>
        </div>
      </div>
    </>
  );
}
