// app/api/v1/threat-intel/secure-scan/route.ts
// NextGuard Secure URL Scanner v1.0
// Performs SSL validation, redirect chain analysis, content-type check,
// and threat scoring for URLs - used by Secure URL Intel dashboard
// Shared data: Web Proxy & Email Gateway use same classification
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ScanResult {
  url: string;
  domain: string;
  status: 'safe' | 'malicious' | 'suspicious' | 'unknown';
  sslValid: boolean;
  sslIssuer: string;
  sslExpiry: string;
  redirectChain: string[];
  finalDestination: string;
  contentType: string;
  reputation: number;
  phishingScore: number;
  malwareScore: number;
  categories: string[];
  scanEngine: string[];
  source: string;
  policyAction: string;
  threatFamily?: string;
}

async function lookupCategories(domain: string): Promise<string[]> {
  try {
    const db = getDB();
    const d = domain.toLowerCase().replace(/^www\./, '');
    const result = await db.execute({
      sql: `SELECT DISTINCT category FROM url_categories WHERE domain = ? OR domain = ?`,
      args: [d, d.split('.').slice(-2).join('.')],
    });
    return result.rows.map((r: any) => r.category as string);
  } catch { return []; }
}

async function lookupIndicator(domain: string): Promise<{ hit: boolean; risk: string; feeds: string[] }> {
  try {
    const db = getDB();
    const d = domain.toLowerCase().replace(/^www\./, '');
    const result = await db.execute({
      sql: `SELECT source_feed, risk_level FROM indicators
            WHERE value_normalized = ? AND is_active = 1
            ORDER BY confidence DESC LIMIT 10`,
      args: [d],
    });
    if (result.rows.length === 0) return { hit: false, risk: 'clean', feeds: [] };
    const feeds = [...new Set(result.rows.map((r: any) => r.source_feed as string))];
    const risk = (result.rows[0] as any).risk_level as string;
    return { hit: true, risk, feeds };
  } catch { return { hit: false, risk: 'clean', feeds: [] }; }
}

function computeReputation(iocHit: boolean, iocRisk: string, categories: string[], sslValid: boolean, domain: string): number {
  let score = 80;
  if (iocHit) {
    if (['known_malicious', 'critical'].includes(iocRisk)) score -= 75;
    else if (['high_risk', 'high'].includes(iocRisk)) score -= 55;
    else if (['medium_risk', 'medium'].includes(iocRisk)) score -= 30;
    else score -= 15;
  }
  const badCats = ['Malware', 'Phishing', 'Cryptojacking', 'Hacking', 'DDoS & Stresser', 'Stalkerware'];
  const medCats = ['Adult Content', 'Gambling', 'Drugs', 'Weapons', 'Piracy', 'Fake News'];
  if (categories.some(c => badCats.includes(c))) score -= 30;
  else if (categories.some(c => medCats.includes(c))) score -= 15;
  if (!sslValid) score -= 10;
  const suspTLDs = ['.xyz', '.top', '.buzz', '.tk', '.ml', '.ga', '.cf', '.gq'];
  if (suspTLDs.some(t => domain.endsWith(t))) score -= 10;
  return Math.max(0, Math.min(100, score));
}

function determineStatus(reputation: number, iocHit: boolean, iocRisk: string): 'safe' | 'malicious' | 'suspicious' | 'unknown' {
  if (iocHit && ['known_malicious', 'critical', 'high_risk'].includes(iocRisk)) return 'malicious';
  if (reputation < 20) return 'malicious';
  if (reputation < 50) return 'suspicious';
  if (reputation >= 70) return 'safe';
  return 'unknown';
}

function determinePolicyAction(status: string, categories: string[]): string {
  if (status === 'malicious') return 'block';
  if (status === 'suspicious') return 'warn';
  const blockCats = ['Malware', 'Phishing', 'Cryptojacking', 'Adult Content', 'Gambling'];
  if (categories.some(c => blockCats.includes(c))) return 'block';
  return 'allow';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    if (!url) {
      return NextResponse.json({ error: 'url parameter required' }, { status: 400 });
    }

    const startTime = Date.now();
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 });
    }
    const domain = parsedUrl.hostname.replace(/^www\./, '');

    // Parallel lookups
    const [categories, iocResult] = await Promise.all([
      lookupCategories(domain),
      lookupIndicator(domain),
    ]);

    // SSL check via HEAD request
    let sslValid = parsedUrl.protocol === 'https:';
    let sslIssuer = 'Unknown';
    let sslExpiry = 'Unknown';
    let contentType = 'unknown';
    let finalDestination = parsedUrl.href;
    const redirectChain: string[] = [];

    try {
      const res = await fetch(parsedUrl.href, {
        method: 'HEAD',
        redirect: 'manual',
        signal: AbortSignal.timeout(10000),
        headers: { 'User-Agent': 'NextGuard-SecureScan/1.0' },
      });
      contentType = res.headers.get('content-type') || 'unknown';
      sslValid = parsedUrl.protocol === 'https:' && res.ok;

      // Follow redirects manually (up to 5)
      let currentUrl = parsedUrl.href;
      let redirectCount = 0;
      let currentRes = res;
      while ([301, 302, 303, 307, 308].includes(currentRes.status) && redirectCount < 5) {
        const location = currentRes.headers.get('location');
        if (!location) break;
        redirectChain.push(currentUrl);
        currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).href;
        redirectCount++;
        try {
          currentRes = await fetch(currentUrl, {
            method: 'HEAD',
            redirect: 'manual',
            signal: AbortSignal.timeout(5000),
            headers: { 'User-Agent': 'NextGuard-SecureScan/1.0' },
          });
        } catch { break; }
      }
      finalDestination = currentUrl;
    } catch {
      sslValid = false;
    }

    const reputation = computeReputation(iocResult.hit, iocResult.risk, categories, sslValid, domain);
    const status = determineStatus(reputation, iocResult.hit, iocResult.risk);
    const policyAction = determinePolicyAction(status, categories);

    const phishingScore = iocResult.hit && categories.some(c => c.includes('Phish')) ? 85 : categories.some(c => c.includes('Phish')) ? 60 : 0;
    const malwareScore = iocResult.hit && categories.some(c => c.includes('Malware')) ? 90 : categories.some(c => c.includes('Malware')) ? 65 : 0;

    const scanResult: ScanResult = {
      url: parsedUrl.href,
      domain,
      status,
      sslValid,
      sslIssuer,
      sslExpiry,
      redirectChain,
      finalDestination,
      contentType,
      reputation,
      phishingScore,
      malwareScore,
      categories: categories.length > 0 ? categories : ['Uncategorized'],
      scanEngine: ['NextGuard TI', 'Turso IOC DB', 'UT1 Categories'],
      source: 'web-proxy',
      policyAction,
      threatFamily: iocResult.hit ? `IOC match: ${iocResult.feeds.join(', ')}` : undefined,
    };

    return NextResponse.json({
      success: true,
      scan: scanResult,
      scan_ms: Date.now() - startTime,
      ioc_match: iocResult.hit,
      ioc_feeds: iocResult.feeds,
      shared_enforcement: {
        web_proxy: policyAction,
        email_gateway: status === 'malicious' ? 'block' : policyAction,
        dns_filter: status === 'malicious' ? 'block' : 'allow',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
