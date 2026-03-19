// app/api/qt-backup/route.ts
// Quotation System Backup API v1.1
// Default: integrity check + row counts for all QT tables
// Paginated export: ?table=qt_quotations&page=1&limit=100
// Protected by CRON_SECRET, TI_ADMIN_KEY, or QT session auth
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { initQuotationDB } from '@/lib/quotation-db';
import { authenticateQtRequest } from '@/lib/quotation-auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Check API key auth (for cron/GitHub Actions)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = request.nextUrl.searchParams.get('key');
  const adminKey = process.env.TI_ADMIN_KEY;
  if (adminKey && key === adminKey) return true;
  if (!cronSecret && !adminKey) return true;
  // Check QT session auth (for monitoring page)
  const auth = authenticateQtRequest(request);
  if (auth) return true;
  return false;
}

const QT_TABLES = [
  'qt_admin_users',
  'qt_products',
  'qt_prices',
  'qt_quotations',
  'qt_lines',
  'qt_files',
  'qt_audit_log',
];

const QT_TABLE_COLUMNS: Record<string, string> = {
  qt_admin_users: 'id, email, name, role, totp_enabled, is_active, last_login, login_attempts, locked_until, created_at, updated_at',
  qt_products: 'id, code, name, type, deployment, description, features, is_active, sort_order, created_at, updated_at',
  qt_prices: 'id, product_id, term_years, min_qty, max_qty, appliance_unit_price, license_unit_price, currency, is_active, created_at, updated_at',
  qt_quotations: 'id, ref_number, customer_name, partner_name, end_user_name, project_name, customer_type, term_years, payment_model, currency, status, include_ps, include_annual_service, ps_description, annual_service_description, appliance_total, license_total, service_total, grand_total, discount_percent, discount_amount, final_price, remarks, validity_days, lead_time, delivery_location, version, created_by, created_at, updated_at, sent_at, expires_at',
  qt_lines: 'id, quotation_id, site_type, product_id, product_code, description, qty, appliance_unit_price, appliance_total, license_unit_price, year1_fee, year2_fee, year3_fee, year4_fee, year5_fee, line_total, is_included, notes, sort_order',
  qt_files: 'id, quotation_id, file_name, r2_key, file_type, file_size, version, created_by, created_at',
  qt_audit_log: 'id, user_id, user_email, action, entity_type, entity_id, details, ip_address, created_at',
};

export async function GET(request: NextRequest) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  const db = getDB();
  await initQuotationDB();

  const table = request.nextUrl.searchParams.get('table');
  const page = parseInt(request.nextUrl.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '500'), 2000);
  const offset = (page - 1) * limit;

  try {
    // Single table export mode
    if (table) {
      if (!QT_TABLES.includes(table)) {
        return NextResponse.json({ error: `Invalid table. Use: ${QT_TABLES.join(', ')}` }, { status: 400 });
      }

      const countResult = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM ${table}`, args: [] });
      const totalRows = Number(countResult.rows[0]?.cnt ?? 0);
      const totalPages = Math.ceil(totalRows / limit);

      const columns = QT_TABLE_COLUMNS[table] || '*';
      const rows = await db.execute({
        sql: `SELECT ${columns} FROM ${table} LIMIT ? OFFSET ?`,
        args: [limit, offset],
      });

      return NextResponse.json({
        version: '1.1',
        system: 'quotation',
        export: {
          table,
          page,
          limit,
          total_rows: totalRows,
          total_pages: totalPages,
          rows_in_page: rows.rows.length,
          has_more: page < totalPages,
        },
        rows: rows.rows,
        duration_ms: Date.now() - startTime,
      });
    }

    // Default: integrity check for all QT tables
    const errors: string[] = [];
    const counts: Record<string, number> = {};
    const checks: string[] = [];

    for (const t of QT_TABLES) {
      try {
        const result = await db.execute({ sql: `SELECT COUNT(*) as cnt FROM ${t}`, args: [] });
        const count = Number(result.rows[0]?.cnt ?? 0);
        counts[t] = count;
        checks.push(`${t}: ${count} rows`);
        if ((t === 'qt_products' || t === 'qt_admin_users') && count === 0) {
          errors.push(`${t} is empty (critical)`);
        }
      } catch (e: any) {
        counts[t] = -1;
        errors.push(`${t}: ${e.message}`);
      }
    }

    // Sample read test
    try {
      const sample = await db.execute({ sql: 'SELECT id, ref_number FROM qt_quotations ORDER BY created_at DESC LIMIT 1', args: [] });
      if (sample.rows.length > 0) {
        checks.push(`latest quotation: ${sample.rows[0].ref_number}`);
      } else {
        checks.push('no quotations yet');
      }
    } catch (e: any) {
      errors.push(`sample read failed: ${e.message}`);
    }

    // Record backup event in audit log
    try {
      await db.execute({
        sql: `INSERT INTO qt_audit_log (user_id, user_email, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`,
        args: ['system', 'backup@system', 'backup_check', 'system', 'backup', JSON.stringify({ counts, errors_count: errors.length })],
      });
    } catch { /* audit log write is best-effort */ }

    return NextResponse.json({
      version: '1.1',
      system: 'quotation',
      timestamp: new Date().toISOString(),
      duration_ms: Date.now() - startTime,
      integrity: {
        status: errors.length === 0 ? 'healthy' : 'degraded',
        checks,
        errors,
      },
      data: { counts },
    });
  } catch (e: any) {
    return NextResponse.json({
      error: 'QT Backup failed',
      message: e.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
