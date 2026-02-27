export const runtime = 'nodejs'
export const maxDuration = 120

import { NextRequest, NextResponse } from 'next/server'
import { gunzipSync } from 'zlib'

const SYSLOG_NPOINT = process.env.NPOINT_SYSLOG_URL || ''
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''

interface SyslogEvent {
  id: string; timestamp: string; facility: string; severity: string; host: string; message: string; raw: string
}
interface AnalysisResult {
  id: string; eventId: string; verdict: 'false_positive' | 'true_positive' | 'needs_review'; confidence: number; reasoning: string; recommendation: string; analyzedAt: string; reviewedBy?: string; reviewedAt?: string; socOverride?: string; socNotes?: string
}
interface SyslogAnalysis {
  id: string; fileName: string; filePath: string; analyzedAt: string; totalEvents: number; falsePositives: number; truePositives: number; needsReview: number; events: SyslogEvent[]; results: AnalysisResult[]; status: string
}

function parseSyslogLine(line: string, index: number): SyslogEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const m = trimmed.match(/^(\S+\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)/)
  if (m) return { id: `evt-${index}-${Date.now()}`, timestamp: m[1], host: m[2], facility: m[3], severity: 'info', message: m[5], raw: trimmed }
  return { id: `evt-${index}-${Date.now()}`, timestamp: new Date().toISOString(), host: 'unknown', facility: 'raw', severity: 'info', message: trimmed, raw: trimmed }
}

function extractTextFromTar(buf: Buffer): string {
  const texts: string[] = []
  let offset = 0
  while (offset + 512 <= buf.length) {
    const name = buf.slice(offset, offset + 100).toString('utf8').replace(/\0/g, '').trim()
    if (!name) break
    const sizeStr = buf.slice(offset + 124, offset + 136).toString('utf8').replace(/\0/g, '').trim()
    const size = parseInt(sizeStr, 8) || 0
    offset += 512
    if (size > 0 && offset + size <= buf.length) {
      texts.push(buf.slice(offset, offset + size).toString('utf8'))
    }
    offset += Math.ceil(size / 512) * 512
  }
  return texts.join('\n')
}

async function analyzeWithLLM(events: SyslogEvent[]): Promise<AnalysisResult[]> {
  if (!OPENAI_API_KEY) return events.map(evt => ({ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, eventId: evt.id, verdict: 'needs_review' as const, confidence: 0, reasoning: 'LLM API key not configured.', recommendation: 'Configure OPENAI_API_KEY.', analyzedAt: new Date().toISOString() }))
  const batchSize = 10
  const results: AnalysisResult[] = []
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    const prompt = `You are a cybersecurity SOC analyst. Analyze each syslog event and determine if it is FALSE POSITIVE, TRUE POSITIVE, or NEEDS REVIEW.\nFor each event respond in JSON array: [{eventIndex, verdict, confidence, reasoning, recommendation}]\nEvents:\n${batch.map((e, idx) => `[${idx}] ${e.raw}`).join('\n')}\nRespond with ONLY a JSON array.`
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: 'You are a DLP security analyst. Respond only with valid JSON.' }, { role: 'user', content: prompt }], temperature: 0.1, max_tokens: 2000 }) })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || '[]'
        const jsonMatch = content.match(/\[([\s\S]*?)\]/)
        const parsed = jsonMatch ? JSON.parse(`[${jsonMatch[1]}]`) : []
        for (const item of parsed) { const evt = batch[item.eventIndex]; if (evt) results.push({ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, eventId: evt.id, verdict: item.verdict || 'needs_review', confidence: item.confidence || 50, reasoning: item.reasoning || 'Analysis completed', recommendation: item.recommendation || 'Review event details', analyzedAt: new Date().toISOString() }) }
        const analyzed = new Set(parsed.map((p: any) => batch[p.eventIndex]?.id))
        for (const evt of batch) { if (!analyzed.has(evt.id)) results.push({ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, eventId: evt.id, verdict: 'needs_review', confidence: 0, reasoning: 'LLM did not analyze this event', recommendation: 'Manual review required', analyzedAt: new Date().toISOString() }) }
      } else { for (const evt of batch) results.push({ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, eventId: evt.id, verdict: 'needs_review', confidence: 0, reasoning: `LLM API error: ${res.status}`, recommendation: 'Manual review required', analyzedAt: new Date().toISOString() }) }
    } catch (err: any) { for (const evt of batch) results.push({ id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`, eventId: evt.id, verdict: 'needs_review', confidence: 0, reasoning: `Error: ${err.message}`, recommendation: 'Manual review required', analyzedAt: new Date().toISOString() }) }
  }
  return results
}

async function getStoredAnalyses(): Promise<SyslogAnalysis[]> {
  try { const res = await fetch(SYSLOG_NPOINT, { cache: 'no-store' }); if (res.ok) { const data = await res.json(); return data.analyses || [] } } catch {} return []
}
async function saveAnalyses(analyses: SyslogAnalysis[]) {
  await fetch(SYSLOG_NPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ analyses: analyses.slice(-50) }) })
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    const fileName = file.name
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''
    const isGzip = fileName.endsWith('.gz') || fileName.endsWith('.tgz')
    if (isGzip) {
      const decompressed = gunzipSync(buffer)
      text = fileName.endsWith('.tgz') ? extractTextFromTar(decompressed) : decompressed.toString('utf8')
    } else {
      text = buffer.toString('utf8')
    }
    const lines = text.split('\n').slice(0, 2000)
    const events: SyslogEvent[] = []
    for (let i = 0; i < lines.length; i++) { const evt = parseSyslogLine(lines[i], i); if (evt) events.push(evt) }
    if (events.length === 0) return NextResponse.json({ error: 'No valid syslog events found' }, { status: 400 })
    const results = await analyzeWithLLM(events)
    const fp = results.filter(r => r.verdict === 'false_positive').length
    const tp = results.filter(r => r.verdict === 'true_positive').length
    const nr = results.filter(r => r.verdict === 'needs_review').length
    const analysis: SyslogAnalysis = { id: `sa-${Date.now()}`, fileName, filePath: `upload/${fileName}`, analyzedAt: new Date().toISOString(), totalEvents: events.length, falsePositives: fp, truePositives: tp, needsReview: nr, events, results, status: 'completed' }
    const existing = await getStoredAnalyses()
    existing.push(analysis)
    await saveAnalyses(existing)
    return NextResponse.json({ success: true, analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
