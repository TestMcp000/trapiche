/**
 * Feature Settings Cached Reads
 *
 * SSR cached reads for feature visibility.
 * Uses cachedQuery for efficient server-side rendering.
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type { FeatureKey, FeatureSetting } from '@/lib/types/features';
import {
  isFeatureEnabled,
  getAllFeatureSettings,
} from './io';

const CACHE_REVALIDATE_SECONDS = 60;

/**
 * Cached check for specific feature
 */
export function isFeatureEnabledCached(key: FeatureKey) {
  return cachedQuery(
    async (): Promise<boolean> => {
      try {
        return await isFeatureEnabled(key);
      } catch (error) {
        console.error(`Error in isFeatureEnabledCached(${key}):`, error);
        return false;
      }
    },
    [`feature-${key}`],
    ['features', 'site-content'],
    CACHE_REVALIDATE_SECONDS
  )();
}

/**
 * Cached blog feature check
 */
export const isBlogEnabledCached = () => isFeatureEnabledCached('blog');

/**
 * Cached gallery feature check
 */
export const isGalleryEnabledCached = () => isFeatureEnabledCached('gallery');

/**
 * Cached shop feature check
 */
export const isShopEnabledCached = () => isFeatureEnabledCached('shop');

/**
 * Cached all feature settings
 * Used by Header/Footer to show/hide navigation links
 */
export const getAllFeatureSettingsCached = cachedQuery(
  async (): Promise<FeatureSetting[]> => {
    try {
      return await getAllFeatureSettings();
    } catch (error) {
      console.error('Error in getAllFeatureSettingsCached:', error);
      return [];
    }
  },
  ['all-features'],
  ['features', 'site-content'],
  CACHE_REVALIDATE_SECONDS
);
