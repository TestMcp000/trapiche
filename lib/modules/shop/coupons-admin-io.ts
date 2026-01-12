/**
 * Shop Coupons Admin IO
 *
 * Admin-only coupon management operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/shop/coupons-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import type { CouponRow, CouponType } from '@/lib/types/shop';

// =============================================================================
// Coupon Read Operations
// =============================================================================

/**
 * Get all coupons (for admin, including inactive)
 * Requires authenticated admin session via RLS
 */
export async function getAllCoupons(): Promise<CouponRow[]> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return [];
  }

  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all coupons:', error);
    return [];
  }

  return (data || []) as CouponRow[];
}

// =============================================================================
// Coupon Write Operations
// =============================================================================

/**
 * Check if a coupon code already exists
 */
export async function checkCouponCodeExists(
  code: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase.from('coupons').select('id').eq('code', code.toUpperCase());
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}

/** DB payload for coupon creation/update */
export interface CouponDbPayload {
  code: string;
  type: CouponType;
  value: number;
  min_subtotal_cents: number | null;
  max_discount_cents: number | null;
  max_usage_count: number | null;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
}

/**
 * Create a new coupon
 */
export async function createCouponAdmin(
  coupon: CouponDbPayload
): Promise<{ id: string } | { error: string }> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      ...coupon,
      code: coupon.code.toUpperCase(),
      current_usage_count: 0,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating coupon:', error);
    return { error: error.message };
  }

  return { id: data.id };
}

/**
 * Update an existing coupon
 */
export async function updateCouponAdmin(
  couponId: string,
  coupon: CouponDbPayload
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('coupons')
    .update({
      ...coupon,
      code: coupon.code.toUpperCase(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', couponId);

  if (error) {
    console.error('Error updating coupon:', error);
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Toggle coupon active status
 */
export async function toggleCouponActiveAdmin(
  couponId: string,
  isActive: boolean
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('coupons')
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq('id', couponId);

  if (error) {
    console.error('Error toggling coupon:', error);
    return { error: error.message };
  }

  return { success: true };
}
