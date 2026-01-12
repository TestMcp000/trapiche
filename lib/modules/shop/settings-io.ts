/**
 * Shop Settings Public IO
 *
 * Public read operations for shop settings.
 * Uses anonymous Supabase client for caching-safe reads.
 *
 * @module lib/modules/shop/settings-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { ShopSettingsRow } from '@/lib/types/shop';

// =============================================================================
// Shop Settings Read Operations
// =============================================================================

/**
 * Get shop settings (public-safe fields only)
 * Uses RPC to return only checkout-safe fields (no admin-only data)
 */
export async function getShopSettings(): Promise<ShopSettingsRow | null> {
  const { data, error } = await createAnonClient().rpc('get_shop_settings_public');

  if (error) {
    // PGRST202: Function not found - migration not applied yet
    if (error.code === 'PGRST202') {
      console.warn('get_shop_settings_public function not found - shop features disabled');
      return null;
    }
    console.error('Error fetching shop settings:', error);
    return null;
  }

  // RPC returns array, get first row
  if (Array.isArray(data) && data.length > 0) {
    return data[0] as ShopSettingsRow;
  }

  return null;
}
