// app/api/v1/threat-intel/backup-alert/route.ts
// Backup failure alert endpoint - sends email via Resend
// Called by GitHub Actions when daily backup fails
// Protected by CRON_SECRET or TI_ADMIN_KEY
// GET: test trigger (sends test alert), POST: production trigger

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  const key = request.nextUrl.searchParams.get('key');
  const adminKey = process.env.TI_ADMIN_KEY;
  if (adminKey && key === adminKey) return true;
  return false;
}

async function sendAlertEmail(runId: string, runUrl: string, errorMessage: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    return { ok: false, error: 'RESEND_API_KEY not configured' };
  }

  const timestamp = new Date().toISOString();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'NextGuard Alert <noreply@next-guard.com>',
      to: ['oscar@next-guard.com'],
      subject: 'Important - TURSO DB Backup Failed',
      html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
        <div style="background:#dc2626;color:white;padding:16px 24px;border-radius:8px 8px 0 0">
          <h2 style="margin:0">⚠️ TURSO DB Backup Failed</h2>
        </div>
        <div style="background:#fef2f2;padding:24px;border:1px solid #fecaca;border-radius:0 0 8px 8px">
          <p style="font-size:16px;color:#991b1b">The daily backup job for NextGuard Threat Intelligence database has <strong>FAILED</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;color:#64748b;width:140px">Run ID</td><td style="padding:8px;font-weight:bold">${runId}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Error</td><td style="padding:8px;color:#dc2626">${errorMessage}</td></tr>
            <tr><td style="padding:8px;color:#64748b">Time (UTC)</td><td style="padding:8px">${timestamp}</td></tr>
          </table>
          <a href="${runUrl}" style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;margin-top:8px">View Failed Run →</a>
          <p style="color:#64748b;font-size:13px;margin-top:20px">Please investigate immediately. The Turso DB is critical infrastructure for NextGuard Threat Intelligence.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:16px">— NextGuard Automated Monitoring</p>
      </div>`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: err };
  }

  return { ok: true, timestamp, to: 'oscar@next-guard.com' };
}

// GET: Test trigger - sends a test alert email
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await sendAlertEmail(
      'TEST-001',
      'https://github.com/NextGuard-hk/nextguard-website/actions',
      '[TEST] This is a test alert to verify email delivery. Please ignore.'
    );

    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to send test email', details: result.error }, { status: 500 });
    }

    return NextResponse.json({ status: 'test_sent', ...result });
  } catch (e: any) {
    return NextResponse.json({ error: 'Test email failed', message: e.message }, { status: 500 });
  }
}

// POST: Production trigger - called by GitHub Actions
export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any = {};
  try {
    body = await request.json();
  } catch {}

  const runUrl = body.run_url || 'N/A';
  const runId = body.run_id || 'N/A';
  const errorMessage = body.error_message || 'Unknown error';

  try {
    const result = await sendAlertEmail(runId, runUrl, errorMessage);

    if (!result.ok) {
      return NextResponse.json({ error: 'Failed to send email', details: result.error }, { status: 500 });
    }

    return NextResponse.json({ status: 'sent', ...result });
  } catch (e: any) {
    return NextResponse.json({ error: 'Email send failed', message: e.message }, { status: 500 });
  }
}
