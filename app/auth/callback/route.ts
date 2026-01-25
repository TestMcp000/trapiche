import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  POST_AUTH_REDIRECT_COOKIE,
  decodeCookiePath,
  sanitizeNextPath,
} from '@/lib/modules/auth/post-auth-redirect';

function decodePossiblyDoubleEncoded(input: string): string {
  let value = input;
  for (let i = 0; i < 2; i++) {
    try {
      const decoded = decodeURIComponent(value);
      if (decoded === value) break;
      value = decoded;
    } catch {
      break;
    }
  }
  return value;
}

function sanitizeAuthErrorDetails(input: string): string {
  const decoded = decodePossiblyDoubleEncoded(input);
  return decoded.replace(/(external code:)\s*.*/i, '$1 <redacted>');
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextParam = sanitizeNextPath(requestUrl.searchParams.get('next')) ?? '/';

  const oauthError = requestUrl.searchParams.get('error');
  const oauthErrorCode = requestUrl.searchParams.get('error_code');
  const oauthErrorDescription = requestUrl.searchParams.get('error_description');
  if (oauthError || oauthErrorCode || oauthErrorDescription) {
    const message = [
      'OAuth sign-in failed.',
      oauthErrorCode ? `Code: ${oauthErrorCode}.` : null,
      oauthErrorDescription
        ? `Details: ${sanitizeAuthErrorDetails(oauthErrorDescription)}`
        : oauthError
          ? `Details: ${oauthError}`
          : null,
    ]
      .filter(Boolean)
      .join(' ');

    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(message)}`, requestUrl.origin)
    );
  }

  if (code) {
    const cookieStore = await cookies();

    const nextCookie = sanitizeNextPath(
      decodeCookiePath(cookieStore.get(POST_AUTH_REDIRECT_COOKIE)?.value)
    );
    const next = nextParam !== '/' ? nextParam : (nextCookie ?? '/');
    
    // Track cookies to be set on the response
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookiesToSet.push({ name, value, options });
            try {
              cookieStore.set({ name, value, ...options });
            } catch {
              // Ignore errors
            }
          },
          remove(name: string, options: CookieOptions) {
            cookiesToSet.push({ name, value: '', options: { ...options, maxAge: 0 } });
            try {
              cookieStore.delete({ name, ...options });
            } catch {
              // Ignore errors
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      
      for (const cookie of cookiesToSet) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }

      response.cookies.set(POST_AUTH_REDIRECT_COOKIE, '', { maxAge: 0, path: '/' });
      
      return response;
    }
    
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
    );
  }

  return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
}


