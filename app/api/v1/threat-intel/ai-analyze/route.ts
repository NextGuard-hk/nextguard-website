// app/api/v1/threat-intel/ai-analyze/route.ts
// AI IOC Analysis — takes enrichment result and generates AI explanation
import { NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

function isChinaRelated(ioc: string, enrichment: any): boolean {
  const cnIndicators = ['.cn', '.com.cn', '.hk', '.tw', '.mo'];
  if (cnIndicators.some(d => ioc.toLowerCase().endsWith(d))) return true;
  if (enrichment?.abuseIPDB?.country && ['CN', 'HK', 'TW', 'MO'].includes(enrichment.abuseIPDB.country)) return true;
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ioc, ioc_type, enrichment } = body;
    if (!ioc) return NextResponse.json({ success: false, error: 'Missing IOC' }, { status: 400 });

    const enrichSummary: string[] = [];
    if (enrichment?.riskScore !== undefined) enrichSummary.push(`Risk Score: ${enrichment.riskScore}/100 (${enrichment.riskLevel})`);
    if (enrichment?.virusTotal) {
      enrichSummary.push(`VirusTotal: ${enrichment.virusTotal.malicious} malicious, ${enrichment.virusTotal.suspicious} suspicious, reputation ${enrichment.virusTotal.reputation}`);
      if (enrichment.virusTotal.tags?.length) enrichSummary.push(`VT Tags: ${enrichment.virusTotal.tags.join(', ')}`);
    }
    if (enrichment?.abuseIPDB) {
      enrichSummary.push(`AbuseIPDB: ${enrichment.abuseIPDB.abuseConfidence}% confidence, ${enrichment.abuseIPDB.totalReports} reports, ISP: ${enrichment.abuseIPDB.isp}, Country: ${enrichment.abuseIPDB.country}`);
    }
    if (enrichment?.otx) {
      enrichSummary.push(`OTX: ${enrichment.otx.pulseCount} pulses`);
      if (enrichment.otx.pulses?.length) enrichSummary.push(`OTX Pulses: ${enrichment.otx.pulses.slice(0, 3).map((p: any) => p.name).join('; ')}`);
    }
    if (enrichment?.greyNoise) enrichSummary.push(`GreyNoise: ${enrichment.greyNoise.classification}, noise=${enrichment.greyNoise.noise}, riot=${enrichment.greyNoise.riot}`);
    if (enrichment?.categories?.length) enrichSummary.push(`Categories: ${enrichment.categories.join(', ')}`);
    if (enrichment?.feedMatches) enrichSummary.push(`Feed Matches: ${enrichment.feedMatches}`);

    const systemPrompt = `You are a senior SOC analyst at NextGuard, a cybersecurity company in Hong Kong. Analyze the given IOC and its enrichment data. Provide actionable intelligence. Output in this exact JSON format:
{
  "what_is_this": "2-3 sentences explaining what this indicator is and what threat it represents",
  "why_risky": ["reason 1", "reason 2", "reason 3"],
  "threat_category": "e.g. Phishing, C2, Malware Distribution, Spam, Benign",
  "confidence": "High/Medium/Low",
  "mitre_ttps": ["T1566 - Phishing", "T1071 - Application Layer Protocol"],
  "suggested_actions": [
    {"action": "Block in firewall/SWG", "priority": "High", "detail": "Add to URL blocklist immediately"},
    {"action": "Check EDR logs", "priority": "Medium", "detail": "Search for connections in last 7 days"},
    {"action": "Alert SOC team", "priority": "Low", "detail": "Include in daily threat brief"}
  ],
  "false_positive_assessment": "1 sentence on likelihood this is a false positive",
  "ticket_note": "A ready-to-paste incident note for Jira/ServiceNow (3-4 lines)"
}
Be concise and practical.`;

    const userPrompt = `Analyze this IOC:\n- Indicator: ${ioc}\n- Type: ${ioc_type || 'unknown'}\n- Enrichment Data:\n${enrichSummary.join('\n')}\n\nProvide your threat assessment.`;

    const useCN = isChinaRelated(ioc, enrichment) && DEEPSEEK_API_KEY;
    const apiUrl = useCN ? DEEPSEEK_URL : PERPLEXITY_URL;
    const apiKey = useCN ? DEEPSEEK_API_KEY : PERPLEXITY_API_KEY;
    const model = useCN ? 'deepseek-chat' : 'sonar';

    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }], temperature: 0.2, max_tokens: 1000 }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ success: false, error: `AI API error: ${aiRes.status}`, detail: errText }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : { what_is_this: content };
    } catch {
      analysis = { what_is_this: content, why_risky: [], suggested_actions: [], threat_category: 'Unknown', confidence: 'Low' };
    }

    return NextResponse.json({ success: true, data: { analysis, model_used: useCN ? 'DeepSeek (CN)' : 'Perplexity', analyzed_at: new Date().toISOString() } });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
