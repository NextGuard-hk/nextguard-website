"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Rss, RefreshCw, ExternalLink, Clock, AlertTriangle } from "lucide-react";

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
  indicatorCount?: number;
}

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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/v1/threat-intel/live-feed', { cache: 'no-store' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.items && data.items.length > 0) {
        setFeedItems(data.items);
        setLastUpdate(data.timestamp || new Date().toISOString());
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    const interval = setInterval(fetchFeed, 300000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchFeed]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const categories = ["all", ...Array.from(new Set(feedItems.map((f) => f.category)))];
  const filtered = selectedCategory === "all" ? feedItems : feedItems.filter((f) => f.category === selectedCategory);

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card className="bg-[#0d1117] border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Rss className="h-5 w-5 text-orange-400" />
              Threat Intelligence Feed
              <Badge variant="outline" className="ml-2 text-green-400 border-green-500/50 text-xs">LIVE</Badge>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Real-time threat intelligence from OTX, CISA & Abuse.ch
              {lastUpdate && <span className="ml-2 text-xs text-gray-500">Updated: {timeAgo(lastUpdate)}</span>}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="border-white/20 text-gray-400 hover:bg-white/10">
            <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />Refresh
          </Button>
        </div>
        <div className="flex gap-2 flex-wrap mt-2">
          {categories.map((cat) => (
            <Badge key={cat} variant="outline" className={`cursor-pointer ${selectedCategory === cat ? 'bg-orange-500/20 text-orange-300 border-orange-500/50' : 'border-white/20 text-gray-400 hover:bg-white/10'}`} onClick={() => setSelectedCategory(cat)}>
              {cat === "all" ? "All" : cat}
            </Badge>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            <div className="space-y-3">
              {filtered.map((item) => (
                <div key={item.id} className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-white/10 px-1.5 py-0.5 rounded text-gray-300">{item.sourceIcon}</span>
                      <Badge variant="outline" className={severityColor(item.severity)}>{item.severity}</Badge>
                      <Badge variant="outline" className="border-white/20 text-gray-400">{item.category}</Badge>
                      {item.indicatorCount ? <Badge variant="outline" className="border-cyan-500/30 text-cyan-400 text-xs">{item.indicatorCount} IOCs</Badge> : null}
                    </div>
                    <span className="text-xs text-gray-500 flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(item.timestamp)}</span>
                  </div>
                  <h4 className="text-white font-medium mb-1 text-sm">{item.title}</h4>
                  <p className="text-gray-400 text-xs mb-2 line-clamp-2">{item.summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">{item.source}</span>
                    </div>
                    <div className="flex gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs border-white/10 text-gray-500">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  {item.url && item.url !== '#' && (
                    <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 mt-2 inline-flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />View Source
                    </a>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-gray-500 py-8">No feed items found</div>
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
