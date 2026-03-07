// app/api/v1/campaigns/route.ts
// Phase 6 - Campaign Tracking API

import { NextRequest, NextResponse } from "next/server";
import { getCampaigns, getCampaignById } from "@/lib/diamond-model";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const adversaryId = searchParams.get("adversaryId");
  const status = searchParams.get("status");
  const sector = searchParams.get("sector");

  if (id) {
    const campaign = getCampaignById(id);
    if (campaign) {
      return NextResponse.json({ success: true, data: campaign });
    }
    return NextResponse.json(
      { success: false, error: "Campaign not found" },
      { status: 404 }
    );
  }

  const campaigns = getCampaigns({
    adversaryId: adversaryId || undefined,
    status: status || undefined,
    sector: sector || undefined,
  });

  return NextResponse.json({
    success: true,
    data: campaigns,
    meta: {
      total: campaigns.length,
      active: campaigns.filter(c => c.status === "active").length,
      filters: { adversaryId, status, sector },
      timestamp: new Date().toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, adversaryId, targetSectors, targetRegions, description } = body;

    if (!name || !adversaryId) {
      return NextResponse.json(
        { success: false, error: "name and adversaryId are required" },
        { status: 400 }
      );
    }

    const newCampaign = {
      id: `camp-${Date.now()}`,
      name,
      adversaryId,
      status: "active" as const,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      targetSectors: targetSectors || [],
      targetRegions: targetRegions || [],
      description: description || "",
      relatedIndicators: [],
    };

    return NextResponse.json(
      { success: true, data: newCampaign, message: "Campaign created (demo mode)" },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
