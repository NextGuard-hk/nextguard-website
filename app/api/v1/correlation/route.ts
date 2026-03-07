// app/api/v1/correlation/route.ts
// Phase 6 - IOC Correlation Analysis API

import { NextRequest, NextResponse } from "next/server";

interface CorrelationResult {
  iocValue: string;
  iocType: string;
  relatedIndicators: { value: string; type: string; relationship: string; confidence: number }[];
  threatActors: string[];
  campaigns: string[];
  malwareFamilies: string[];
  riskScore: number;
  firstSeen: string;
  lastSeen: string;
}

const CORRELATION_DB: Record<string, CorrelationResult> = {
  "198.51.100.44": {
    iocValue: "198.51.100.44",
    iocType: "ipv4-addr",
    relatedIndicators: [
      { value: "evil-payload.example.com", type: "domain", relationship: "resolves-to", confidence: 90 },
      { value: "abc123def456", type: "file-hash", relationship: "downloaded-from", confidence: 85 },
    ],
    threatActors: ["Lazarus Group"],
    campaigns: ["AppleJeus 3.0"],
    malwareFamilies: ["DTrack", "AppleJeus"],
    riskScore: 92,
    firstSeen: "2024-11-15T00:00:00Z",
    lastSeen: "2025-01-20T14:30:00Z",
  },
  "malware-c2.example.com": {
    iocValue: "malware-c2.example.com",
    iocType: "domain-name",
    relatedIndicators: [
      { value: "203.0.113.50", type: "ipv4-addr", relationship: "resolves-to", confidence: 95 },
      { value: "phishing-page.example.org", type: "domain", relationship: "related-to", confidence: 70 },
    ],
    threatActors: ["APT28"],
    campaigns: ["Operation Pawn Storm 2025"],
    malwareFamilies: ["Sofacy", "X-Agent"],
    riskScore: 88,
    firstSeen: "2025-01-01T00:00:00Z",
    lastSeen: "2025-01-15T10:00:00Z",
  },
  "update-service.example.net": {
    iocValue: "update-service.example.net",
    iocType: "domain-name",
    relatedIndicators: [
      { value: "192.0.2.100", type: "ipv4-addr", relationship: "resolves-to", confidence: 88 },
    ],
    threatActors: ["Sandworm"],
    campaigns: ["Industroyer Redux"],
    malwareFamilies: ["Industroyer2", "CaddyWiper"],
    riskScore: 95,
    firstSeen: "2024-12-01T00:00:00Z",
    lastSeen: "2025-02-01T08:00:00Z",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ioc = searchParams.get("ioc");
  const type = searchParams.get("type");

  if (ioc) {
    const result = CORRELATION_DB[ioc];
    if (result) {
      return NextResponse.json({ success: true, data: result });
    }
    return NextResponse.json(
      { success: false, error: "No correlation data found for this IOC" },
      { status: 404 }
    );
  }

  // Return all correlations or filter by type
  let results = Object.values(CORRELATION_DB);
  if (type) {
    results = results.filter(r => r.iocType === type);
  }

  return NextResponse.json({
    success: true,
    data: results,
    meta: { total: results.length, timestamp: new Date().toISOString() },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { indicators } = body;

    if (!indicators || !Array.isArray(indicators)) {
      return NextResponse.json(
        { success: false, error: "indicators array is required" },
        { status: 400 }
      );
    }

    const results = indicators.map((ioc: string) => {
      const correlation = CORRELATION_DB[ioc];
      return {
        ioc,
        found: !!correlation,
        correlation: correlation || null,
      };
    });

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        queried: indicators.length,
        found: results.filter((r: any) => r.found).length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }
}
