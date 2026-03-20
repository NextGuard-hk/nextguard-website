// app/api/qt-quotations/[id]/route.ts
// Single Quotation - GET, PUT (update), DELETE, PATCH (status)
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getDB } from '@/lib/db'
import { generateId, writeQuotationAudit } from '@/lib/quotation-db'
import { computePricing, generateDefaultRemarks, type PriceLineInput } from '@/lib/quotation-engine'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDB()
  const qtResult = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
  if (qtResult.rows.length === 0) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

  const quotation = qtResult.rows[0] as any
  if (auth.role !== 'admin' && quotation.created_by !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const linesResult = await db.execute({ sql: `SELECT * FROM qt_lines WHERE quotation_id = ? ORDER BY sort_order`, args: [id] })
  const filesResult = await db.execute({ sql: `SELECT id, file_name, file_type, version, created_at FROM qt_files WHERE quotation_id = ? ORDER BY created_at DESC`, args: [id] })
  return NextResponse.json({ quotation, lines: linesResult.rows, files: filesResult.rows })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = authenticateQtRequest(req)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const db = getDB()
    const body = await req.json().catch(() => ({}))

    const qtResult = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
    if (qtResult.rows.length === 0) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

    const existing = qtResult.rows[0] as any
    if (auth.role !== 'admin' && existing.created_by !== auth.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { customerName, partnerName, endUserName, projectName, customerType, termYears, paymentModel, currency, status, includePs, includeAnnualService, psDescription, annualServiceDescription, validityDays, leadTime, deliveryLocation, remarks, lines, discountPercent, targetFinalPrice } = body

    let pricing = null
    if (lines) {
      const validLines = lines.filter((l: any) => l.productId || l.product_id || l.productCode || l.product_code)
      const lineInputs: PriceLineInput[] = validLines.map((l: any) => ({
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

      pricing = await computePricing({
        lines: lineInputs,
        termYears: parseInt(termYears || existing.term_years),
        discountPercent: discountPercent !== undefined ? parseFloat(discountPercent) : undefined,
        targetFinalPrice: targetFinalPrice !== undefined ? parseFloat(targetFinalPrice) : undefined,
        currency: currency || existing.currency || 'HKD',
      })

      await db.execute({ sql: `DELETE FROM qt_lines WHERE quotation_id = ?`, args: [id] })
      for (const pl of pricing.lines) {
        const lineId = generateId('line')
        await db.execute({
          sql: `INSERT INTO qt_lines (id, quotation_id, site_type, product_id, product_code, description, qty, appliance_unit_price, appliance_total, license_unit_price, year1_fee, year2_fee, year3_fee, year4_fee, year5_fee, line_total, is_included, notes, sort_order, sku) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [lineId, id, pl.siteType, pl.productId, pl.productCode, pl.description, pl.qty, pl.applianceUnitPrice, pl.applianceTotal, pl.licenseUnitPrice, pl.year1Fee, pl.year2Fee, pl.year3Fee, pl.year4Fee, pl.year5Fee, pl.lineTotal, pl.isIncluded ? 1 : 0, pl.notes, pl.sortOrder, validLines[pricing.lines.indexOf(pl)]?.sku || ''],
        })
      }
    }

    const updates: string[] = []
    const args: any[] = []
    const set = (col: string, val: any) => { if (val !== undefined) { updates.push(`${col} = ?`); args.push(val) } }

    set('customer_name', customerName)
    set('partner_name', partnerName)
    set('end_user_name', endUserName)
    set('project_name', projectName)
    set('customer_type', customerType)
    set('term_years', termYears ? parseInt(termYears) : undefined)
    set('payment_model', paymentModel)
    set('currency', currency)
    set('status', status)
    set('include_ps', includePs !== undefined ? (includePs ? 1 : 0) : undefined)
    set('include_annual_service', includeAnnualService !== undefined ? (includeAnnualService ? 1 : 0) : undefined)
    set('ps_description', psDescription)
    set('annual_service_description', annualServiceDescription)
    set('validity_days', validityDays)
    set('lead_time', leadTime)
    set('delivery_location', deliveryLocation)
    set('remarks', remarks)

    if (pricing) {
      set('appliance_total', pricing.totals.applianceTotal)
      set('license_total', pricing.totals.licenseTotal)
      set('service_total', pricing.totals.serviceTotal)
      set('grand_total', pricing.totals.grandTotal)
      set('discount_percent', pricing.discountPercent)
      set('discount_amount', pricing.totals.discountAmount)
      set('final_price', pricing.totals.finalPrice)
      set('version', (existing.version || 1) + 1)
    }

    if (status === 'sent') set('sent_at', new Date().toISOString())
    updates.push(`updated_at = datetime('now')`)
    args.push(id)

    if (updates.length > 0) {
      await db.execute({ sql: `UPDATE qt_quotations SET ${updates.join(', ')} WHERE id = ?`, args })
    }

    await writeQuotationAudit(auth.userId, auth.email, 'quotation_updated', 'quotation', id, { status })

    const updated = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
    const updatedLines = await db.execute({ sql: `SELECT * FROM qt_lines WHERE quotation_id = ? ORDER BY sort_order`, args: [id] })

    return NextResponse.json({ quotation: updated.rows[0], lines: updatedLines.rows, pricing })
  } catch (e: any) {
    console.error('Quotation PUT error:', e)
    return NextResponse.json({ error: e.message || 'Internal server error', stack: e.stack?.split('\n').slice(0, 5) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateQtRequest(req)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const { id } = await params
  const db = getDB()
  await db.execute({ sql: `DELETE FROM qt_quotations WHERE id = ?`, args: [id] })
  await writeQuotationAudit(auth.userId, auth.email, 'quotation_deleted', 'quotation', id)
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const db = getDB()
  const body = await req.json().catch(() => ({}))

  const qtResult = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
  if (qtResult.rows.length === 0) return NextResponse.json({ error: 'Quotation not found' }, { status: 404 })

  const existing = qtResult.rows[0] as any
  if (auth.role !== 'admin' && existing.created_by !== auth.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { status } = body
  if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 })

  const updates: string[] = [`status = ?`, `updated_at = datetime('now')`]
  const uArgs: any[] = [status]
  if (status === 'sent') { updates.push(`sent_at = ?`); uArgs.push(new Date().toISOString()) }
  uArgs.push(id)

  await db.execute({ sql: `UPDATE qt_quotations SET ${updates.join(', ')} WHERE id = ?`, args: uArgs })
  await writeQuotationAudit(auth.userId, auth.email, 'status_updated', 'quotation', id, { status })

  const updated = await db.execute({ sql: `SELECT * FROM qt_quotations WHERE id = ?`, args: [id] })
  return NextResponse.json({ quotation: updated.rows[0] })
}