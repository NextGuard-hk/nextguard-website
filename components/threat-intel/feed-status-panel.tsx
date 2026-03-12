// components/threat-intel/feed-status-panel.tsx
// Phase 8 — Unified Feed Status Panel (Commercial APIs + OSINT Feeds)
'use client';

import React, { useState, useEffect } from 'react';
import { useFeedStatus, useTestConnectivity } from '@/lib/threat-intel-hooks';

const providerIcons: Record<string, string> = {
  virustotal: '🛡️',
  abuseipdb: '🚫',
  otx: '🔭',
  greynoise: '📡',
  google_safe_browsing: '🔒',
  cloudflare_radar: '☁️',
};

const osintFeedIcons: Record<string, string> = {
  urlhaus: '🐛',
  phishtank: '🎣',
  openphish: '🌊',
  'abuse.ch': '⚠️',
  phishstats: '📊',
  threatfox: '🦊',
  feodo_tracker: '🔴',
  c2_intel: '🎯',
  blocklist_de: '🛡️',
  emerging_threats: '⚡',
  disposable_emails: '📧',
  local_ioc: '📁',
};

interface OsintFeed {
  id: number;
  name: string;
  url: string;
  type: string;
  is_active: boolean;
  last_fetch: string | null;
  indicator_count: number;
  health: string;
}

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
  .fsp-section-title { color: #aaa; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; margin: 16px 0 8px 0; padding-bottom: 4px; border-bottom: 1px solid #2a2a4a; }
  .fsp-health-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
  @media (max-width: 480px) {
    .fsp-card { padding: 14px; }
    .fsp-feed-item { padding: 8px 10px; }
  }
`;

export default function FeedStatusPanel() {
  const { feeds, loading, error, refresh } = useFeedStatus();
  const { results: testResults, loading: testing, test } = useTestConnectivity();
  const [osintFeeds, setOsintFeeds] = useState<OsintFeed[]>([]);
  const [osintLoading, setOsintLoading] = useState(false);

  const fetchOsintFeeds = async () => {
    setOsintLoading(true);
    try {
      const res = await fetch('/api/v1/threat-intel/feeds');
      const data = await res.json();
      if (data.feeds) setOsintFeeds(data.feeds);
    } catch {}
    setOsintLoading(false);
  };

  useEffect(() => { fetchOsintFeeds(); }, []);

  const activeOsint = osintFeeds.filter(f => f.is_active).length;
  const totalOsintIndicators = osintFeeds.reduce((s, f) => s + f.indicator_count, 0);

  const getHealthColor = (health: string) => {
    if (health === 'healthy') return '#22c55e';
    if (health === 'warning') return '#eab308';
    if (health === 'stale') return '#f97316';
    if (health === 'disabled') return '#666';
    return '#ef4444';
  };

  const getIconForFeed = (name: string): string => {
    const key = name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    return osintFeedIcons[key] || osintFeedIcons[name] || '📦';
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: fspStyles }} />
      <div className="fsp-card">
        <div className="fsp-header">
          <h3 style={{ margin: 0, fontSize: 15, color: '#e0e0e0' }}>📡 Threat Intelligence Feeds</h3>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => test('all')} disabled={testing} className="fsp-btn">
              {testing ? 'Testing...' : 'Test APIs'}
            </button>
            <button onClick={() => { refresh(); fetchOsintFeeds(); }} className="fsp-btn">
              {loading || osintLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 12 }}>{error}</div>
        )}

        {/* OSINT Database Feeds Section */}
        <div className="fsp-section-title">🌐 OSINT Database Feeds ({activeOsint} active • {totalOsintIndicators.toLocaleString()} IOCs)</div>
        {osintLoading ? (
          <div style={{ color: '#666', fontSize: 12, padding: 8 }}>Loading OSINT feeds...</div>
        ) : osintFeeds.length === 0 ? (
          <div style={{ color: '#666', fontSize: 12, padding: 8 }}>No OSINT feeds configured. Run ingestion to populate.</div>
        ) : (
          osintFeeds.map((feed) => (
            <div key={feed.id} className="fsp-feed-item">
              <span className="fsp-feed-icon">{getIconForFeed(feed.name)}</span>
              <div className="fsp-feed-info">
                <div className="fsp-feed-name">{feed.name}</div>
                <div className="fsp-feed-meta">
                  {feed.indicator_count.toLocaleString()} indicators | Type: {feed.type}
                  {feed.last_fetch && ` | Last: ${new Date(feed.last_fetch).toLocaleDateString()}`}
                </div>
              </div>
              <span className="fsp-health-dot" style={{ backgroundColor: getHealthColor(feed.health) }} title={feed.health} />
            </div>
          ))
        )}

        {/* Commercial API Feeds Section */}
        <div className="fsp-section-title">🔑 Commercial API Feeds</div>
        {feeds && feeds.feeds ? (
          feeds.feeds.map((feed: any) => {
            const testStatus = testResults?.[feed.provider];
            return (
              <div key={feed.provider} className="fsp-feed-item">
                <span className="fsp-feed-icon">{providerIcons[feed.provider] || '📦'}</span>
                <div className="fsp-feed-info">
                  <div className="fsp-feed-name">{feed.name}</div>
                  <div className="fsp-feed-meta">
                    Tier: {feed.tier} | Limit: {feed.dailyLimit}/day
                  </div>
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
          })
        ) : (
          <div style={{ color: '#666', fontSize: 12, padding: 8 }}>Loading commercial feeds...</div>
        )}
      </div>
    </>
  );
}
