"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Clock, Users, ChevronRight, AlertTriangle, ExternalLink } from "lucide-react";

interface Campaign {
  id: string;
  name: string;
  description: string;
  aliases: string[];
  firstSeen: string;
  lastSeen: string;
  created: string;
  modified: string;
  references: { source_name: string; url?: string }[];
}

const severityFromAge = (modified: string): "critical" | "high" | "medium" | "low" => {
  const days = (Date.now() - new Date(modified).getTime()) / 86400000;
  if (days < 180) return "critical";
  if (days < 365) return "high";
  if (days < 730) return "medium";
  return "low";
};

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  }
};

export function ThreatCampaignTracker() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Campaign | null>(null);

  useEffect(() => {
    fetch('https://raw.githubusercontent.com/mitre/cti/master/enterprise-attack/enterprise-attack.json')
      .then(r => r.json())
      .then(data => {
        const objects = data.objects || [];
        const camps = objects
          .filter((o: any) => o.type === 'campaign' && !o.revoked)
          .map((c: any) => ({
            id: c.external_references?.[0]?.external_id || c.id,
            name: c.name,
            description: c.description || '',
            aliases: c.aliases || [],
            firstSeen: c.first_seen || c.created,
            lastSeen: c.last_seen || c.modified,
            created: c.created,
            modified: c.modified,
            references: (c.external_references || []).map((r: any) => ({ source_name: r.source_name, url: r.url })),
          }))
          .sort((a: Campaign, b: Campaign) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
        setCampaigns(camps);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const recentCampaigns = campaigns.filter(c => {
    const days = (Date.now() - new Date(c.modified).getTime()) / 86400000;
    return days < 365;
  });

  const stats = {
    total: campaigns.length,
    recent: recentCampaigns.length,
    critical: campaigns.filter(c => severityFromAge(c.modified) === 'critical').length,
  };

  const timeAgo = (d: string) => {
    const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-red-500" />
              Threat Campaign Tracker
            </CardTitle>
            <CardDescription>Real campaigns from MITRE ATT&CK knowledge base</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">Source: MITRE ATT&CK</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Campaigns</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-red-400">{stats.critical}</div>
            <div className="text-xs text-muted-foreground">Recent (6mo)</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-400">{stats.recent}</div>
            <div className="text-xs text-muted-foreground">Active (1yr)</div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {loading ? (
            [1,2,3,4].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />)
          ) : (
            campaigns.slice(0, 30).map(campaign => {
              const sev = severityFromAge(campaign.modified);
              return (
                <div key={campaign.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => setSelected(selected?.id === campaign.id ? null : campaign)}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{campaign.name}</span>
                      <Badge className={severityColor(sev) + " text-xs"}>{sev}</Badge>
                      <Badge variant="secondary" className="text-xs">{campaign.id}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {timeAgo(campaign.modified)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{campaign.description.slice(0, 200)}</p>

                  {selected?.id === campaign.id && (
                    <div className="mt-3 space-y-2 border-t pt-3">
                      <p className="text-sm text-muted-foreground leading-relaxed">{campaign.description.slice(0, 500)}</p>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>First seen: {campaign.firstSeen?.slice(0, 10) || 'N/A'}</span>
                        <span>Last seen: {campaign.lastSeen?.slice(0, 10) || 'N/A'}</span>
                      </div>
                      {campaign.references.filter(r => r.url).length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {campaign.references.filter(r => r.url).slice(0, 3).map((r, i) => (
                            <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                              <ExternalLink className="h-3 w-3" />{r.source_name}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
