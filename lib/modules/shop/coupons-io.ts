/**
 * Shop Coupons Public IO
 *
 * Public read operations for coupon validation.
 * Uses anonymous Supabase client for caching-safe reads.
 *
 * @module lib/modules/shop/coupons-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { CouponRow } from '@/lib/types/shop';

// =============================================================================
// Coupon Read Operations
// =============================================================================

/**
 * Get a coupon by code (for checkout validation)
 */
export async function getCouponByCode(code: string): Promise<CouponRow | null> {
  const { data, error } = await createAnonClient()
    .from('coupons')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('Error fetching coupon by code:', error);
    return null;
  }

  return data as CouponRow | null;
}
