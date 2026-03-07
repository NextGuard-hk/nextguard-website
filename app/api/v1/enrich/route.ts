// app/api/v1/enrich/route.ts
// Phase 4 — IOC Enrichment API using commercial feeds
import { NextRequest, NextResponse } from 'next/server';
import { enrichIOC, detectIOCType } from '@/lib/commercial-feeds';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/v1/enrich - Enrich a single IOC
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const body = await req.json();
    const { ioc, ioc_type } = body;

    if (!ioc || typeof ioc !== 'string') {
      return NextResponse.json({ error: 'Missing or invalid "ioc" field' }, { status: 400 });
    }

    const type = ioc_type ?? detectIOCType(ioc.trim());
    const result = await enrichIOC(ioc.trim(), type);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[enrich] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}

// GET /api/v1/enrich?ioc=8.8.8.8 - Quick lookup via query param
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('x-api-key') || req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const ioc = searchParams.get('ioc');
    const iocType = searchParams.get('type');

    if (!ioc) {
      return NextResponse.json({ error: 'Missing "ioc" query parameter' }, { status: 400 });
    }

    const type = iocType ?? detectIOCType(ioc.trim());
    const result = await enrichIOC(ioc.trim(), type);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[enrich] Error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
