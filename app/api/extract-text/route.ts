// @ts-nocheck
export const runtime = 'nodejs'
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB

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
      text = `[Image file: ${file.name}, size: ${(file.size / 1024).toFixed(1)}KB]\n[Note: Image uploaded for DLP inspection. AI engine will analyze image metadata and filename for sensitive content. For full OCR-based text extraction, an on-premise deployment with Tesseract/PaddleOCR is recommended.]\nFilename: ${file.name}`
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
