import { NextRequest, NextResponse } from 'next/server';

// Simple TOTP-like: generate a 6-digit code from secret + time window
function generateTOTP(secret: string): string {
  const timeStep = Math.floor(Date.now() / 30000); // 30-second window
  let hash = 0;
  const str = secret + timeStep.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash % 1000000).toString().padStart(6, '0');
}

function verifyTOTP(secret: string, code: string): boolean {
  // Check current and previous time window (allows 60s tolerance)
  const current = generateTOTP(secret);
  const timeStep = Math.floor(Date.now() / 30000) - 1;
  let hash = 0;
  const str = secret + timeStep.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  const previous = Math.abs(hash % 1000000).toString().padStart(6, '0');
  return code === current || code === previous;
}

// Rate limiting map (in-memory, resets on deploy)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  if (!attempts) return false;
  // Reset after 15 minutes
  if (now - attempts.lastAttempt > 15 * 60 * 1000) {
    loginAttempts.delete(ip);
    return false;
  }
  return attempts.count >= 5; // Max 5 attempts per 15 min
}

function recordAttempt(ip: string) {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  if (attempts) {
    attempts.count++;
    attempts.lastAttempt = now;
  } else {
    loginAttempts.set(ip, { count: 1, lastAttempt: now });
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  if (isRateLimited(ip)) {
    return NextResponse.json(
      { status: 'error', message: 'Too many attempts. Try again in 15 minutes.' },
      { status: 429 }
    );
  }

  try {
    const { password, totpCode } = await request.json();

    const adminPassword = process.env.CONTACT_ADMIN_PASSWORD;
    const totpSecret = process.env.CONTACT_TOTP_SECRET;
    const sessionSecret = process.env.CONTACT_SESSION_SECRET;

    if (!adminPassword || !totpSecret || !sessionSecret) {
      return NextResponse.json(
        { status: 'error', message: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify password
    if (password !== adminPassword) {
      recordAttempt(ip);
      return NextResponse.json(
        { status: 'error', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify TOTP code
    if (!verifyTOTP(totpSecret, totpCode)) {
      recordAttempt(ip);
      return NextResponse.json(
        { status: 'error', message: 'Invalid 2FA code' },
        { status: 401 }
      );
    }

    // Generate session token (valid for 2 hours)
    const response = NextResponse.json({
      status: 'success',
      token: sessionSecret,
    });

    response.cookies.set('contact_admin_token', sessionSecret, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 2 * 60 * 60, // 2 hours
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// GET endpoint to check auth status
export async function GET(request: NextRequest) {
  const sessionSecret = process.env.CONTACT_SESSION_SECRET;
  const cookieToken = request.cookies.get('contact_admin_token')?.value;

  if (cookieToken && cookieToken === sessionSecret) {
    return NextResponse.json({ status: 'authenticated' });
  }

  return NextResponse.json(
    { status: 'unauthenticated' },
    { status: 401 }
  );
}

// DELETE endpoint for logout
export async function DELETE() {
  const response = NextResponse.json({ status: 'logged_out' });
  response.cookies.delete('contact_admin_token');
  return response;
}
