import { NextRequest, NextResponse } from 'next/server';

function generateTOTP(secret: string): string {
  const timeStep = Math.floor(Date.now() / 30000);
  let hash = 0;
  const str = secret + timeStep.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

async function sendCodeEmail(to: string, code: string): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'NextGuard Admin <noreply@next-guard.com>',
        to: [to],
        subject: 'Your NextGuard Admin Verification Code',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#0f172a">NextGuard Admin Verification</h2>
          <p>Your verification code is:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;padding:16px;background:#f1f5f9;border-radius:8px;margin:16px 0">${code}</div>
          <p style="color:#64748b;font-size:14px">This code expires in 30 seconds. Do not share it with anyone.</p>
        </div>`,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// GET endpoint: generates TOTP code and sends it via email
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password');
  const adminPassword = process.env.CONTACT_ADMIN_PASSWORD;
  const totpSecret = process.env.CONTACT_TOTP_SECRET;
  const adminEmail = process.env.ADMIN_EMAIL;

  if (!adminPassword || !totpSecret || !adminEmail) {
    return NextResponse.json(
      { status: 'error', message: 'Server configuration error' },
      { status: 500 }
    );
  }

  if (authHeader !== adminPassword) {
    return NextResponse.json(
      { status: 'error', message: 'Unauthorized' },
      { status: 401 }
    );
  }

  const code = generateTOTP(totpSecret);
  const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

  const emailSent = await sendCodeEmail(adminEmail, code);

  if (!emailSent) {
    return NextResponse.json(
      { status: 'error', message: 'Failed to send verification email' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: 'success',
    message: 'Verification code sent to admin email',
    expiresIn: secondsRemaining,
  });
}
