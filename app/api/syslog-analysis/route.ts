// Increase body size limit for large syslog uploads
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const BUCKET = 'nextguard-downloads'
const SYSLOG_NPOINT = process.env.NPOINT_SYSLOG_URL || ''
const LLM_API_KEY = process.env.PERPLEXITY_API_KEY || process.env.OPENAI_API_KEY || ''
const LLM_ENDPOINT = process.env.PERPLEXITY_API_KEY ? 'https://api.perplexity.ai/chat/completions' : 'https://api.openai.com/v1/chat/completions'
const LLM_MODEL = process.env.PERPLEXITY_API_KEY ? 'sonar' : 'gpt-4o-mini'

const S3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
})

function isAdmin(req: NextRequest): boolean {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET
  if (!sessionSecret) return false
  const token = req.cookies.get('contact_admin_token')
  return token?.value === sessionSecret
}

interface SyslogEvent {
  id: string
  timestamp: string
  facility: string
  severity: string
  host: string
  message: string
  raw: string
}

interface AnalysisResult {
  id: string
  eventId: string
  verdict: 'false_positive' | 'true_positive' | 'needs_review'
  confidence: number
  reasoning: string
  recommendation: string
  analyzedAt: string
  reviewedBy?: string
  reviewedAt?: string
  socOverride?: string
  socNotes?: string
}

interface SyslogAnalysis {
  id: string
  fileName: string
  filePath: string
  analyzedAt: string
  totalEvents: number
  falsePositives: number
  truePositives: number
  needsReview: number
  events: SyslogEvent[]
  results: AnalysisResult[]
  status: 'pending' | 'analyzing' | 'completed' | 'error'
}

function parseSyslogLine(line: string, index: number): SyslogEvent | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  const syslogRegex = /^(\S+\s+\d+\s+[\d:]+)\s+(\S+)\s+(\S+?)(?:\[(\d+)\])?:\s*(.*)$/
  const match = trimmed.match(syslogRegex)
  if (match) {
    return {
      id: `evt-${index}-${Date.now()}`,
      timestamp: match[1],
      host: match[2],
      facility: match[3],
      severity: 'info',
      message: match[5],
      raw: trimmed,
    }
  }
  const csvParts = trimmed.split(',')
  if (csvParts.length >= 3) {
    return {
      id: `evt-${index}-${Date.now()}`,
      timestamp: csvParts[0]?.trim() || new Date().toISOString(),
      host: csvParts[1]?.trim() || 'unknown',
      facility: csvParts[2]?.trim() || 'unknown',
      severity: csvParts[3]?.trim() || 'info',
      message: csvParts.slice(4).join(',').trim() || trimmed,
      raw: trimmed,
    }
  }
  return {
    id: `evt-${index}-${Date.now()}`,
    timestamp: new Date().toISOString(),
    host: 'unknown',
    facility: 'raw',
    severity: 'info',
    message: trimmed,
    raw: trimmed,
  }
}

