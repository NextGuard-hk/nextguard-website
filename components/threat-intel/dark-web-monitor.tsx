"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Eye, EyeOff, Globe, Search, Shield, Clock, ExternalLink } from "lucide-react";

interface DarkWebMention {
  id: string;
  source: string;
  type: "credential_leak" | "data_breach" | "mention" | "paste" | "marketplace";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  date: string;
  affectedAssets: string[];
  status: "new" | "investigating" | "resolved" | "false_positive";
}

const mockMentions: DarkWebMention[] = [
  {
    id: "dw-001",
    source: "Dark Forum XYZ",
    type: "credential_leak",
    severity: "critical",
    title: "Employee credentials found in dark web dump",
    description: "Multiple employee email/password combinations discovered in a recent data dump on a known dark web forum.",
    date: new Date(Date.now() - 2 * 3600000).toISOString(),
    affectedAssets: ["corp-email", "vpn-access"],
    status: "new",
  },
  {
    id: "dw-002",
    source: "Paste Site",
    type: "paste",
    severity: "high",
    title: "API keys exposed in public paste",
    description: "Internal API keys found in a public paste site, potentially exposing cloud infrastructure.",
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    affectedAssets: ["cloud-api"],
    status: "investigating",
  },
  {
    id: "dw-003",
    source: "Marketplace",
    type: "marketplace",
    severity: "high",
    title: "Company data listed for sale",
    description: "A threat actor is claiming to sell customer database records on a dark web marketplace.",
    date: new Date(Date.now() - 48 * 3600000).toISOString(),
    affectedAssets: ["customer-db"],
    status: "investigating",
  },
  {
    id: "dw-004",
    source: "Threat Intel Feed",
    type: "mention",
    severity: "medium",
    title: "Company mentioned in threat actor discussion",
    description: "Company name referenced in a discussion about potential targets in a closed threat actor channel.",
    date: new Date(Date.now() - 72 * 3600000).toISOString(),
    affectedAssets: ["brand"],
    status: "resolved",
  },
  {
    id: "dw-005",
    source: "Breach Database",
    type: "data_breach",
    severity: "low",
    title: "Old breach data recirculated",
    description: "Previously known breach data from 2021 resurfaced in a new compilation.",
    date: new Date(Date.now() - 168 * 3600000).toISOString(),
    affectedAssets: ["legacy-accounts"],
    status: "false_positive",
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
    case "new": return "bg-red-500/20 text-red-400";
    case "investigating": return "bg-yellow-500/20 text-yellow-400";
    case "resolved": return "bg-green-500/20 text-green-400";
    case "false_positive": return "bg-gray-500/20 text-gray-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

const typeIcon = (t: string) => {
  switch (t) {
    case "credential_leak": return <EyeOff className="h-4 w-4" />;
    case "data_breach": return <Shield className="h-4 w-4" />;
    case "mention": return <Eye className="h-4 w-4" />;
    case "paste": return <ExternalLink className="h-4 w-4" />;
    case "marketplace": return <Globe className="h-4 w-4" />;
    default: return <AlertTriangle className="h-4 w-4" />;
  }
};

export function DarkWebMonitor() {
  const [mentions, setMentions] = useState<DarkWebMention[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMentions(mockMentions);
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const filtered = mentions.filter((m) => {
    const matchesSearch =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || m.type === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: mentions.length,
    critical: mentions.filter((m) => m.severity === "critical").length,
    new: mentions.filter((m) => m.status === "new").length,
    investigating: mentions.filter((m) => m.status === "investigating").length,
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-purple-400" />
              Dark Web Monitor
            </CardTitle>
            <CardDescription>Monitor dark web mentions and credential leaks</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className={severityColor("critical")}>{stats.critical} Critical</Badge>
            <Badge className={statusColor("new")}>{stats.new} New</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search mentions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="all" className="data-[state=active]:bg-white/10">All</TabsTrigger>
            <TabsTrigger value="credential_leak" className="data-[state=active]:bg-white/10">Credentials</TabsTrigger>
            <TabsTrigger value="data_breach" className="data-[state=active]:bg-white/10">Breaches</TabsTrigger>
            <TabsTrigger value="mention" className="data-[state=active]:bg-white/10">Mentions</TabsTrigger>
            <TabsTrigger value="marketplace" className="data-[state=active]:bg-white/10">Marketplace</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((mention) => (
              <div
                key={mention.id}
                className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`p-1.5 rounded ${severityColor(mention.severity)}`}>
                      {typeIcon(mention.type)}
                    </span>
                    <div>
                      <h4 className="text-white font-medium text-sm">{mention.title}</h4>
                      <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {timeAgo(mention.date)} · {mention.source}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={severityColor(mention.severity)}>{mention.severity}</Badge>
                    <Badge className={statusColor(mention.status)}>{mention.status.replace("_", " ")}</Badge>
                  </div>
                </div>
                <p className="text-gray-300 text-sm mb-2">{mention.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {mention.affectedAssets.map((asset) => (
                      <Badge key={asset} variant="outline" className="text-xs border-white/20 text-gray-400">
                        {asset}
                      </Badge>
                    ))}
                  </div>
                  <Button variant="ghost" size="sm" className="text-purple-400 hover:text-purple-300">
                    Investigate
                  </Button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No mentions found matching your criteria</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
