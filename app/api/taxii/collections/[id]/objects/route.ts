// app/api/taxii/collections/[id]/objects/route.ts
// Phase 5 — TAXII 2.1 Collection Objects Endpoint
import { NextRequest, NextResponse } from 'next/server';
import {
  getCollection, getObjects, addObjects, getManifest,
  taxiiHeaders, STIX_MEDIA_TYPE, validateTAXIIAuth,
} from '@/lib/taxii-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/taxii/collections/[id]/objects - Get STIX objects from collection
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
  const collection = getCollection(id);
  if (!collection) {
    return new NextResponse(JSON.stringify({ title: 'Not Found', description: `Collection ${id} not found` }), {
      status: 404, headers: taxiiHeaders(),
    });
  }
  if (!collection.can_read) {
    return new NextResponse(JSON.stringify({ title: 'Forbidden', description: 'Collection is not readable' }), {
      status: 403, headers: taxiiHeaders(),
    });
  }

  const { searchParams } = new URL(req.url);
  const envelope = getObjects(id, {
    addedAfter: searchParams.get('added_after') || undefined,
    type: searchParams.get('match[type]') || searchParams.get('type') || undefined,
    limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : undefined,
    next: searchParams.get('next') || undefined,
  });

  return new NextResponse(JSON.stringify(envelope), {
    status: 200,
    headers: taxiiHeaders(STIX_MEDIA_TYPE),
  });
}

// POST /api/taxii/collections/[id]/objects - Add STIX objects to collection
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateTAXIIAuth(req)) {
    return new NextResponse(JSON.stringify({ title: 'Unauthorized' }), {
      status: 401, headers: taxiiHeaders(),
    });
  }

  const { id } = await params;
  const collection = getCollection(id);
  if (!collection) {
    return new NextResponse(JSON.stringify({ title: 'Not Found' }), {
      status: 404, headers: taxiiHeaders(),
    });
  }
  if (!collection.can_write) {
    return new NextResponse(JSON.stringify({ title: 'Forbidden', description: 'Collection does not accept writes' }), {
      status: 403, headers: taxiiHeaders(),
    });
  }

  try {
    const body = await req.json();
    const objects = body.objects || [];
    if (objects.length === 0) {
      return new NextResponse(JSON.stringify({ title: 'Bad Request', description: 'No objects provided' }), {
        status: 400, headers: taxiiHeaders(),
      });
    }
    const status = addObjects(id, objects);
    return new NextResponse(JSON.stringify(status), {
      status: 202, headers: taxiiHeaders(),
    });
  } catch (e: any) {
    return new NextResponse(JSON.stringify({ title: 'Bad Request', description: e.message }), {
      status: 400, headers: taxiiHeaders(),
    });
  }
}
