// lib/correlation-engine.ts
// Phase 6 — IOC Correlation Analysis Engine
// Links IOCs together, identifies patterns and relationships

export interface IOCNode {
  id: string;
  value: string;
  type: 'ipv4-addr' | 'ipv6-addr' | 'domain' | 'hash' | 'url' | 'email-addr';
  firstSeen: string;
  lastSeen: string;
  riskScore: number;
  tags: string[];
  sources: string[];
}

export interface IOCRelationship {
  id: string;
  sourceRef: string;
  targetRef: string;
  relationshipType: 'communicates-with' | 'resolves-to' | 'drops' | 'indicates' | 'uses' | 'attributed-to' | 'related-to';
  confidence: number;
  description: string;
  firstSeen: string;
}

export interface CorrelationCluster {
  id: string;
  name: string;
  iocs: IOCNode[];
  relationships: IOCRelationship[];
  threatActorId?: string;
  campaignId?: string;
  confidence: number;
  createdAt: string;
}

export interface CorrelationResult {
  queryIOC: string;
  relatedIOCs: IOCNode[];
  relationships: IOCRelationship[];
  clusters: CorrelationCluster[];
  timeline: { date: string; event: string; iocId: string }[];
  stats: { totalRelated: number; totalRelationships: number; totalClusters: number };
}

// In-memory graph store
const nodes: Map<string, IOCNode> = new Map();
const edges: IOCRelationship[] = [];
const clusters: Map<string, CorrelationCluster> = new Map();

// Initialize with sample correlation data
function initCorrelationData() {
  if (nodes.size > 0) return;
  const now = new Date().toISOString();

  // Sample IOC nodes
  const sampleNodes: IOCNode[] = [
    { id: 'ioc-1', value: '203.0.113.100', type: 'ipv4-addr', firstSeen: now, lastSeen: now, riskScore: 85, tags: ['c2', 'apt'], sources: ['virustotal', 'otx'] },
    { id: 'ioc-2', value: 'evil-phishing.example.com', type: 'domain', firstSeen: now, lastSeen: now, riskScore: 92, tags: ['phishing'], sources: ['abuseipdb'] },
    { id: 'ioc-3', value: '198.51.100.50', type: 'ipv4-addr', firstSeen: now, lastSeen: now, riskScore: 78, tags: ['scanner'], sources: ['greynoise'] },
    { id: 'ioc-4', value: 'abc123def456789', type: 'hash', firstSeen: now, lastSeen: now, riskScore: 95, tags: ['ransomware', 'nextrat'], sources: ['virustotal'] },
    { id: 'ioc-5', value: 'dropper.malware.example.net', type: 'domain', firstSeen: now, lastSeen: now, riskScore: 88, tags: ['malware-distribution'], sources: ['otx'] },
    { id: 'ioc-6', value: '192.0.2.200', type: 'ipv4-addr', firstSeen: now, lastSeen: now, riskScore: 70, tags: ['exfiltration'], sources: ['virustotal', 'abuseipdb'] },
  ];
  sampleNodes.forEach(n => nodes.set(n.id, n));

  // Sample relationships
  edges.push(
    { id: 'rel-1', sourceRef: 'ioc-1', targetRef: 'ioc-2', relationshipType: 'resolves-to', confidence: 90, description: 'C2 IP resolves to phishing domain', firstSeen: now },
    { id: 'rel-2', sourceRef: 'ioc-4', targetRef: 'ioc-1', relationshipType: 'communicates-with', confidence: 85, description: 'Malware hash communicates with C2', firstSeen: now },
    { id: 'rel-3', sourceRef: 'ioc-5', targetRef: 'ioc-4', relationshipType: 'drops', confidence: 92, description: 'Dropper domain delivers ransomware', firstSeen: now },
    { id: 'rel-4', sourceRef: 'ioc-1', targetRef: 'ioc-6', relationshipType: 'related-to', confidence: 65, description: 'Same infrastructure subnet', firstSeen: now },
    { id: 'rel-5', sourceRef: 'ioc-3', targetRef: 'ioc-1', relationshipType: 'communicates-with', confidence: 55, description: 'Scanner probing C2 server', firstSeen: now },
  );

  // Sample cluster
  clusters.set('cluster-1', {
    id: 'cluster-1',
    name: 'NextRAT Campaign Infrastructure',
    iocs: sampleNodes.filter(n => ['ioc-1', 'ioc-2', 'ioc-4', 'ioc-5'].includes(n.id)),
    relationships: edges.filter(e => ['rel-1', 'rel-2', 'rel-3'].includes(e.id)),
    threatActorId: 'ta-001',
    campaignId: 'campaign-001',
    confidence: 88,
    createdAt: now,
  });
}

// ----- Correlation Query -----
export function correlateIOC(iocValue: string): CorrelationResult {
  initCorrelationData();

  // Find matching node
  const matchNode = Array.from(nodes.values()).find(n => n.value === iocValue);
  if (!matchNode) {
    return {
      queryIOC: iocValue,
      relatedIOCs: [],
      relationships: [],
      clusters: [],
      timeline: [],
      stats: { totalRelated: 0, totalRelationships: 0, totalClusters: 0 },
    };
  }

  // Find related edges
  const relatedEdges = edges.filter(e => e.sourceRef === matchNode.id || e.targetRef === matchNode.id);

  // Collect related node IDs
  const relatedIds = new Set<string>();
  relatedEdges.forEach(e => {
    relatedIds.add(e.sourceRef);
    relatedIds.add(e.targetRef);
  });
  relatedIds.delete(matchNode.id);

  // Get related nodes
  const relatedNodes = Array.from(relatedIds).map(id => nodes.get(id)).filter(Boolean) as IOCNode[];

  // Find clusters containing this IOC
  const matchedClusters = Array.from(clusters.values()).filter(c =>
    c.iocs.some(i => i.id === matchNode.id)
  );

  // Build timeline
  const timeline = relatedEdges.map(e => ({
    date: e.firstSeen,
    event: `${e.relationshipType}: ${e.description}`,
    iocId: e.sourceRef === matchNode.id ? e.targetRef : e.sourceRef,
  }));

  return {
    queryIOC: iocValue,
    relatedIOCs: relatedNodes,
    relationships: relatedEdges,
    clusters: matchedClusters,
    timeline,
    stats: {
      totalRelated: relatedNodes.length,
      totalRelationships: relatedEdges.length,
      totalClusters: matchedClusters.length,
    },
  };
}

// ----- Add IOC Node -----
export function addIOCNode(node: IOCNode): void {
  initCorrelationData();
  nodes.set(node.id, node);
}

// ----- Add Relationship -----
export function addRelationship(rel: IOCRelationship): void {
  initCorrelationData();
  edges.push(rel);
}

// ----- Get All Clusters -----
export function getAllClusters(): CorrelationCluster[] {
  initCorrelationData();
  return Array.from(clusters.values());
}

// ----- Get Graph Stats -----
export function getGraphStats() {
  initCorrelationData();
  return {
    totalNodes: nodes.size,
    totalEdges: edges.length,
    totalClusters: clusters.size,
    nodesByType: Array.from(nodes.values()).reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
  };
}
