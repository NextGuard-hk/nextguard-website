// app/api/v1/init/route.ts
// Phase 4 — System initialization & status endpoint
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const phases = {
    phase1: {
      name: 'Threat Intel Dashboard',
      status: 'completed',
      features: ['News aggregation', 'IOC scanning', 'Basic dashboard'],
    },
    phase2: {
      name: 'STIX 2.1 Integration',
      status: 'completed',
      features: ['STIX bundle creation', 'STIX validation', 'Pattern generation', 'STIX enrichment'],
    },
    phase3: {
      name: 'API化 (RESTful API)',
      status: 'completed',
      features: ['/api/v1/indicators', '/api/v1/feeds', '/api/v1/lookup'],
    },
    phase4: {
      name: 'Commercial Feed Integration',
      status: 'completed',
      features: [
        'VirusTotal API integration',
        'AbuseIPDB API integration',
        'AlienVault OTX integration',
        'GreyNoise API integration',
        'IOC enrichment endpoint',
        'Feed status & connectivity testing',
        'Caching layer with TTL',
        'Rate limiting per provider',
        'Unified risk scoring',
      ],
    },
  };

  const commercialFeeds = {
    virustotal: { configured: !!process.env.VIRUSTOTAL_API_KEY },
    abuseipdb: { configured: !!process.env.ABUSEIPDB_API_KEY },
    otx: { configured: !!process.env.OTX_API_KEY },
    greynoise: { configured: !!process.env.GREYNOISE_API_KEY },
  };

  return NextResponse.json({
    name: 'NextGuard Threat Intelligence API',
    version: '1.4.0',
    status: 'operational',
    phases,
    commercialFeeds,
    endpoints: {
      indicators: '/api/v1/indicators',
      feeds: '/api/v1/feeds',
      feedsCommercial: '/api/v1/feeds/commercial',
      lookup: '/api/v1/lookup',
      enrich: '/api/v1/enrich',
      init: '/api/v1/init',
    },
    timestamp: new Date().toISOString(),
  });
}
