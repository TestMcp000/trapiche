/**
 * Browser Supabase Client (Client-Side)
 *
 * Client-side Supabase client for use in React client components.
 * Uses @supabase/ssr for cookie-based authentication in the browser.
 *
 * USE CASES:
 * - Client components that need real-time subscriptions
 * - Client-side form submissions with auth
 * - Interactive features requiring user authentication
 * - Auth state management (sign in/out)
 *
 * RESTRICTIONS:
 * - Client components only ('use client' directive required)
 * - Never import server-only modules (admin.ts, anon.ts)
 *
 * @see lib/infrastructure/supabase/server.ts - Server client with cookies (for SSR)
 * @see lib/infrastructure/supabase/anon.ts - Server-only anonymous client (for caching)
 * @see lib/infrastructure/supabase/admin.ts - Service role client (server-only, bypasses RLS)
 */

'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a Supabase client for browser-side operations.
 *
 * @returns SupabaseClient - Browser client with cookie-based auth
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
