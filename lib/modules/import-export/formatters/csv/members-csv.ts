/**
 * Members CSV Formatter (Pure, Export-only)
 *
 * Formats customer/member data to CSV.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.8
 * @see uiux_refactor.md §4 item 2
 */

import type { CustomerProfileRow } from '@/lib/types/shop';
import {
  escapeCsvCell,
  nullToEmpty,
  toIsoUtc,
  boolToCsv,
  arrayToCsvValue,
  toCsv,
} from './csv-utils';

// =============================================================================
// Types
// =============================================================================

/** Options for member CSV export */
export interface MemberCsvOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** CSV column headers (basic) */
const MEMBER_CSV_HEADERS = [
  'display_name',
  'order_count',
  'ltv_cents',
  'first_order_at',
  'last_order_at',
  'tags',
  'is_blocked',
] as const;

/** Additional sensitive columns */
const MEMBER_SENSITIVE_HEADERS = [
  'email',
  'phone',
] as const;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a member to a CSV row.
 *
 * @param member - Member row from database
 * @param options - Export options
 * @returns Array of escaped cell values
 */
export function transformMemberToCsvRow(
  member: CustomerProfileRow,
  options: MemberCsvOptions = {}
): string[] {
  const row = [
    escapeCsvCell(nullToEmpty(member.display_name)),
    escapeCsvCell(member.order_count ?? 0),
    escapeCsvCell(member.ltv_cents ?? 0),
    escapeCsvCell(toIsoUtc(member.first_order_at)),
    escapeCsvCell(toIsoUtc(member.last_order_at)),
    arrayToCsvValue(member.tags),
    escapeCsvCell(boolToCsv(member.is_blocked ?? false)),
  ];

  if (options.includeSensitive) {
    row.push(
      escapeCsvCell(nullToEmpty(member.email)),
      escapeCsvCell(nullToEmpty(member.phone))
    );
  }

  return row;
}

/**
 * Format members to CSV string.
 *
 * @param members - Array of member rows
 * @param options - Export options
 * @returns CSV string
 */
export function formatMembersToCsv(
  members: CustomerProfileRow[],
  options: MemberCsvOptions = {}
): string {
  // Build headers based on options
  const headers: string[] = [...MEMBER_CSV_HEADERS];
  if (options.includeSensitive) {
    headers.push(...MEMBER_SENSITIVE_HEADERS);
  }

  const rowArrays = members.map((member) =>
    transformMemberToCsvRow(member, options)
  );

  return toCsv(headers, rowArrays);
}
