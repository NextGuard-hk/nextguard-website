// @ts-nocheck
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// OCR via OCR.space free API (Vercel serverless compatible - no binary deps)
async function ocrFromImage(buffer: Buffer, filename: string): Promise<string> {
  try {
    const base64 = buffer.toString('base64')
    const ext = filename.toLowerCase().split('.').pop() || 'png'
    const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png'
    const body = new URLSearchParams({
      apikey: process.env.OCR_SPACE_API_KEY || 'helloworld',
      base64Image: `data:${mimeType};base64,${base64}`,
      language: 'eng',
      isOverlayRequired: 'false',
      OCREngine: '2',
    })
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json()
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const text = data.ParsedResults.map((r: any) => r.ParsedText).join('\n').trim()
      if (text) return text
    }
    return ''
  } catch (e: any) {
    return ''
  }
}

// OCR for scanned/image-based PDFs via OCR.space (supports PDF natively)
async function ocrFromPdf(buffer: Buffer, filename: string): Promise<string> {
  try {
    const base64 = buffer.toString('base64')
    const body = new URLSearchParams({
      apikey: process.env.OCR_SPACE_API_KEY || 'helloworld',
      base64Image: `data:application/pdf;base64,${base64}`,
      language: 'eng',
      isOverlayRequired: 'false',
      OCREngine: '2',
      filetype: 'PDF',
      isTable: 'true',
    })
    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    })
    const data = await res.json()
    if (data.ParsedResults && data.ParsedResults.length > 0) {
      const text = data.ParsedResults.map((r: any) => r.ParsedText).join('\n').trim()
      if (text) return text
    }
    return ''
  } catch (e: any) {
    return ''
  }
}

// Check if extracted PDF text is meaningful (not just metadata)
function isPdfTextMeaningful(text: string): boolean {
  if (!text) return false
  const cleaned = text.replace(/font\s*size[:\s]*\d+/gi, '').replace(/\s+/g, ' ').trim()
  return cleaned.length >= 20
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: `File too large. Maximum size is 5MB. Your file: ${(file.size / 1024 / 1024).toFixed(1)}MB` }, { status: 400 })

    const name = file.name.toLowerCase()
    const buffer = Buffer.from(await file.arrayBuffer())
    let rawText = ''
    let ocrText = ''
    let isScanned = false

    if (name.endsWith('.pdf')) {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      rawText = data.text || ''
      if (!isPdfTextMeaningful(rawText)) {
        isScanned = true
        ocrText = await ocrFromPdf(buffer, file.name)
      }
    } else if (name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png')) {
      isScanned = true
      ocrText = await ocrFromImage(buffer, file.name)
    } else if (name.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
      const XLSX = await import('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      const sheets: string[] = []
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName]
        sheets.push(`[Sheet: ${sheetName}]\n${XLSX.utils.sheet_to_csv(sheet)}`)
      }
      rawText = sheets.join('\n\n')
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
      rawText = slideTexts.join('\n\n')
    } else if (name.endsWith('.txt') || name.endsWith('.csv') || name.endsWith('.json') || name.endsWith('.xml') || name.endsWith('.log') || name.endsWith('.md') || name.endsWith('.html') || name.endsWith('.js') || name.endsWith('.ts') || name.endsWith('.py') || name.endsWith('.sql') || name.endsWith('.yml') || name.endsWith('.yaml') || name.endsWith('.env') || name.endsWith('.cfg') || name.endsWith('.conf') || name.endsWith('.ini')) {
      rawText = buffer.toString('utf-8')
    } else {
      return NextResponse.json({ error: `Unsupported file type: ${file.name}` }, { status: 400 })
    }

    const displayText = ocrText || rawText || '[No text content extracted from file]'
    return NextResponse.json({ text: displayText, rawText, ocrText, isScanned, filename: file.name, size: file.size })
  } catch (e: any) {
    return NextResponse.json({ error: `Extraction failed: ${e.message}` }, { status: 500 })
  }
}