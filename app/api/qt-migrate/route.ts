import { NextResponse } from 'next/server'
import { getDB } from '@/lib/db'

export async function POST() {
  try {
    const db = getDB()
    // Create product categories table
    await db.execute(`CREATE TABLE IF NOT EXISTS qt_product_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code_prefix TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`)
    // Add category_id to qt_products
    try { await db.execute(`ALTER TABLE qt_products ADD COLUMN category_id TEXT REFERENCES qt_product_categories(id)`) } catch(e) {}
    try { await db.execute(`CREATE INDEX IF NOT EXISTS idx_qt_products_cat ON qt_products(category_id)`) } catch(e) {}

    // Seed categories
    const categories = [
      { id: 'cat_mgmt', name: 'Management Server', code_prefix: 'UCSS', description: 'Centralized management and policy server', sort_order: 1 },
      { id: 'cat_swg', name: 'Secure Web Gateway + DLP', code_prefix: 'UCSG-SWGD', description: 'Web gateway with URL filtering and DLP', sort_order: 2 },
      { id: 'cat_seg', name: 'Email Security Gateway + DLP', code_prefix: 'UCSG-ASEG', description: 'Email gateway with anti-spam and DLP', sort_order: 3 },
      { id: 'cat_endpoint', name: 'Endpoint DLP Agent', code_prefix: 'UCSC', description: 'Desktop endpoint DLP agents', sort_order: 4 },
      { id: 'cat_service', name: 'Professional Services', code_prefix: 'PS', description: 'Implementation and consulting', sort_order: 5 },
      { id: 'cat_maintenance', name: 'Annual Maintenance', code_prefix: 'ANNUAL', description: 'On-going maintenance and support', sort_order: 6 },
    ]
    for (const c of categories) {
      await db.execute({ sql: `INSERT OR REPLACE INTO qt_product_categories (id, name, code_prefix, description, sort_order, is_active) VALUES (?, ?, ?, ?, ?, 1)`, args: [c.id, c.name, c.code_prefix, c.description, c.sort_order] })
    }

    // Update existing products with category_id
    const catMap: Record<string, string> = {
      'prod_ucss_5100': 'cat_mgmt', 'prod_ucss_5100_vm': 'cat_mgmt', 'prod_ucss_1100_vm': 'cat_mgmt',
      'prod_ucss_1100': 'cat_mgmt',
      'prod_ucsg_swgd_5100': 'cat_swg', 'prod_ucsg_swgd_1100_vm': 'cat_swg',
      'prod_ucsg_swgd_1100': 'cat_swg',
      'prod_ucsg_aseg_5100': 'cat_seg', 'prod_ucsg_aseg_1100_vm': 'cat_seg',
      'prod_ucsg_aseg_1100': 'cat_seg',
      'prod_ucsc_win': 'cat_endpoint', 'prod_ucsc_mac': 'cat_endpoint',
      'prod_ucsc_winmac': 'cat_endpoint',
      'prod_ps_impl': 'cat_service',
      'prod_annual_svc': 'cat_maintenance',
    }
    for (const [pid, cid] of Object.entries(catMap)) {
      await db.execute({ sql: `UPDATE qt_products SET category_id = ? WHERE id = ?`, args: [cid, pid] })
    }

    // Seed additional models that may be missing
    const newProducts = [
      { id: 'prod_ucss_1100', code: 'UCSS-1100', name: 'SecGator Management Server 1100', type: 'management', deployment: 'appliance', category_id: 'cat_mgmt', description: 'Hardware Appliance Management Server (Entry)', features: '[]' },
      { id: 'prod_ucsg_swgd_1100', code: 'UCSG-SWGD-1100', name: 'SecGator Web Gateway + DLP 1100', type: 'web_gateway', deployment: 'appliance', category_id: 'cat_swg', description: 'Hardware Appliance Secure Web Gateway with DLP (Entry)', features: '[]' },
      { id: 'prod_ucsg_aseg_1100', code: 'UCSG-ASEG-1100', name: 'SecGator Email Gateway + DLP 1100', type: 'email_gateway', deployment: 'appliance', category_id: 'cat_seg', description: 'Hardware Appliance Email Security Gateway with DLP (Entry)', features: '[]' },
      { id: 'prod_ucsc_winmac', code: 'UCSC-WINMAC-SW', name: 'SecGator Endpoint DLP Agent - Win/Mac', type: 'endpoint', deployment: 'endpoint', category_id: 'cat_endpoint', description: 'Windows + macOS Endpoint DLP Agent (per seat)', features: '[]' },
    ]
    for (const p of newProducts) {
      await db.execute({ sql: `INSERT OR IGNORE INTO qt_products (id, code, name, type, deployment, category_id, description, features, is_active, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 0)`, args: [p.id, p.code, p.name, p.type, p.deployment, p.category_id, p.description, p.features] })
    }

    return NextResponse.json({ success: true, message: 'Migration complete: categories created, products updated' })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
