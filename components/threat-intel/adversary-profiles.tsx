// components/threat-intel/adversary-profiles.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Search, ExternalLink, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface AdversaryGroup {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  techniques: string[];
  software: string[];
  created: string;
  modified: string;
  references: { source_name: string; url?: string }[];
}

export function AdversaryProfiles() {
  const [groups, setGroups] = useState<AdversaryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    async function fetchGroups() {
      try {
        setLoading(true);
        const res = await fetch('/api/v1/threat-intel/mitre?type=groups', { next: { revalidate: 3600 } });
        if (!res.ok) throw new Error('Failed to fetch MITRE ATT&CK data');
        const data = await res.json();
        setGroups(data.groups || []);
        setLastUpdated(data.lastUpdated || new Date().toISOString());
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGroups();
  }, []);

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Adversary Profiles</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (<Skeleton key={i} className="h-20 w-full" />))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" /> Adversary Profiles</CardTitle></CardHeader>
        <CardContent><p className="text-red-400">{error}</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-500" />
            Adversary Profiles
            <Badge variant="outline" className="ml-2">{groups.length} Groups</Badge>
          </CardTitle>
          {lastUpdated && (
            <span className="text-xs text-muted-foreground">Source: MITRE ATT&CK | Updated: {new Date(lastUpdated).toLocaleDateString()}</span>
          )}
        </div>
        <div className="relative mt-2">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search groups or aliases..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {filtered.slice(0, 50).map(group => (
            <div key={group.id} className="border rounded-lg p-3 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{group.name}</span>
                  <Badge variant="secondary" className="text-xs">{group.id}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{group.techniques.length} techniques</Badge>
                  {expandedId === group.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
              </div>
              {group.aliases.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap">
                  {group.aliases.slice(0, 5).map(a => (<Badge key={a} variant="outline" className="text-xs">{a}</Badge>))}
                  {group.aliases.length > 5 && <Badge variant="outline" className="text-xs">+{group.aliases.length - 5} more</Badge>}
                </div>
              )}
              {expandedId === group.id && (
                <div className="mt-3 space-y-2 text-sm">
                  <p className="text-muted-foreground leading-relaxed">{group.description?.slice(0, 500)}{group.description?.length > 500 ? '...' : ''}</p>
                  {group.techniques.length > 0 && (
                    <div>
                      <span className="font-medium text-xs">Techniques: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.techniques.slice(0, 10).map(t => (<Badge key={t} className="text-xs bg-red-500/10 text-red-400 border-red-500/20">{t}</Badge>))}
                        {group.techniques.length > 10 && <Badge variant="outline" className="text-xs">+{group.techniques.length - 10} more</Badge>}
                      </div>
                    </div>
                  )}
                  {group.software.length > 0 && (
                    <div>
                      <span className="font-medium text-xs">Software: </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {group.software.slice(0, 8).map(s => (<Badge key={s} className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/20">{s}</Badge>))}
                      </div>
                    </div>
                  )}
                  {group.references.filter(r => r.url).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                      {group.references.filter(r => r.url).slice(0, 3).map((r, i) => (
                        <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:underline flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />{r.source_name}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="text-center text-muted-foreground py-4">No adversary groups found</p>}
          {filtered.length > 50 && <p className="text-center text-xs text-muted-foreground py-2">Showing 50 of {filtered.length} results. Refine your search.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
