// middleware.ts
// Protects /quotation-admin routes - requires valid qt_session cookie with mfaVerified
import { NextRequest, NextResponse } from 'next/server'

const QT_JWT_SECRET = process.env.QT_JWT_SECRET || process.env.JWT_SECRET || 'qt-nextguard-secret-2026'

function base64urlDecode(str: string): string {
  const padded = str + '=='.slice(0, (4 - str.length % 4) % 4)
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

function verifyQtToken(token: string): { mfaVerified: boolean; exp: number } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = btoa(QT_JWT_SECRET + '.qt.' + header + '.' + body)
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
    if (sig !== expectedSig) return null
    const payload = JSON.parse(base64urlDecode(body))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Protect /quotation-admin routes
  if (pathname.startsWith('/quotation-admin')) {
    const token = req.cookies.get('qt_session')?.value
    if (!token) {
      return NextResponse.redirect(new URL('/quotation-login', req.url))
    }
    const payload = verifyQtToken(token)
    if (!payload || !payload.mfaVerified) {
      const response = NextResponse.redirect(new URL('/quotation-login', req.url))
      response.cookies.delete('qt_session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/quotation-admin/:path*'],
}
