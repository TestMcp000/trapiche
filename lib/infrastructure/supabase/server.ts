/**
 * Authenticated Server Supabase Client (Cookie-Based)
 *
 * Server-side client that uses cookies for user authentication.
 * Respects Row Level Security (RLS) policies based on the authenticated user.
 *
 * USE CASES:
 * - Server components that need authenticated user data
 * - Server actions (form mutations with user context)
 * - API routes that need user authentication
 * - Admin pages with RLS-based access control
 *
 * RESTRICTIONS:
 * - Cannot be used in unstable_cache (depends on request context)
 * - Must be awaited (async function)
 *
 * @see lib/infrastructure/supabase/client.ts - Browser client with cookies/auth
 * @see lib/infrastructure/supabase/anon.ts - Server-only anonymous client (for caching)
 * @see lib/infrastructure/supabase/admin.ts - Service role client (bypasses RLS)
 */

import 'server-only';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Create an authenticated Supabase client for server-side operations.
 * Uses cookies to maintain user session.
 *
 * @returns Promise<SupabaseClient> - Authenticated server client
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        async get(name: string) {
          const cookie = cookieStore.get(name);
          return cookie?.value;
        },
        async set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookies in server components
          }
        },
        async remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Handle cookies in server components
          }
        },
      },
    }
  );
}
