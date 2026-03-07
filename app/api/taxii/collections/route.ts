// app/api/taxii/collections/route.ts
// Phase 5 — TAXII 2.1 Collections Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getCollections, getApiRoot, taxiiHeaders, validateTAXIIAuth } from '@/lib/taxii-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/taxii/collections - List all collections
export async function GET(req: NextRequest) {
  if (!validateTAXIIAuth(req)) {
    return new NextResponse(JSON.stringify({ title: 'Unauthorized', description: 'Valid credentials required' }), {
      status: 401,
      headers: { ...taxiiHeaders(), 'WWW-Authenticate': 'Basic realm="NextGuard TAXII"' },
    });
  }

  const cols = getCollections();
  return new NextResponse(JSON.stringify({ collections: cols }), {
    status: 200,
    headers: taxiiHeaders(),
  });
}
