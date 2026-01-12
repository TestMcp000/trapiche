/**
 * Members JSON Formatter (Pure, Export-only)
 *
 * Formats customer profiles (members) to JSON export envelope.
 * Following PRD §2.8 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.8
 */

import type { CustomerProfileRow } from '@/lib/types/shop';
import type {
  MembersExport,
  MemberExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Options for member export */
export interface MemberExportOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a CustomerProfileRow to export data format.
 *
 * @param member - The customer profile to transform
 * @param options - Export options
 * @returns Export data object
 */
export function transformMemberToExportData(
  member: CustomerProfileRow,
  options: MemberExportOptions = {}
): MemberExportData {
  const data: MemberExportData = {
    display_name: member.display_name,
    order_count: member.order_count,
    ltv_cents: member.ltv_cents,
    first_order_at: member.first_order_at,
    last_order_at: member.last_order_at,
    tags: member.tags ?? [],
    is_blocked: member.is_blocked,
  };

  // Include sensitive fields if requested
  if (options.includeSensitive) {
    data.email = member.email ?? undefined;
    data.phone = member.phone ?? undefined;
    data.address_json = member.address_json ?? undefined;
  }

  return data;
}

/**
 * Format an array of members to JSON export envelope.
 *
 * @param members - Array of customer profiles to export
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatMembersToJson(
  members: CustomerProfileRow[],
  options: MemberExportOptions = {},
  exportedAt?: string
): MembersExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'members',
    includeSensitive: options.includeSensitive ?? false,
    data: members.map((member) => transformMemberToExportData(member, options)),
  };
}

/**
 * Serialize members export to JSON string.
 *
 * @param members - Array of customer profiles to export
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatMembersToJsonString(
  members: CustomerProfileRow[],
  options: MemberExportOptions = {},
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatMembersToJson(members, options, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
