/**
 * Coupons JSON Parser (Pure)
 *
 * Parses JSON import data for coupons.
 * Following PRD §2.6 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.6
 */

import type {
  CouponsExport,
  CouponExportData,
  CouponImportData,
  ParseResult,
} from '@/lib/types/import-export';

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate discount type.
 */
function isValidDiscountType(value: unknown): value is 'amount' | 'percentage' {
  return value === 'amount' || value === 'percentage';
}

/**
 * Validate a single coupon export data.
 *
 * @param data - The data to validate
 * @returns Array of error messages
 */
export function validateCouponFields(
  data: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(data.code)) {
    errors.push('code is required');
  }
  if (!isValidDiscountType(data.discount_type)) {
    errors.push('discount_type must be "amount" or "percentage"');
  }
  if (typeof data.discount_value !== 'number' || data.discount_value <= 0) {
    errors.push('discount_value must be a positive number');
  }

  return errors;
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Transform parsed coupon export data to import data format.
 *
 * @param data - The export data
 * @returns Import data
 */
export function transformCouponToImportData(
  data: CouponExportData
): CouponImportData {
  return {
    code: data.code,
    discount_type: data.discount_type,
    discount_value: data.discount_value,
    min_order_cents: data.min_order_cents ?? null,
    max_uses: data.max_uses ?? null,
    starts_at: data.starts_at ?? null,
    expires_at: data.expires_at ?? null,
    is_active: typeof data.is_active === 'boolean' ? data.is_active : true,
  };
}

/**
 * Parse coupons JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseCouponsJson(
  jsonString: string
): ParseResult<CouponImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid JSON: expected object' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'coupons') {
      return {
        success: false,
        error: `Invalid type: expected 'coupons', got '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'Invalid data: expected array' };
    }

    // Validate and transform each coupon
    const coupons: CouponImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const coupon = envelope.data[i] as Record<string, unknown>;
      const errors = validateCouponFields(coupon);

      if (errors.length > 0) {
        return {
          success: false,
          error: `Coupon ${i + 1}: ${errors.join('; ')}`,
        };
      }

      coupons.push(transformCouponToImportData(coupon as unknown as CouponExportData));
    }

    return { success: true, data: coupons };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as coupons export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseCouponsObject(
  data: unknown
): ParseResult<CouponImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Invalid input: expected object' };
  }

  const envelope = data as CouponsExport;

  if (envelope.type !== 'coupons') {
    return {
      success: false,
      error: `Invalid type: expected 'coupons', got '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'Invalid data: expected array' };
  }

  const coupons: CouponImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const coupon = envelope.data[i];
    const errors = validateCouponFields(coupon as unknown as Record<string, unknown>);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Coupon ${i + 1}: ${errors.join('; ')}`,
      };
    }

    coupons.push(transformCouponToImportData(coupon));
  }

  return { success: true, data: coupons };
}
