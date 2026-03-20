// lib/quotation-db.ts
// Turso (libSQL) schema and helpers for Quotation System
import { getDB } from './db'

export async function initQuotationDB(): Promise<void> {
  const db = getDB()
  await db.batch([
    // Admin Users for Quotation System
    `CREATE TABLE IF NOT EXISTS qt_admin_users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'sales' CHECK(role IN ('admin','sales')),
      totp_secret TEXT,
      totp_enabled INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      last_login TEXT,
      login_attempts INTEGER DEFAULT 0,
      locked_until TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    // Product Catalog
    `CREATE TABLE IF NOT EXISTS qt_products (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('management','web_gateway','email_gateway','endpoint','service','appliance')),
      deployment TEXT DEFAULT 'appliance' CHECK(deployment IN ('appliance','vm','endpoint','service')),
      description TEXT,
      features TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qt_products_code ON qt_products(code)`,
    `CREATE INDEX IF NOT EXISTS idx_qt_products_type ON qt_products(type)`,
    // Price Policies
    `CREATE TABLE IF NOT EXISTS qt_prices (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES qt_products(id) ON DELETE CASCADE,
      term_years INTEGER NOT NULL CHECK(term_years IN (1,2,3,5)),
      min_qty INTEGER DEFAULT 1,
      max_qty INTEGER DEFAULT 999999,
      appliance_unit_price REAL DEFAULT 0,
      license_unit_price REAL DEFAULT 0,
      currency TEXT DEFAULT 'HKD',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qt_prices_product ON qt_prices(product_id)`,
    // Quotations
    `CREATE TABLE IF NOT EXISTS qt_quotations (
      id TEXT PRIMARY KEY,
      ref_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      partner_name TEXT,
      end_user_name TEXT,
      project_name TEXT,
      customer_type TEXT DEFAULT 'end_user' CHECK(customer_type IN ('partner','end_user')),
      term_years INTEGER NOT NULL DEFAULT 3,
      payment_model TEXT DEFAULT 'one_off' CHECK(payment_model IN ('one_off','yearly')),
      currency TEXT DEFAULT 'HKD',
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft','sent','accepted','expired','cancelled')),
      include_ps INTEGER DEFAULT 0,
      include_annual_service INTEGER DEFAULT 0,
      ps_description TEXT,
      annual_service_description TEXT,
      appliance_total REAL DEFAULT 0,
      license_total REAL DEFAULT 0,
      service_total REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      discount_percent REAL DEFAULT 0,
      discount_amount REAL DEFAULT 0,
      final_price REAL DEFAULT 0,
      remarks TEXT,
      validity_days INTEGER DEFAULT 30,
      lead_time TEXT DEFAULT '2-6 weeks',
      delivery_location TEXT DEFAULT 'Customer Site',
      version INTEGER DEFAULT 1,
      created_by TEXT REFERENCES qt_admin_users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      sent_at TEXT,
      expires_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qt_quotations_ref ON qt_quotations(ref_number)`,
    `CREATE INDEX IF NOT EXISTS idx_qt_quotations_status ON qt_quotations(status)`,
    `CREATE INDEX IF NOT EXISTS idx_qt_quotations_created ON qt_quotations(created_at)`,
    // Quotation Line Items
    `CREATE TABLE IF NOT EXISTS qt_lines (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES qt_quotations(id) ON DELETE CASCADE,
      site_type TEXT DEFAULT 'production',
      product_id TEXT REFERENCES qt_products(id),
      product_code TEXT NOT NULL,
      description TEXT,
      qty INTEGER NOT NULL DEFAULT 1,
      appliance_unit_price REAL DEFAULT 0,
      appliance_total REAL DEFAULT 0,
      license_unit_price REAL DEFAULT 0,
      year1_fee REAL DEFAULT 0,
      year2_fee REAL DEFAULT 0,
      year3_fee REAL DEFAULT 0,
      year4_fee REAL DEFAULT 0,
      year5_fee REAL DEFAULT 0,
      line_total REAL DEFAULT 0,
      is_included INTEGER DEFAULT 0,
      notes TEXT,
      sort_order INTEGER DEFAULT 0
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qt_lines_quotation ON qt_lines(quotation_id)`,
    // Exported Files (R2)
    `CREATE TABLE IF NOT EXISTS qt_files (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES qt_quotations(id) ON DELETE CASCADE,
      file_name TEXT NOT NULL,
      r2_key TEXT NOT NULL,
      file_type TEXT DEFAULT 'xlsx' CHECK(file_type IN ('xlsx','pdf')),
      file_size INTEGER,
      version INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    // Audit Log
    `CREATE TABLE IF NOT EXISTS qt_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_qt_audit_entity ON qt_audit_log(entity_type, entity_id)`,
    `CREATE INDEX IF NOT EXISTS idx_qt_audit_user ON qt_audit_log(user_id)`,
    `CREATE INDEX IF NOT EXISTS idx_qt_audit_created ON qt_audit_log(created_at)`,
  ], 'write')

  // Run migrations for any missing columns
  await runQuotationMigrations()
}

async function runQuotationMigrations(): Promise<void> {
  const db = getDB()
  const migrations = [
    `ALTER TABLE qt_quotations ADD COLUMN end_user_name TEXT`,
    `ALTER TABLE qt_quotations ADD COLUMN include_ps INTEGER DEFAULT 0`,
    `ALTER TABLE qt_quotations ADD COLUMN include_annual_service INTEGER DEFAULT 0`,
    `ALTER TABLE qt_quotations ADD COLUMN ps_description TEXT`,
    `ALTER TABLE qt_quotations ADD COLUMN annual_service_description TEXT`,
        `ALTER TABLE qt_lines ADD COLUMN sku TEXT DEFAULT ''`,
  ]
  for (const sql of migrations) {
    try { await db.execute(sql) } catch { /* column already exists */ }
  }
}

export function generateQuotationRef(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `QT-${y}${m}${d}-${rand}`
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

export async function writeQuotationAudit(
  userId: string | null,
  userEmail: string | null,
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  ip?: string
): Promise<void> {
  try {
    const db = getDB()
    await db.execute({
      sql: `INSERT INTO qt_audit_log (user_id, user_email, action, entity_type, entity_id, details, ip_address)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        userId,
        userEmail,
        action,
        entityType,
        entityId,
        details ? JSON.stringify(details) : null,
        ip || null,
      ],
    })
  } catch (e) {
    console.error('Audit log error:', e)
  }
}

// Seed default product catalog (Skyguard product line)
export async function seedDefaultProducts(): Promise<void> {
  const db = getDB()
  const products = [
    // Management Server
    { id: 'prod_ucss_5100', code: 'UCSS-5100', name: 'SkyGuard Management Server 5100', type: 'management', deployment: 'appliance', description: 'Hardware Appliance Management Server', features: JSON.stringify(['Centralized policy management','Real-time monitoring dashboard','Multi-site support','Compliance reporting']) },
    { id: 'prod_ucss_5100_vm', code: 'UCSS-5100-VM', name: 'SkyGuard Management Server 5100 VM', type: 'management', deployment: 'vm', description: 'VM-based Management Server (VM provided by customer)', features: JSON.stringify(['Centralized policy management','Real-time monitoring dashboard','Multi-site support','Compliance reporting','VM deployment']) },
    { id: 'prod_ucss_1100_vm', code: 'UCSS-1100-VM', name: 'SkyGuard Management Server 1100 VM', type: 'management', deployment: 'vm', description: 'VM-based Management Server Entry Level', features: JSON.stringify(['Centralized policy management','Real-time monitoring','Single-site support']) },
    // Web Gateway
    { id: 'prod_ucsg_swgd_5100', code: 'UCSG-SWGD-5100', name: 'SkyGuard Web Gateway + DLP 5100', type: 'web_gateway', deployment: 'appliance', description: 'Hardware Appliance Secure Web Gateway with DLP', features: JSON.stringify(['URL filtering','Web DLP','HTTPS inspection','Application control','Bandwidth management']) },
    { id: 'prod_ucsg_swgd_1100_vm', code: 'UCSG-SWGD-1100-VM', name: 'SkyGuard Web Gateway + DLP 1100 VM', type: 'web_gateway', deployment: 'vm', description: 'VM-based Secure Web Gateway with DLP', features: JSON.stringify(['URL filtering','Web DLP','HTTPS inspection','Application control']) },
    // Email Gateway
    { id: 'prod_ucsg_aseg_5100', code: 'UCSG-ASEG-5100', name: 'SkyGuard Email Gateway + DLP 5100', type: 'email_gateway', deployment: 'appliance', description: 'Hardware Appliance Email Security Gateway with DLP', features: JSON.stringify(['Email DLP','Anti-spam','Anti-phishing','Email encryption','Data loss prevention']) },
    { id: 'prod_ucsg_aseg_1100_vm', code: 'UCSG-ASEG-1100-VM', name: 'SkyGuard Email Gateway + DLP 1100 VM', type: 'email_gateway', deployment: 'vm', description: 'VM-based Email Security Gateway with DLP', features: JSON.stringify(['Email DLP','Anti-spam','Anti-phishing','Email encryption']) },
    // Endpoint Agents
    { id: 'prod_ucsc_win', code: 'UCSC-WIN-SW', name: 'SkyGuard Endpoint DLP Agent - Windows', type: 'endpoint', deployment: 'endpoint', description: 'Windows Endpoint DLP Agent (per seat)', features: JSON.stringify(['File DLP','Print control','USB/removable media control','Screenshot prevention','Clipboard monitoring']) },
    { id: 'prod_ucsc_mac', code: 'UCSC-MAC-SW', name: 'SkyGuard Endpoint DLP Agent - macOS', type: 'endpoint', deployment: 'endpoint', description: 'macOS Endpoint DLP Agent (per seat)', features: JSON.stringify(['File DLP','Print control','USB/removable media control','Screenshot prevention','Clipboard monitoring']) },
    // Services
    { id: 'prod_ps_impl', code: 'PS-IMPL', name: 'Professional Services - Implementation', type: 'service', deployment: 'service', description: 'On-site implementation and configuration service', features: JSON.stringify(['Installation & configuration','Policy setup','User training','Acceptance testing']) },
    { id: 'prod_annual_svc', code: 'ANNUAL-SVC', name: 'Annual On-going Maintenance Service', type: 'service', deployment: 'service', description: 'Annual maintenance and support service', features: JSON.stringify(['5x8 technical support','Software updates','Health check (quarterly)','Incident response']) },
  ]

  for (const p of products) {
    await db.execute({
      sql: `INSERT OR IGNORE INTO qt_products (id, code, name, type, deployment, description, features, is_active, sort_order)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, 0)`,
      args: [p.id, p.code, p.name, p.type, p.deployment, p.description, p.features],
          })
  }
}

      // Seed default pricing for all products
export async function seedDefaultPrices(): Promise<void> {
  const db = getDB()
  // Pricing: [productId, termYears, minQty, applianceUnitPrice, licenseUnitPrice]
  const prices: [string, number, number, number, number][] = [
    // Management Server - UCSS-5100 (Hardware)
    ['prod_ucss_5100', 1, 1, 45000, 18000],
    ['prod_ucss_5100', 3, 1, 45000, 15000],
    ['prod_ucss_5100', 5, 1, 45000, 12000],
    // Management Server - UCSS-5100-VM
    ['prod_ucss_5100_vm', 1, 1, 0, 25000],
    ['prod_ucss_5100_vm', 3, 1, 0, 21000],
    ['prod_ucss_5100_vm', 5, 1, 0, 18000],
    // Management Server - UCSS-1100-VM
    ['prod_ucss_1100_vm', 1, 1, 0, 15000],
    ['prod_ucss_1100_vm', 3, 1, 0, 12000],
    ['prod_ucss_1100_vm', 5, 1, 0, 10000],
    // Web Gateway - UCSG-SWGD-5100 (Hardware)
    ['prod_ucsg_swgd_5100', 1, 1, 85000, 28000],
    ['prod_ucsg_swgd_5100', 3, 1, 85000, 24000],
    ['prod_ucsg_swgd_5100', 5, 1, 85000, 20000],
    ['prod_ucsg_swgd_5100', 1, 500, 85000, 22000],
    ['prod_ucsg_swgd_5100', 3, 500, 85000, 18000],
    // Web Gateway - UCSG-SWGD-1100-VM
    ['prod_ucsg_swgd_1100_vm', 1, 1, 0, 35000],
    ['prod_ucsg_swgd_1100_vm', 3, 1, 0, 30000],
    ['prod_ucsg_swgd_1100_vm', 5, 1, 0, 25000],
    // Email Gateway - UCSG-ASEG-5100 (Hardware)
    ['prod_ucsg_aseg_5100', 1, 1, 75000, 25000],
    ['prod_ucsg_aseg_5100', 3, 1, 75000, 21000],
    ['prod_ucsg_aseg_5100', 5, 1, 75000, 18000],
    // Email Gateway - UCSG-ASEG-1100-VM
    ['prod_ucsg_aseg_1100_vm', 1, 1, 0, 32000],
    ['prod_ucsg_aseg_1100_vm', 3, 1, 0, 27000],
    ['prod_ucsg_aseg_1100_vm', 5, 1, 0, 22000],
    // Endpoint DLP - Windows (per seat)
    ['prod_ucsc_win', 1, 1, 0, 380],
    ['prod_ucsc_win', 3, 1, 0, 320],
    ['prod_ucsc_win', 5, 1, 0, 260],
    ['prod_ucsc_win', 1, 100, 0, 320],
    ['prod_ucsc_win', 3, 100, 0, 270],
    ['prod_ucsc_win', 1, 500, 0, 260],
    ['prod_ucsc_win', 3, 500, 0, 220],
    ['prod_ucsc_win', 1, 1000, 0, 220],
    ['prod_ucsc_win', 3, 1000, 0, 185],
    // Endpoint DLP - macOS (per seat)
    ['prod_ucsc_mac', 1, 1, 0, 420],
    ['prod_ucsc_mac', 3, 1, 0, 350],
    ['prod_ucsc_mac', 5, 1, 0, 290],
    ['prod_ucsc_mac', 1, 100, 0, 350],
    ['prod_ucsc_mac', 3, 100, 0, 295],
    ['prod_ucsc_mac', 1, 500, 0, 290],
    ['prod_ucsc_mac', 3, 500, 0, 240],
    // Professional Services
    ['prod_ps_impl', 1, 1, 0, 45000],
    ['prod_ps_impl', 3, 1, 0, 45000],
    // Annual Maintenance Service
    ['prod_annual_svc', 1, 1, 0, 35000],
    ['prod_annual_svc', 3, 1, 0, 30000],
    ['prod_annual_svc', 5, 1, 0, 25000],
  ]

  for (const [productId, termYears, minQty, appPrice, licPrice] of prices) {
    const id = `price_${productId}_${termYears}y_${minQty}q`
    await db.execute({
      sql: `INSERT OR IGNORE INTO qt_prices (id, product_id, term_years, min_qty, max_qty, appliance_unit_price, license_unit_price, currency) VALUES (?, ?, ?, ?, 999999, ?, ?, 'HKD')`,
      args: [id, productId, termYears, minQty, appPrice, licPrice],
    })
  }
}
