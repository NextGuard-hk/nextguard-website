// app/api/v1/diamond/route.ts
// Phase 6 - Diamond Model API

import { NextRequest, NextResponse } from "next/server";
import {
  getDiamondEvents,
  getDiamondEventById,
  buildDiamondAnalysis,
} from "@/lib/diamond-model";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const adversaryId = searchParams.get("adversaryId");
  const phase = searchParams.get("phase");
  const sector = searchParams.get("sector");
  const minConfidence = searchParams.get("minConfidence");
  const analysis = searchParams.get("analysis");

  // Build full Diamond Model analysis for an adversary
  if (analysis === "true" && adversaryId) {
    const result = buildDiamondAnalysis(adversaryId);
    return NextResponse.json({
      success: true,
      data: result,
      meta: { type: "diamond-analysis", timestamp: new Date().toISOString() },
    });
  }

  // Get single event by ID
  if (id) {
    const event = getDiamondEventById(id);
    if (event) {
      return NextResponse.json({ success: true, data: event });
    }
    return NextResponse.json(
      { success: false, error: "Diamond event not found" },
      { status: 404 }
    );
  }

  // List events with filters
  const events = getDiamondEvents({
    adversaryId: adversaryId || undefined,
    phase: phase || undefined,
    sector: sector || undefined,
    minConfidence: minConfidence ? parseInt(minConfidence) : undefined,
  });

  return NextResponse.json({
    success: true,
    data: events,
    meta: {
      total: events.length,
      filters: { adversaryId, phase, sector, minConfidence },
      timestamp: new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adversaryIds } = body;

    if (!adversaryIds || !Array.isArray(adversaryIds)) {
      return NextResponse.json(
        { success: false, error: "adversaryIds array is required" },
        { status: 400 }
      );
    }

    const analyses = adversaryIds.map((advId: string) => ({
      adversaryId: advId,
      analysis: buildDiamondAnalysis(advId),
    }));

    return NextResponse.json({
      success: true,
      data: analyses,
      meta: { count: analyses.length, timestamp: new Date().toISOString() },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
