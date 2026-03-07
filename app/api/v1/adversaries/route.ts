// app/api/v1/adversaries/route.ts
// Phase 6 - Threat Actor Mapping API

import { NextRequest, NextResponse } from "next/server";
import {
  getAdversaries,
  getAdversaryById,
  getDiamondEvents,
  getCampaigns,
} from "@/lib/diamond-model";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const country = searchParams.get("country");
  const motivation = searchParams.get("motivation");
  const expand = searchParams.get("expand");

  if (id) {
    const adversary = getAdversaryById(id);
    if (!adversary) {
      return NextResponse.json(
        { success: false, error: "Adversary not found" },
        { status: 404 }
      );
    }

    // Optionally expand with related data
    if (expand === "true") {
      const events = getDiamondEvents({ adversaryId: id });
      const campaigns = getCampaigns({ adversaryId: id });
      return NextResponse.json({
        success: true,
        data: {
          ...adversary,
          diamondEvents: events,
          campaigns,
          stats: {
            totalEvents: events.length,
            activeCampaigns: campaigns.filter(c => c.status === "active").length,
            avgConfidence: events.length > 0
              ? Math.round(events.reduce((sum, e) => sum + e.confidence, 0) / events.length)
              : 0,
          },
        },
      });
    }

    return NextResponse.json({ success: true, data: adversary });
  }

  let adversaries = getAdversaries();
  if (country) {
    adversaries = adversaries.filter(a => a.country.toLowerCase() === country.toLowerCase());
  }
  if (motivation) {
    adversaries = adversaries.filter(a => a.motivation.toLowerCase() === motivation.toLowerCase());
  }

  return NextResponse.json({
    success: true,
    data: adversaries,
    meta: {
      total: adversaries.length,
      filters: { country, motivation },
      timestamp: new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json(
        { success: false, error: "ids array is required" },
        { status: 400 }
      );
    }

    const results = ids.map((id: string) => {
      const adversary = getAdversaryById(id);
      const events = getDiamondEvents({ adversaryId: id });
      const campaigns = getCampaigns({ adversaryId: id });
      return {
        id,
        found: !!adversary,
        adversary: adversary || null,
        eventCount: events.length,
        campaignCount: campaigns.length,
      };
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: { queried: ids.length, found: results.filter((r: any) => r.found).length },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
