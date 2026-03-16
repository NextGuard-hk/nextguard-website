import { NextRequest, NextResponse } from 'next/server'
import { classifyUrlWithAI, batchClassifyWithAI, isAIClassificationAvailable } from '@/lib/ai-url-classifier'
import { initDB } from '@/lib/db'

// AI URL Classification API - Tier 1 Feature
// GET: classify single URL via query param
// POST: classify single or batch URLs
// Endpoint: /api/v1/url-categories/ai-classify

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || ''
  if (!url) {
    return NextResponse.json({
      error: 'url parameter required',
      aiAvailable: isAIClassificationAvailable(),
    }, { status: 400 })
  }

  try {
    await initDB()
    const result = await classifyUrlWithAI(url)
    return NextResponse.json({
      ...result,
      aiAvailable: isAIClassificationAvailable(),
    })
  } catch (e: unknown) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
      aiAvailable: isAIClassificationAvailable(),
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await initDB()
    const body = await request.json()

    // Batch classification
    if (Array.isArray(body.urls)) {
      const results = await batchClassifyWithAI(body.urls)
      const cached = results.filter(r => r.cached).length
      return NextResponse.json({
        results,
        summary: {
          total: results.length,
          cached,
          fresh: results.length - cached,
          avgConfidence: Math.round(results.reduce((s, r) => s + r.confidence, 0) / results.length),
          avgMs: Math.round(results.reduce((s, r) => s + r.classificationMs, 0) / results.length),
        },
        aiAvailable: isAIClassificationAvailable(),
      })
    }

    // Single URL
    if (body.url) {
      const result = await classifyUrlWithAI(body.url)
      return NextResponse.json({
        ...result,
        aiAvailable: isAIClassificationAvailable(),
      })
    }

    return NextResponse.json({ error: 'url or urls[] required' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({
      error: e instanceof Error ? e.message : String(e),
      aiAvailable: isAIClassificationAvailable(),
    }, { status: 500 })
  }
}
