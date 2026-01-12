/**
 * Pricing Module (Pure)
 *
 * 遵循 refactor.md：
 * - Pure module：可單測、不可 IO、不可 import Next/React/Supabase
 * - 金額以 cents 為單位（整數運算，避免浮點誤差）
 *
 * 功能：
 * - subtotal / discount / total 計算
 * - coupon 折扣（amount / percentage）
 * - 輸入保護（無效 quantity / unitPrice 歸零）
 */

import type { CartItem, Coupon } from '@/lib/types/shop';

// =============================================================================
// Types
// =============================================================================

/** 購物車計算結果 */
export interface CartCalculation {
  /** 商品小計（cents） */
  subtotalCents: number;
  /** 折扣金額（cents，正數） */
  discountCents: number;
  /** 最終總額（cents） */
  totalCents: number;
  /** 有效商品數量 */
  validItemCount: number;
  /** 已套用的優惠券（null = 未套用或不符資格） */
  appliedCoupon: Coupon | null;
  /** 優惠券未套用原因（null = 已套用或無優惠券） */
  couponError: CouponError | null;
}

/** 優惠券錯誤類型 */
export type CouponError =
  | 'expired' // 已過期
  | 'min_subtotal_not_met' // 未達最低消費
  | 'usage_limit_reached' // 已達使用次數上限
  | 'invalid_coupon'; // 無效優惠券

// =============================================================================
// Input Validation
// =============================================================================

/**
 * 正規化購物車項目：無效的 quantity 或 unitPrice 歸零
 *
 * 規則：
 * - quantity <= 0 → 該項目不計入
 * - unitPriceCents < 0 → 視為 0
 */
export function normalizeCartItems(items: CartItem[]): CartItem[] {
  return items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      ...item,
      unitPriceCents: Math.max(0, item.unitPriceCents),
    }));
}

// =============================================================================
// Subtotal Calculation
// =============================================================================

/**
 * 計算購物車小計（cents）
 */
export function calculateSubtotal(items: CartItem[]): number {
  const normalized = normalizeCartItems(items);
  return normalized.reduce(
    (sum, item) => sum + item.quantity * item.unitPriceCents,
    0
  );
}

// =============================================================================
// Coupon Validation & Discount
// =============================================================================

/**
 * 驗證優惠券是否可用
 *
 * @param coupon - 優惠券
 * @param subtotalCents - 購物車小計（cents）
 * @param currentUsageCount - 目前已使用次數（可選，預設 0）
 * @param now - 當前時間（可選，預設 Date.now()，方便測試注入）
 */
export function validateCoupon(
  coupon: Coupon,
  subtotalCents: number,
  currentUsageCount: number = 0,
  now: number = Date.now()
): CouponError | null {
  // 檢查過期
  if (coupon.expiresAt) {
    const expiresAtMs = new Date(coupon.expiresAt).getTime();
    if (now >= expiresAtMs) {
      return 'expired';
    }
  }

  // 檢查最低消費
  if (
    coupon.minSubtotalCents !== undefined &&
    subtotalCents < coupon.minSubtotalCents
  ) {
    return 'min_subtotal_not_met';
  }

  // 檢查使用次數上限
  if (
    coupon.maxUsageCount !== undefined &&
    currentUsageCount >= coupon.maxUsageCount
  ) {
    return 'usage_limit_reached';
  }

  return null;
}

/**
 * 計算優惠券折扣金額（cents）
 *
 * 規則：
 * - amount coupon：直接扣除，但不超過 subtotal
 * - percentage coupon：按百分比計算，受 maxDiscountCents 限制
 * - 折扣不會使總價為負
 */
export function calculateDiscount(
  coupon: Coupon,
  subtotalCents: number
): number {
  if (subtotalCents <= 0) {
    return 0;
  }

  let discountCents: number;

  if (coupon.type === 'amount') {
    // 固定金額折扣
    discountCents = coupon.value;
  } else {
    // 百分比折扣（value = 0-100）
    discountCents = Math.floor((subtotalCents * coupon.value) / 100);

    // 套用最大折扣限制
    if (coupon.maxDiscountCents !== undefined) {
      discountCents = Math.min(discountCents, coupon.maxDiscountCents);
    }
  }

  // 折扣不可超過小計（避免負總價）
  return Math.min(discountCents, subtotalCents);
}

// =============================================================================
// Full Cart Calculation
// =============================================================================

/**
 * 計算完整購物車（含優惠券）
 *
 * @param items - 購物車項目
 * @param coupon - 優惠券（可選）
 * @param currentUsageCount - 優惠券目前已使用次數（可選）
 * @param now - 當前時間毫秒（可選，方便測試注入）
 */
export function calculateCart(
  items: CartItem[],
  coupon?: Coupon | null,
  currentUsageCount: number = 0,
  now: number = Date.now()
): CartCalculation {
  const normalized = normalizeCartItems(items);
  const subtotalCents = calculateSubtotal(items);

  let discountCents = 0;
  let appliedCoupon: Coupon | null = null;
  let couponError: CouponError | null = null;

  if (coupon) {
    const error = validateCoupon(coupon, subtotalCents, currentUsageCount, now);
    if (error) {
      couponError = error;
    } else {
      discountCents = calculateDiscount(coupon, subtotalCents);
      appliedCoupon = coupon;
    }
  }

  const totalCents = Math.max(0, subtotalCents - discountCents);

  return {
    subtotalCents,
    discountCents,
    totalCents,
    validItemCount: normalized.length,
    appliedCoupon,
    couponError,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * 格式化金額為顯示用字串（例如 $12.34）
 *
 * @param cents - 金額（cents）
 * @param currency - 貨幣符號（預設 $）
 */
export function formatPrice(cents: number, currency: string = '$'): string {
  const dollars = (cents / 100).toFixed(2);
  return `${currency}${dollars}`;
}

/**
 * 將浮點金額轉換為 cents（四捨五入）
 */
export function toCents(dollars: number): number {
  return Math.round(dollars * 100);
}
