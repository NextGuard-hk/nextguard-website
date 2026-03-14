"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, Eye, Globe, Search, Shield, Clock, ExternalLink, RefreshCw } from "lucide-react";

interface ThreatEntry {
  id: string;
  source: string;
  type: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  date: string;
  ioc: string;
  status: string;
  url?: string;
}

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  }
};

export function DarkWebMonitor() {
  const [entries, setEntries] = useState<ThreatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const [urlhausRes, threatFoxRes] = await Promise.allSettled([
        fetch('https://urlhaus-api.abuse.ch/v1/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'tag=malware'
        }).then(r => r.json()),
        fetch('https://threatfox-api.abuse.ch/api/v1/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: 'get_iocs', days: 1 })
        }).then(r => r.json()),
      ]);

      const items: ThreatEntry[] = [];

      if (urlhausRes.status === 'fulfilled' && urlhausRes.value.urls) {
        urlhausRes.value.urls.slice(0, 15).forEach((u: any, i: number) => {
          items.push({
            id: `uh-${i}`,
            source: 'URLhaus',
            type: 'malware_url',
            severity: u.threat === 'malware_download' ? 'critical' : 'high',
            title: `Malware Distribution: ${u.url_status}`,
            description: `${u.threat || 'Malware'} URL detected. Tags: ${(u.tags || []).join(', ') || 'none'}. Reporter: ${u.reporter || 'anonymous'}`,
            date: u.dateadded || new Date().toISOString(),
            ioc: u.url || '',
            status: u.url_status || 'online',
            url: `https://urlhaus.abuse.ch/url/${u.id}/`,
          });
        });
      }

      if (threatFoxRes.status === 'fulfilled' && threatFoxRes.value.data) {
        (Array.isArray(threatFoxRes.value.data) ? threatFoxRes.value.data : []).slice(0, 15).forEach((t: any, i: number) => {
          items.push({
            id: `tf-${i}`,
            source: 'ThreatFox',
            type: t.ioc_type || 'ioc',
            severity: t.confidence_level >= 75 ? 'critical' : t.confidence_level >= 50 ? 'high' : 'medium',
            title: `${t.malware || 'Malware'}: ${t.threat_type || 'C2'}`,
            description: `IOC type: ${t.ioc_type || 'unknown'}. Malware: ${t.malware || 'unknown'}. Tags: ${(t.tags || []).join(', ') || 'none'}`,
            date: t.first_seen_utc || new Date().toISOString(),
            ioc: t.ioc || '',
            status: 'active',
            url: `https://threatfox.abuse.ch/ioc/${t.id}/`,
          });
        });
      }

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setEntries(items);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchData(); };

  const filtered = entries.filter(e => {
    const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.ioc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || e.source.toLowerCase() === activeTab;
    return matchesSearch && matchesTab;
  });

  const stats = {
    total: entries.length,
    critical: entries.filter(e => e.severity === 'critical').length,
    urlhaus: entries.filter(e => e.source === 'URLhaus').length,
    threatfox: entries.filter(e => e.source === 'ThreatFox').length,
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return 'Just now';
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              Underground Threat Monitor
              <Badge className="bg-red-500/20 text-red-400 border-red-500/50 text-xs">LIVE</Badge>
            </CardTitle>
            <CardDescription>Real-time malware URLs & C2 infrastructure from Abuse.ch</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant="outline">{stats.critical} Critical</Badge>
          <Badge variant="outline">{stats.urlhaus} URLhaus</Badge>
          <Badge variant="outline">{stats.threatfox} ThreatFox</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-3">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search IOCs, malware families..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-3">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="urlhaus">URLhaus</TabsTrigger>
            <TabsTrigger value="threatfox">ThreatFox</TabsTrigger>
          </TabsList>
        </Tabs>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />)
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">No threats found</p>
          ) : (
            filtered.map(entry => (
              <div key={entry.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                    <span className="font-semibold text-sm">{entry.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={severityColor(entry.severity) + " text-xs"}>{entry.severity}</Badge>
                    <Badge variant="secondary" className="text-xs">{entry.source}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mb-1">{entry.description}</p>
                {entry.ioc && (
                  <code className="text-xs text-blue-400 font-mono block truncate">{entry.ioc}</code>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(entry.date)}
                  </span>
                  {entry.url && (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" /> Details
                    </a>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <p className="text-xs text-muted-foreground text-right mt-2">Sources: Abuse.ch URLhaus & ThreatFox</p>
      </CardContent>
    </Card>
  );
}
