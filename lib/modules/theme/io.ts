/**
 * Theme IO Module - Public Reads
 *
 * Server-side IO for reading theme configuration from site_config table.
 * Uses anonymous Supabase client for public reads (no cookies, RLS-aware).
 *
 * @module lib/modules/theme/io
 * @see ARCHITECTURE.md section 5 (Supabase Client Selection)
 */

import 'server-only';
import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { SiteConfigRow } from '@/lib/types/theme';

/**
 * Get site configuration for theme settings.
 *
 * Uses singleton pattern: site_config table has only one row with id=1.
 * Returns null on any error (table missing, RLS denial, etc.) to ensure
 * public SSR doesn't crash if DB is not yet set up.
 *
 * @returns Site configuration row or null if not found/error
 */
export async function getSiteConfig(): Promise<SiteConfigRow | null> {
  try {
    const supabase = createAnonClient();

    const { data, error } = await supabase
      .from('site_config')
      .select('*')
      .eq('id', 1)
      .limit(1)
      .maybeSingle();

    if (error) {
      // PGRST106: Table does not exist (migration not applied)
      // Other errors: RLS denial, network issues, etc.
      console.warn('[getSiteConfig] Error reading site_config:', error.message);
      return null;
    }

    return data as SiteConfigRow;
  } catch (error) {
    console.warn('[getSiteConfig] Unexpected error:', error);
    return null;
  }
}
