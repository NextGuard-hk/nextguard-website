// app/api/qt-seed/route.ts
// Seed products, models and prices into the Quotation System DB
import { NextRequest, NextResponse } from 'next/server'
import { initQuotationDB, seedDefaultProducts, seedDefaultPrices } from '@/lib/quotation-db'
import { getDB } from '@/lib/db'

const SECRET = 'nextguard-cron-2024-secure'

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== SECRET) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const action = req.nextUrl.searchParams.get('action') || 'seed-all'
  const db = getDB()

  try {
    if (action === 'seed-all' || action === 'init') {
      await initQuotationDB()
      await seedDefaultProducts()
      await seedDefaultPrices()
      // Also seed missing products from quotation samples
      await seedExtraProducts(db)
      return NextResponse.json({ success: true, message: 'DB initialized, products + prices seeded' })
    }

    if (action === 'products') {
      await seedDefaultProducts()
      await seedExtraProducts(db)
      return NextResponse.json({ success: true, message: 'Products seeded' })
    }

    if (action === 'prices') {
      await seedDefaultPrices()
      await seedExtraPrices(db)
      return NextResponse.json({ success: true, message: 'Prices seeded' })
    }

    if (action === 'check') {
      const products = await db.execute('SELECT id, code, name, type, deployment FROM qt_products ORDER BY sort_order, type')
      const prices = await db.execute('SELECT COUNT(*) as cnt FROM qt_prices')
      return NextResponse.json({ products: products.rows, priceCount: (prices.rows[0] as any)?.cnt })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

async function seedExtraProducts(db: any) {
  // Missing products from Excel quotation samples
  const extra = [
    // Hardware appliance models missing from default seed
    { id: 'prod_ucss_1100', code: 'UCSS-1100', name: 'SecGator Management Server 1100', type: 'management', deployment: 'appliance', description: 'Hardware Appliance Management Server (Entry)' },
    { id: 'prod_ucsg_swgd_1100', code: 'UCSG-SWGD-1100', name: 'SecGator Web Gateway + DLP 1100', type: 'web_gateway', deployment: 'appliance', description: 'Hardware Appliance Secure Web Gateway with DLP (Entry)' },
    { id: 'prod_ucsg_aseg_1100', code: 'UCSG-ASEG-1100', name: 'SecGator Email Gateway + DLP 1100', type: 'email_gateway', deployment: 'appliance', description: 'Hardware Appliance Email Security Gateway with DLP (Entry)' },
    { id: 'prod_ucsg_aseg_5100', code: 'UCSG-ASEG-5100', name: 'SecGator Email Gateway + DLP 5100', type: 'email_gateway', deployment: 'appliance', description: 'Hardware Appliance Email Security Gateway with DLP' },
    // VM models
    { id: 'prod_ucsg_aseg_1100_vm', code: 'UCSG-ASEG-1100-VM', name: 'SecGator Email Gateway + DLP 1100 VM', type: 'email_gateway', deployment: 'vm', description: 'VM-based Email Security Gateway with DLP' },
    { id: 'prod_ucsg_swgd_1100_vm', code: 'UCSG-SWGD-1100-VM', name: 'SecGator Web Gateway + DLP 1100 VM', type: 'web_gateway', deployment: 'vm', description: 'VM-based Secure Web Gateway with DLP' },
    { id: 'prod_ucss_1100_vm', code: 'UCSS-1100-VM', name: 'SecGator Management Server 1100 VM', type: 'management', deployment: 'vm', description: 'VM-based Management Server (Entry)' },
    { id: 'prod_ucss_5100_vm', code: 'UCSS-5100-VM', name: 'SecGator Management Server 5100 VM', type: 'management', deployment: 'vm', description: 'VM-based Management Server' },
    { id: 'prod_ucss_5100', code: 'UCSS-5100', name: 'SecGator Management Server 5100', type: 'management', deployment: 'appliance', description: 'Hardware Appliance Management Server' },
    { id: 'prod_ucsg_swgd_5100', code: 'UCSG-SWGD-5100', name: 'SecGator Web Gateway + DLP 5100', type: 'web_gateway', deployment: 'appliance', description: 'Hardware Appliance Secure Web Gateway with DLP' },
    // Combined Win+Mac endpoint
    { id: 'prod_ucsc_winmac', code: 'UCSC-WINMAC-SW', name: 'SecGator Endpoint DLP Agent - Win/Mac', type: 'endpoint', deployment: 'endpoint', description: 'Windows + macOS Endpoint DLP Agent (per seat)' },
    // Services
    { id: 'prod_ps_impl', code: 'PS-IMPL', name: 'Professional Services - Implementation', type: 'service', deployment: 'service', description: 'Setup, installation, integration, fine-tuning and data policy consultation' },
    { id: 'prod_annual_svc', code: 'ANNUAL-SVC', name: 'Annual On-going Maintenance Service', type: 'service', deployment: 'service', description: 'Annual onsite/remote service for software upgrade, fine-tuning and data policy consultation' },
  ]
  for (const p of extra) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO qt_products (id, code, name, type, deployment, description, features, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, '[]', 1, 0)`,
      args: [p.id, p.code, p.name, p.type, p.deployment, p.description],
    })
  }
}

async function seedExtraPrices(db: any) {
  // Prices from the Excel quotation samples
  const prices: [string, number, number, number, number][] = [
    // UCSS-5100 (HW) from CNCBI/CHB samples
    ['prod_ucss_5100', 3, 1, 50000, 100000],
    ['prod_ucss_5100', 5, 1, 70000, 100000],
    // UCSS-1100 (HW) from CHB sample
    ['prod_ucss_1100', 3, 1, 45000, 70000],
    ['prod_ucss_1100', 5, 1, 50000, 65000],
    // UCSS-1100-VM from ICAC/Manulife
    ['prod_ucss_1100_vm', 2, 1, 0, 70000],
    ['prod_ucss_1100_vm', 3, 1, 0, 60000],
    // UCSS-5100-VM from ASTRI
    ['prod_ucss_5100_vm', 1, 1, 0, 150000],
    // UCSG-SWGD-5100 (HW)
    ['prod_ucsg_swgd_5100', 3, 1, 50000, 100000],
    ['prod_ucsg_swgd_5100', 5, 1, 70000, 100000],
    // UCSG-SWGD-1100 (HW)
    ['prod_ucsg_swgd_1100', 3, 1, 45000, 70000],
    ['prod_ucsg_swgd_1100', 5, 1, 50000, 65000],
    // UCSG-SWGD-1100-VM from ICAC/Manulife
    ['prod_ucsg_swgd_1100_vm', 2, 1, 0, 70000],
    ['prod_ucsg_swgd_1100_vm', 3, 1, 0, 60000],
    // UCSG-ASEG-5100 (HW)
    ['prod_ucsg_aseg_5100', 3, 1, 50000, 100000],
    ['prod_ucsg_aseg_5100', 5, 1, 70000, 100000],
    // UCSG-ASEG-1100 (HW)
    ['prod_ucsg_aseg_1100', 3, 1, 45000, 70000],
    ['prod_ucsg_aseg_1100', 5, 1, 50000, 65000],
    // UCSG-ASEG-1100-VM from ICAC/Manulife
    ['prod_ucsg_aseg_1100_vm', 2, 1, 0, 70000],
    ['prod_ucsg_aseg_1100_vm', 3, 1, 0, 60000],
    // UCSC-WINMAC-SW (combined endpoint)
    ['prod_ucsc_winmac', 1, 1, 0, 300],
    ['prod_ucsc_winmac', 2, 1, 0, 280],
    ['prod_ucsc_winmac', 3, 1, 0, 250],
    ['prod_ucsc_winmac', 5, 1, 0, 200],
    ['prod_ucsc_winmac', 1, 100, 0, 250],
    ['prod_ucsc_winmac', 3, 100, 0, 200],
    ['prod_ucsc_winmac', 1, 500, 0, 200],
    ['prod_ucsc_winmac', 3, 500, 0, 150],
    ['prod_ucsc_winmac', 1, 1000, 0, 180],
    ['prod_ucsc_winmac', 3, 1000, 0, 150],
    ['prod_ucsc_winmac', 3, 3000, 0, 150],
    // PS
    ['prod_ps_impl', 1, 1, 0, 80000],
    ['prod_ps_impl', 3, 1, 0, 80000],
    ['prod_ps_impl', 5, 1, 0, 80000],
    // Annual service
    ['prod_annual_svc', 1, 1, 0, 50000],
    ['prod_annual_svc', 3, 1, 0, 50000],
    ['prod_annual_svc', 5, 1, 0, 50000],
  ]
  for (const [productId, termYears, minQty, appPrice, licPrice] of prices) {
    const id = `price_${productId}_${termYears}y_${minQty}q`
    await db.execute({
      sql: `INSERT OR IGNORE INTO qt_prices (id, product_id, term_years, min_qty, max_qty, appliance_unit_price, license_unit_price, currency) VALUES (?, ?, ?, ?, 999999, ?, ?, 'HKD')`,
      args: [id, productId, termYears, minQty, appPrice, licPrice],
    })
  }
}
