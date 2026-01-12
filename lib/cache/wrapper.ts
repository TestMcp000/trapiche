/**
 * Cache Query Wrapper
 *
 * Server-only wrapper for Next.js unstable_cache that incorporates
 * global cache versioning for system-wide cache invalidation.
 */

import 'server-only';
import { unstable_cache } from 'next/cache';
import { getGlobalCacheVersion } from '@/lib/system/cache-io';

/**
 * Get cache version with fallback for build time.
 * During static generation, the service role client may not be available.
 */
async function getCacheVersionSafe(): Promise<number> {
  try {
    return await getGlobalCacheVersion();
  } catch (error) {
    // During build/static generation, fallback to version 1
    console.warn('[cachedQuery] Failed to get cache version, using default:', error);
    return 1;
  }
}

/**
 * Wrap a fetcher function with Next.js unstable_cache, incorporating
 * global cache versioning for system-wide invalidation.
 *
 * @param fetcher - Async function that fetches data
 * @param keys - Cache keys (version will be prepended automatically)
 * @param tags - Cache tags ('global-system' will be added automatically)
 * @param revalidateSeconds - Revalidation interval in seconds
 * @returns Wrapped function with caching
 */
export function cachedQuery<TArgs extends unknown[], TResult>(
  fetcher: (...args: TArgs) => Promise<TResult>,
  keys: string[],
  tags: string[],
  revalidateSeconds: number
): (...args: TArgs) => Promise<TResult> {
  // Return a function that wraps the fetcher with version-aware caching
  return async (...args: TArgs): Promise<TResult> => {
    // Get current cache version (with fallback for build time)
    const version = await getCacheVersionSafe();

    // Build versioned keys
    const versionedKeys = [`v${version}`, ...keys];

    // Ensure 'global-system' tag is included (dedupe)
    const allTags = tags.includes('global-system')
      ? tags
      : ['global-system', ...tags];

    // Create the cached version of the fetcher
    const cachedFetcher = unstable_cache(
      async (...args: TArgs) => fetcher(...args),
      versionedKeys,
      {
        revalidate: revalidateSeconds,
        tags: allTags,
      }
    );

    return cachedFetcher(...args);
  };
}
