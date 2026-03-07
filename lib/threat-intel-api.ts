// lib/threat-intel-api.ts
// NextGuard Phase 3 — Shared API Service Layer
// Provides auth, rate limiting, pagination, and response helpers

import { getDB } from './db';
import { NextResponse } from 'next/server';

// ─── Types ───────────────────────────────────────────────────────────────────

export type IndicatorType = 'domain' | 'ipv4-addr' | 'ipv6-addr' | 'url' | 'email-addr' | 'file-hash';
export type RiskLevel = 'known_malicious' | 'high_risk' | 'medium_risk' | 'low_risk' | 'clean' | 'unknown';
export type TLP = 'white' | 'green' | 'amber' | 'red';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: string;
}

export interface IndicatorRecord {
  id: string;
  type: IndicatorType;
  value: string;
  value_normalized: string;
  risk_level: RiskLevel;
  confidence: number;
  tlp: TLP;
  categories: string[];
  tags: string[];
  description: string | null;
  source_feed: string;
  source_ref: string | null;
  first_seen: string;
  last_seen: string;
  valid_from: string;
  valid_until: string | null;
  kill_chain_phase: string | null;
  threat_actor: string | null;
  campaign: string | null;
  hit_count: number;
  last_hit_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface FeedRecord {
  id: string;
  name: string;
  url: string;
  feed_type: string;
  indicator_type: string;
  parser: string;
  enabled: number;
  refresh_interval_min: number;
  last_refresh: string | null;
  last_success: string | null;
  last_error: string | null;
  entries_count: number;
  total_ingested: number;
  status: string;
  config: string;
  created_at: string;
  updated_at: string;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export function authenticateRequest(request: Request): {
  valid: boolean;
  apiKey: string | null;
  isAdmin: boolean;
} {
  const url = new URL(request.url);
  // Support key via query param or Authorization header
  const queryKey = url.searchParams.get('key') || url.searchParams.get('api_key');
  const authHeader = request.headers.get('authorization');
  const headerKey = authHeader?.replace(/^Bearer\s+/i, '') ?? null;
  const apiKey = queryKey || headerKey;

  if (!apiKey) return { valid: false, apiKey: null, isAdmin: false };

  const adminKey = process.env.TI_ADMIN_KEY;
  const publicKey = process.env.TI_PUBLIC_KEY;

  const isAdmin = !!adminKey && apiKey === adminKey;
  const isPublic = !!publicKey && apiKey === publicKey;
  const valid = isAdmin || isPublic;

  return { valid, apiKey, isAdmin };
}

export function requireAuth(
  request: Request,
  requireAdmin = false
): NextResponse | null {
  const { valid, isAdmin } = authenticateRequest(request);
  if (!valid) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Provide API key via ?key= or Authorization: Bearer header.' },
      { status: 401 }
    );
  }
  if (requireAdmin && !isAdmin) {
    return NextResponse.json(
      { success: false, error: 'Forbidden. Admin key required.' },
      { status: 403 }
    );
  }
  return null; // auth passed
}

// ─── Rate limiting (in-memory, per edge invocation) ──────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 120; // requests per window

export function checkRateLimit(request: Request): NextResponse | null {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return null;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded. Max 120 requests/minute.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
          'X-RateLimit-Limit': String(RATE_LIMIT_MAX),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }
  return null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export function getPagination(url: URL, maxLimit = 100): PaginationParams {
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const limit = Math.min(maxLimit, Math.max(1, parseInt(url.searchParams.get('limit') ?? '20', 10)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
): NextResponse {
  return NextResponse.json({
    success: true,
    data,
    meta: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      pages: Math.ceil(total / pagination.limit),
    },
  });
}

// ─── CORS headers ─────────────────────────────────────────────────────────────

export function withCors(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  return response;
}

export function corsOptions(): NextResponse {
  return withCors(
    new NextResponse(null, { status: 204 })
  );
}

// ─── Indicator helpers ────────────────────────────────────────────────────────

export function parseIndicatorRow(row: Record<string, unknown>): IndicatorRecord {
  return {
    id: row.id as string,
    type: row.type as IndicatorType,
    value: row.value as string,
    value_normalized: row.value_normalized as string,
    risk_level: row.risk_level as RiskLevel,
    confidence: row.confidence as number,
    tlp: (row.tlp as TLP) ?? 'white',
    categories: JSON.parse((row.categories as string) || '[]'),
    tags: JSON.parse((row.tags as string) || '[]'),
    description: row.description as string | null,
    source_feed: row.source_feed as string,
    source_ref: row.source_ref as string | null,
    first_seen: row.first_seen as string,
    last_seen: row.last_seen as string,
    valid_from: row.valid_from as string,
    valid_until: row.valid_until as string | null,
    kill_chain_phase: row.kill_chain_phase as string | null,
    threat_actor: row.threat_actor as string | null,
    campaign: row.campaign as string | null,
    hit_count: (row.hit_count as number) ?? 0,
    last_hit_at: row.last_hit_at as string | null,
    is_active: row.is_active as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function parseFeedRow(row: Record<string, unknown>): FeedRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    url: row.url as string,
    feed_type: (row.feed_type as string) ?? 'osint',
    indicator_type: (row.indicator_type as string) ?? 'domain',
    parser: (row.parser as string) ?? 'text_lines',
    enabled: row.enabled as number,
    refresh_interval_min: (row.refresh_interval_min as number) ?? 15,
    last_refresh: row.last_refresh as string | null,
    last_success: row.last_success as string | null,
    last_error: row.last_error as string | null,
    entries_count: (row.entries_count as number) ?? 0,
    total_ingested: (row.total_ingested as number) ?? 0,
    status: (row.status as string) ?? 'pending',
    config: (row.config as string) ?? '{}',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

// ─── Normalise lookup value ───────────────────────────────────────────────────

export function normalizeLookupValue(value: string): string[] {
  const raw = value.toLowerCase().trim();
  const variants = new Set<string>([raw]);
  // Strip www.
  variants.add(raw.replace(/^www\./, ''));
  // Try extracting hostname from URL
  try {
    const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    variants.add(u.hostname.replace(/^www\./, ''));
  } catch {}
  return [...variants].filter(Boolean);
}

// ─── DB helper ────────────────────────────────────────────────────────────────

export { getDB };
