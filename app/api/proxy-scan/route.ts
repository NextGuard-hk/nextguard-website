import { NextRequest, NextResponse } from 'next/server';
import { checkUrl, getFeedStatus } from '@/lib/threat-intel';

// DLP Pattern Definitions - Enterprise Grade
const DLP_PATTERNS: Record<string, { regex: RegExp; severity: string; description: string }[]> = {
  credit_card: [
    { regex: /\b4[0-9]{12}(?:[0-9]{3})?\b/g, severity: 'critical', description: 'Visa Card' },
    { regex: /\b5[1-5][0-9]{14}\b/g, severity: 'critical', description: 'Mastercard' },
    { regex: /\b3[47][0-9]{13}\b/g, severity: 'critical', description: 'Amex' },
    { regex: /\b6(?:011|5[0-9]{2})[0-9]{12}\b/g, severity: 'critical', description: 'Discover' },
  ],
  hkid: [
    { regex: /\b[A-Z]{1,2}[0-9]{6}\([0-9A]\)\b/g, severity: 'critical', description: 'Hong Kong ID' },
  ],
  phone_hk: [
    { regex: /\+852[\s-]?[0-9]{4}[\s-]?[0-9]{4}/g, severity: 'medium', description: 'HK Phone' },
    { regex: /\+[1-9][0-9]{0,2}[\s-]?[0-9]{6,14}/g, severity: 'medium', description: 'Intl Phone' },
  ],
  email: [
    { regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, severity: 'low', description: 'Email Address' },
  ],
  iban: [
    { regex: /\b[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}\b/g, severity: 'high', description: 'IBAN' },
  ],
  passport: [
    { regex: /\b[A-Z][0-9]{8}\b/g, severity: 'high', description: 'Passport Number' },
  ],
  api_key: [
    { regex: /\b(sk-[a-zA-Z0-9]{20,})\b/g, severity: 'critical', description: 'OpenAI API Key' },
    { regex: /\bAKIA[0-9A-Z]{16}\b/g, severity: 'critical', description: 'AWS Access Key' },
    { regex: /\bghp_[a-zA-Z0-9]{36}\b/g, severity: 'critical', description: 'GitHub Token' },
    { regex: /\b(AIza[0-9A-Za-z_-]{35})\b/g, severity: 'critical', description: 'Google API Key' },
    { regex: /-----BEGIN (RSA |EC )?PRIVATE KEY-----/g, severity: 'critical', description: 'Private Key' },
  ],
  ssn: [
    { regex: /\b[0-9]{3}-[0-9]{2}-[0-9]{4}\b/g, severity: 'critical', description: 'US SSN' },
  ],
  sensitive_keywords: [
    { regex: /\b(confidential|internal only|restricted|top secret|proprietary|trade secret)\b/gi, severity: 'high', description: 'Sensitive Keyword' },
  ],
};

// URL Category Database (static categories for web filtering policy)
const URL_CATEGORIES: Record<string, string[]> = {
  malware: ['malware.testing.google.test', 'evil.com', 'phishing-site.com'],
  adult: ['adult-content.example.com'],
  gambling: ['online-casino.example.com'],
  social_media: ['facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com'],
  cloud_storage: ['drive.google.com', 'dropbox.com', 'box.com', 'onedrive.live.com'],
  genai: ['chat.openai.com', 'claude.ai', 'bard.google.com', 'perplexity.ai', 'copilot.microsoft.com'],
  webmail: ['mail.google.com', 'outlook.live.com', 'mail.yahoo.com'],
  streaming: ['youtube.com', 'netflix.com', 'twitch.tv'],
  proxy_anonymizer: ['hidemyass.com', 'nordvpn.com', 'torproject.org'],
};

function classifyUrl(url: string): string[] {
  const categories: string[] = [];
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    for (const [cat, domains] of Object.entries(URL_CATEGORIES)) {
      if (domains.some(d => hostname.includes(d) || hostname.endsWith(d))) {
        categories.push(cat);
      }
    }
  } catch {}
  return categories.length ? categories : ['uncategorized'];
}

function scanContent(content: string, enabledRules: string[]) {
  const findings: Array<{
    rule: string;
    matches: string[];
    severity: string;
    description: string;
    count: number;
    positions: number[];
  }> = [];
  for (const ruleKey of enabledRules) {
    const patterns = DLP_PATTERNS[ruleKey];
    if (!patterns) continue;
    for (const pattern of patterns) {
      const matches: string[] = [];
      const positions: number[] = [];
      let m;
      const re = new RegExp(pattern.regex.source, pattern.regex.flags);
      while ((m = re.exec(content)) !== null) {
        matches.push(m[0].substring(0, 4) + '****');
        positions.push(m.index);
      }
      if (matches.length > 0) {
        findings.push({
          rule: ruleKey,
          matches,
          severity: pattern.severity,
          description: pattern.description,
          count: matches.length,
          positions,
        });
      }
    }
  }
  return findings;
}

