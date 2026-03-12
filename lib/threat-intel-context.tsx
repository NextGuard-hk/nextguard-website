// lib/threat-intel-context.tsx
// Shared data provider — fetches health & stats ONCE, all components consume from context
// Fixes: multiple components independently fetching same endpoints causing request flooding
'use client';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

interface HealthData {
  status: string;
  service: string;
  version: string;
  probe_ms: number;
  checks: {
    db: {
      status: string;
      total_indicators: number;
      active_feeds: number;
      lookups_last_24h: number;
      last_updated: string;
    };
  };
}

interface StatsData {
  overview: {
    total_indicators: number;
    active_indicators: number;
    high_confidence: number;
    oldest_indicator: string;
    last_updated: string;
    severity_breakdown: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  feeds: { total: number; active: number; oldest_fetch: string; newest_fetch: string };
  by_type: Array<{ type: string; count: number; high_confidence: number; avg_confidence: number }>;
  by_feed: Array<{ feed: string; total: number; active: number; last_added: string }>;
  by_category: Array<{ category: string; count: number }>;
  trend: { days: number; data: Array<{ date: string; added: number }> };
  lookup_performance_24h: {
    total_lookups: number;
    threats_detected: number;
    detection_rate: string;
  };
  generated_at: string;
}

interface ThreatIntelContextType {
  health: HealthData | null;
  stats: StatsData | null;
  loading: boolean;
  error: string | null;
  lastRefresh: string;
  refresh: () => Promise<void>;
}

const ThreatIntelContext = createContext<ThreatIntelContextType>({
  health: null,
  stats: null,
  loading: true,
  error: null,
  lastRefresh: '',
  refresh: async () => {},
});

export function useThreatIntelData() {
  return useContext(ThreatIntelContext);
}

async function fetchWithTimeout(url: string, timeoutMs: number = 15000): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export function ThreatIntelProvider({ children }: { children: React.ReactNode }) {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState('');
  const fetchingRef = useRef(false);

  const refresh = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const [hRes, sRes] = await Promise.allSettled([
        fetchWithTimeout('/api/v1/threat-intel/health'),
        fetchWithTimeout('/api/v1/threat-intel/stats'),
      ]);
      if (hRes.status === 'fulfilled') setHealth(hRes.value);
      else setError(`Health: ${hRes.reason?.message || 'failed'}`);
      if (sRes.status === 'fulfilled') setStats(sRes.value);
      else setError(prev => prev ? `${prev}; Stats: ${sRes.reason?.message}` : `Stats: ${sRes.reason?.message || 'failed'}`);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 60000);
    return () => clearInterval(t);
  }, [refresh]);

  return (
    <ThreatIntelContext.Provider value={{ health, stats, loading, error, lastRefresh, refresh }}>
      {children}
    </ThreatIntelContext.Provider>
  );
}
