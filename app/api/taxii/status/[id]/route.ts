// app/api/taxii/status/[id]/route.ts
// Phase 5 — TAXII 2.1 Status Endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getStatus, taxiiHeaders, validateTAXIIAuth } from '@/lib/taxii-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/taxii/status/[id] - Get status of a previous add-objects request
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateTAXIIAuth(req)) {
    return new NextResponse(JSON.stringify({ title: 'Unauthorized' }), {
      status: 401, headers: taxiiHeaders(),
    });
  }

  const { id } = await params;
  const status = getStatus(id);
  if (!status) {
    return new NextResponse(JSON.stringify({ title: 'Not Found', description: `Status ${id} not found` }), {
      status: 404, headers: taxiiHeaders(),
    });
  }

  return new NextResponse(JSON.stringify(status), {
    status: 200, headers: taxiiHeaders(),
  });
}
