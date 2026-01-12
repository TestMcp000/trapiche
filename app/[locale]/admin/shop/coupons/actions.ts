'use server';

import { revalidateTag } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import {
  checkCouponCodeExists,
  createCouponAdmin,
  updateCouponAdmin,
  toggleCouponActiveAdmin,
  type CouponDbPayload,
} from '@/lib/modules/shop/admin-io';
import type { CouponType } from '@/lib/types/shop';

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minSubtotalCents: number | null;
  maxDiscountCents: number | null;
  maxUsageCount: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  couponId?: string;
}

function toCouponDbPayload(input: CouponInput): CouponDbPayload {
  return {
    code: input.code,
    type: input.type,
    value: input.value,
    min_subtotal_cents: input.minSubtotalCents,
    max_discount_cents: input.maxDiscountCents,
    max_usage_count: input.maxUsageCount,
    starts_at: input.startsAt,
    expires_at: input.expiresAt,
    is_active: input.isActive,
  };
}

// =============================================================================
// Create Coupon
// =============================================================================

export async function createCoupon(input: CouponInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate
    if (!input.code.trim()) {
      return { success: false, error: 'Coupon code is required' };
    }

    if (input.value <= 0) {
      return { success: false, error: 'Discount value must be greater than 0' };
    }

    if (input.type === 'percentage' && input.value > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%' };
    }

    // Check code uniqueness
    const codeExists = await checkCouponCodeExists(input.code);
    if (codeExists) {
      return { success: false, error: 'A coupon with this code already exists' };
    }

    // Create coupon via lib
    const result = await createCouponAdmin(toCouponDbPayload(input));

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    revalidateTag('shop', { expire: 0 });
    return { success: true, couponId: result.id };
  } catch (error) {
    console.error('Unexpected error in createCoupon:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Update Coupon
// =============================================================================

export async function updateCoupon(couponId: string, input: CouponInput): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate
    if (!input.code.trim()) {
      return { success: false, error: 'Coupon code is required' };
    }

    if (input.value <= 0) {
      return { success: false, error: 'Discount value must be greater than 0' };
    }

    if (input.type === 'percentage' && input.value > 100) {
      return { success: false, error: 'Percentage discount cannot exceed 100%' };
    }

    // Check code uniqueness (excluding current coupon)
    const codeExists = await checkCouponCodeExists(input.code, couponId);
    if (codeExists) {
      return { success: false, error: 'A coupon with this code already exists' };
    }

    // Update coupon via lib
    const result = await updateCouponAdmin(couponId, toCouponDbPayload(input));

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    revalidateTag('shop', { expire: 0 });
    return { success: true, couponId };
  } catch (error) {
    console.error('Unexpected error in updateCoupon:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}

// =============================================================================
// Toggle Coupon Active
// =============================================================================

export async function toggleCouponActive(couponId: string, isActive: boolean): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    
    const isAdmin = await isSiteAdmin(supabase);
    if (!isAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    // Toggle via lib
    const result = await toggleCouponActiveAdmin(couponId, isActive);

    if ('error' in result) {
      return { success: false, error: result.error };
    }

    revalidateTag('shop', { expire: 0 });
    return { success: true, couponId };
  } catch (error) {
    console.error('Unexpected error in toggleCouponActive:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
}
