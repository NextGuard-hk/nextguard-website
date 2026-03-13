"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Users, MapPin, Zap, ChevronRight, AlertTriangle } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  threatActor: string;
  status: "active" | "dormant" | "resolved";
  severity: "critical" | "high" | "medium" | "low";
  firstSeen: string;
  lastSeen: string;
  iocCount: number;
  targetSectors: string[];
  targetRegions: string[];
  ttps: string[];
  description: string;
  trend: "escalating" | "stable" | "declining";
}

const mockCampaigns: Campaign[] = [
  {
    id: "camp-001",
    name: "Operation Dragon Bridge",
    threatActor: "APT41 / Winnti",
    status: "active",
    severity: "critical",
    firstSeen: "2026-01-15",
    lastSeen: new Date(Date.now() - 3600000).toISOString(),
    iocCount: 247,
    targetSectors: ["Financial Services", "Government"],
    targetRegions: ["APAC", "Hong Kong"],
    ttps: ["T1566.001", "T1059.001", "T1071.001", "T1486"],
    description: "Sophisticated spear-phishing campaign targeting HK financial institutions with custom backdoors and credential harvesters.",
    trend: "escalating",
  },
  {
    id: "camp-002",
    name: "SilkVenom Credential Harvest",
    threatActor: "UNC3886",
    status: "active",
    severity: "high",
    firstSeen: "2026-02-20",
    lastSeen: new Date(Date.now() - 86400000).toISOString(),
    iocCount: 156,
    targetSectors: ["Technology", "Telecom"],
    targetRegions: ["APAC", "Southeast Asia"],
    ttps: ["T1190", "T1078", "T1003.001"],
    description: "Exploitation of edge network devices to harvest VPN and SSH credentials from tech companies.",
    trend: "stable",
  },
  {
    id: "camp-003",
    name: "GhostNet Resurgence",
    threatActor: "Mustang Panda",
    status: "active",
    severity: "high",
    firstSeen: "2026-03-01",
    lastSeen: new Date(Date.now() - 172800000).toISOString(),
    iocCount: 89,
    targetSectors: ["Government", "NGO"],
    targetRegions: ["Hong Kong", "Taiwan"],
    ttps: ["T1566.002", "T1204.002", "T1547.001"],
    description: "USB-based malware distribution targeting government entities through compromised document templates.",
    trend: "escalating",
  },
  {
    id: "camp-004",
    name: "PhishNet Finance Wave",
    threatActor: "FIN7",
    status: "dormant",
    severity: "medium",
    firstSeen: "2025-11-10",
    lastSeen: "2026-02-15",
    iocCount: 312,
    targetSectors: ["Financial Services", "Retail"],
    targetRegions: ["Global"],
    ttps: ["T1566.001", "T1059.005", "T1055"],
    description: "Large-scale phishing campaign impersonating banking portals with JavaScript-based skimmers.",
    trend: "declining",
  },
  {
    id: "camp-005",
    name: "Ransomware-as-a-Service Wave 3",
    threatActor: "LockBit 4.0 Affiliates",
    status: "active",
    severity: "critical",
    firstSeen: "2026-02-01",
    lastSeen: new Date(Date.now() - 7200000).toISOString(),
    iocCount: 523,
    targetSectors: ["Healthcare", "Manufacturing", "Education"],
    targetRegions: ["Global", "APAC"],
    ttps: ["T1486", "T1490", "T1027", "T1562.001"],
    description: "Multi-affiliate ransomware campaign leveraging stolen VPN credentials and disabling endpoint protection.",
    trend: "escalating",
  },
];

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "bg-red-500/20 text-red-400";
    case "dormant": return "bg-yellow-500/20 text-yellow-400";
    case "resolved": return "bg-green-500/20 text-green-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

const trendIcon = (t: string) => {
  switch (t) {
    case "escalating": return <TrendingUp className="h-3 w-3 text-red-400" />;
    case "stable": return <Zap className="h-3 w-3 text-yellow-400" />;
    case "declining": return <TrendingUp className="h-3 w-3 text-green-400 rotate-180" />;
    default: return null;
  }
};

export function ThreatCampaignTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Campaign | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCampaigns(mockCampaigns);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const stats = {
    active: campaigns.filter((c) => c.status === "active").length,
    totalIOCs: campaigns.reduce((sum, c) => sum + c.iocCount, 0),
    escalating: campaigns.filter((c) => c.trend === "escalating").length,
  };

  const daysSince = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    return Math.floor(diff / 86400000);
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              Threat Campaign Tracker
            </CardTitle>
            <CardDescription>AI-detected threat campaigns and actor clustering</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-red-500/20 text-red-400">{stats.active} Active</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-400">{stats.totalIOCs} IOCs</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.active}</p>
            <p className="text-xs text-gray-400">Active Campaigns</p>
          </div>
          <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-center">
            <p className="text-2xl font-bold text-cyan-400">{stats.totalIOCs}</p>
            <p className="text-xs text-gray-400">Related IOCs</p>
          </div>
          <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-center">
            <p className="text-2xl font-bold text-orange-400">{stats.escalating}</p>
            <p className="text-xs text-gray-400">Escalating</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-28 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                  selected?.id === campaign.id
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
                onClick={() => setSelected(selected?.id === campaign.id ? null : campaign)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`h-4 w-4 ${
                      campaign.severity === "critical" ? "text-red-400" : "text-orange-400"
                    }`} />
                    <div>
                      <h4 className="text-white font-medium text-sm">{campaign.name}</h4>
                      <p className="text-gray-400 text-xs flex items-center gap-1">
                        <Users className="h-3 w-3" /> {campaign.threatActor}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      {trendIcon(campaign.trend)} {campaign.trend}
                    </span>
                    <Badge className={statusColor(campaign.status)}>{campaign.status}</Badge>
                    <Badge className={severityColor(campaign.severity)}>{campaign.severity}</Badge>
                  </div>
                </div>
                <p className="text-gray-300 text-xs mb-2">{campaign.description}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {daysSince(campaign.firstSeen)}d active</span>
                  <span>{campaign.iocCount} IOCs</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {campaign.targetRegions.join(", ")}</span>
                </div>

                {selected?.id === campaign.id && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div>
                      <span className="text-gray-400 text-xs font-medium">Target Sectors:</span>
                      <div className="flex gap-1 mt-1">
                        {campaign.targetSectors.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs border-white/20 text-gray-300">{s}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-400 text-xs font-medium">MITRE TTPs:</span>
                      <div className="flex gap-1 mt-1">
                        {campaign.ttps.map((t) => (
                          <Badge key={t} className="text-xs bg-purple-500/20 text-purple-300 border-purple-500/50">{t}</Badge>
                        ))}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="text-cyan-400 hover:text-cyan-300 mt-1">
                      View Full Campaign Report <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
