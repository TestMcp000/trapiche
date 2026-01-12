/**
 * Coupons JSON Formatter (Pure)
 *
 * Formats coupons to JSON export envelope.
 * Following PRD §2.6 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.6
 */

import type { CouponRow } from '@/lib/types/shop';
import type {
  CouponsExport,
  CouponExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a CouponRow to export data format.
 *
 * @param coupon - The coupon to transform
 * @returns Export data object
 */
export function transformCouponToExportData(
  coupon: CouponRow
): CouponExportData {
  return {
    code: coupon.code,
    discount_type: coupon.type,
    discount_value: coupon.value,
    min_order_cents: coupon.min_subtotal_cents,
    max_uses: coupon.max_usage_count,
    used_count: coupon.current_usage_count,
    starts_at: coupon.starts_at,
    expires_at: coupon.expires_at,
    is_active: coupon.is_active,
  };
}

/**
 * Format an array of coupons to JSON export envelope.
 *
 * @param coupons - Array of coupons to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatCouponsToJson(
  coupons: CouponRow[],
  exportedAt?: string
): CouponsExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'coupons',
    data: coupons.map(transformCouponToExportData),
  };
}

/**
 * Serialize coupons export to JSON string.
 *
 * @param coupons - Array of coupons to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatCouponsToJsonString(
  coupons: CouponRow[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatCouponsToJson(coupons, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