async function analyzeWithLLM(events: SyslogEvent[]): Promise<AnalysisResult[]> {
  if (!LLM_API_KEY) {
    return events.map(evt => ({
      id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      eventId: evt.id,
      verdict: 'needs_review' as const,
      confidence: 0,
      reasoning: 'LLM API key not configured. Manual review required.',
      recommendation: 'Configure OPENAI_API_KEY environment variable for automated analysis.',
      analyzedAt: new Date().toISOString(),
    }))
  }
  const batchSize = 10
  const results: AnalysisResult[] = []
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize)
    const prompt = `You are a cybersecurity SOC analyst specializing in DLP (Data Loss Prevention) syslog analysis. Analyze each syslog event below and determine if it is a FALSE POSITIVE, TRUE POSITIVE, or NEEDS REVIEW.\n\nFor each event, respond in JSON array format with objects containing:\n- eventIndex (number, 0-based index in this batch)\n- verdict: "false_positive", "true_positive", or "needs_review"\n- confidence: 0-100\n- reasoning: brief explanation\n- recommendation: what SOC should do\n\nEvents:\n${batch.map((e, idx) => `[${idx}] ${e.raw}`).join('\n')}\n\nRespond with ONLY a JSON array, no other text.`
    try {
      const res = await fetch(LLM_ENDPOINT, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${LLM_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: LLM_MODEL,
          messages: [{ role: 'system', content: 'You are a DLP security analyst. Respond only with valid JSON.' }, { role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 2000,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content || '[]'
        const jsonMatch = content.match(/\[([\s\S]*?)\]/)
        const parsed = jsonMatch ? JSON.parse(`[${jsonMatch[1]}]`) : []
        for (const item of parsed) {
          const evt = batch[item.eventIndex]
          if (evt) {
            results.push({
              id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              eventId: evt.id,
              verdict: item.verdict || 'needs_review',
              confidence: item.confidence || 50,
              reasoning: item.reasoning || 'Analysis completed',
              recommendation: item.recommendation || 'Review event details',
              analyzedAt: new Date().toISOString(),
            })
          }
        }
        const analyzed = new Set(parsed.map((p: any) => batch[p.eventIndex]?.id))
        for (const evt of batch) {
          if (!analyzed.has(evt.id)) {
            results.push({
              id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
              eventId: evt.id,
              verdict: 'needs_review',
              confidence: 0,
              reasoning: 'LLM did not return analysis for this event',
              recommendation: 'Manual review required',
              analyzedAt: new Date().toISOString(),
            })
          }
        }
      } else {
        for (const evt of batch) {
          results.push({
            id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
            eventId: evt.id,
            verdict: 'needs_review',
            confidence: 0,
            reasoning: `LLM API error: ${res.status}`,
            recommendation: 'Manual review required',
            analyzedAt: new Date().toISOString(),
          })
        }
      }
    } catch (err: any) {
      for (const evt of batch) {
        results.push({
          id: `ar-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
          eventId: evt.id,
          verdict: 'needs_review',
          confidence: 0,
          reasoning: `Analysis error: ${err.message}`,
          recommendation: 'Manual review required',
          analyzedAt: new Date().toISOString(),
        })
      }
    }
  }
  return results
}

async function getStoredAnalyses(): Promise<SyslogAnalysis[]> {
  try {
    const res = await fetch(SYSLOG_NPOINT, { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      return data.analyses || []
    }
  } catch {}
  return []
}

async function saveAnalyses(analyses: SyslogAnalysis[]) {
  await fetch(SYSLOG_NPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ analyses: analyses.slice(-50) }),
  })
}

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get('action')
  const admin = isAdmin(req)
  if (action === 'list-files') {
    if (!admin) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    try {
      const data = await S3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'internal/Syslog/', Delimiter: '/' }))
      const folders = (data.CommonPrefixes || []).map(p => ({ name: p.Prefix?.replace('internal/Syslog/', '').replace(/\/$/, '') || '', path: p.Prefix || '', type: 'folder' as const }))
      const files = (data.Contents || []).filter(f => f.Key !== 'internal/Syslog/' && !f.Key?.endsWith('.keep')).map(f => ({ name: f.Key?.replace('internal/Syslog/', '') || '', path: f.Key || '', size: f.Size || 0, lastModified: f.LastModified?.toISOString() || '', type: 'file' as const }))
      return NextResponse.json({ items: [...folders, ...files] })
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 })
    }
  }
  if (action === 'results') {
    const analyses = await getStoredAnalyses()
    return NextResponse.json({ analyses })
  }
  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { filePath, content, fileName } = body
    let syslogContent = ''
    let syslogFileName = ''
    let syslogFilePath = ''

    if (content) {
      // Direct text upload - no admin required for demo
      syslogContent = content
      syslogFileName = fileName || `upload-${new Date().toISOString().slice(0,10)}.log`
      syslogFilePath = `upload/${syslogFileName}`
    } else if (filePath) {
      // R2 file - admin required
      if (!isAdmin(req)) return NextResponse.json({ error: 'Admin only' }, { status: 403 })
      const obj = await S3.send(new GetObjectCommand({ Bucket: BUCKET, Key: filePath }))
      syslogContent = await obj.Body?.transformToString() || ''
      syslogFileName = filePath.split('/').pop() || filePath
      syslogFilePath = filePath
    } else {
      return NextResponse.json({ error: 'Missing filePath or content' }, { status: 400 })
    }

    const lines = syslogContent.split('\n')
    const events: SyslogEvent[] = []
    for (let i = 0; i < lines.length; i++) {
      const evt = parseSyslogLine(lines[i], i)
      if (evt) events.push(evt)
    }
    if (events.length === 0) return NextResponse.json({ error: 'No valid syslog events found in the uploaded content' }, { status: 400 })
    const results = await analyzeWithLLM(events)
    const fp = results.filter(r => r.verdict === 'false_positive').length
    const tp = results.filter(r => r.verdict === 'true_positive').length
    const nr = results.filter(r => r.verdict === 'needs_review').length
    const analysis: SyslogAnalysis = {
      id: `sa-${Date.now()}`,
      fileName: syslogFileName,
      filePath: syslogFilePath,
      analyzedAt: new Date().toISOString(),
      totalEvents: events.length,
      falsePositives: fp,
      truePositives: tp,
      needsReview: nr,
      events,
      results,
      status: 'completed',
    }
    const existing = await getStoredAnalyses()
    existing.push(analysis)
    await saveAnalyses(existing)
    return NextResponse.json({ success: true, analysis })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { analysisId, resultId, socOverride, socNotes, reviewedBy } = body
    const analyses = await getStoredAnalyses()
    const analysis = analyses.find(a => a.id === analysisId)
    if (!analysis) return NextResponse.json({ error: 'Analysis not found' }, { status: 404 })
    const result = analysis.results.find(r => r.id === resultId)
    if (!result) return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    const oldVerdict = result.socOverride || result.verdict
    if (socOverride) result.socOverride = socOverride
    if (socNotes) result.socNotes = socNotes
    result.reviewedBy = reviewedBy || 'SOC Analyst'
    result.reviewedAt = new Date().toISOString()
    const oldV = oldVerdict; if (oldV === 'false_positive') analysis.falsePositives--; else if (oldV === 'true_positive') analysis.truePositives--; else if (oldV === 'needs_review') analysis.needsReview--; if (socOverride === 'false_positive') analysis.falsePositives++; else if (socOverride === 'true_positive') analysis.truePositives++; else analysis.needsReview++
    await saveAnalyses(analyses)
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
