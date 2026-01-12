/**
 * Shop Pricing Module Tests
 *
 * 測試 lib/modules/shop/pricing.ts 的 pure functions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCartItems,
  calculateSubtotal,
  validateCoupon,
  calculateDiscount,
  calculateCart,
  formatPrice,
  toCents,
} from '../lib/modules/shop/pricing';
import type { CartItem, Coupon } from '../lib/types/shop';

describe('normalizeCartItems', () => {
  it('filters out items with quantity <= 0', () => {
    const items: CartItem[] = [
      { variantKey: 'a', quantity: 2, unitPriceCents: 1000 },
      { variantKey: 'b', quantity: 0, unitPriceCents: 500 },
      { variantKey: 'c', quantity: -1, unitPriceCents: 300 },
    ];
    const result = normalizeCartItems(items);
    assert.equal(result.length, 1);
    assert.equal(result[0].variantKey, 'a');
  });

  it('sets negative unitPriceCents to 0', () => {
    const items: CartItem[] = [
      { variantKey: 'a', quantity: 1, unitPriceCents: -500 },
    ];
    const result = normalizeCartItems(items);
    assert.equal(result[0].unitPriceCents, 0);
  });
});

describe('calculateSubtotal', () => {
  it('calculates correct subtotal', () => {
    const items: CartItem[] = [
      { variantKey: 'a', quantity: 2, unitPriceCents: 1000 },
      { variantKey: 'b', quantity: 3, unitPriceCents: 500 },
    ];
    const subtotal = calculateSubtotal(items);
    assert.equal(subtotal, 2 * 1000 + 3 * 500); // 3500
  });

  it('returns 0 for empty cart', () => {
    assert.equal(calculateSubtotal([]), 0);
  });

  it('ignores invalid items', () => {
    const items: CartItem[] = [
      { variantKey: 'a', quantity: 2, unitPriceCents: 1000 },
      { variantKey: 'b', quantity: 0, unitPriceCents: 500 },
    ];
    assert.equal(calculateSubtotal(items), 2000);
  });
});

describe('validateCoupon', () => {
  const baseCoupon: Coupon = {
    code: 'TEST10',
    type: 'percentage',
    value: 10,
  };

  it('returns null for valid coupon', () => {
    const error = validateCoupon(baseCoupon, 5000);
    assert.equal(error, null);
  });

  it('returns expired for past expiration date', () => {
    const expiredCoupon: Coupon = {
      ...baseCoupon,
      expiresAt: '2020-01-01T00:00:00Z',
    };
    const error = validateCoupon(expiredCoupon, 5000);
    assert.equal(error, 'expired');
  });

  it('returns expired when now exactly equals expiresAt (boundary case)', () => {
    const expiresAt = '2025-01-15T12:00:00Z';
    const expiresAtMs = new Date(expiresAt).getTime();
    const boundaryCoupon: Coupon = {
      ...baseCoupon,
      expiresAt,
    };
    // now == expiresAt should be treated as expired (>= check)
    const error = validateCoupon(boundaryCoupon, 5000, 0, expiresAtMs);
    assert.equal(error, 'expired');
  });

  it('allows coupon 1ms before expiration', () => {
    const expiresAt = '2025-01-15T12:00:00Z';
    const expiresAtMs = new Date(expiresAt).getTime();
    const almostExpiredCoupon: Coupon = {
      ...baseCoupon,
      expiresAt,
    };
    // 1ms before expiration should still be valid
    const error = validateCoupon(almostExpiredCoupon, 5000, 0, expiresAtMs - 1);
    assert.equal(error, null);
  });

  it('returns min_subtotal_not_met when under minimum', () => {
    const minCoupon: Coupon = {
      ...baseCoupon,
      minSubtotalCents: 10000,
    };
    const error = validateCoupon(minCoupon, 5000);
    assert.equal(error, 'min_subtotal_not_met');
  });

  it('returns usage_limit_reached when usage exceeded', () => {
    const limitedCoupon: Coupon = {
      ...baseCoupon,
      maxUsageCount: 5,
    };
    const error = validateCoupon(limitedCoupon, 5000, 5);
    assert.equal(error, 'usage_limit_reached');
  });

  it('allows coupon when usage under limit', () => {
    const limitedCoupon: Coupon = {
      ...baseCoupon,
      maxUsageCount: 5,
    };
    const error = validateCoupon(limitedCoupon, 5000, 4);
    assert.equal(error, null);
  });
});

describe('calculateDiscount', () => {
  it('calculates amount discount correctly', () => {
    const coupon: Coupon = {
      code: 'FLAT500',
      type: 'amount',
      value: 500, // $5.00 off
    };
    assert.equal(calculateDiscount(coupon, 3000), 500);
  });

  it('caps amount discount at subtotal', () => {
    const coupon: Coupon = {
      code: 'FLAT500',
      type: 'amount',
      value: 500,
    };
    assert.equal(calculateDiscount(coupon, 300), 300); // Only $3.00 available
  });

  it('calculates percentage discount correctly', () => {
    const coupon: Coupon = {
      code: 'PCT10',
      type: 'percentage',
      value: 10, // 10% off
    };
    assert.equal(calculateDiscount(coupon, 5000), 500); // 10% of $50.00
  });

  it('applies maxDiscountCents to percentage coupon', () => {
    const coupon: Coupon = {
      code: 'PCT50',
      type: 'percentage',
      value: 50, // 50% off
      maxDiscountCents: 1000, // Max $10.00 discount
    };
    assert.equal(calculateDiscount(coupon, 5000), 1000); // 50% = 2500, capped at 1000
  });

  it('returns 0 for zero subtotal', () => {
    const coupon: Coupon = {
      code: 'PCT10',
      type: 'percentage',
      value: 10,
    };
    assert.equal(calculateDiscount(coupon, 0), 0);
  });

  it('floors percentage discount to avoid fractional cents', () => {
    const coupon: Coupon = {
      code: 'PCT33',
      type: 'percentage',
      value: 33, // 33% off
    };
    // 33% of 100 cents = 33 cents (no fractional)
    // 33% of 101 cents = 33.33 → floors to 33
    assert.equal(calculateDiscount(coupon, 101), 33);
  });
});

describe('calculateCart', () => {
  const items: CartItem[] = [
    { variantKey: 'a', quantity: 2, unitPriceCents: 1000 },
    { variantKey: 'b', quantity: 1, unitPriceCents: 500 },
  ];

  it('calculates cart without coupon', () => {
    const result = calculateCart(items);
    assert.equal(result.subtotalCents, 2500);
    assert.equal(result.discountCents, 0);
    assert.equal(result.totalCents, 2500);
    assert.equal(result.validItemCount, 2);
    assert.equal(result.appliedCoupon, null);
    assert.equal(result.couponError, null);
  });

  it('applies valid coupon', () => {
    const coupon: Coupon = {
      code: 'PCT10',
      type: 'percentage',
      value: 10,
    };
    const result = calculateCart(items, coupon);
    assert.equal(result.subtotalCents, 2500);
    assert.equal(result.discountCents, 250); // 10% of 2500
    assert.equal(result.totalCents, 2250);
    assert.deepEqual(result.appliedCoupon, coupon);
    assert.equal(result.couponError, null);
  });

  it('rejects expired coupon and reports error', () => {
    const expiredCoupon: Coupon = {
      code: 'EXPIRED',
      type: 'percentage',
      value: 50,
      expiresAt: '2020-01-01T00:00:00Z',
    };
    const result = calculateCart(items, expiredCoupon);
    assert.equal(result.discountCents, 0);
    assert.equal(result.totalCents, 2500);
    assert.equal(result.appliedCoupon, null);
    assert.equal(result.couponError, 'expired');
  });

  it('never produces negative total', () => {
    const hugeDiscountCoupon: Coupon = {
      code: 'HUGE',
      type: 'amount',
      value: 999999,
    };
    const result = calculateCart(items, hugeDiscountCoupon);
    assert.equal(result.totalCents, 0);
    assert.ok(result.totalCents >= 0);
  });

  it('handles empty cart', () => {
    const result = calculateCart([]);
    assert.equal(result.subtotalCents, 0);
    assert.equal(result.totalCents, 0);
    assert.equal(result.validItemCount, 0);
  });
});

describe('formatPrice', () => {
  it('formats cents to dollar string', () => {
    assert.equal(formatPrice(1234), '$12.34');
    assert.equal(formatPrice(100), '$1.00');
    assert.equal(formatPrice(5), '$0.05');
    assert.equal(formatPrice(0), '$0.00');
  });

  it('uses custom currency symbol', () => {
    assert.equal(formatPrice(1000, 'NT$'), 'NT$10.00');
  });
});

describe('toCents', () => {
  it('converts dollars to cents with rounding', () => {
    assert.equal(toCents(12.34), 1234);
    assert.equal(toCents(12.345), 1235); // rounds up
    assert.equal(toCents(12.344), 1234); // rounds down
    assert.equal(toCents(0), 0);
  });
});
