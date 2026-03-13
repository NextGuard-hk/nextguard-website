"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, Shield, AlertTriangle, MapPin } from "lucide-react";

interface GeoThreat {
  country: string;
  code: string;
  attacks: number;
  blocked: number;
  topType: string;
  severity: "critical" | "high" | "medium" | "low";
  trend: "up" | "down" | "stable";
  lat: number;
  lng: number;
}

const mockGeoData: GeoThreat[] = [
  { country: "China", code: "CN", attacks: 12453, blocked: 11890, topType: "APT / Espionage", severity: "critical", trend: "up", lat: 35.86, lng: 104.19 },
  { country: "Russia", code: "RU", attacks: 8921, blocked: 8654, topType: "Ransomware", severity: "critical", trend: "up", lat: 61.52, lng: 105.32 },
  { country: "United States", code: "US", attacks: 6234, blocked: 5987, topType: "Credential Theft", severity: "high", trend: "stable", lat: 37.09, lng: -95.71 },
  { country: "North Korea", code: "KP", attacks: 3456, blocked: 3401, topType: "Crypto Theft", severity: "high", trend: "up", lat: 40.34, lng: 127.51 },
  { country: "Iran", code: "IR", attacks: 2187, blocked: 2098, topType: "Destructive", severity: "high", trend: "stable", lat: 32.43, lng: 53.69 },
  { country: "Brazil", code: "BR", attacks: 1876, blocked: 1654, topType: "Banking Trojan", severity: "medium", trend: "down", lat: -14.24, lng: -51.93 },
  { country: "India", code: "IN", attacks: 1543, blocked: 1432, topType: "Phishing", severity: "medium", trend: "up", lat: 20.59, lng: 78.96 },
  { country: "Vietnam", code: "VN", attacks: 987, blocked: 945, topType: "Supply Chain", severity: "medium", trend: "stable", lat: 14.06, lng: 108.28 },
  { country: "Nigeria", code: "NG", attacks: 876, blocked: 812, topType: "BEC Scam", severity: "medium", trend: "up", lat: 9.08, lng: 8.68 },
  { country: "Hong Kong", code: "HK", attacks: 654, blocked: 621, topType: "Targeted Phishing", severity: "high", trend: "up", lat: 22.40, lng: 114.11 },
];

const severityColor = (s: string) => {
  switch (s) {
    case "critical": return "text-red-400";
    case "high": return "text-orange-400";
    case "medium": return "text-yellow-400";
    case "low": return "text-blue-400";
    default: return "text-gray-400";
  }
};

const severityBg = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high": return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "low": return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    default: return "bg-gray-500/20 text-gray-400 border-gray-500/50";
  }
};

const barWidth = (val: number, max: number) => `${Math.max(5, (val / max) * 100)}%`;

export function GeoThreatMap() {
  const [data, setData] = useState<GeoThreat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setData(mockGeoData);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const totalAttacks = data.reduce((s, d) => s + d.attacks, 0);
  const totalBlocked = data.reduce((s, d) => s + d.blocked, 0);
  const maxAttacks = Math.max(...data.map((d) => d.attacks), 1);
  const blockRate = totalAttacks > 0 ? ((totalBlocked / totalAttacks) * 100).toFixed(1) : "0";

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Globe className="h-5 w-5 text-emerald-400" />
              Geographic Threat Map
            </CardTitle>
            <CardDescription>Attack origins and geographic threat distribution</CardDescription>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">
            {blockRate}% Blocked
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 text-center">
            <p className="text-2xl font-bold text-white">{(totalAttacks / 1000).toFixed(1)}k</p>
            <p className="text-xs text-gray-400">Total Attacks</p>
          </div>
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-center">
            <p className="text-2xl font-bold text-emerald-400">{(totalBlocked / 1000).toFixed(1)}k</p>
            <p className="text-xs text-gray-400">Blocked</p>
          </div>
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
            <p className="text-2xl font-bold text-red-400">{data.length}</p>
            <p className="text-xs text-gray-400">Source Countries</p>
          </div>
        </div>

        {/* Visual representation using bars */}
        <div className="relative p-4 rounded-lg bg-gradient-to-br from-slate-900/50 to-slate-800/50 border border-white/10">
          <div className="absolute top-2 right-2 text-[10px] text-gray-500">Live Threat Origins</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {(loading ? Array(10).fill(null) : data).map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                {loading ? (
                  <div className="h-4 flex-1 bg-white/5 rounded animate-pulse" />
                ) : (
                  <>
                    <span className="text-[11px] text-gray-400 w-6 text-center font-mono">{item.code}</span>
                    <div className="flex-1 h-5 bg-white/5 rounded-sm overflow-hidden relative">
                      <div
                        className={`h-full rounded-sm transition-all duration-1000 ${
                          item.severity === "critical" ? "bg-red-500/40" :
                          item.severity === "high" ? "bg-orange-500/40" :
                          "bg-yellow-500/40"
                        }`}
                        style={{ width: barWidth(item.attacks, maxAttacks) }}
                      />
                      <span className="absolute right-1 top-0.5 text-[9px] text-gray-300">
                        {(item.attacks / 1000).toFixed(1)}k
                      </span>
                    </div>
                    {item.trend === "up" && <TrendingUp className="h-3 w-3 text-red-400 flex-shrink-0" />}
                    {item.trend === "down" && <TrendingUp className="h-3 w-3 text-green-400 rotate-180 flex-shrink-0" />}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top threats table */}
        {!loading && (
          <div className="space-y-2">
            <h4 className="text-xs text-gray-400 font-medium uppercase tracking-wider">Top Threat Origins</h4>
            {data.slice(0, 5).map((item) => (
              <div key={item.code} className="flex items-center justify-between p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-2">
                  <MapPin className={`h-3 w-3 ${severityColor(item.severity)}`} />
                  <span className="text-white text-sm">{item.country}</span>
                  <Badge className={severityBg(item.severity)} >
                    {item.topType}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-gray-400">{item.attacks.toLocaleString()} attacks</span>
                  <span className="text-emerald-400">
                    <Shield className="h-3 w-3 inline mr-0.5" />
                    {((item.blocked / item.attacks) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
