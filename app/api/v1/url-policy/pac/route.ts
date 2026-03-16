// app/api/v1/url-policy/pac/route.ts
// P2-4: PAC (Proxy Auto-Configuration) file generator
// Tier 1 feature: Enterprise proxy config for endpoint agents
// GET /api/v1/url-policy/pac?userId=xxx - returns PAC file
// GET /api/v1/url-policy/pac?format=json - returns proxy config as JSON
import { NextRequest, NextResponse } from 'next/server'
import { getDB } from '@/lib/db'
export const dynamic = 'force-dynamic'
const PROXY_HOST = process.env.SWG_PROXY_HOST || 'swg.next-guard.com'
const PROXY_PORT = process.env.SWG_PROXY_PORT || '8443'
async function getBlockedDomains(userId: string | null): Promise<string[]> {
  try {
    const db = getDB()
    // Get custom blocked domains
    const custom = await db.execute(
      `SELECT cue.domain FROM custom_url_entries cue
      JOIN custom_url_categories cc ON cc.id = cue.category_id
      WHERE cc.action = 'Block' AND cc.is_active = 1`
    )
    // Get override blocked domains
    const overrides = await db.execute(
      `SELECT domain FROM url_policy_overrides
      WHERE action = 'Block' AND (expires_at IS NULL OR expires_at > datetime('now'))`
    )
    const domains = new Set<string>()
    for (const r of custom.rows as any[]) domains.add(r.domain)
    for (const r of overrides.rows as any[]) domains.add(r.domain)
    return Array.from(domains)
  } catch { return [] }
}
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const format = searchParams.get('format') || 'pac'
    const userId = searchParams.get('userId') || null
    const blockedDomains = await getBlockedDomains(userId)
    if (format === 'json') {
      return NextResponse.json({
        proxyHost: PROXY_HOST,
        proxyPort: PROXY_PORT,
        proxyUrl: `HTTPS ${PROXY_HOST}:${PROXY_PORT}`,
        blockedDomains,
        bypassDomains: ['localhost', '127.0.0.1', '*.local', '*.internal'],
        userId,
        generatedAt: new Date().toISOString(),
        version: '1.0',
      })
    }
    // Generate PAC file
    const blockedList = blockedDomains.map(d => `    if (dnsDomainIs(host, "${d}")) return "PROXY ${PROXY_HOST}:${PROXY_PORT}";`).join('\n')
    const pac = `// NextGuard SWG - Auto-generated PAC file
// Generated: ${new Date().toISOString()}
// User: ${userId || 'global'}
function FindProxyForURL(url, host) {
  // Bypass local addresses
  if (isPlainHostName(host) ||
      shExpMatch(host, "*.local") ||
      shExpMatch(host, "*.internal") ||
      isInNet(host, "10.0.0.0", "255.0.0.0") ||
      isInNet(host, "172.16.0.0", "255.240.0.0") ||
      isInNet(host, "192.168.0.0", "255.255.0.0") ||
      isInNet(host, "127.0.0.0", "255.0.0.0")) {
    return "DIRECT";
  }
  // Blocked domains - route through SWG proxy
${blockedList}
  // All other traffic - route through SWG for inspection
  if (url.substring(0, 5) == "http:" || url.substring(0, 6) == "https:") {
    return "PROXY ${PROXY_HOST}:${PROXY_PORT}; DIRECT";
  }
  return "DIRECT";
}`
    return new NextResponse(pac, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ns-proxy-autoconfig',
        'Content-Disposition': 'inline; filename="proxy.pac"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
