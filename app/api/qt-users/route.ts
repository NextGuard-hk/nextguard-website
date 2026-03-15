// app/api/qt-users/route.ts
// Admin endpoint to create / list quotation system users
// Protected: requires QUOTATION_SETUP_SECRET env var as Bearer token
import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { hashPassword, generateTotpSecret } from '@/lib/quotation-auth';
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
  const users = await db.execute('SELECT id, username, email, is_active, totp_enabled, created_at FROM qt_users ORDER BY created_at DESC');
  return NextResponse.json({ users: users.rows });
}

// POST /api/qt-users - create user
export async function POST(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  await initQuotationDB();
  const body = await req.json();
  const { username, password, email } = body;
  if (!username || !password) return NextResponse.json({ error: 'username and password required' }, { status: 400 });

  const existing = await db.execute({ sql: 'SELECT id FROM qt_users WHERE username = ?', args: [username] });
  if (existing.rows.length > 0) return NextResponse.json({ error: 'Username already exists' }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const totpSecret = generateTotpSecret();
  const id = crypto.randomUUID();

  await db.execute({
    sql: 'INSERT INTO qt_users (id, username, password_hash, email, totp_secret, totp_enabled, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 1, datetime("now"), datetime("now"))',
    args: [id, username, passwordHash, email || null, totpSecret],
  });

  // Return the TOTP secret so it can be added to authenticator app
  const totpUri = `otpauth://totp/NextGuard:${username}?secret=${totpSecret}&issuer=NextGuard`;

  return NextResponse.json({
    success: true,
    user: { id, username, email },
    totp: {
      secret: totpSecret,
      uri: totpUri,
      instructions: 'Scan the URI in Google Authenticator or Authy to enable 2FA.',
    },
  }, { status: 201 });
}

// DELETE /api/qt-users - delete user by username
export async function DELETE(req: NextRequest) {
  if (!checkSetupAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getDB();
  const body = await req.json();
  const { username } = body;
  if (!username) return NextResponse.json({ error: 'username required' }, { status: 400 });
  await db.execute({ sql: 'DELETE FROM qt_users WHERE username = ?', args: [username] });
  return NextResponse.json({ success: true });
}
