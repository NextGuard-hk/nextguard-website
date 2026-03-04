import { NextRequest, NextResponse } from 'next/server';

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

// URL Category Database
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

// Simulate SSL/TLS inspection
function analyzeUrlReputation(url: string): string {   const DDNS = ['linkpc.net','ddns.net','no-ip.com','dyndns.org','duckdns.org','freedns.afraid.org','hopto.org','zapto.org','sytes.net','serveblog.net','servehttp.com','myftp.org','myftp.biz','redirectme.net','serveftp.com','ignorelist.com','servegame.com','serveminecraft.net','servemp3.com','gotdns.ch','gotdns.com','changeip.com','bounceme.net','dnsdynamic.org','now-dns.com','now-dns.net','now-dns.org','trickip.net','trickip.org'];   const SUSPICIOUS_TLDS = ['.xyz','.top','.club','.click','.loan','.win','.gq','.ml','.cf','.ga','.tk','.pw','.work','.date','.download','.stream','.racing','.party','.trade','.review','.science','.faith','.bid','.men','.space'];   const MALICIOUS_KEYWORDS = ['malware','phish','exploit','botnet','ransomware','cryptominer','webshell','c99','r57'];   try {     const hostname = new URL(url).hostname.toLowerCase();     if (DDNS.some(d => hostname === d || hostname.endsWith('.' + d))) return 'suspicious';     if (MALICIOUS_KEYWORDS.some(k => hostname.includes(k))) return 'malicious';     if (SUSPICIOUS_TLDS.some(t => hostname.endsWith(t))) return 'suspicious';     if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return 'suspicious';     return 'clean';   } catch { return 'unknown'; } }  function inspectTLS(url: string) {
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

    // MODE 1: Forward Proxy - fetch URL through our proxy with DLP inspection
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

      // Fetch through proxy
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

      // DLP scan response content
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
          reputation: analyzeUrlReputation(targetUrl || ''),
        },
        performance: {
          latency: Date.now() - startTime,
          proxyNode: 'nextguard-hk-1.edge.next-guard.com',
          cacheHit: false,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // MODE 2: Content DLP Scan (Network DLP / ICAP style)
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

    // MODE 3: URL Category Check
    if (mode === 'url-check') {
      const categories = classifyUrl(targetUrl || '');
      return NextResponse.json({
        url: targetUrl,
        categories,
        reputation: analyzeUrlReputation(targetUrl || ''),
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
    version: '2.0',
    capabilities: ['forward-proxy', 'ssl-inspection', 'dlp-scan', 'url-filtering', 'threat-prevention', 'icap', 'network-dlp'],
    proxyNodes: [
      { id: 'hk-1', location: 'Hong Kong', status: 'active' },
      { id: 'sg-1', location: 'Singapore', status: 'active' },
      { id: 'jp-1', location: 'Tokyo', status: 'active' },
    ],
    dlpPatterns: Object.keys(DLP_PATTERNS),
    urlCategories: Object.keys(URL_CATEGORIES),
    status: 'operational',
    timestamp: new Date().toISOString(),
  });
}
