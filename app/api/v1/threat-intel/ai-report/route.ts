// app/api/v1/threat-intel/ai-report/route.ts
// AI Report Generator — generates executive PDF-ready threat reports
import { NextResponse } from 'next/server';

const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY || '';
const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { report_type, time_range, include_sections, language } = body;

    if (!report_type) {
      return NextResponse.json({ success: false, error: 'Missing report_type' }, { status: 400 });
    }

    const systemPrompt = `You are a senior threat intelligence analyst at NextGuard, a cybersecurity company in Hong Kong specializing in DLP and threat intelligence. Generate a professional executive threat intelligence report. Output in this exact JSON format:
{
  "title": "Report title",
  "executive_summary": "2-3 paragraph executive summary",
  "threat_landscape": {
    "overview": "Current threat landscape overview",
    "top_threats": [
      {"name": "Threat name", "severity": "Critical/High/Medium/Low", "description": "Brief description", "affected_sectors": ["sector1", "sector2"]}
    ],
    "emerging_trends": ["trend1", "trend2"]
  },
  "statistics": {
    "total_iocs_processed": number,
    "critical_alerts": number,
    "blocked_threats": number,
    "top_attack_vectors": [{"vector": "name", "percentage": number}]
  },
  "recommendations": [
    {"priority": "High/Medium/Low", "action": "Recommendation", "detail": "Implementation detail"}
  ],
  "apac_focus": "Regional APAC/China threat analysis paragraph",
  "conclusion": "Closing paragraph with forward-looking assessment"
}
Be detailed, professional, and actionable. Focus on Asia-Pacific region threats.`;

    const userPrompt = `Generate a ${report_type} threat intelligence report.
Time range: ${time_range || 'Last 7 days'}
Language: ${language || 'English'}
Include sections: ${include_sections?.join(', ') || 'all'}
Current date: ${new Date().toISOString().split('T')[0]}`;

    const useCN = language === 'zh-CN' && DEEPSEEK_API_KEY;
    const apiUrl = useCN ? DEEPSEEK_URL : PERPLEXITY_URL;
    const apiKey = useCN ? DEEPSEEK_API_KEY : PERPLEXITY_API_KEY;
    const model = useCN ? 'deepseek-chat' : 'sonar';

    const aiRes = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return NextResponse.json({ success: false, error: `AI API error: ${aiRes.status}`, detail: errText }, { status: 502 });
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    let report;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      report = jsonMatch ? JSON.parse(jsonMatch[0]) : { executive_summary: content };
    } catch {
      report = { executive_summary: content, title: `${report_type} Threat Report` };
    }

    return NextResponse.json({
      success: true,
      data: {
        report,
        model_used: useCN ? 'DeepSeek (CN)' : 'Perplexity',
        generated_at: new Date().toISOString(),
        report_type,
        time_range: time_range || 'Last 7 days',
      }
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
