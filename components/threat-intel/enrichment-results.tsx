// components/threat-intel/enrichment-results.tsx
// Phase 5 — Enrichment Results Display
'use client';

import React from 'react';
import type { EnrichmentResult } from '@/lib/commercial-feeds';
import RiskScoreCard from './risk-score-card';

interface EnrichmentResultsProps {
  result: EnrichmentResult;
}

function SourceCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#12122a', borderRadius: '8px', padding: '14px',
      border: '1px solid #2a2a4a',
    }}>
      <h4 style={{ color: '#aaa', margin: '0 0 10px 0', fontSize: '13px' }}>
        {icon} {title}
      </h4>
      {children}
    </div>
  );
}

function DataRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0' }}>
      <span style={{ color: '#888', fontSize: '12px' }}>{label}</span>
      <span style={{ color: color || '#e0e0e0', fontSize: '12px', fontFamily: 'monospace' }}>{value}</span>
    </div>
  );
}

export default function EnrichmentResults({ result }: EnrichmentResultsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Risk Score */}
      <RiskScoreCard
        score={result.riskScore}
        level={result.riskLevel}
        ioc={result.ioc}
        iocType={result.ioc_type}
        queriedAt={result.queriedAt}
      />

      {/* Source Results Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
        {/* VirusTotal */}
        {result.virusTotal && (
          <SourceCard title="VirusTotal" icon="🛡️">
            <DataRow label="Malicious" value={result.virusTotal.malicious} color={result.virusTotal.malicious > 0 ? '#ef4444' : '#22c55e'} />
            <DataRow label="Suspicious" value={result.virusTotal.suspicious} color={result.virusTotal.suspicious > 0 ? '#f97316' : '#888'} />
            <DataRow label="Harmless" value={result.virusTotal.harmless} color="#22c55e" />
            <DataRow label="Undetected" value={result.virusTotal.undetected} />
            <DataRow label="Reputation" value={result.virusTotal.reputation} />
            {result.virusTotal.tags.length > 0 && (
              <div style={{ marginTop: '6px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {result.virusTotal.tags.slice(0, 5).map(t => (
                  <span key={t} style={{ padding: '1px 6px', borderRadius: '3px', background: '#2a2a4a', color: '#aaa', fontSize: '10px' }}>{t}</span>
                ))}
              </div>
            )}
          </SourceCard>
        )}

        {/* AbuseIPDB */}
        {result.abuseIPDB && (
          <SourceCard title="AbuseIPDB" icon="🚫">
            <DataRow label="Confidence" value={`${result.abuseIPDB.abuseConfidenceScore}%`} color={result.abuseIPDB.abuseConfidenceScore > 50 ? '#ef4444' : '#22c55e'} />
            <DataRow label="Total Reports" value={result.abuseIPDB.totalReports} />
            <DataRow label="Country" value={result.abuseIPDB.countryCode || 'N/A'} />
            <DataRow label="ISP" value={result.abuseIPDB.isp || 'N/A'} />
            <DataRow label="Domain" value={result.abuseIPDB.domain || 'N/A'} />
          </SourceCard>
        )}

        {/* OTX */}
        {result.otx && (
          <SourceCard title="AlienVault OTX" icon="🔭">
            <DataRow label="Pulse Count" value={result.otx.pulseCount} color={result.otx.pulseCount > 0 ? '#f97316' : '#22c55e'} />
            <DataRow label="Reputation" value={result.otx.reputation} />
            <DataRow label="Country" value={result.otx.country || 'N/A'} />
            <DataRow label="ASN" value={result.otx.asn || 'N/A'} />
            {result.otx.pulses.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>Recent Pulses:</div>
                {result.otx.pulses.slice(0, 3).map(p => (
                  <div key={p.id} style={{ color: '#aaa', fontSize: '11px', padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    • {p.name}
                  </div>
                ))}
              </div>
            )}
          </SourceCard>
        )}

        {/* GreyNoise */}
        {result.greyNoise && (
          <SourceCard title="GreyNoise" icon="📡">
            <DataRow label="Classification" value={result.greyNoise.classification} color={
              result.greyNoise.classification === 'malicious' ? '#ef4444' :
              result.greyNoise.classification === 'benign' ? '#22c55e' : '#888'
            } />
            <DataRow label="Noise" value={result.greyNoise.noise ? 'Yes' : 'No'} />
            <DataRow label="RIOT" value={result.greyNoise.riot ? 'Yes' : 'No'} />
            <DataRow label="Name" value={result.greyNoise.name || 'N/A'} />
            <DataRow label="Last Seen" value={result.greyNoise.lastSeen || 'N/A'} />
          </SourceCard>
        )}
      </div>

      {/* Errors */}
      {Object.keys(result.errors).length > 0 && (
        <div style={{ background: '#2a1a1a', borderRadius: '8px', padding: '12px', border: '1px solid #ef444433' }}>
          <div style={{ color: '#ef4444', fontSize: '13px', marginBottom: '6px' }}>⚠️ Errors</div>
          {Object.entries(result.errors).map(([k, v]) => (
            <div key={k} style={{ color: '#888', fontSize: '12px' }}>{k}: {v}</div>
          ))}
        </div>
      )}
    </div>
  );
}
