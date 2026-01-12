/**
 * Shop Settings Admin IO
 *
 * Admin-only shop settings operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/shop/shop-settings-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import type { ShopSettingsRow, InvoiceToggles } from '@/lib/types/shop';

// =============================================================================
// Shop Settings Read Operations
// =============================================================================

/**
 * Get shop settings for admin (full access)
 * Requires authenticated admin session via RLS
 */
export async function getShopSettingsAdmin(): Promise<ShopSettingsRow | null> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return null;
  }

  const { data, error } = await supabase
    .from('shop_settings')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching shop settings (admin):', error);
    return null;
  }

  return data as ShopSettingsRow | null;
}

// =============================================================================
// Shop Settings Write Operations
// =============================================================================

/** DB payload for shop settings update */
export interface ShopSettingsDbPayload {
  reserved_ttl_minutes: number;
  invoice_config_mode: string;
  invoice_toggles_json: InvoiceToggles | null;
  invoice_json_schema: Record<string, unknown> | null;
}

/**
 * Update shop settings (upsert)
 */
export async function updateShopSettingsAdmin(
  settings: ShopSettingsDbPayload,
  userId: string | null
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('shop_settings').upsert(
    {
      id: 'default',
      ...settings,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.error('Error saving shop settings:', error);
    return { error: error.message };
  }

  return { success: true };
}
