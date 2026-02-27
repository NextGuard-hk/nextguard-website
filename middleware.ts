import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    const adminSession = request.cookies.get('admin_session')
    const sessionSecret = process.env.CONTACT_SESSION_SECRET

    if (!sessionSecret) {
      return NextResponse.redirect(new URL('/soc-login', request.url))
    }

    if (!adminSession || adminSession.value !== sessionSecret) {
      return NextResponse.redirect(new URL('/soc-login', request.url))
    }
  }

  // Protect admin API routes
  if (pathname.startsWith('/api/news-feed/admin') || pathname.startsWith('/api/logs') || pathname.startsWith('/api/syslog-analysis')) {
    const adminToken = request.cookies.get('contact_admin_token') || request.cookies.get('admin_session')
    const sessionSecret = process.env.CONTACT_SESSION_SECRET

    if (!sessionSecret || !adminToken || adminToken.value !== sessionSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next()
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

  return response
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/news-feed/admin/:path*',
    '/api/logs/:path*',
    '/api/syslog-analysis/:path*',
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
