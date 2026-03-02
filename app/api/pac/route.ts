import { NextRequest, NextResponse } from 'next/server';

// PAC File Generator - Zscaler/Forcepoint/Symantec Style
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode') || 'explicit';
  const bypassDomains = (searchParams.get('bypass') || '').split(',').filter(Boolean);

  const defaultBypass = [
    '*.next-guard.com',
    '*.microsoft.com',
    '*.windows.net',
    '*.office365.com',
    '*.office.com',
    '127.0.0.1',
    'localhost',
    '10.*.*.*',
    '172.16.*.*',
    '192.168.*.*',
  ];

  const allBypass = [...new Set([...defaultBypass, ...bypassDomains])];

  const pacScript = `// NextGuard Cloud SWG - Proxy Auto-Configuration (PAC) File
// Generated: ${new Date().toISOString()}
// Mode: ${mode}
// Reference: Zscaler ZIA + Forcepoint ONE + Symantec Cloud SWG
//
// Deploy via: GPO, MDM, WPAD/DHCP, or manual browser config
// PAC URL: https://next-guard.com/api/pac

function FindProxyForURL(url, host) {
  // === BYPASS RULES ===
  // RFC 1918 Private Networks
  if (isInNet(host, "10.0.0.0", "255.0.0.0") ||
      isInNet(host, "172.16.0.0", "255.240.0.0") ||
      isInNet(host, "192.168.0.0", "255.255.0.0") ||
      isInNet(host, "127.0.0.0", "255.0.0.0")) {
    return "DIRECT";
  }

  // Localhost
  if (host === "localhost" || host === "127.0.0.1") {
    return "DIRECT";
  }

  // Custom bypass domains
  ${allBypass.filter(d => d.includes('*')).map(d => 
    `if (shExpMatch(host, "${d}")) return "DIRECT";`
  ).join('\n  ')}

  // === SSL INSPECTION BYPASS ===
  // Financial / Banking (comply with regulations)
  if (shExpMatch(host, "*.bank.com") ||
      shExpMatch(host, "*.hsbc.com.hk") ||
      shExpMatch(host, "*.hangseng.com") ||
      shExpMatch(host, "*.bochk.com")) {
    return "PROXY nextguard-hk-1.edge.next-guard.com:9443; DIRECT";
  }

  // === PROXY CHAIN ===
  // Primary: Hong Kong PoP
  // Failover: Singapore PoP
  // Final fallback: DIRECT
  ${mode === 'explicit' ? 
    'return "PROXY nextguard-hk-1.edge.next-guard.com:9400; PROXY nextguard-sg-1.edge.next-guard.com:9400; DIRECT";' :
    'return "PROXY nextguard-hk-1.edge.next-guard.com:80; DIRECT";'
  }
}`;

  return new NextResponse(pacScript, {
    headers: {
      'Content-Type': 'application/x-ns-proxy-autoconfig',
      'Content-Disposition': 'inline; filename="proxy.pac"',
      'Cache-Control': 'public, max-age=3600',
      'X-NextGuard-SWG': 'pac-v2.0',
    },
  });
}
