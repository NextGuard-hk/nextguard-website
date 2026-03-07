// components/threat-intel/ioc-enrichment-form.tsx
// Phase 5 — IOC Enrichment Search Form
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

export default function IOCEnrichmentForm({ onEnrich, loading }: IOCEnrichmentFormProps) {
  const [ioc, setIoc] = useState('');
  const [iocType, setIocType] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (ioc.trim()) onEnrich(ioc.trim(), iocType || undefined);
  };

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #333',
    }}>
      <h3 style={{ color: '#e0e0e0', margin: '0 0 16px 0', fontSize: '16px' }}>
        🔍 IOC Enrichment Lookup
      </h3>

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <input
            type="text"
            value={ioc}
            onChange={(e) => setIoc(e.target.value)}
            placeholder="Enter IP, domain, hash, or URL..."
            style={{
              flex: 1, padding: '10px 14px', borderRadius: '8px',
              border: '1px solid #444', background: '#0d0d1a', color: '#e0e0e0',
              fontSize: '14px', fontFamily: 'monospace', outline: 'none',
            }}
          />
          <select
            value={iocType}
            onChange={(e) => setIocType(e.target.value)}
            style={{
              padding: '10px', borderRadius: '8px', border: '1px solid #444',
              background: '#0d0d1a', color: '#aaa', fontSize: '13px', outline: 'none',
            }}
          >
            <option value="">Auto-detect</option>
            <option value="ipv4-addr">IPv4</option>
            <option value="ipv6-addr">IPv6</option>
            <option value="domain">Domain</option>
            <option value="hash">Hash</option>
            <option value="url">URL</option>
          </select>
          <button
            type="submit"
            disabled={loading || !ioc.trim()}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: loading ? '#444' : '#3b82f6', color: '#fff',
              fontSize: '14px', fontWeight: 'bold', cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? '⚡ Enriching...' : '⚡ Enrich'}
          </button>
        </div>
      </form>

      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        <span style={{ color: '#666', fontSize: '12px', lineHeight: '28px' }}>Quick:</span>
        {exampleIOCs.map((ex) => (
          <button
            key={ex.value}
            onClick={() => { setIoc(ex.value); onEnrich(ex.value); }}
            disabled={loading}
            style={{
              padding: '4px 10px', borderRadius: '14px', border: '1px solid #444',
              background: '#1e1e3a', color: '#888', fontSize: '11px', cursor: 'pointer',
            }}
          >
            {ex.label}
          </button>
        ))}
      </div>
    </div>
  );
}
