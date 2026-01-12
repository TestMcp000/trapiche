/**
 * Shop Validators (Pure)
 *
 * Validation functions for shop products and coupons import/export.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.5, §2.6
 */

import { isValidSlug } from '@/lib/validators/slug';
import type {
  ProductImportData,
  ProductVariantImportData,
  CouponImportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// Product Validators
// =============================================================================

/**
 * Validate a product variant for import.
 *
 * @param variant - The variant to validate
 * @param index - The variant index
 * @returns Validation result
 */
export function validateProductVariant(
  variant: ProductVariantImportData,
  index: number
): ValidationResult {
  const errors: ValidationError[] = [];

  // Variant key validation
  if (!variant.variant_key?.trim()) {
    errors.push({ field: `variant[${index}].variant_key`, message: 'Variant key is required' });
  }

  // Price validation (must be non-negative integer)
  if (typeof variant.price_cents !== 'number' || variant.price_cents < 0) {
    errors.push({ field: `variant[${index}].price_cents`, message: 'Price must be a non-negative integer (cents)' });
  }
  if (!Number.isInteger(variant.price_cents)) {
    errors.push({ field: `variant[${index}].price_cents`, message: 'Price must be an integer (cents)' });
  }

  // Compare at price validation
  if (variant.compare_at_price_cents !== null) {
    if (typeof variant.compare_at_price_cents !== 'number' || variant.compare_at_price_cents < 0) {
      errors.push({ field: `variant[${index}].compare_at_price_cents`, message: 'Compare at price must be a non-negative integer (cents)' });
    }
    if (!Number.isInteger(variant.compare_at_price_cents)) {
      errors.push({ field: `variant[${index}].compare_at_price_cents`, message: 'Compare at price must be an integer (cents)' });
    }
    if (variant.compare_at_price_cents <= variant.price_cents) {
      errors.push({ field: `variant[${index}].compare_at_price_cents`, message: 'Compare at price should be higher than sale price' });
    }
  }

  // Stock validation
  if (typeof variant.stock !== 'number' || variant.stock < 0) {
    errors.push({ field: `variant[${index}].stock`, message: 'Stock must be a non-negative integer' });
  }
  if (!Number.isInteger(variant.stock)) {
    errors.push({ field: `variant[${index}].stock`, message: 'Stock must be an integer' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a product for import.
 *
 * @param product - The product to validate
 * @returns Validation result
 */
export function validateProduct(
  product: ProductImportData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Slug validation
  if (!product.slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  } else if (!isValidSlug(product.slug)) {
    errors.push({ field: 'slug', message: 'Invalid slug format (lowercase alphanumeric with hyphens)' });
  }

  // At least one variant required
  if (!product.variants || product.variants.length === 0) {
    errors.push({ field: 'variants', message: 'At least one variant is required' });
  } else {
    // Validate each variant
    for (let i = 0; i < product.variants.length; i++) {
      const variantResult = validateProductVariant(product.variants[i], i);
      errors.push(...variantResult.errors);
    }

    // Check for duplicate variant keys
    const variantKeys = product.variants.map((v) => v.variant_key);
    const duplicates = variantKeys.filter((key, index) => variantKeys.indexOf(key) !== index);
    if (duplicates.length > 0) {
      errors.push({ field: 'variants', message: `Duplicate variant keys: ${[...new Set(duplicates)].join(', ')}` });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple products for import.
 *
 * @param products - Array of products to validate
 * @returns Map of product slug to validation result
 */
export function validateProducts(
  products: ProductImportData[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const product of products) {
    results.set(product.slug, validateProduct(product));
  }

  return results;
}

// =============================================================================
// Coupon Validators
// =============================================================================

/**
 * Validate a coupon for import.
 *
 * @param coupon - The coupon to validate
 * @returns Validation result
 */
export function validateCoupon(
  coupon: CouponImportData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Code validation
  if (!coupon.code?.trim()) {
    errors.push({ field: 'code', message: 'Coupon code is required' });
  } else if (!/^[A-Z0-9_-]+$/i.test(coupon.code)) {
    errors.push({ field: 'code', message: 'Coupon code must be alphanumeric (with optional dashes/underscores)' });
  }

  // Discount type validation
  if (coupon.discount_type !== 'amount' && coupon.discount_type !== 'percentage') {
    errors.push({ field: 'discount_type', message: 'Discount type must be "amount" or "percentage"' });
  }

  // Discount value validation
  if (typeof coupon.discount_value !== 'number' || coupon.discount_value <= 0) {
    errors.push({ field: 'discount_value', message: 'Discount value must be a positive number' });
  }
  if (coupon.discount_type === 'percentage' && coupon.discount_value > 100) {
    errors.push({ field: 'discount_value', message: 'Percentage discount cannot exceed 100' });
  }

  // Min order validation
  if (coupon.min_order_cents !== null) {
    if (typeof coupon.min_order_cents !== 'number' || coupon.min_order_cents < 0) {
      errors.push({ field: 'min_order_cents', message: 'Minimum order must be a non-negative integer (cents)' });
    }
  }

  // Date validation
  if (coupon.starts_at && coupon.expires_at) {
    const startsAt = new Date(coupon.starts_at);
    const expiresAt = new Date(coupon.expires_at);
    if (startsAt >= expiresAt) {
      errors.push({ field: 'expires_at', message: 'Expiration date must be after start date' });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple coupons for import.
 *
 * @param coupons - Array of coupons to validate
 * @returns Map of coupon code to validation result
 */
export function validateCoupons(
  coupons: CouponImportData[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const coupon of coupons) {
    results.set(coupon.code, validateCoupon(coupon));
  }

  return results;
}
