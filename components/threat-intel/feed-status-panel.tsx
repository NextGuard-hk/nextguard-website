// components/threat-intel/feed-status-panel.tsx
// Phase 5 — Commercial Feed Status Panel
'use client';

import React from 'react';
import { useFeedStatus, useTestConnectivity } from '@/lib/threat-intel-hooks';

const providerIcons: Record<string, string> = {
  virustotal: '🛡️',
  abuseipdb: '🚫',
  otx: '🔭',
  greynoise: '📡',
};

export default function FeedStatusPanel() {
  const { feeds, loading, error, refresh } = useFeedStatus();
  const { results: testResults, loading: testing, test } = useTestConnectivity();

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #333',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ color: '#e0e0e0', margin: 0, fontSize: '16px' }}>📡 Commercial Feeds</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => test('all')}
            disabled={testing}
            style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid #555',
              background: '#2a2a4a', color: '#aaa', cursor: 'pointer', fontSize: '12px',
            }}
          >
            {testing ? 'Testing...' : 'Test All'}
          </button>
          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '4px 12px', borderRadius: '6px', border: '1px solid #555',
              background: '#2a2a4a', color: '#aaa', cursor: 'pointer', fontSize: '12px',
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '12px' }}>{error}</div>}

      {feeds && (
        <>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <span style={{ color: '#22c55e', fontSize: '13px' }}>✓ {feeds.summary.enabled} enabled</span>
            <span style={{ color: '#666', fontSize: '13px' }}>|</span>
            <span style={{ color: '#888', fontSize: '13px' }}>{feeds.summary.disabled} disabled</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {feeds.feeds.map((feed) => {
              const testStatus = testResults?.[feed.provider];
              return (
                <div key={feed.provider} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 14px', borderRadius: '8px',
                  background: feed.enabled ? '#1e3a2e' : '#2a2a3a',
                  border: `1px solid ${feed.enabled ? '#22c55e33' : '#44444466'}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>{providerIcons[feed.provider] || '📦'}</span>
                    <div>
                      <div style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 500 }}>{feed.name}</div>
                      <div style={{ color: '#888', fontSize: '11px' }}>Tier: {feed.tier} | Limit: {feed.dailyLimit}/day</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {testStatus && (
                      <span style={{
                        fontSize: '11px',
                        color: testStatus.status === 'ok' ? '#22c55e' : '#ef4444',
                      }}>
                        {testStatus.status === 'ok' ? '✓ OK' : '✗ Error'}
                      </span>
                    )}
                    <span style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: feed.enabled ? '#22c55e' : '#666',
                      display: 'inline-block',
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