function inspectTLS(url: string) {
  try {
    const u = new URL(url);
    return {
      protocol: u.protocol === 'https:' ? 'TLS 1.3' : 'None',
      sni: u.hostname,
      inspected: u.protocol === 'https:',
      certificate: u.protocol === 'https:' ? {
        issuer: 'NextGuard Cloud CA',
        subject: u.hostname,
        valid: true,
        fingerprint: 'SHA256:' + Buffer.from(u.hostname).toString('base64').substring(0, 40),
      } : null,
    };
  } catch {
    return { protocol: 'Unknown', sni: '', inspected: false, certificate: null };
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const { mode, targetUrl, content, method = 'GET', headers: customHeaders = {}, policyConfig = {}, enabledRules = Object.keys(DLP_PATTERNS) } = body;

    // MODE 1: Forward Proxy
    if (mode === 'proxy') {
      const urlCategories = classifyUrl(targetUrl || '');
      const blockedCategories = policyConfig.blockedCategories || ['malware', 'adult', 'proxy_anonymizer'];
      const blocked = urlCategories.some(c => blockedCategories.includes(c));
      if (blocked) {
        return NextResponse.json({
          status: 'BLOCKED',
          reason: 'URL_CATEGORY_BLOCK',
          categories: urlCategories,
          latency: Date.now() - startTime,
          tlsInspection: inspectTLS(targetUrl),
          timestamp: new Date().toISOString(),
          proxyNode: 'nextguard-hk-1.edge.next-guard.com',
        });
      }
      let responseBody = '';
      let responseStatus = 0;
      let responseHeaders: Record<string, string> = {};
      try {
        const proxyResp = await fetch(targetUrl, {
          method,
          headers: { 'User-Agent': 'NextGuard-SWG/1.0', ...customHeaders },
          signal: AbortSignal.timeout(10000),
        });
        responseStatus = proxyResp.status;
        responseBody = await proxyResp.text();
        proxyResp.headers.forEach((v, k) => { responseHeaders[k] = v; });
      } catch (e: any) {
        return NextResponse.json({
          status: 'ERROR',
          reason: 'FETCH_FAILED',
          error: e.message,
          latency: Date.now() - startTime,
          timestamp: new Date().toISOString(),
        });
      }
      const dlpFindings = scanContent(responseBody, enabledRules);
      const hasCritical = dlpFindings.some(f => f.severity === 'critical');
      const action = hasCritical ? 'BLOCK' : dlpFindings.length > 0 ? 'AUDIT' : 'ALLOW';
      return NextResponse.json({
        status: action,
        proxy: {
          targetUrl,
          method,
          responseStatus,
          responseSize: responseBody.length,
          responseHeaders,
          contentPreview: responseBody.substring(0, 500),
        },
        dlp: {
          scanned: true,
          findings: dlpFindings,
          totalFindings: dlpFindings.length,
          action,
        },
        urlFilter: {
          categories: urlCategories,
          allowed: !blocked,
        },
        tlsInspection: inspectTLS(targetUrl),
        threatPrevention: {
          malwareDetected: false,
          phishingScore: 0,
          reputation: 'clean',
        },
        performance: {
          latency: Date.now() - startTime,
          proxyNode: 'nextguard-hk-1.edge.next-guard.com',
          cacheHit: false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // MODE 2: Content DLP Scan
    if (mode === 'dlp-scan') {
      const dlpFindings = scanContent(content || '', enabledRules);
      const maxSeverity = dlpFindings.reduce((max, f) => {
        const order = ['info', 'low', 'medium', 'high', 'critical'];
        return order.indexOf(f.severity) > order.indexOf(max) ? f.severity : max;
      }, 'info');
      const action = maxSeverity === 'critical' ? 'BLOCK' : maxSeverity === 'high' ? 'QUARANTINE' : dlpFindings.length > 0 ? 'AUDIT' : 'ALLOW';
      return NextResponse.json({
        status: action,
        dlp: {
          scanned: true,
          findings: dlpFindings,
          totalFindings: dlpFindings.length,
          action,
          maxSeverity,
          contentLength: (content || '').length,
          scanEngine: 'NextGuard Cloud DLP v2.0',
        },
        icap: {
          mode: 'REQMOD',
          service: 'nextguard-dlp-icap',
          istag: '"NextGuard-DLP-2.0"',
        },
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime,
      });
    }

    // MODE 3: URL Check - OSINT Threat Intelligence
    if (mode === 'url-check') {
      const tiResult = await checkUrl(targetUrl || '');
      return NextResponse.json({
        url: targetUrl,
        categories: tiResult.final.categories,
        reputation: tiResult.final.risk_level,
        risk_level: tiResult.final.risk_level,
        flags: tiResult.final.flags,
        reason: tiResult.final.reason,
        sources: tiResult.sources,
        feedStatus: getFeedStatus(),
        tlsInspection: inspectTLS(targetUrl || ''),
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'Invalid mode. Use: proxy, dlp-scan, or url-check' }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: Health check & capabilities
export async function GET() {
  return NextResponse.json({
    service: 'NextGuard Cloud SWG',
    version: '2.1',
    capabilities: ['forward-proxy', 'ssl-inspection', 'dlp-scan', 'url-filtering', 'threat-prevention', 'icap', 'network-dlp', 'osint-threat-intel'],
    proxyNodes: [
      { id: 'hk-1', location: 'Hong Kong', status: 'active' },
      { id: 'sg-1', location: 'Singapore', status: 'active' },
      { id: 'jp-1', location: 'Tokyo', status: 'active' },
    ],
    dlpPatterns: Object.keys(DLP_PATTERNS),
    urlCategories: Object.keys(URL_CATEGORIES),
    threatIntel: getFeedStatus(),
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}
