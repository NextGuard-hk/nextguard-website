// components/threat-intel/enrichment-results.tsx
// Phase 7 — Responsive Enrichment Results Display
'use client';
import React from 'react';
import type { EnrichmentResult } from '@/lib/commercial-feeds';
import RiskScoreCard from './risk-score-card';

interface EnrichmentResultsProps {
  result: EnrichmentResult;
}

const erStyles = `
  .er-source-card { background: #12122a; border-radius: 8px; padding: 14px; border: 1px solid #2a2a4a; }
  .er-source-card h4 { color: #aaa; margin: 0 0 10px 0; font-size: 13px; }
  .er-data-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .er-data-label { color: #888; font-size: 12px; }
  .er-data-value { font-size: 12px; font-family: monospace; }
  .er-sources-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .er-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; margin: 2px; }
  .er-cat-section { background: #12122a; border-radius: 8px; padding: 14px; border: 1px solid #2a2a4a; margin-bottom: 12px; }
  .er-cat-badges { display: flex; flex-wrap: wrap; gap: 6px; }
  .er-errors { background: #2a1a1a; border-radius: 8px; padding: 12px; border: 1px solid #ef444444; margin-top: 12px; }
  @media (max-width: 600px) {
    .er-sources-grid { grid-template-columns: 1fr; }
    .er-source-card { padding: 12px; }
  }
`;

function DataRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="er-data-row">
      <span className="er-data-label">{label}</span>
      <span className="er-data-value" style={{ color: color || '#e0e0e0' }}>{value}</span>
    </div>
  );
}

function getCategoryColor(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes('phishing') || c.includes('malware') || c.includes('suspicious') || c.includes('hacking') || c.includes('botnet') || c.includes('spam') || c.includes('c2') || c.includes('command')) return '#ef4444';
  if (c.includes('adult') || c.includes('gambling') || c.includes('dating') || c.includes('piracy') || c.includes('torrent') || c.includes('weapons') || c.includes('violence') || c.includes('drugs')) return '#f97316';
  if (c.includes('vpn') || c.includes('proxy') || c.includes('dynamic dns') || c.includes('url shortener') || c.includes('paste')) return '#eab308';
  if (c.includes('social media') || c.includes('streaming') || c.includes('gaming') || c.includes('entertainment')) return '#a78bfa';
  if (c.includes('finance') || c.includes('banking') || c.includes('crypto')) return '#22d3ee';
  if (c.includes('education') || c.includes('government') || c.includes('healthcare')) return '#22c55e';
  return '#6b7280';
}

export default function EnrichmentResults({ result }: EnrichmentResultsProps) {
  return (
    <>
      <style>{erStyles}</style>
      <div>
        <RiskScoreCard
          score={result.riskScore}
          level={result.riskLevel}
          ioc={result.ioc}
          iocType={result.ioc_type}
          queriedAt={result.queriedAt}
        />

        {/* URL Category Section */}
        {result.categories && result.categories.length > 0 && (
          <div className="er-cat-section">
            <h4 style={{ color: '#aaa', margin: '0 0 8px 0', fontSize: '13px' }}>
              🏷️ URL Category
              {result.category_source && (
                <span style={{
                  marginLeft: '8px', padding: '1px 6px', borderRadius: '3px',
                  background: '#22c55e22', color: '#22c55e', fontSize: '10px',
                }}>
                  {result.category_source === 'turso-url-categories' ? 'DB' :
                   result.category_source === 'turso-indicators' ? 'Threat DB' :
                   result.category_source === 'live-osint' ? 'Live' : 'Heuristic'}
                </span>
              )}
            </h4>
            <div className="er-cat-badges">
              {result.categories.map((cat) => (
                <span key={cat} className="er-tag" style={{
                  background: `${getCategoryColor(cat)}22`,
                  color: getCategoryColor(cat),
                  border: `1px solid ${getCategoryColor(cat)}44`,
                }}>{cat}</span>
              ))}
            </div>
          </div>
        )}

        {/* Source Results Grid */}
        <div className="er-sources-grid">
          {result.virusTotal && (
            <div className="er-source-card">
              <h4>🛡️ VirusTotal</h4>
              <DataRow label="Malicious" value={result.virusTotal.malicious} color={result.virusTotal.malicious > 0 ? '#ef4444' : '#22c55e'} />
              <DataRow label="Suspicious" value={result.virusTotal.suspicious} color={result.virusTotal.suspicious > 0 ? '#f97316' : '#888'} />
              <DataRow label="Harmless" value={result.virusTotal.harmless} />
              <DataRow label="Undetected" value={result.virusTotal.undetected} />
              <DataRow label="Reputation" value={result.virusTotal.reputation} />
              {result.virusTotal.tags.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  {result.virusTotal.tags.slice(0, 5).map(t => (
                    <span key={t} className="er-tag" style={{ background: '#2a2a4a', color: '#aaa' }}>{t}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.abuseIPDB && (
            <div className="er-source-card">
              <h4>🚫 AbuseIPDB</h4>
              <DataRow label="Confidence" value={`${result.abuseIPDB.abuseConfidence}%`} color={result.abuseIPDB.abuseConfidence > 50 ? '#ef4444' : '#22c55e'} />
              <DataRow label="Total Reports" value={result.abuseIPDB.totalReports} />
              <DataRow label="ISP" value={result.abuseIPDB.isp} />
              <DataRow label="Domain" value={result.abuseIPDB.domain} />
              <DataRow label="Country" value={result.abuseIPDB.country} />
            </div>
          )}

          {result.otx && (
            <div className="er-source-card">
              <h4>🔭 AlienVault OTX</h4>
              <DataRow label="Pulse Count" value={result.otx.pulseCount} color={result.otx.pulseCount > 0 ? '#f97316' : '#22c55e'} />
              <DataRow label="Reputation" value={result.otx.reputation} />
              {result.otx.pulses.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ color: '#888', fontSize: '10px', marginBottom: '4px' }}>Recent Pulses:</div>
                  {result.otx.pulses.slice(0, 3).map(p => (
                    <div key={p.id} style={{ color: '#aaa', fontSize: '11px', padding: '2px 0' }}>
                      • {p.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {result.greyNoise && (
            <div className="er-source-card">
              <h4>📡 GreyNoise</h4>
              <DataRow label="Classification" value={result.greyNoise.classification} />
              <DataRow label="Noise" value={result.greyNoise.noise ? 'Yes' : 'No'} />
              <DataRow label="RIOT" value={result.greyNoise.riot ? 'Yes' : 'No'} />
              <DataRow label="Name" value={result.greyNoise.name} />
            </div>
          )}
        </div>

        {/* Errors */}
        {Object.keys(result.errors).length > 0 && (
          <div className="er-errors">
            <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}>⚠️ Errors</div>
            {Object.entries(result.errors).map(([k, v]) => (
              <div key={k} style={{ color: '#ef4444', fontSize: '11px', padding: '2px 0' }}>
                {k}: {v}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
