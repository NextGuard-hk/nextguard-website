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

// GET endpoint: returns current TOTP code (protected by admin password in header)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-password');
  const adminPassword = process.env.CONTACT_ADMIN_PASSWORD;
  const totpSecret = process.env.CONTACT_TOTP_SECRET;

  if (!adminPassword || !totpSecret) {
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
  const timeStep = Math.floor(Date.now() / 30000);
  const secondsRemaining = 30 - (Math.floor(Date.now() / 1000) % 30);

  return NextResponse.json({
    status: 'success',
    code,
    expiresIn: secondsRemaining,
    timeStep,
  });
}
