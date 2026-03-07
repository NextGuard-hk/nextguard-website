// app/api/v1/feeds/commercial/route.ts
// Phase 4 — Commercial Feed Status & Management
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface FeedStatus {
  name: string;
  provider: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  tier: string;
  dailyLimit: number;
  usedToday: number;
  lastChecked: string;
}

function getFeedStatuses(): FeedStatus[] {
  return [
    {
      name: 'VirusTotal',
      provider: 'virustotal',
      enabled: !!process.env.VIRUSTOTAL_API_KEY,
      apiKeyConfigured: !!process.env.VIRUSTOTAL_API_KEY,
      tier: process.env.VT_TIER || 'free',
      dailyLimit: process.env.VT_TIER === 'premium' ? 30000 : 500,
      usedToday: 0,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'AbuseIPDB',
      provider: 'abuseipdb',
      enabled: !!process.env.ABUSEIPDB_API_KEY,
      apiKeyConfigured: !!process.env.ABUSEIPDB_API_KEY,
      tier: process.env.ABUSEIPDB_TIER || 'free',
      dailyLimit: process.env.ABUSEIPDB_TIER === 'premium' ? 5000 : 1000,
      usedToday: 0,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'AlienVault OTX',
      provider: 'otx',
      enabled: !!process.env.OTX_API_KEY,
      apiKeyConfigured: !!process.env.OTX_API_KEY,
      tier: 'free',
      dailyLimit: 10000,
      usedToday: 0,
      lastChecked: new Date().toISOString(),
    },
    {
      name: 'GreyNoise',
      provider: 'greynoise',
      enabled: !!process.env.GREYNOISE_API_KEY,
      apiKeyConfigured: !!process.env.GREYNOISE_API_KEY,
      tier: process.env.GREYNOISE_TIER || 'community',
      dailyLimit: process.env.GREYNOISE_TIER === 'enterprise' ? 50000 : 500,
      usedToday: 0,
      lastChecked: new Date().toISOString(),
    },
  ];
}

// GET /api/v1/feeds/commercial - List commercial feed status
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const feeds = getFeedStatuses();
    const enabledCount = feeds.filter(f => f.enabled).length;

    return NextResponse.json({
      success: true,
      data: {
        feeds,
        summary: {
          total: feeds.length,
          enabled: enabledCount,
          disabled: feeds.length - enabledCount,
        },
      },
    });
  } catch (error: any) {
    console.error('[feeds/commercial] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

// POST /api/v1/feeds/commercial - Test feed connectivity
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const body = await req.json();
    const { provider } = body;

    if (!provider) {
      return NextResponse.json({ error: 'Missing "provider" field' }, { status: 400 });
    }

    const testIOC = '8.8.8.8';
    const results: Record<string, any> = {};

    if (provider === 'all' || provider === 'virustotal') {
      try {
        const { queryVirusTotal } = await import('@/lib/commercial-feeds');
        const r = await queryVirusTotal(testIOC, 'ipv4-addr');
        results.virustotal = { status: 'ok', data: r ? 'connected' : 'no_key' };
      } catch (e: any) { results.virustotal = { status: 'error', message: e.message }; }
    }
    if (provider === 'all' || provider === 'abuseipdb') {
      try {
        const { queryAbuseIPDB } = await import('@/lib/commercial-feeds');
        const r = await queryAbuseIPDB(testIOC);
        results.abuseipdb = { status: 'ok', data: r ? 'connected' : 'no_key' };
      } catch (e: any) { results.abuseipdb = { status: 'error', message: e.message }; }
    }
    if (provider === 'all' || provider === 'otx') {
      try {
        const { queryOTX } = await import('@/lib/commercial-feeds');
        const r = await queryOTX(testIOC, 'ipv4-addr');
        results.otx = { status: 'ok', data: r ? 'connected' : 'no_key' };
      } catch (e: any) { results.otx = { status: 'error', message: e.message }; }
    }
    if (provider === 'all' || provider === 'greynoise') {
      try {
        const { queryGreyNoise } = await import('@/lib/commercial-feeds');
        const r = await queryGreyNoise(testIOC);
        results.greynoise = { status: 'ok', data: r ? 'connected' : 'no_key' };
      } catch (e: any) { results.greynoise = { status: 'error', message: e.message }; }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    console.error('[feeds/commercial] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
