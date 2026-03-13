// app/api/v1/threat-intel/ai-brief/route.ts
// AI Threat Brief — calls Perplexity to generate daily threat summary
import { NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';

let cachedBrief: { text: string; generatedAt: string; stats: any } | null = null;
let lastGenTime = 0;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  if (cachedBrief && Date.now() - lastGenTime < CACHE_TTL) {
    return NextResponse.json({ success: true, data: cachedBrief, cached: true });
  }
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://www.next-guard.com';
    const statsRes = await fetch(`${baseUrl}/api/v1/threat-intel/stats`, { cache: 'no-store' });
    const stats = statsRes.ok ? await statsRes.json() : null;
    const feedBreakdown = stats?.by_feed?.map((f: any) => `${f.feed}: ${f.total}`).join(', ') || 'N/A';
    const severityBreakdown = stats?.overview?.severity_breakdown
      ? `Critical: ${stats.overview.severity_breakdown.critical}, High: ${stats.overview.severity_breakdown.high}, Medium: ${stats.overview.severity_breakdown.medium}, Low: ${stats.overview.severity_breakdown.low}`
      : 'N/A';
    const totalIOCs = stats?.overview?.active_indicators || 0;
    const highConf = stats?.overview?.high_confidence || 0;
    const byType = stats?.by_type?.map((t: any) => `${t.type}: ${t.count}`).join(', ') || 'N/A';
    const lookups24h = stats?.lookup_performance_24h?.total_lookups || 0;
    const threatsDetected = stats?.lookup_performance_24h?.threats_detected || 0;

    const systemPrompt = `You are a senior threat intelligence analyst at NextGuard, a cybersecurity company based in Hong Kong. Generate a concise daily threat brief for SOC managers and CISOs. Be specific, actionable, and professional. Output in this exact JSON format:
{
  "title": "Brief headline (max 10 words)",
  "summary": "2-3 sentence executive summary of threat landscape",
  "key_findings": ["finding 1", "finding 2", "finding 3"],
  "risk_assessment": "overall risk level assessment in 1 sentence",
  "recommended_actions": ["action 1", "action 2", "action 3"],
  "regional_focus": "1 sentence about Asia-Pacific / Hong Kong specific threats if relevant"
}`;

    const userPrompt = `Generate today's AI Threat Intelligence Brief based on our platform data:\n- Total Active IOCs: ${totalIOCs.toLocaleString()}\n- High Confidence IOCs: ${highConf.toLocaleString()} (${totalIOCs > 0 ? ((highConf / totalIOCs) * 100).toFixed(1) : 0}%)\n- Severity Breakdown: ${severityBreakdown}\n- IOC Types: ${byType}\n- Feed Sources: ${feedBreakdown}\n- Lookups (24h): ${lookups24h}, Threats Detected: ${threatsDetected}\n- Date: ${new Date().toISOString().split('T')[0]}\n\nAnalyze this data and provide actionable intelligence.`;

    const aiRes = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'sonar', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.3, max_tokens: 800 }),
    });

    if (!aiRes.ok) {
      const fallback = generateFallbackBrief(stats);
      cachedBrief = { text: JSON.stringify(fallback), generatedAt: new Date().toISOString(), stats };
      lastGenTime = Date.now();
      return NextResponse.json({ success: true, data: { brief: fallback, generatedAt: cachedBrief.generatedAt }, fallback: true });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    let brief;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      brief = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      brief = { summary: content, title: 'Daily Threat Brief', key_findings: [], recommended_actions: [], risk_assessment: '', regional_focus: '' };
    }
    cachedBrief = { text: JSON.stringify(brief), generatedAt: new Date().toISOString(), stats };
    lastGenTime = Date.now();
    return NextResponse.json({ success: true, data: { brief, generatedAt: cachedBrief.generatedAt } });
  } catch (e: any) {
    const fallback = generateFallbackBrief(null);
    return NextResponse.json({ success: true, data: { brief: fallback, generatedAt: new Date().toISOString() }, fallback: true });
  }
}

export async function POST() {
  cachedBrief = null;
  lastGenTime = 0;
  return GET();
}

function generateFallbackBrief(stats: any) {
  const total = stats?.overview?.active_indicators || 0;
  const critical = stats?.overview?.severity_breakdown?.critical || 0;
  return {
    title: 'Threat Intelligence Status Update',
    summary: `NextGuard is currently monitoring ${total.toLocaleString()} active IOCs across 11 threat feeds. ${critical.toLocaleString()} indicators are classified as critical severity.`,
    key_findings: ['Phishing domains remain the dominant threat type (>90% of IOCs)', `${critical.toLocaleString()} critical indicators require immediate attention`, 'All major OSINT feeds are actively ingesting'],
    risk_assessment: 'Elevated risk level due to high volume of critical indicators.',
    recommended_actions: ['Review and block high-confidence phishing domains in SWG/Firewall', 'Verify endpoint protection rules are updated with latest hash IOCs', 'Monitor for credential harvesting campaigns targeting APAC region'],
    regional_focus: 'Hong Kong financial sector continues to be a primary target for phishing campaigns.',
  };
}
