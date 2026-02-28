// @ts-nocheck
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// OCR via OpenAI Vision API
async function ocrWithVision(base64Image: string, mimeType: string, filename: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY || process.env.PERPLEXITY_API_KEY || ''
  if (!apiKey) return `[OCR unavailable: no API key configured]\nFilename: ${filename}`

  const isOpenAI = !!process.env.OPENAI_API_KEY
  const endpoint = isOpenAI
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.perplexity.ai/chat/completions'
  const model = isOpenAI ? 'gpt-4o-mini' : 'sonar'

  // Only OpenAI supports vision - if only Perplexity key, fall back
  if (!isOpenAI) {
    return `[OCR requires OpenAI API key. Perplexity API does not support image analysis.]\nFilename: ${filename}`
  }

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an OCR text extraction engine. Extract ALL text visible in the image exactly as it appears. Include all numbers, names, IDs, addresses, and any other text content. Preserve the layout as much as possible. If no text is found, respond with "[No text detected in image]". Do not add commentary - only output the extracted text.',
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'high',
                },
              },
              {
                type: 'text',
                text: 'Extract all text from this image. Output only the extracted text, nothing else.',
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0,
      }),
    })

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      return `[OCR error: ${res.status}]\nFilename: ${filename}`
    }

    const data = await res.json()
    const extractedText = data.choices?.[0]?.message?.content?.trim() || '[No text detected]'
    return `[OCR Extracted Text from: ${filename}]\n${extractedText}`
  } catch (e: any) {
    return `[OCR failed: ${e.message}]\nFilename: ${filename}`
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `File too large. Maximum size is 5MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB` }, { status: 400 })

    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let text = ''

    if (name.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      text = data.text
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      text = result.value
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        sheets.push(`[Sheet: ${sheetName}]\n${XLSX.utils.sheet_to_csv(sheet)}`)
      }
      text = sheets.join('\n\n')
    } else if (name.endsWith('.pptx')) {
      const JSZip = (await import('jszip')).default
      const zip = await JSZip.loadAsync(buffer)
      const slideTexts: string[] = []
      const slideFiles = Object.keys(zip.files).filter(f => f.match(/ppt\/slides\/slide\d+\.xml/)).sort()
      for (const sf of slideFiles) {
        const xml = await zip.files[sf].async('text')
        const textMatches = xml.match(/<a:t>(.*?)<\/a:t>/g)
        if (textMatches) {
          const slideText = textMatches.map(m => m.replace(/<\/?a:t>/g, '')).join(' ')
          slideTexts.push(slideText)
        }
      }
      text = slideTexts.join('\n\n')
    } else if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
      // OCR: Extract text from image using OpenAI Vision API
      const mimeType = name.endsWith('.png') ? 'image/png' : 'image/jpeg'
      const base64 = buffer.toString('base64')
      text = await ocrWithVision(base64, mimeType, file.name)
    } else if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.json') || name.endsWith('.xml') || name.endsWith('.log') || name.endsWith('.md') || name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.sql') || name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.env') || name.endsWith('.cfg') || name.endsWith('.conf') || name.endsWith('.ini')) {
      text = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 })
    }

    if (!text.trim()) text = '[No text content extracted from file]'
    return NextResponse.json({ text, filename: file.name, size: file.size })
  } catch (e: any) {
    return NextResponse.json({ error: `Extraction failed: ${e.message}` }, { status: 500 })
  }
}
