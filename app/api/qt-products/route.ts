// app/api/qt-products/route.ts
// Product Catalog API - GET (list), POST (create), PUT (update) - Admin only for CUD
import { NextRequest, NextResponse } from 'next/server'
import { authenticateQtRequest } from '@/lib/quotation-auth'
import { getDB } from '@/lib/db'
import { generateId, writeQuotationAudit } from '@/lib/quotation-db'

export async function GET(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const db = getDB()
  const { searchParams } = req.nextUrl
  const type = searchParams.get('type')
  const includeInactive = searchParams.get('includeInactive') === 'true' && auth.role === 'admin'

  let sql = `SELECT p.*, GROUP_CONCAT(pr.id) as price_ids FROM qt_products p LEFT JOIN qt_prices pr ON pr.product_id = p.id`
  const args: string[] = []
  const where: string[] = []

  if (!includeInactive) where.push(`p.is_active = 1`)
  if (type) { where.push(`p.type = ?`); args.push(type) }

  if (where.length > 0) sql += ` WHERE ` + where.join(' AND ')
  sql += ` GROUP BY p.id ORDER BY p.sort_order, p.type, p.code`

  const result = await db.execute({ sql, args })
  const products = result.rows.map((row: any) => ({
    ...row,
    features: (() => { try { return JSON.parse(row.features || '[]') } catch { return [] } })(),
  }))

  // Also fetch prices for each product
  const productIds = products.map((p: any) => p.id)
  let prices: any[] = []
  if (productIds.length > 0) {
    const priceResult = await db.execute({
      sql: `SELECT * FROM qt_prices WHERE product_id IN (${productIds.map(() => '?').join(',')}) AND is_active = 1 ORDER BY term_years, min_qty`,
      args: productIds,
    })
    prices = priceResult.rows as any[]
  }

  // Attach prices to products
  const enriched = products.map((p: any) => ({
    ...p,
    prices: prices.filter((pr: any) => pr.product_id === p.id),
  }))

  return NextResponse.json({ products: enriched })
}

export async function POST(req: NextRequest) {
  const auth = authenticateQtRequest(req)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const { action } = body

  const db = getDB()

  // Create product
  if (!action || action === 'create-product') {
    const { code, name, type, deployment, description, features, sortOrder } = body
    if (!code || !name || !type) {
      return NextResponse.json({ error: 'code, name, type are required' }, { status: 400 })
    }
    const id = generateId('prod')
    await db.execute({
      sql: `INSERT INTO qt_products (id, code, name, type, deployment, description, features, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, code.toUpperCase(), name, type, deployment || 'appliance', description || '', JSON.stringify(features || []), sortOrder || 0],
    })
    await writeQuotationAudit(auth.userId, auth.email, 'product_created', 'product', id, { code })
    const created = await db.execute({ sql: `SELECT * FROM qt_products WHERE id = ?`, args: [id] })
    return NextResponse.json({ product: created.rows[0] }, { status: 201 })
  }

  // Create price policy
  if (action === 'create-price') {
    const { productId, termYears, minQty, maxQty, applianceUnitPrice, licenseUnitPrice, currency } = body
    if (!productId || !termYears) {
      return NextResponse.json({ error: 'productId and termYears are required' }, { status: 400 })
    }
    const id = generateId('price')
    await db.execute({
      sql: `INSERT INTO qt_prices (id, product_id, term_years, min_qty, max_qty, appliance_unit_price, license_unit_price, currency)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, productId, termYears, minQty || 1, maxQty || 999999, applianceUnitPrice || 0, licenseUnitPrice || 0, currency || 'HKD'],
    })
    await writeQuotationAudit(auth.userId, auth.email, 'price_created', 'price', id, { productId, termYears })
    const created = await db.execute({ sql: `SELECT * FROM qt_prices WHERE id = ?`, args: [id] })
    return NextResponse.json({ price: created.rows[0] }, { status: 201 })
  }

  // Update product
  if (action === 'update-product') {
    const { id, code, name, type, deployment, description, features, sortOrder, isActive } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.execute({
      sql: `UPDATE qt_products SET code=?, name=?, type=?, deployment=?, description=?, features=?, sort_order=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      args: [code, name, type, deployment, description || '', JSON.stringify(features || []), sortOrder || 0, isActive !== false ? 1 : 0, id],
    })
    await writeQuotationAudit(auth.userId, auth.email, 'product_updated', 'product', id)
    const updated = await db.execute({ sql: `SELECT * FROM qt_products WHERE id = ?`, args: [id] })

  // Update price
  if (action === 'update-price') {
    const { id, applianceUnitPrice, licenseUnitPrice, termYears, minQty, maxQty, isActive } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.execute({
      sql: `UPDATE qt_prices SET appliance_unit_price=?, license_unit_price=?, term_years=?, min_qty=?, max_qty=?, is_active=?, updated_at=datetime('now') WHERE id=?`,
      args: [applianceUnitPrice || 0, licenseUnitPrice || 0, termYears, minQty || 1, maxQty || 999999, isActive !== false ? 1 : 0, id],
    })
    await writeQuotationAudit(auth.userId, auth.email, 'price_updated', 'price', id)
    const updated = await db.execute({ sql: `SELECT * FROM qt_prices WHERE id = ?`, args: [id] })
    return NextResponse.json({ price: updated.rows[0] })
  }

  // Delete price
  if (action === 'delete-price') {
    const { id } = body
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
    await db.execute({ sql: `DELETE FROM qt_prices WHERE id = ?`, args: [id] })
    await writeQuotationAudit(auth.userId, auth.email, 'price_deleted', 'price', id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}
