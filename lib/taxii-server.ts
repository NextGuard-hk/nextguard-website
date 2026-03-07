// lib/taxii-server.ts
// Phase 5 — TAXII 2.1 Server Implementation
// STIX/TAXII provider enabling standard protocol subscription

export const TAXII_MEDIA_TYPE = 'application/taxii+json;version=2.1';
export const STIX_MEDIA_TYPE = 'application/stix+json;version=2.1';

// ----- TAXII Types -----
export interface TAXIIDiscovery {
  title: string;
  description: string;
  contact: string;
  default: string;
  api_roots: string[];
}

export interface TAXIIApiRoot {
  title: string;
  description: string;
  versions: string[];
  max_content_length: number;
}

export interface TAXIICollection {
  id: string;
  title: string;
  description: string;
  can_read: boolean;
  can_write: boolean;
  media_types: string[];
}

export interface TAXIIManifestEntry {
  id: string;
  date_added: string;
  version: string;
  media_type: string;
}

export interface TAXIIStatus {
  id: string;
  status: 'pending' | 'complete' | 'error';
  request_timestamp: string;
  total_count: number;
  success_count: number;
  failure_count: number;
  pending_count: number;
  successes?: string[];
  failures?: { id: string; message: string }[];
}

export interface TAXIIEnvelope {
  more?: boolean;
  next?: string;
  objects?: any[];
}

// ----- In-Memory Store -----
const collections: TAXIICollection[] = [
  {
    id: 'nextguard-threat-intel',
    title: 'NextGuard Threat Intelligence',
    description: 'Curated threat intelligence feed from NextGuard including malicious IPs, domains, and file hashes',
    can_read: true,
    can_write: false,
    media_types: [STIX_MEDIA_TYPE],
  },
  {
    id: 'nextguard-ioc-feed',
    title: 'NextGuard IOC Feed',
    description: 'Real-time indicators of compromise from commercial and open-source feeds',
    can_read: true,
    can_write: false,
    media_types: [STIX_MEDIA_TYPE],
  },
  {
    id: 'nextguard-submissions',
    title: 'NextGuard Community Submissions',
    description: 'Community-submitted indicators and threat reports',
    can_read: true,
    can_write: true,
    media_types: [STIX_MEDIA_TYPE],
  },
];

const objectStore: Map<string, any[]> = new Map();
const statusStore: Map<string, TAXIIStatus> = new Map();

// Initialize with sample STIX objects
function initSampleData() {
  if (objectStore.size > 0) return;
  const now = new Date().toISOString();
  objectStore.set('nextguard-threat-intel', [
    {
      type: 'indicator',
      spec_version: '2.1',
      id: 'indicator--a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      created: now,
      modified: now,
      name: 'Malicious IP - C2 Server',
      pattern: "[ipv4-addr:value = '203.0.113.100']",
      pattern_type: 'stix',
      valid_from: now,
      labels: ['malicious-activity'],
      confidence: 85,
    },
    {
      type: 'indicator',
      spec_version: '2.1',
      id: 'indicator--b2c3d4e5-f6a7-8901-bcde-f12345678901',
      created: now,
      modified: now,
      name: 'Phishing Domain',
      pattern: "[domain-name:value = 'evil-phishing.example.com']",
      pattern_type: 'stix',
      valid_from: now,
      labels: ['phishing'],
      confidence: 92,
    },
    {
      type: 'malware',
      spec_version: '2.1',
      id: 'malware--c3d4e5f6-a7b8-9012-cdef-123456789012',
      created: now,
      modified: now,
      name: 'NextRAT',
      description: 'Remote access trojan targeting enterprise networks',
      malware_types: ['remote-access-trojan'],
      is_family: true,
    },
  ]);
  objectStore.set('nextguard-ioc-feed', [
    {
      type: 'indicator',
      spec_version: '2.1',
      id: 'indicator--d4e5f6a7-b8c9-0123-defa-234567890123',
      created: now,
      modified: now,
      name: 'Suspicious Hash - Ransomware',
      pattern: "[file:hashes.'SHA-256' = 'abc123def456789']",
      pattern_type: 'stix',
      valid_from: now,
      labels: ['ransomware'],
      confidence: 78,
    },
  ]);
  objectStore.set('nextguard-submissions', []);
}

