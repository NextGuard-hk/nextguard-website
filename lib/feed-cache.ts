// lib/feed-cache.ts
// Phase 4 — Caching layer for commercial feed results
// Reduces API calls and respects rate limits

import { EnrichmentResult } from './commercial-feeds';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  createdAt: number;
}

class FeedCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTTL: number; // milliseconds
  private maxSize: number;

  constructor(defaultTTLSeconds = 3600, maxSize = 10000) {
    this.defaultTTL = defaultTTLSeconds * 1000;
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlSeconds?: number): void {
    if (this.cache.size >= this.maxSize) {
      this.evictExpired();
      if (this.cache.size >= this.maxSize) {
        const oldest = this.cache.keys().next().value;
        if (oldest) this.cache.delete(oldest);
      }
    }
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
      createdAt: Date.now(),
    });
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) this.cache.delete(key);
    }
  }

  stats(): { size: number; maxSize: number; hitRate: string } {
    this.evictExpired();
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 'N/A',
    };
  }
}

// Singleton caches for different feed types
export const enrichmentCache = new FeedCache(3600, 10000); // 1 hour TTL
export const vtCache = new FeedCache(7200, 5000); // 2 hour TTL for VT
export const abuseIPDBCache = new FeedCache(3600, 5000);
export const otxCache = new FeedCache(3600, 5000);
export const greyNoiseCache = new FeedCache(1800, 5000); // 30 min TTL

// Helper: cached enrichment lookup
export async function cachedEnrichIOC(
  ioc: string,
  iocType: string | undefined,
  enrichFn: (ioc: string, iocType?: string) => Promise<EnrichmentResult>
): Promise<EnrichmentResult> {
  const cacheKey = `enrich:${ioc}:${iocType || 'auto'}`;
  const cached = enrichmentCache.get<EnrichmentResult>(cacheKey);
  if (cached) return { ...cached, queriedAt: cached.queriedAt + ' (cached)' };

  const result = await enrichFn(ioc, iocType);
  enrichmentCache.set(cacheKey, result);
  return result;
}

// Rate limiter for API calls
export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(maxPerMinute: number) {
    this.maxTokens = maxPerMinute;
    this.tokens = maxPerMinute;
    this.refillRate = maxPerMinute / 60;
    this.lastRefill = Date.now();
  }

  canProceed(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;
  }

  remaining(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

// Rate limiters per provider
export const vtRateLimiter = new RateLimiter(4); // VT free: 4/min
export const abuseIPDBRateLimiter = new RateLimiter(60); // AbuseIPDB: ~60/min
export const otxRateLimiter = new RateLimiter(100); // OTX: generous
export const greyNoiseRateLimiter = new RateLimiter(10); // GreyNoise community

export default FeedCache;
