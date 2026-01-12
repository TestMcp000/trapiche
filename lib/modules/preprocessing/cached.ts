/**
 * Preprocessing Config Cached Reads
 *
 * SSR cached reads for preprocessing configuration.
 * Uses cachedQuery wrapper for efficient server-side rendering with
 * automatic cache invalidation via revalidateTag('preprocessing-config').
 *
 * @module lib/modules/preprocessing/cached
 * @see ARCHITECTURE.md section 6 (Cache & Revalidation)
 * @see doc/archive/2025-12-31-admin-performance-archive.md (Server-side Caching)
 */

import 'server-only';
import { cachedQuery } from '@/lib/cache/wrapper';
import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import { validatePreprocessingConfig } from '@/lib/validators/preprocessing-config';
import type { PreprocessingConfigResult } from './config-io';

const CACHE_REVALIDATE_SECONDS = 30;

/**
 * Cached preprocessing configuration read.
 *
 * Wraps DB query with Next.js unstable_cache for efficient SSR.
 * Cache is invalidated via revalidateTag('preprocessing-config') when admin updates settings.
 *
 * @returns Preprocessing configuration result with validated config or fallback to empty
 */
export const getPreprocessingConfigCached = cachedQuery(
  async (): Promise<PreprocessingConfigResult> => {
    try {
      const supabase = createAnonClient();

      const { data, error } = await supabase
        .from('site_config')
        .select('preprocessing_config')
        .eq('id', 1)
        .single();

      if (error) {
        console.error('[getPreprocessingConfigCached] DB error:', error);
        return { success: false, error: error.message };
      }

      if (!data) {
        return { success: true, config: {} };
      }

      // Validate the config
      const validation = validatePreprocessingConfig(data.preprocessing_config);

      if (!validation.success) {
        console.warn('[getPreprocessingConfigCached] Invalid config in DB:', validation.error);
        // Return empty config on validation failure (fallback to defaults)
        return { success: true, config: {} };
      }

      return { success: true, config: validation.data };
    } catch (error) {
      console.error('[getPreprocessingConfigCached] Unexpected error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
  ['preprocessing-config'],
  ['preprocessing-config', 'site-config'],
  CACHE_REVALIDATE_SECONDS
);
