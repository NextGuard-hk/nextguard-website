"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, Shield, AlertTriangle } from "lucide-react";

interface CountryThreat {
  country: string;
  code: string;
  groups: number;
  techniques: number;
  topGroups: string[];
  severity: "critical" | "high" | "medium" | "low";
}

const COUNTRY_MAP: Record<string, { code: string; severity: "critical" | "high" | "medium" | "low" }> = {
  'China': { code: 'CN', severity: 'critical' },
  'Russia': { code: 'RU', severity: 'critical' },
  'North Korea': { code: 'KP', severity: 'high' },
  'Iran': { code: 'IR', severity: 'high' },
  'Vietnam': { code: 'VN', severity: 'medium' },
  'India': { code: 'IN', severity: 'medium' },
  'Pakistan': { code: 'PK', severity: 'medium' },
  'Israel': { code: 'IL', severity: 'medium' },
  'Unknown': { code: '??', severity: 'low' },
};

const severityBg = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    default: return "bg-blue-500/20 text-blue-400 border-blue-500/50";
  }
};

export function GeoThreatMap() {
  const [data, setData] = useState<CountryThreat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/threat-intel/mitre')
      .then(r => r.json())
      .then(result => {
        const groups = result.groups || [];
        const countryAgg: Record<string, { groups: string[]; techniques: number }> = {};
        groups.forEach((g: any) => {
          const country = extractCountry(g.description || '', g.aliases || []);
          if (!countryAgg[country]) countryAgg[country] = { groups: [], techniques: 0 };
          countryAgg[country].groups.push(g.name);
          countryAgg[country].techniques += g.techniques?.length || 0;
        });
        const mapped: CountryThreat[] = Object.entries(countryAgg)
          .map(([country, info]) => ({
            country,
            code: COUNTRY_MAP[country]?.code || '??',
            groups: info.groups.length,
            techniques: info.techniques,
            topGroups: info.groups.slice(0, 3),
            severity: COUNTRY_MAP[country]?.severity || 'low',
          }))
          .sort((a, b) => b.groups - a.groups);
        setData(mapped);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const totalGroups = data.reduce((s, d) => s + d.groups, 0);
  const totalTechniques = data.reduce((s, d) => s + d.techniques, 0);
  const maxGroups = Math.max(...data.map(d => d.groups), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Geographic Threat Map
            </CardTitle>
            <CardDescription>Adversary group origins from MITRE ATT&CK</CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">Source: MITRE ATT&CK</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{totalGroups}</div>
            <div className="text-xs text-muted-foreground">Threat Groups</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.filter(d => d.severity === 'critical').length}</div>
            <div className="text-xs text-muted-foreground">Critical Origins</div>
          </div>
          <div className="bg-card border rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{data.length}</div>
            <div className="text-xs text-muted-foreground">Source Countries</div>
          </div>
        </div>

        {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

        <div className="space-y-2">
          {loading ? (
            Array(6).fill(null).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-lg" />
            ))
          ) : (
            data.filter(d => d.country !== 'Unknown').map(item => (
              <div key={item.code} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent/50 transition-colors">
                <div className="w-8 text-center font-mono text-xs font-bold">{item.code}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">{item.country}</span>
                    <Badge className={severityBg(item.severity) + " text-xs"}>{item.severity}</Badge>
                    <span className="text-xs text-muted-foreground">{item.groups} groups</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(item.groups / maxGroups) * 100}%` }} />
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">{item.topGroups.slice(0, 2).join(', ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function extractCountry(desc: string, aliases: string[]): string {
  const d = desc.toLowerCase();
  if (d.includes('china') || d.includes('chinese') || d.includes('prc')) return 'China';
  if (d.includes('russia') || d.includes('russian') || d.includes('gru') || d.includes('fsb')) return 'Russia';
  if (d.includes('north korea') || d.includes('dprk') || d.includes('lazarus')) return 'North Korea';
  if (d.includes('iran') || d.includes('iranian') || d.includes('irgc')) return 'Iran';
  if (d.includes('vietnam')) return 'Vietnam';
  if (d.includes('india')) return 'India';
  if (d.includes('pakistan')) return 'Pakistan';
  if (d.includes('israel')) return 'Israel';
  return 'Unknown';
}
