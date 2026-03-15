// app/api/qt-users/route.ts
// Admin endpoint to create / list quotation system users
// Protected: requires QUOTATION_SETUP_SECRET env var as Bearer token
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { hashQtPassword, generateTotpSecret, getTotpUri } from '@/lib/quotation-auth';
import { initQuotationDB } from '@/lib/quotation-db';

function checkSetupAuth(req: NextRequest) {
  const secret = process.env.QUOTATION_SETUP_SECRET;
  if (!secret) return false;
  const auth = req.headers.get('authorization') || '';
  return auth === `Bearer ${secret}`;
}

// GET /api/qt-users - list users
export async function GET(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  await initQuotationDB();
  const users = await db.execute('SELECT id, email, name, role, is_active, totp_enabled, last_login, created_at FROM qt_admin_users ORDER BY created_at DESC');
  return NextResponse.json({ users: users.rows });
}

// POST /api/qt-users - create user
export async function POST(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  await initQuotationDB();
  const body = await req.json();
  const { email, password, name, role = 'sales' } = body;
  if (!email || !password || !name) return NextResponse.json({ error: 'email, password and name required' }, { status: 400 });

  const existing = await db.execute({ sql: 'SELECT id FROM qt_admin_users WHERE email = ?', args: [email.toLowerCase()] });
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

  const passwordHash = await hashQtPassword(password);
  const totpSecret = generateTotpSecret();
  const id = 'usr_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  await db.execute({
    sql: `INSERT INTO qt_admin_users (id, email, password_hash, name, role, totp_secret, totp_enabled, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    args: [id, email.toLowerCase().trim(), passwordHash, name, role, totpSecret],
  });

  const totpUri = getTotpUri(totpSecret, email);

  return NextResponse.json({
    success: true,
    user: { id, email, name, role },
    totp: {
      secret: totpSecret,
      uri: totpUri,
      instructions: 'Add this secret to Google Authenticator or Authy. The URI can be converted to a QR code at https://www.qr-code-generator.com/',
    },
  }, { status: 201 });
}

// PATCH /api/qt-users - update user (deactivate/reactivate)
export async function PATCH(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  const body = await req.json();
  const { email, is_active } = body;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  await db.execute({ sql: `UPDATE qt_admin_users SET is_active = ?, updated_at = datetime('now') WHERE email = ?`, args: [is_active ? 1 : 0, email.toLowerCase()] });
  return NextResponse.json({ success: true });
}

// DELETE /api/qt-users - delete user by email
export async function DELETE(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  const body = await req.json();
  const { email } = body;
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  await db.execute({ sql: 'DELETE FROM qt_admin_users WHERE email = ?', args: [email.toLowerCase()] });
  return NextResponse.json({ success: true });
}
