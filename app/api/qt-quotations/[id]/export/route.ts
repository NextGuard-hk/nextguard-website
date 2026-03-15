// app/api/qt-quotations/[id]/export/route.ts
// Excel Export: generates .xlsx matching the Skyguard quotation format, uploads to R2
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getDB } from '@/lib/db'
import { generateId, writeQuotationAudit } from '@/lib/quotation-db'
import * as XLSX from 'xlsx'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

function getR2Client() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
    credentials: {
      accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
    },
  })
}

const R2_BUCKET = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'nextguard-files'

function formatHKD(amount: number): string {
  return `HKD ${Number(amount).toLocaleString('en-HK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function buildQuotationExcel(quotation: any, lines: any[]): Buffer {
  const wb = XLSX.utils.book_new()
  const term = quotation.term_years || 3

  // ─── Build rows ───
  const rows: any[][] = []

  // Title
  rows.push(['NEXTGUARD TECHNOLOGY LIMITED'])
  rows.push(['Quotation'])
  rows.push([])

  // Header info
  rows.push(['Quotation Ref:', quotation.ref_number, '', 'Date:', new Date(quotation.created_at).toLocaleDateString('en-HK')])
  rows.push(['Customer:', quotation.customer_name, '', 'Valid Until:', new Date(quotation.expires_at || Date.now()).toLocaleDateString('en-HK')])
  if (quotation.partner_name) rows.push(['Partner:', quotation.partner_name])
  if (quotation.end_user_name) rows.push(['End User:', quotation.end_user_name])
  if (quotation.project_name) rows.push(['Project:', quotation.project_name])
  rows.push(['Term:', `${term} Year(s)`, '', 'Payment:', quotation.payment_model === 'one_off' ? 'One-off (Upfront)' : 'Yearly Payment'])
  rows.push(['Currency:', quotation.currency || 'HKD'])
  rows.push([])

  // Column headers - dynamic based on term years
  const yearHeaders = []
  for (let y = 1; y <= term; y++) yearHeaders.push(`Year ${y} License Fee`)
  const headers = ['Site', 'Series/Code', 'Description', 'QTY', 'Appliance Unit Price', 'Appliance Total', 'License Unit Price', ...yearHeaders, 'Line Total', 'Notes']
  rows.push(headers)

  // Group lines by site_type
  const siteOrder = ['production', 'dr', 'uat', 'hk_site', 'dr_site', 'other']
  const siteLabels: Record<string, string> = {
    production: 'Production Site',
    dr: 'DR Site',
    uat: 'UAT Site',
    hk_site: 'HK Site',
    dr_site: 'DR Site',
    other: 'Other',
  }

  const grouped: Record<string, any[]> = {}
  for (const line of lines) {
    const s = line.site_type || 'production'
    if (!grouped[s]) grouped[s] = []
    grouped[s].push(line)
  }

  const siteKeys = [...siteOrder.filter(s => grouped[s]), ...Object.keys(grouped).filter(s => !siteOrder.includes(s))]

  for (const siteKey of siteKeys) {
    const siteLines = grouped[siteKey] || []
    rows.push([siteLabels[siteKey] || siteKey.toUpperCase()])
    for (const line of siteLines) {
      if (line.is_included) {
        const yearFees = []
        for (let y = 1; y <= term; y++) yearFees.push('Included')
        rows.push([
          '',
          line.product_code,
          line.description || line.product_code,
          line.qty,
          line.appliance_unit_price > 0 ? formatHKD(line.appliance_unit_price) : '-',
          line.appliance_total > 0 ? formatHKD(line.appliance_total) : '-',
          'Included',
          ...yearFees,
          'Included',
          line.notes || '',
        ])
      } else {
        const yearFees = []
        for (let y = 1; y <= term; y++) {
          const fee = [line.year1_fee, line.year2_fee, line.year3_fee, line.year4_fee, line.year5_fee][y - 1] || 0
          yearFees.push(fee > 0 ? formatHKD(fee) : '-')
        }
        rows.push([
          '',
          line.product_code,
          line.description || line.product_code,
          line.qty,
          line.appliance_unit_price > 0 ? formatHKD(line.appliance_unit_price) : '-',
          line.appliance_total > 0 ? formatHKD(line.appliance_total) : '-',
          line.license_unit_price > 0 ? formatHKD(line.license_unit_price) : '-',
          ...yearFees,
          line.line_total > 0 ? formatHKD(line.line_total) : '-',
          line.notes || '',
        ])
      }
    }
  }

  rows.push([])

  // Totals section
  rows.push(['', '', '', '', '', '', 'Appliance Total:', formatHKD(quotation.appliance_total)])
  rows.push(['', '', '', '', '', '', 'License Total:', formatHKD(quotation.license_total)])
  if (quotation.service_total > 0) rows.push(['', '', '', '', '', '', 'Service Total:', formatHKD(quotation.service_total)])
  rows.push(['', '', '', '', '', '', 'Grand Total:', formatHKD(quotation.grand_total)])

  if (quotation.discount_amount > 0) {
    rows.push(['', '', '', '', '', '', `Best Offer / Discount (${Number(quotation.discount_percent).toFixed(1)}%):`, `-${formatHKD(quotation.discount_amount)}`])
    rows.push(['', '', '', '', '', '', 'FINAL PRICE:', formatHKD(quotation.final_price)])
  }

  rows.push([])

  // Remarks
  rows.push(['REMARKS & CONDITIONS:'])
  const remarkLines = (quotation.remarks || '').split('\n')
  for (const rl of remarkLines) {
    if (rl.trim()) rows.push([rl.trim()])
  }

  // Create worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Column widths
  const colCount = headers.length
  ws['!cols'] = [
    { wch: 18 }, // Site
    { wch: 22 }, // Code
    { wch: 40 }, // Description
    { wch: 8 },  // QTY
    { wch: 22 }, // Appliance Unit
    { wch: 22 }, // Appliance Total
    { wch: 22 }, // License Unit
    ...Array(term).fill({ wch: 22 }), // Year fees
    { wch: 22 }, // Line Total
    { wch: 30 }, // Notes
  ]

  XLSX.utils.book_append_sheet(wb, ws, 'Quotation')

  // Return as Buffer
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return Buffer.from(buf)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDB()

  // Fetch quotation
  const qtResult = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
  if (qtResult.rows.length === 0) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })
  const quotation = qtResult.rows[0] as any

  if (auth.role !== 'admin' && quotation.created_by !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch lines
  const linesResult = await db.execute({ sql: `SELECT * FROM qt_lines WHERE quotation_id = ? ORDER BY sort_order`, args: [id] })
  const lines = linesResult.rows as any[]

  // Generate Excel
  const excelBuffer = buildQuotationExcel(quotation, lines)

  // Version number
  const filesResult = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM qt_files WHERE quotation_id = ? AND file_type = 'xlsx'`, args: [id] })
  const version = ((filesResult.rows[0] as any).cnt || 0) + 1

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const customerSlug = (quotation.customer_name || 'customer').replace(/[^a-zA-Z0-9]/g, '-').slice(0, 20)
  const fileName = `${quotation.ref_number}_${customerSlug}_v${version}_${date}.xlsx`
  const r2Key = `quotations/${id}/${fileName}`

  // Upload to R2
  try {
    const r2 = getR2Client()
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: r2Key,
      Body: excelBuffer,
      ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      Metadata: {
        quotationId: id,
        refNumber: quotation.ref_number,
        customer: quotation.customer_name,
        version: String(version),
      },
    }))

    // Record file in DB
    const fileId = generateId('file')
    await db.execute({
      sql: `INSERT INTO qt_files (id, quotation_id, file_name, r2_key, file_type, file_size, version, created_by) VALUES (?,?,?,?,?,?,?,?)`,
      args: [fileId, id, fileName, r2Key, 'xlsx', excelBuffer.length, version, auth.userId],
    })

    // Generate signed download URL (valid 15 minutes)
    const signedUrl = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key }),
      { expiresIn: 900 }
    )

    await writeQuotationAudit(auth.userId, auth.email, 'quotation_exported', 'quotation', id, { fileName, version })

    return NextResponse.json({
      success: true,
      fileName,
      version,
      downloadUrl: signedUrl,
      expiresIn: 900,
    })
  } catch (e: any) {
    // Fallback: return Excel directly as download (if R2 not configured)
    console.error('R2 upload failed, returning direct download:', e.message)
    return new NextResponse(excelBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': String(excelBuffer.length),
      },
    })
  }
}
