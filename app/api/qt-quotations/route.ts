// app/api/qt-quotations/route.ts
// Quotation CRUD API - GET (list), POST (create)
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getDB } from '@/lib/db'
import { generateId, generateQuotationRef, writeQuotationAudit } from '@/lib/quotation-db'
import { computePricing, generateDefaultRemarks, type PriceLineInput } from '@/lib/quotation-engine'

export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDB()
  const { searchParams } = req.nextUrl
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  let sql = `SELECT q.*, u.name as created_by_name, u.email as created_by_email
    FROM qt_quotations q
    LEFT JOIN qt_admin_users u ON u.id = q.created_by`
  const args: (string | number)[] = []
  const where: string[] = []

  if (status) { where.push(`q.status = ?`); args.push(status) }
  if (search) {
    where.push(`(q.customer_name LIKE ? OR q.partner_name LIKE ? OR q.project_name LIKE ? OR q.ref_number LIKE ?)`)
    const s = `%${search}%`
    args.push(s, s, s, s)
  }
  // Non-admin can only see own quotations
  if (auth.role !== 'admin') { where.push(`q.created_by = ?`); args.push(auth.userId) }

  if (where.length > 0) sql += ` WHERE ` + where.join(' AND ')
  sql += ` ORDER BY q.created_at DESC LIMIT ? OFFSET ?`
  args.push(limit, offset)

  const result = await db.execute({ sql, args })
  const countResult = await db.execute({
    sql: `SELECT COUNT(*) as total FROM qt_quotations q ${where.length > 0 ? 'WHERE ' + where.join(' AND ') : ''}`,
    args: args.slice(0, args.length - 2),
  })

  return NextResponse.json({
    quotations: result.rows,
    total: (countResult.rows[0] as any).total,
    limit,
    offset,
  })
}

export async function POST(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const db = getDB()

  const {
    customerName, partnerName, endUserName, projectName, customerType,
    termYears, paymentModel, currency,
    includePs, includeAnnualService, psDescription, annualServiceDescription,
    validityDays, leadTime, deliveryLocation, remarks,
    lines, discountPercent, targetFinalPrice,
  } = body

  if (!customerName || !termYears) {
    return NextResponse.json({ error: 'customerName and termYears are required' }, { status: 400 })
  }

  // Compute pricing
  const lineInputs: PriceLineInput[] = (lines || []).map((l: any) => ({
    productId: l.productId || l.product_id || '',
    productCode: l.productCode || l.product_code || '',
    siteType: l.siteType || l.site_type || 'production',
    qty: parseInt(l.qty) || 1,
    customAppliancePrice: l.applianceUnitPrice !== undefined ? parseFloat(l.applianceUnitPrice) : undefined,
    customLicensePrice: l.licenseUnitPrice !== undefined ? parseFloat(l.licenseUnitPrice) : undefined,
    isIncluded: l.isIncluded || false,
    notes: l.notes || '',
    sortOrder: l.sortOrder || 0,
  }))

  const pricing = await computePricing({
    lines: lineInputs,
    termYears: parseInt(termYears),
    discountPercent: discountPercent ? parseFloat(discountPercent) : undefined,
    targetFinalPrice: targetFinalPrice ? parseFloat(targetFinalPrice) : undefined,
    currency: currency || 'HKD',
  })

  // Generate default remarks if not provided
  const finalRemarks = remarks || generateDefaultRemarks(
    parseInt(termYears),
    validityDays || 30,
    leadTime || '2-6 weeks',
    deliveryLocation || 'Customer Site',
    !!includePs,
    !!includeAnnualService,
    paymentModel || 'one_off'
  )

  // Create quotation
  const quotationId = generateId('qt')
  const refNumber = generateQuotationRef()
  const expiresAt = new Date(Date.now() + (validityDays || 30) * 24 * 60 * 60 * 1000).toISOString()

  await db.execute({
    sql: `INSERT INTO qt_quotations (
      id, ref_number, customer_name, partner_name, end_user_name, project_name, customer_type,
      term_years, payment_model, currency, status,
      include_ps, include_annual_service, ps_description, annual_service_description,
      appliance_total, license_total, service_total, grand_total,
      discount_percent, discount_amount, final_price,
      remarks, validity_days, lead_time, delivery_location,
      version, created_by, expires_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      quotationId, refNumber, customerName, partnerName || null, endUserName || null, projectName || null, customerType || 'end_user',
      parseInt(termYears), paymentModel || 'one_off', currency || 'HKD', 'draft',
      includePs ? 1 : 0, includeAnnualService ? 1 : 0, psDescription || null, annualServiceDescription || null,
      pricing.totals.applianceTotal, pricing.totals.licenseTotal, pricing.totals.serviceTotal, pricing.totals.grandTotal,
      pricing.discountPercent, pricing.totals.discountAmount, pricing.totals.finalPrice,
      finalRemarks, validityDays || 30, leadTime || '2-6 weeks', deliveryLocation || 'Customer Site',
      1, auth.userId, expiresAt,
    ],
  })

  // Insert line items
  for (const pl of pricing.lines) {
    const lineId = generateId('line')
    await db.execute({
      sql: `INSERT INTO qt_lines (
        id, quotation_id, site_type, product_id, product_code, description, qty,
        appliance_unit_price, appliance_total, license_unit_price,
        year1_fee, year2_fee, year3_fee, year4_fee, year5_fee,
        line_total, is_included, notes, sort_order
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [
        lineId, quotationId, pl.siteType, pl.productId, pl.productCode, pl.description, pl.qty,
        pl.applianceUnitPrice, pl.applianceTotal, pl.licenseUnitPrice,
        pl.year1Fee, pl.year2Fee, pl.year3Fee, pl.year4Fee, pl.year5Fee,
        pl.lineTotal, pl.isIncluded ? 1 : 0, pl.notes, pl.sortOrder,
      ],
    })
  }

  await writeQuotationAudit(auth.userId, auth.email, 'quotation_created', 'quotation', quotationId, { refNumber, customerName })

  // Return full quotation with lines
  const created = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [quotationId] })
  const linesResult = await db.execute({ sql: `SELECT * FROM qt_lines WHERE quotation_id = ? ORDER BY sort_order`, args: [quotationId] })

  return NextResponse.json({
    quotation: created.rows[0],
    lines: linesResult.rows,
    pricing,
  }, { status: 201 })
}
