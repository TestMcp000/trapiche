/**
 * Theme Cached Reads
 *
 * SSR cached reads for theme configuration.
 * Uses cachedQuery wrapper for efficient server-side rendering with
 * automatic cache invalidation via revalidateTag('site-config').
 *
 * @module lib/modules/theme/cached
 * @see ARCHITECTURE.md section 6 (Cache & Revalidation)
 */

import 'server-only';
import { cachedQuery } from '@/lib/cache/wrapper';
import type { SiteConfigRow } from '@/lib/types/theme';
import { getSiteConfig } from './io';

const CACHE_REVALIDATE_SECONDS = 60;

/**
 * Cached site configuration read.
 *
 * Wraps getSiteConfig() with Next.js unstable_cache for efficient SSR.
 * Cache is invalidated via revalidateTag('site-config') when admin updates settings.
 *
 * @returns Site configuration row or null if not found/error
 */
export const getSiteConfigCached = cachedQuery(
  async (): Promise<SiteConfigRow | null> => {
    try {
      return await getSiteConfig();
    } catch (error) {
      console.error('[getSiteConfigCached] Error:', error);
      return null;
    }
  },
  ['site-config'],
  ['site-config'],
  CACHE_REVALIDATE_SECONDS
);
