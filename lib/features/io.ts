/**
 * Feature Settings IO - Public Reads
 *
 * Provides public access to feature visibility settings.
 * Uses anon client (no cookies) for cacheable reads.
 *
 * Features: blog, gallery, shop (all disabled by default)
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { FeatureKey, FeatureSetting } from '@/lib/types/features';

/**
 * Check if a specific feature is enabled
 * Uses RPC for efficient single-value check
 */
export async function isFeatureEnabled(key: FeatureKey): Promise<boolean> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase.rpc('is_feature_enabled', {
      p_feature_key: key,
    });

    if (error) {
      // PGRST202: Function not found - migration not applied yet
      if (error.code === 'PGRST202') {
        console.warn(`is_feature_enabled function not found - ${key} disabled`);
        return false;
      }
      console.error(`Error checking ${key} feature:`, error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error(`Error checking ${key} enabled status:`, error);
    return false;
  }
}

/**
 * Get all feature settings
 * Used by admin UI and Header/Footer components
 */
export async function getAllFeatureSettings(): Promise<FeatureSetting[]> {
  try {
    const supabase = createAnonClient();
    const { data, error } = await supabase
      .from('feature_settings')
      .select('*')
      .order('display_order');

    if (error) {
      console.error('Error fetching feature settings:', error);
      return [];
    }

    return (data ?? []) as FeatureSetting[];
  } catch (error) {
    console.error('Error fetching feature settings:', error);
    return [];
  }
}

// Convenience functions for specific features
export const isBlogEnabled = () => isFeatureEnabled('blog');
export const isGalleryEnabled = () => isFeatureEnabled('gallery');
export const isShopEnabled = () => isFeatureEnabled('shop');

