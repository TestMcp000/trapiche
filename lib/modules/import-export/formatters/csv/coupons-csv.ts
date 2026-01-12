/**
 * Coupons CSV Formatter (Pure)
 *
 * Formats coupons to CSV.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.6
 * @see uiux_refactor.md §4 item 2
 */

import type { CouponRow } from '@/lib/types/shop';
import {
  escapeCsvCell,
  nullToEmpty,
  toIsoUtc,
  boolToCsv,
  toCsv,
} from './csv-utils';

// =============================================================================
// Types
// =============================================================================

/** CSV row data for a coupon */
interface CouponCsvRow {
  code: string;
  discount_type: string;
  discount_value: string;
  min_order_cents: string;
  max_uses: string;
  used_count: string;
  starts_at: string;
  expires_at: string;
  is_active: string;
}

// =============================================================================
// Constants
// =============================================================================

/** CSV column headers */
const COUPON_CSV_HEADERS = [
  'code',
  'discount_type',
  'discount_value',
  'min_order_cents',
  'max_uses',
  'used_count',
  'starts_at',
  'expires_at',
  'is_active',
] as const;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a coupon to a CSV row.
 * Maps from CouponRow DB schema to PRD export format.
 *
 * @param coupon - Coupon row from database
 * @returns CSV row object
 */
export function transformCouponToCsvRow(coupon: CouponRow): CouponCsvRow {
  return {
    code: coupon.code,
    // Map 'type' to 'discount_type' per PRD schema
    discount_type: coupon.type,
    // Map 'value' to 'discount_value'
    discount_value: String(coupon.value),
    // Map 'min_subtotal_cents' to 'min_order_cents'
    min_order_cents: nullToEmpty(coupon.min_subtotal_cents),
    // Map 'max_usage_count' to 'max_uses'
    max_uses: nullToEmpty(coupon.max_usage_count),
    // Map 'current_usage_count' to 'used_count'
    used_count: String(coupon.current_usage_count ?? 0),
    starts_at: toIsoUtc(coupon.starts_at),
    expires_at: toIsoUtc(coupon.expires_at),
    is_active: boolToCsv(coupon.is_active),
  };
}

/**
 * Convert a CSV row object to an array of escaped cell values.
 *
 * @param row - CSV row object
 * @returns Array of escaped cell strings
 */
function rowToArray(row: CouponCsvRow): string[] {
  return COUPON_CSV_HEADERS.map((header) => escapeCsvCell(row[header]));
}

/**
 * Format coupons to CSV string.
 *
 * @param coupons - Array of coupon rows
 * @returns CSV string
 */
export function formatCouponsToCsv(coupons: CouponRow[]): string {
  const rows = coupons.map(transformCouponToCsvRow);
  const rowArrays = rows.map(rowToArray);
  return toCsv([...COUPON_CSV_HEADERS], rowArrays);
}
