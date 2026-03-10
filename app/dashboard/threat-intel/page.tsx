// app/dashboard/threat-intel/page.tsx
// Phase 6 — Enhanced Threat Intelligence Dashboard with Platform Stats
'use client';

import React from 'react';
import { useEnrichIOC, useFeedStatus, useInitStatus, useEnrichHistory } from '@/lib/threat-intel-hooks';
import IOCEnrichmentForm from '@/components/threat-intel/ioc-enrichment-form';
import EnrichmentResults from '@/components/threat-intel/enrichment-results';
import FeedStatusPanel from '@/components/threat-intel/feed-status-panel';
import PlatformStats from '@/components/threat-intel/platform-stats';

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
    <div style={{
      minHeight: '100vh',
      background: '#0a0a1a',
      padding: '24px',
      color: '#e0e0e0',
    }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>
          Threat Intelligence Dashboard
        </h1>
        <p style={{ color: '#888', margin: 0, fontSize: '14px' }}>
          {initStatus ? `${initStatus.name} v${initStatus.version} — ${initStatus.status}` : 'Loading...'}
        </p>
      </div>

      {/* Phase Status Bar */}
      {initStatus && (
        <div style={{
          display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap',
        }}>
          {Object.entries(initStatus.phases).map(([key, phase]) => (
            <div key={key} style={{
              padding: '4px 12px', borderRadius: '16px',
              background: phase.status === 'completed' ? '#22c55e22' : '#eab30822',
              border: `1px solid ${phase.status === 'completed' ? '#22c55e44' : '#eab30844'}`,
              color: phase.status === 'completed' ? '#22c55e' : '#eab308',
              fontSize: '11px',
            }}>
              {phase.status === 'completed' ? '\u2713' : '\u25CB'} {phase.name}
            </div>
          ))}
        </div>
      )}

      {/* Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '20px' }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Search Form */}
          <IOCEnrichmentForm onEnrich={handleEnrich} loading={loading} />

          {/* Error */}
          {error && (
            <div style={{
              background: '#2a1a1a', borderRadius: '8px', padding: '12px',
              border: '1px solid #ef444444', color: '#ef4444', fontSize: '13px',
            }}>
              {error}
            </div>
          )}

          {/* Results */}
          {result && <EnrichmentResults result={result} />}

          {/* History */}
          {history.length > 0 && (
            <div style={{
              background: '#1a1a2e', borderRadius: '12px', padding: '16px',
              border: '1px solid #333',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ color: '#e0e0e0', margin: 0, fontSize: '15px' }}>Recent Lookups</h3>
                <button onClick={clear} style={{
                  padding: '2px 10px', borderRadius: '4px', border: '1px solid #444',
                  background: 'transparent', color: '#888', fontSize: '11px', cursor: 'pointer',
                }}>Clear</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {history.slice(0, 10).map((h, i) => (
                  <div key={i} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 12px', borderRadius: '6px', background: '#12122a',
                    cursor: 'pointer',
                  }} onClick={() => enrich(h.ioc, h.ioc_type)}>
                    <div>
                      <span style={{ color: '#e0e0e0', fontSize: '13px', fontFamily: 'monospace' }}>{h.ioc}</span>
                      <span style={{ color: '#666', fontSize: '11px', marginLeft: '8px' }}>{h.ioc_type}</span>
                    </div>
                    <span style={{
                      padding: '1px 8px', borderRadius: '3px', fontSize: '11px', fontWeight: 'bold',
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
          <div style={{
            background: '#1a1a2e', borderRadius: '12px', padding: '16px',
            border: '1px solid #333',
          }}>
            <h3 style={{ color: '#e0e0e0', margin: '0 0 12px 0', fontSize: '15px' }}>API Endpoints</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {[
                { method: 'GET', path: '/api/v1/threat-intel/lookup?indicator=...', desc: 'Single IOC lookup' },
                { method: 'POST', path: '/api/v1/threat-intel/batch-lookup', desc: 'Batch lookup (up to 100)' },
                { method: 'GET', path: '/api/v1/threat-intel/health', desc: 'Platform health check' },
                { method: 'GET', path: '/api/v1/threat-intel/stats', desc: 'Threat intel statistics' },
                { method: 'GET', path: '/api/v1/threat-intel/export?format=csv', desc: 'Export IOCs' },
              ].map((ep, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                  <span style={{
                    padding: '1px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 'bold',
                    background: ep.method === 'POST' ? '#eab30822' : '#22c55e22',
                    color: ep.method === 'POST' ? '#eab308' : '#22c55e',
                    fontFamily: 'monospace',
                  }}>{ep.method}</span>
                  <span style={{ color: '#60a5fa', fontSize: '11px', fontFamily: 'monospace' }}>{ep.path}</span>
                  <span style={{ color: '#666', fontSize: '10px', marginLeft: 'auto' }}>{ep.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Sidebar — Platform Stats */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PlatformStats />
          <FeedStatusPanel />
        </div>
      </div>
    </div>
  );
}
