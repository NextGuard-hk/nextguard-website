"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClipboardCheck, Search, Download, Filter, Clock, User, Shield, FileText } from "lucide-react";

interface AuditEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  category: "policy_change" | "ioc_lookup" | "feed_update" | "export" | "login" | "alert_action" | "config_change";
  details: string;
  framework: string;
  severity: "info" | "warning" | "critical";
  ipAddress: string;
}

const mockAuditLog: AuditEntry[] = [
  { id: "aud-001", timestamp: new Date(Date.now() - 300000).toISOString(), user: "admin@nextguard.com", action: "Policy Updated", category: "policy_change", details: "Modified DLP policy 'Credit Card Detection' - changed action from Audit to Block", framework: "PCI-DSS", severity: "warning", ipAddress: "10.0.1.15" },
  { id: "aud-002", timestamp: new Date(Date.now() - 900000).toISOString(), user: "soc-analyst@nextguard.com", action: "IOC Lookup", category: "ioc_lookup", details: "Queried IP 185.220.101.34 - Result: High Risk (Tor Exit Node)", framework: "NIST", severity: "info", ipAddress: "10.0.2.22" },
  { id: "aud-003", timestamp: new Date(Date.now() - 1800000).toISOString(), user: "system", action: "Feed Refresh", category: "feed_update", details: "AlienVault OTX feed updated: 1,247 new IOCs ingested", framework: "ISO-27001", severity: "info", ipAddress: "127.0.0.1" },
  { id: "aud-004", timestamp: new Date(Date.now() - 3600000).toISOString(), user: "ciso@nextguard.com", action: "Report Export", category: "export", details: "Exported monthly threat intelligence report (PDF, 2.4MB)", framework: "SOX", severity: "info", ipAddress: "10.0.1.5" },
  { id: "aud-005", timestamp: new Date(Date.now() - 7200000).toISOString(), user: "admin@nextguard.com", action: "Alert Dismissed", category: "alert_action", details: "Marked alert #TI-4521 as false positive - domain: safe-update.example.com", framework: "PDPO", severity: "warning", ipAddress: "10.0.1.15" },
  { id: "aud-006", timestamp: new Date(Date.now() - 10800000).toISOString(), user: "soc-analyst@nextguard.com", action: "Batch IOC Check", category: "ioc_lookup", details: "Submitted batch check of 45 URLs - 3 flagged as malicious", framework: "NIST", severity: "info", ipAddress: "10.0.2.22" },
  { id: "aud-007", timestamp: new Date(Date.now() - 14400000).toISOString(), user: "system", action: "Config Changed", category: "config_change", details: "Threat scoring threshold updated from 65 to 70 for auto-block", framework: "ISO-27001", severity: "critical", ipAddress: "127.0.0.1" },
  { id: "aud-008", timestamp: new Date(Date.now() - 21600000).toISOString(), user: "compliance@nextguard.com", action: "Login", category: "login", details: "Successful login from new device (MacBook Pro, Safari)", framework: "PDPO", severity: "info", ipAddress: "192.168.1.100" },
  { id: "aud-009", timestamp: new Date(Date.now() - 28800000).toISOString(), user: "admin@nextguard.com", action: "Feed Disabled", category: "feed_update", details: "Disabled GreyNoise commercial feed - API quota exceeded", framework: "ISO-27001", severity: "warning", ipAddress: "10.0.1.15" },
  { id: "aud-010", timestamp: new Date(Date.now() - 43200000).toISOString(), user: "system", action: "Auto-Block", category: "alert_action", details: "Auto-blocked 12 IPs matching ransomware C2 indicators from ThreatFox feed", framework: "NIST", severity: "critical", ipAddress: "127.0.0.1" },
];

const categoryColor = (c: string) => {
  switch (c) {
    case "policy_change": return "bg-purple-500/20 text-purple-400";
    case "ioc_lookup": return "bg-blue-500/20 text-blue-400";
    case "feed_update": return "bg-green-500/20 text-green-400";
    case "export": return "bg-cyan-500/20 text-cyan-400";
    case "login": return "bg-gray-500/20 text-gray-400";
    case "alert_action": return "bg-orange-500/20 text-orange-400";
    case "config_change": return "bg-red-500/20 text-red-400";
    default: return "bg-gray-500/20 text-gray-400";
  }
};

const severityDot = (s: string) => {
  switch (s) {
    case "critical": return "bg-red-400";
    case "warning": return "bg-yellow-400";
    default: return "bg-gray-400";
  }
};

const categoryIcon = (c: string) => {
  switch (c) {
    case "policy_change": return <Shield className="h-3.5 w-3.5" />;
    case "ioc_lookup": return <Search className="h-3.5 w-3.5" />;
    case "feed_update": return <FileText className="h-3.5 w-3.5" />;
    case "export": return <Download className="h-3.5 w-3.5" />;
    case "login": return <User className="h-3.5 w-3.5" />;
    case "alert_action": return <Shield className="h-3.5 w-3.5" />;
    case "config_change": return <Filter className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
};

export function ComplianceAuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  useEffect(() => {
    const timer = setTimeout(() => {
      setEntries(mockAuditLog);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const filtered = entries.filter((e) => {
    const matchSearch = e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.user.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCat === "all" || e.category === filterCat;
    return matchSearch && matchCat;
  });

  const timeAgo = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const categories = ["all", "policy_change", "ioc_lookup", "feed_update", "export", "login", "alert_action", "config_change"];

  return (
    <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-indigo-400" />
              Compliance Audit Log
            </CardTitle>
            <CardDescription>Complete audit trail for compliance and governance</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="border-white/20 text-gray-300 hover:bg-white/10">
            <Download className="h-4 w-4 mr-1" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search audit log..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={filterCat === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterCat(cat)}
              className={`text-xs ${
                filterCat === cat
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/50"
                  : "border-white/20 text-gray-400 hover:bg-white/10"
              }`}
            >
              {cat === "all" ? "All" : cat.replace("_", " ")}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                <div className={`p-1.5 rounded ${categoryColor(entry.category)}`}>
                  {categoryIcon(entry.category)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${severityDot(entry.severity)}`} />
                    <span className="text-white text-sm font-medium">{entry.action}</span>
                    <Badge className={categoryColor(entry.category)} >
                      {entry.category.replace("_", " ")}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] border-white/20 text-gray-500 ml-auto">
                      {entry.framework}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-xs truncate">{entry.details}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-gray-500">
                    <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" /> {entry.user}</span>
                    <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" /> {timeAgo(entry.timestamp)}</span>
                    <span>{entry.ipAddress}</span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No audit entries match your criteria</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
