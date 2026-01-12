/**
 * Feature Settings Admin IO
 *
 * Owner-only operations for toggling feature visibility.
 * Uses cookie-based server client with RLS enforcement.
 */

'use server';

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import { revalidateTag, revalidatePath } from 'next/cache';
import type { FeatureKey, FeatureSetting } from '@/lib/types/features';

/**
 * Get all feature settings (admin view)
 * Returns all features regardless of enabled status
 */
export async function getAllFeatureSettingsAdmin(): Promise<FeatureSetting[]> {
  const supabase = await createClient();

  // Check owner permission
  const ownerCheck = await isOwner(supabase);
  if (!ownerCheck) {
    console.warn('Non-owner attempted to access feature settings admin');
    return [];
  }

  const { data, error } = await supabase
    .from('feature_settings')
    .select('*')
    .order('display_order');

  if (error) {
    console.error('Error fetching feature settings (admin):', error);
    return [];
  }

  return (data ?? []) as FeatureSetting[];
}

/**
 * Toggle a feature on/off
 * Owner-only - RLS enforces this at database level
 */
export async function setFeatureEnabled(
  key: FeatureKey,
  enabled: boolean
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Check owner permission
  const ownerCheck = await isOwner(supabase);
  if (!ownerCheck) {
    return { success: false, error: 'Only owner can toggle features' };
  }

  const { error } = await supabase
    .from('feature_settings')
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('feature_key', key);

  if (error) {
    console.error(`Error toggling ${key} feature:`, error);
    return { success: false, error: error.message };
  }

  // Revalidate caches
  revalidateTag('features', { expire: 0 });
  revalidateTag('site-content', { expire: 0 });
  revalidateTag('gallery', { expire: 0 });
  revalidateTag('shop', { expire: 0 });
  revalidatePath('/en', 'page');
  revalidatePath('/zh', 'page');
  revalidatePath(`/en/${key}`, 'page');
  revalidatePath(`/zh/${key}`, 'page');
  revalidatePath('/sitemap.xml', 'page');

  return { success: true };
}
