/**
 * Cache Version IO Module
 *
 * Server-only module for global cache version management.
 * Uses service role client to read/update system_settings.
 */

import 'server-only';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';

/**
 * Check if we're in a build/prerender context where service role may not work.
 * During `next build`, NEXT_PHASE is set to 'phase-production-build'.
 */
function isBuildContext(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build';
}

/**
 * Get the current global cache version from system_settings.
 * During build time or on failure, returns default value to avoid blocking static generation.
 */
export async function getGlobalCacheVersion(): Promise<number> {
  // During build, skip database check and return default version
  // This avoids RLS permission issues during static generation
  if (isBuildContext()) {
    return 1;
  }

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from('system_settings')
      .select('cache_version')
      .eq('id', 1)
      .single();

    if (error || !data) {
      console.warn('[getGlobalCacheVersion] Failed to read cache version, using default:', error?.message ?? 'row not found');
      return 1;
    }

    return data.cache_version;
  } catch (error) {
    console.warn('[getGlobalCacheVersion] Error reading cache version, using default:', error);
    return 1;
  }
}

/**
 * Increment the global cache version and return the new value.
 * This effectively invalidates all cached queries using cachedQuery().
 */
export async function incrementGlobalCacheVersion(): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .rpc('increment_cache_version')
    .single();

  // Fallback to manual update if RPC doesn't exist
  if (error && error.message.includes('function')) {
    // Manual increment
    const { data: current } = await supabase
      .from('system_settings')
      .select('cache_version')
      .eq('id', 1)
      .single();

    const newVersion = (current?.cache_version ?? 1) + 1;

    const { error: updateError } = await supabase
      .from('system_settings')
      .update({
        cache_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (updateError) {
      throw new Error('Failed to increment cache version: ' + updateError.message);
    }

    return newVersion;
  }

  if (error) {
    throw new Error('Failed to increment cache version: ' + error.message);
  }

  return (data as { cache_version: number })?.cache_version ?? 1;
}
