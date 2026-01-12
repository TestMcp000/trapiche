/**
 * lib/infrastructure/supabase/index.ts
 *
 * Central export point for Supabase client factories.
 *
 * Note: Each client file exports a factory with a specific purpose:
 * - client.ts - Browser client for 'use client' components
 * - server.ts - Server client with cookie-based auth for SSR
 * - anon.ts   - Anonymous client for cached public reads
 * - admin.ts  - Service role client that bypasses RLS
 * - middleware.ts - Middleware session refresh helper
 *
 * @see ARCHITECTURE.md §3.4.1
 */

// Re-export all supabase clients
export { createClient as createBrowserClient } from './client';
export { createClient as createServerClient } from './server';
export { createAnonClient } from './anon';
export { createAdminClient } from './admin';
export { updateSession } from './middleware';
