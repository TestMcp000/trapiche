import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './lib/i18n/routing';
import { updateSession } from './lib/infrastructure/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';

const intlMiddleware = createIntlMiddleware(routing);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip HTTPS redirect for localhost and health checks
  const host = request.headers.get('host') || '';
  const isLocalhost = host.includes('localhost') || host.includes('127.0.0.1');
  const isHealthCheck = pathname === '/api/health' || pathname === '/_health';
  
  // HTTPS redirect for production (non-localhost) environments
  const proto = request.headers.get('x-forwarded-proto');
  if (proto === 'http' && !isLocalhost && !isHealthCheck) {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = 'https:';
    return NextResponse.redirect(httpsUrl.toString(), 301);
  }

  // Fallback: If Supabase OAuth returns to Site URL (e.g. /zh?code=...),
  // redirect to our dedicated callback handler so the session can be exchanged.
  const code = request.nextUrl.searchParams.get('code');
  const isAuthCallback = pathname === '/auth/callback' || pathname === '/auth/callback/';
  if (code && !isAuthCallback) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = '/auth/callback';
    return NextResponse.redirect(callbackUrl);
  }
  
  // Skip i18n middleware for auth and api routes (including locale-prefixed auth routes)
  if (
    pathname.startsWith('/auth') || 
    pathname.startsWith('/api') ||
    pathname.match(/^\/(zh|en)\/auth/)
  ) {
    return await updateSession(request);
  }

  
  // Update Supabase session
  const response = await updateSession(request);
  
  // Apply i18n middleware
  const intlResponse = intlMiddleware(request);
  
  // Merge cookies from Supabase session update
  if (response.cookies) {
    response.cookies.getAll().forEach((cookie) => {
      intlResponse.cookies.set(cookie.name, cookie.value);
    });
  }
  
  return intlResponse;
}

export const config = {
  matcher: ['/', '/(zh|en)/:path*', '/((?!_next|_vercel|api|.*\\..*).*)'],
};
