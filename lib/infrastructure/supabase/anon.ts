/**
 * Anonymous Supabase Client (Server-Only, Public Access)
 *
 * CRITICAL: This is a server-only anonymous client for public data reads.
 *
 * USE CASES:
 * - SSR cached reads in lib/*-cached.ts modules (unstable_cache compatible)
 * - Public data fetching without user cookies
 * - Sitemap generation
 * - Shop visibility checks (is_shop_visible RPC)
 *
 * RESTRICTIONS:
 * - Server-only (uses anon key, no cookies)
 * - Read-only public data (respects RLS for public access)
 * - Never use for authenticated operations
 * - Never use for admin writes (use server.ts or admin.ts instead)
 *
 * WHY THIS EXISTS:
 * - unstable_cache cannot use cookie-based clients (no request context)
 * - Provides consistent public reads across SSR and caching layers
 *
 * @see lib/infrastructure/supabase/client.ts - Browser client with cookies/auth
 * @see lib/infrastructure/supabase/server.ts - Server client with user cookies/auth
 * @see lib/infrastructure/supabase/admin.ts - Service role client (bypasses RLS entirely)
 */

import 'server-only';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Check if required environment variables are available.
 * During static generation, these might not be set.
 */
function hasRequiredEnvVars(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

// Cache the client instance to avoid recreating on every call
let cachedClient: SupabaseClient | null = null;

/**
 * Create a Supabase client with anonymous (anon) key for public reads.
 * This client respects Row Level Security (RLS) policies.
 *
 * Safe for use with Next.js unstable_cache since it doesn't depend on request context.
 *
 * @returns Supabase client with anon key
 * @throws Error if environment variables are missing (except during build)
 */
export function createAnonClient(): SupabaseClient {
  // Return cached client if available
  if (cachedClient) {
    return cachedClient;
  }

  // Check for required environment variables
  if (!hasRequiredEnvVars()) {
    // During build/prerender, throw a specific error that can be caught
    throw new Error('[createAnonClient] Missing required Supabase environment variables');
  }

  cachedClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return cachedClient;
}
