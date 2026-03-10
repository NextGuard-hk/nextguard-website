// components/threat-intel/ioc-enrichment-form.tsx
// Phase 7 — Responsive IOC Enrichment Search Form
'use client';

import React, { useState } from 'react';
import type { EnrichmentResult } from '@/lib/commercial-feeds';

interface IOCEnrichmentFormProps {
  onEnrich: (ioc: string, iocType?: string) => void;
  loading: boolean;
}

const exampleIOCs = [
  { value: '8.8.8.8', label: 'Google DNS (IP)' },
  { value: '1.1.1.1', label: 'Cloudflare DNS (IP)' },
  { value: 'example.com', label: 'Example Domain' },
  { value: '44d88612fea8a8f36de82e1278abb02f', label: 'EICAR Test Hash' },
];

const formStyles = `
  .ioc-form-card { background: #1a1a2e; border-radius: 12px; padding: 20px; border: 1px solid #333; }
  .ioc-form-row { display: flex; gap: 8px; margin-bottom: 12px; }
  .ioc-form-input { flex: 1; padding: 10px 14px; border-radius: 8px; border: 1px solid #444; background: #0d0d1a; color: #e0e0e0; font-size: 14px; font-family: monospace; outline: none; min-width: 0; }
  .ioc-form-select { padding: 10px; border-radius: 8px; border: 1px solid #444; background: #0d0d1a; color: #aaa; font-size: 13px; outline: none; }
  .ioc-form-btn { padding: 10px 20px; border-radius: 8px; border: none; background: #22c55e; color: #fff; font-weight: bold; cursor: pointer; font-size: 14px; white-space: nowrap; }
  .ioc-form-btn:disabled { opacity: 0.6; cursor: not-allowed; }
  .ioc-quick-wrap { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .ioc-quick-btn { padding: 4px 10px; border-radius: 14px; border: 1px solid #444; background: #1e1e3a; color: #888; font-size: 11px; cursor: pointer; white-space: nowrap; }
  .ioc-quick-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  @media (max-width: 600px) {
    .ioc-form-row { flex-direction: column; }
    .ioc-form-select { width: 100%; }
    .ioc-form-btn { width: 100%; }
    .ioc-form-card { padding: 14px; }
  }
`;

export default function IOCEnrichmentForm({ onEnrich, loading }: IOCEnrichmentFormProps) {
  const [ioc, setIoc] = useState('');
  const [iocType, setIocType] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ioc.trim()) onEnrich(ioc.trim(), iocType || undefined);
  };

  return (
    <>
      <style>{formStyles}</style>
      <div className="ioc-form-card">
        <h3 style={{ color: '#e0e0e0', margin: '0 0 16px 0', fontSize: '16px' }}>
          🔍 IOC Enrichment Lookup
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="ioc-form-row">
            <input
              type="text"
              value={ioc}
              onChange={(e) => setIoc(e.target.value)}
              placeholder="Enter IP, domain, hash, or URL..."
              className="ioc-form-input"
            />
            <select
              value={iocType}
              onChange={(e) => setIocType(e.target.value)}
              className="ioc-form-select"
            >
              <option value="">Auto-detect</option>
              <option value="ipv4-addr">IPv4</option>
              <option value="ipv6-addr">IPv6</option>
              <option value="domain">Domain</option>
              <option value="hash">Hash</option>
              <option value="url">URL</option>
            </select>
            <button type="submit" disabled={loading || !ioc.trim()} className="ioc-form-btn">
              {loading ? '⚡ Enriching...' : '⚡ Enrich'}
            </button>
          </div>
        </form>

        <div className="ioc-quick-wrap">
          <span style={{ color: '#666', fontSize: '11px' }}>Quick:</span>
          {exampleIOCs.map((ex) => (
            <button
              key={ex.value}
              onClick={() => { setIoc(ex.value); onEnrich(ex.value); }}
              disabled={loading}
              className="ioc-quick-btn"
            >
              {ex.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
