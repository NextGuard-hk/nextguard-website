// components/threat-intel/feed-status-panel.tsx
// Phase 7 — Responsive Commercial Feed Status Panel
'use client';

import React from 'react';
import { useFeedStatus, useTestConnectivity } from '@/lib/threat-intel-hooks';

const providerIcons: Record<string, string> = {
  virustotal: '🛡️',
  abuseipdb: '🚫',
  otx: '🔭',
  greynoise: '📡',
    google_safe_browsing: '🔒',
  cloudflare_radar: '☁️',
};

const fspStyles = `
  .fsp-card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #333; }
  .fsp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
  .fsp-btn { padding: 4px 12px; border-radius: 6px; border: 1px solid #555; background: #2a2a4a; color: #aaa; cursor: pointer; font-size: 12px; }
  .fsp-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .fsp-summary { color: '#888'; font-size: 12px; margin-bottom: 12px; }
  .fsp-feed-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px; margin-bottom: 6px; border: 1px solid #2a2a4a; background: #12122a; }
  .fsp-feed-icon { font-size: 20px; flex-shrink: 0; }
  .fsp-feed-info { flex: 1; min-width: 0; }
  .fsp-feed-name { color: #e0e0e0; font-size: 13px; font-weight: 500; }
  .fsp-feed-meta { color: #666; font-size: 11px; }
  .fsp-test-badge { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; flex-shrink: 0; }
  @media (max-width: 480px) {
    .fsp-card { padding: 14px; }
    .fsp-feed-item { padding: 8px 10px; }
  }
`;

export default function FeedStatusPanel() {
  const { feeds, loading, error, refresh } = useFeedStatus();
  const { results: testResults, loading: testing, test } = useTestConnectivity();

  return (
    <>
      <style>{fspStyles}</style>
      <div className="fsp-card">
        <div className="fsp-header">
          <h3 style={{ color: '#e0e0e0', margin: 0, fontSize: '16px' }}>📡 Commercial Feeds</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => test('all')} disabled={testing} className="fsp-btn">
              {testing ? 'Testing...' : 'Test All'}
            </button>
            <button onClick={refresh} disabled={loading} className="fsp-btn">
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '12px' }}>{error}</div>
        )}

        {feeds && (
          <>
            <div style={{ color: '#888', fontSize: '12px', marginBottom: '12px' }}>
              ✓ {feeds.summary.enabled} enabled &nbsp;|&nbsp; {feeds.summary.disabled} disabled
            </div>

            {feeds.feeds.map((feed) => {
              const testStatus = testResults?.[feed.provider];
              return (
                <div key={feed.provider} className="fsp-feed-item">
                  <span className="fsp-feed-icon">{providerIcons[feed.provider] || '📦'}</span>
                  <div className="fsp-feed-info">
                    <div className="fsp-feed-name">{feed.name}</div>
                    <div className="fsp-feed-meta">Tier: {feed.tier} | Limit: {feed.dailyLimit}/day</div>
                  </div>
                  {testStatus && (
                    <span className="fsp-test-badge" style={{
                      background: testStatus.status === 'ok' ? '#22c55e22' : '#ef444422',
                      color: testStatus.status === 'ok' ? '#22c55e' : '#ef4444',
                    }}>
                      {testStatus.status === 'ok' ? '✓ OK' : '✗ Error'}
                    </span>
                  )}
                </div>
              );
            })}
          </>
        )}
      </div>
    </>
  );
}
