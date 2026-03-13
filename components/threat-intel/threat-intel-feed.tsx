"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rss, RefreshCw, ExternalLink, Clock, Filter, ChevronDown } from "lucide-react";

interface ThreatFeedItem {
  id: string;
  source: string;
  sourceIcon: string;
  title: string;
  summary: string;
  category: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  timestamp: string;
  tags: string[];
  url?: string;
}

const mockFeedItems: ThreatFeedItem[] = [
  {
    id: "tf-001",
    source: "AlienVault OTX",
    sourceIcon: "AV",
    title: "New Ransomware Variant Targeting Healthcare Sector",
    summary: "A new variant of LockBit ransomware has been observed targeting healthcare organizations with phishing campaigns.",
    category: "Malware",
    severity: "critical",
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    tags: ["ransomware", "healthcare", "lockbit"],
  },
  {
    id: "tf-002",
    source: "VirusTotal",
    sourceIcon: "VT",
    title: "Zero-day exploit in popular enterprise software",
    summary: "Critical zero-day vulnerability discovered with active exploitation in the wild. Patch not yet available.",
    category: "Vulnerability",
    severity: "critical",
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    tags: ["zero-day", "exploit", "enterprise"],
    url: "#",
  },
  {
    id: "tf-003",
    source: "CISA",
    sourceIcon: "CI",
    title: "Advisory on Chinese State-Sponsored Cyber Operations",
    summary: "CISA releases joint advisory detailing TTPs used by Chinese state-sponsored actors targeting critical infrastructure.",
    category: "APT",
    severity: "high",
    timestamp: new Date(Date.now() - 14400000).toISOString(),
    tags: ["apt", "china", "critical-infrastructure"],
    url: "#",
  },
  {
    id: "tf-004",
    source: "Cloudflare Radar",
    sourceIcon: "CF",
    title: "DDoS attack campaign targeting financial services",
    summary: "Large-scale DDoS campaign detected targeting multiple financial institutions across APAC region.",
    category: "DDoS",
    severity: "high",
    timestamp: new Date(Date.now() - 28800000).toISOString(),
    tags: ["ddos", "financial", "apac"],
  },
  {
    id: "tf-005",
    source: "MITRE ATT&CK",
    sourceIcon: "MA",
    title: "Updated technique for credential harvesting via OAuth",
    summary: "New sub-technique documented for adversary abuse of OAuth applications to harvest user credentials.",
    category: "Technique",
    severity: "medium",
    timestamp: new Date(Date.now() - 43200000).toISOString(),
    tags: ["oauth", "credential-harvesting", "technique"],
    url: "#",
  },
  {
    id: "tf-006",
    source: "PhishTank",
    sourceIcon: "PT",
    title: "Phishing campaign impersonating major cloud provider",
    summary: "Widespread phishing campaign detected using sophisticated clone sites of a major cloud service provider.",
    category: "Phishing",
    severity: "medium",
    timestamp: new Date(Date.now() - 57600000).toISOString(),
    tags: ["phishing", "cloud", "credential-theft"],
  },
  {
    id: "tf-007",
    source: "Abuse.ch",
    sourceIcon: "AB",
    title: "New C2 infrastructure identified for Emotet botnet",
    summary: "Multiple new command and control servers identified associated with the Emotet botnet resurgence.",
    category: "Botnet",
    severity: "high",
    timestamp: new Date(Date.now() - 72000000).toISOString(),
    tags: ["emotet", "botnet", "c2"],
  },
];

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    case "info": return "bg-cyan-500/20 text-cyan-400 border-cyan-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

export function ThreatIntelFeed() {
  const [feedItems, setFeedItems] = useState<ThreatFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setFeedItems(mockFeedItems);
      setLoading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  const categories = ["all", ...Array.from(new Set(mockFeedItems.map((f) => f.category)))];

  const filtered = selectedCategory === "all"
    ? feedItems
    : feedItems.filter((f) => f.category === selectedCategory);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Rss className="h-5 w-5 text-orange-400" />
              Threat Intelligence Feed
            </CardTitle>
            <CardDescription>Real-time threat intelligence from multiple sources</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="border-white/20 text-gray-300 hover:bg-white/10"
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat
                ? "bg-orange-500/20 text-orange-300 border-orange-500/50 hover:bg-orange-500/30"
                : "border-white/20 text-gray-400 hover:bg-white/10"
              }
            >
              {cat === "all" ? "All" : cat}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3 pr-4">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-gray-300">
                      {item.sourceIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={severityColor(item.severity)} >
                          {item.severity}
                        </Badge>
                        <Badge variant="outline" className="border-white/20 text-gray-400 text-xs">
                          {item.category}
                        </Badge>
                        <span className="text-gray-500 text-xs flex items-center gap-1 ml-auto">
                          <Clock className="h-3 w-3" />
                          {timeAgo(item.timestamp)}
                        </span>
                      </div>
                      <h4 className="text-white text-sm font-medium mb-1 truncate">{item.title}</h4>
                      <p className="text-gray-400 text-xs line-clamp-2">{item.summary}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-gray-500 text-xs">{item.source}</span>
                        <div className="flex gap-1 ml-auto">
                          {item.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-[10px] border-white/10 text-gray-500 px-1.5 py-0">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
