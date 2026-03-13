"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Crosshair, Play, Clock, Terminal, BookOpen, Zap, ChevronRight, Search } from "lucide-react";

interface HuntQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  category: "network" | "endpoint" | "identity" | "cloud" | "email";
  mitre: string;
  lastRun?: string;
  findings: number;
  status: "ready" | "running" | "completed" | "error";
}

const prebuiltHunts: HuntQuery[] = [
  {
    id: "h-001", name: "Lateral Movement via PsExec",
    description: "Detect PsExec-style remote execution across network endpoints",
    query: "process.name:(psexec* OR paexec*) AND network.direction:outbound",
    category: "endpoint", mitre: "T1570", findings: 3, status: "completed",
    lastRun: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "h-002", name: "Suspicious DNS Tunneling",
    description: "Identify potential DNS tunneling via anomalous query patterns",
    query: "dns.query.length > 50 AND dns.query.subdomain_count > 4",
    category: "network", mitre: "T1071.004", findings: 0, status: "ready",
  },
  {
    id: "h-003", name: "Credential Dumping Indicators",
    description: "Hunt for LSASS memory access and credential extraction tools",
    query: "process.target.name:lsass.exe AND event.action:access",
    category: "endpoint", mitre: "T1003.001", findings: 1, status: "completed",
    lastRun: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "h-004", name: "Impossible Travel Login",
    description: "Detect logins from geographically impossible locations within short timeframes",
    query: "auth.success:true AND geo.distance_km > 5000 AND time_delta < 2h",
    category: "identity", mitre: "T1078", findings: 2, status: "completed",
    lastRun: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "h-005", name: "Cloud Storage Exfiltration",
    description: "Monitor for bulk downloads or sharing from cloud storage services",
    query: "cloud.action:(download OR share_external) AND file.count > 50",
    category: "cloud", mitre: "T1567", findings: 0, status: "ready",
  },
  {
    id: "h-006", name: "Email Rule Manipulation",
    description: "Detect creation of forwarding rules in mailboxes for data exfiltration",
    query: "email.action:create_rule AND rule.type:(forward OR redirect)",
    category: "email", mitre: "T1114.003", findings: 5, status: "completed",
    lastRun: new Date(Date.now() - 28800000).toISOString(),
  },
];

const categoryColor = (c: string) => {
  switch (c) {
    case "network": return "bg-blue-500/20 text-blue-400";
    case "endpoint": return "bg-orange-500/20 text-orange-400";
    case "identity": return "bg-purple-500/20 text-purple-400";
    case "cloud": return "bg-cyan-500/20 text-cyan-400";
    case "email": return "bg-green-500/20 text-green-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

export function ThreatHuntingWorkbench() {
  const [hunts] = useState<HuntQuery[]>(prebuiltHunts);
  const [customQuery, setCustomQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);

  const handleRun = (id: string) => {
    setRunningId(id);
    setTimeout(() => setRunningId(null), 3000);
  };

  const filtered = hunts.filter((h) =>
    h.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    h.description.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const totalFindings = hunts.reduce((s, h) => s + h.findings, 0);

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Crosshair className="h-5 w-5 text-amber-400" />
              Threat Hunting Workbench
            </CardTitle>
            <CardDescription>Proactive threat hunting with pre-built and custom queries</CardDescription>
          </div>
          <div className="flex gap-2">
            <Badge className="bg-amber-500/20 text-amber-400">{hunts.length} Hunts</Badge>
            <Badge className="bg-red-500/20 text-red-400">{totalFindings} Findings</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Custom query input */}
        <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Terminal className="h-3.5 w-3.5" /> Custom Hunt Query
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Enter KQL / custom hunt query..."
              value={customQuery}
              onChange={(e) => setCustomQuery(e.target.value)}
              className="bg-black/30 border-white/10 text-white font-mono text-sm"
            />
            <Button className="bg-amber-500/20 text-amber-300 border border-amber-500/50 hover:bg-amber-500/30" disabled={!customQuery}>
              <Play className="h-4 w-4 mr-1" /> Run
            </Button>
          </div>
        </div>

        {/* Search filter */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Filter hunts..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white"
          />
        </div>

        {/* Pre-built hunts */}
        <div className="space-y-2">
          <h4 className="text-xs text-gray-400 font-medium uppercase tracking-wider flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> Pre-built Hunt Library
          </h4>
          {filtered.map((hunt) => (
            <div key={hunt.id} className="p-3 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <Crosshair className="h-3.5 w-3.5 text-amber-400" />
                  <h4 className="text-white text-sm font-medium">{hunt.name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={categoryColor(hunt.category)}>{hunt.category}</Badge>
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 text-xs">{hunt.mitre}</Badge>
                </div>
              </div>
              <p className="text-gray-400 text-xs mb-2">{hunt.description}</p>
              <div className="flex items-center justify-between">
                <code className="text-[10px] text-gray-500 font-mono bg-black/20 px-2 py-0.5 rounded truncate max-w-[60%]">
                  {hunt.query}
                </code>
                <div className="flex items-center gap-2">
                  {hunt.findings > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 text-xs">
                      <Zap className="h-2.5 w-2.5 mr-0.5" />{hunt.findings}
                    </Badge>
                  )}
                  {hunt.lastRun && (
                    <span className="text-[10px] text-gray-500 flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" />
                      {Math.floor((Date.now() - new Date(hunt.lastRun).getTime()) / 3600000)}h ago
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-400 hover:text-amber-300 text-xs h-7"
                    onClick={() => handleRun(hunt.id)}
                    disabled={runningId === hunt.id}
                  >
                    {runningId === hunt.id ? (
                      <><span className="animate-spin mr-1">&#x21bb;</span> Running...</>
                    ) : (
                      <><Play className="h-3 w-3 mr-0.5" /> Run</>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
