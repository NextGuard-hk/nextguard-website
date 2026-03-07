// lib/threat-intel-hooks.ts
// Phase 5 — React hooks for Threat Intelligence Dashboard
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { EnrichmentResult } from './commercial-feeds';

// ----- Types -----
export interface FeedStatusInfo {
  name: string;
  provider: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  tier: string;
  dailyLimit: number;
  usedToday: number;
  lastChecked: string;
}

export interface FeedsSummary {
  feeds: FeedStatusInfo[];
  summary: { total: number; enabled: number; disabled: number };
}

export interface InitStatus {
  name: string;
  version: string;
  status: string;
  phases: Record<string, { name: string; status: string; features: string[] }>;
  commercialFeeds: Record<string, { configured: boolean }>;
  endpoints: Record<string, string>;
  timestamp: string;
}

// ----- useEnrichIOC -----
export function useEnrichIOC() {
  const [result, setResult] = useState<EnrichmentResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enrich = useCallback(async (ioc: string, iocType?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/v1/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'demo' },
        body: JSON.stringify({ ioc: ioc.trim(), ioc_type: iocType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Enrichment failed');
      setResult(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, enrich };
}

// ----- useFeedStatus -----
export function useFeedStatus() {
  const [feeds, setFeeds] = useState<FeedsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/feeds/commercial', {
        headers: { 'x-api-key': 'demo' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch feed status');
      setFeeds(data.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { feeds, loading, error, refresh };
}

// ----- useInitStatus -----
export function useInitStatus() {
  const [status, setStatus] = useState<InitStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/v1/init')
      .then(r => r.json())
      .then(d => setStatus(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { status, loading };
}

// ----- useEnrichHistory -----
export function useEnrichHistory() {
  const [history, setHistory] = useState<EnrichmentResult[]>([]);

  const add = useCallback((result: EnrichmentResult) => {
    setHistory(prev => [result, ...prev].slice(0, 50));
  }, []);

  const clear = useCallback(() => setHistory([]), []);

  return { history, add, clear };
}

// ----- useTestConnectivity -----
export function useTestConnectivity() {
  const [results, setResults] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(false);

  const test = useCallback(async (provider: string = 'all') => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch('/api/v1/feeds/commercial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': 'demo' },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setResults(data.data);
    } catch { setResults(null); }
    finally { setLoading(false); }
  }, []);

  return { results, loading, test };
}
