/**
 * Service Role Supabase Client (Bypasses RLS)
 *
 * CRITICAL: This client uses the service role key and bypasses all Row Level Security policies.
 *
 * USE CASES:
 * - Webhook handlers that need to write regardless of auth state
 * - Server-side merging of anonymous reactions with public data
 * - System operations like cache version updates
 * - Gallery likedByMe aggregation (lib/modules/gallery/liked-by-me-io.ts)
 *
 * RESTRICTIONS:
 * - MUST be server-only (never import in client components)
 * - MUST validate all inputs before writing
 * - MUST log sensitive operations for audit trail
 * - Architecture tests enforce this boundary
 *
 * NAMING NOTE: "admin" refers to service role, not admin users.
 * For admin user operations, use lib/infrastructure/supabase/server.ts with RLS.
 *
 * @see lib/infrastructure/supabase/server.ts - Authenticated server client (with cookies/RLS)
 * @see lib/infrastructure/supabase/anon.ts - Anonymous public reads (server-only)
 * @see lib/infrastructure/supabase/client.ts - Browser client
 */

import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client with service role privileges.
 * This client bypasses Row Level Security (RLS) policies.
 *
 * @returns Supabase client with service role key
 * @throws Error if environment variables are missing
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