// ----- Discovery -----
export function getDiscovery(baseUrl: string): TAXIIDiscovery {
  return {
    title: 'NextGuard TAXII Server',
    description: 'NextGuard Threat Intelligence TAXII 2.1 Server',
    contact: 'security@nextguard.hk',
    default: `${baseUrl}/api/taxii`,
    api_roots: [`${baseUrl}/api/taxii`],
  };
}

// ----- API Root -----
export function getApiRoot(): TAXIIApiRoot {
  return {
    title: 'NextGuard Threat Intel API Root',
    description: 'Primary API root for NextGuard threat intelligence',
    versions: ['application/taxii+json;version=2.1'],
    max_content_length: 10485760,
  };
}

// ----- Collections -----
export function getCollections(): TAXIICollection[] {
  initSampleData();
  return collections;
}

export function getCollection(id: string): TAXIICollection | undefined {
  return collections.find(c => c.id === id);
}

// ----- Objects -----
export function getObjects(
  collectionId: string,
  options?: { addedAfter?: string; type?: string; limit?: number; next?: string }
): TAXIIEnvelope {
  initSampleData();
  let objects = objectStore.get(collectionId) ?? [];
  if (options?.addedAfter) {
    const after = new Date(options.addedAfter).getTime();
    objects = objects.filter(o => new Date(o.created).getTime() > after);
  }
  if (options?.type) {
    objects = objects.filter(o => o.type === options.type);
  }
  const limit = options?.limit ?? 100;
  const startIdx = options?.next ? parseInt(options.next, 10) : 0;
  const sliced = objects.slice(startIdx, startIdx + limit);
  const hasMore = startIdx + limit < objects.length;
  return {
    more: hasMore,
    next: hasMore ? String(startIdx + limit) : undefined,
    objects: sliced,
  };
}

export function addObjects(collectionId: string, objects: any[]): TAXIIStatus {
  initSampleData();
  const collection = getCollection(collectionId);
  if (!collection || !collection.can_write) {
    return {
      id: crypto.randomUUID(),
      status: 'error',
      request_timestamp: new Date().toISOString(),
      total_count: objects.length,
      success_count: 0,
      failure_count: objects.length,
      pending_count: 0,
      failures: objects.map(o => ({ id: o.id || 'unknown', message: 'Collection is read-only' })),
    };
  }
  const existing = objectStore.get(collectionId) ?? [];
  const successes: string[] = [];
  const failures: { id: string; message: string }[] = [];
  for (const obj of objects) {
    if (!obj.type || !obj.id) {
      failures.push({ id: obj.id || 'unknown', message: 'Missing required fields' });
    } else {
      existing.push({ ...obj, spec_version: obj.spec_version || '2.1' });
      successes.push(obj.id);
    }
  }
  objectStore.set(collectionId, existing);
  const status: TAXIIStatus = {
    id: crypto.randomUUID(),
    status: 'complete',
    request_timestamp: new Date().toISOString(),
    total_count: objects.length,
    success_count: successes.length,
    failure_count: failures.length,
    pending_count: 0,
    successes,
    failures,
  };
  statusStore.set(status.id, status);
  return status;
}

// ----- Manifest -----
export function getManifest(collectionId: string): TAXIIManifestEntry[] {
  initSampleData();
  const objects = objectStore.get(collectionId) ?? [];
  return objects.map(o => ({
    id: o.id,
    date_added: o.created || new Date().toISOString(),
    version: o.modified || o.created || new Date().toISOString(),
    media_type: STIX_MEDIA_TYPE,
  }));
}

// ----- Status -----
export function getStatus(statusId: string): TAXIIStatus | undefined {
  return statusStore.get(statusId);
}

// ----- TAXII Auth Validation -----
export function validateTAXIIAuth(req: Request): boolean {
  const auth = req.headers.get('authorization');
  if (!auth) return false;
  if (auth.startsWith('Basic ') || auth.startsWith('Bearer ')) return true;
  const apiKey = req.headers.get('x-api-key');
  return !!apiKey;
}

// ----- TAXII Response Headers -----
export function taxiiHeaders(contentType: string = TAXII_MEDIA_TYPE): Record<string, string> {
  return {
    'Content-Type': contentType,
    'X-TAXII-Date-Added-First': new Date().toISOString(),
    'X-TAXII-Date-Added-Last': new Date().toISOString(),
  };
}
