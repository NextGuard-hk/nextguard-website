// app/api/taxii/discovery/route.ts
// Phase 5 — TAXII 2.1 Discovery Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getDiscovery, getApiRoot, taxiiHeaders, TAXII_MEDIA_TYPE, validateTAXIIAuth } from '@/lib/taxii-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/taxii/discovery - TAXII Discovery
export async function GET(req: NextRequest) {
  const accept = req.headers.get('accept') || '';
  const baseUrl = new URL(req.url).origin;

  // Check if requesting API root info
  const discovery = getDiscovery(baseUrl);

  return new NextResponse(JSON.stringify(discovery), {
    status: 200,
    headers: taxiiHeaders(),
  });
}
