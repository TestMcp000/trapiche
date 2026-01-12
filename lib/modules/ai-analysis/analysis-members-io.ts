/**
 * AI Analysis Members Data Fetcher
 *
 * Server-only module to fetch members data for AI analysis.
 * Returns anonymized data shape - never includes email/phone/address.
 *
 * @module lib/modules/ai-analysis/analysis-members-io
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisFilters } from '@/lib/types/ai-analysis';
import {
  mapMemberToAnalysisShape,
  type MemberAnalysisShape,
  type MemberRowForAnalysis,
} from './analysis-data-mappers';

// Re-export types for convenience
export { type MemberAnalysisShape } from './analysis-data-mappers';

// =============================================================================
// IO Functions (server-only)
// =============================================================================

/**
 * Fetch members for AI analysis.
 * Applies optional filters and returns anonymized data shape.
 * PII fields are excluded at query level (not selected).
 *
 * @param filters - Optional analysis filters
 * @returns Array of members in anonymized format
 */
export async function fetchMembersForAnalysis(
  filters?: AnalysisFilters
): Promise<MemberAnalysisShape[]> {
  const supabase = createAdminClient();

  // Note: Deliberately NOT selecting any PII fields
  // (email, display_name, phone, address_json)
  let query = supabase
    .from('customer_profiles')
    .select(
      `
      id,
      user_id,
      order_count,
      ltv_cents,
      avg_order_cents,
      first_order_at,
      last_order_at,
      tags,
      is_blocked
    `
    );

  // Apply member ID filter if specified
  if (filters?.memberIds && filters.memberIds.length > 0) {
    query = query.in('user_id', filters.memberIds);
  }

  // Apply date range filter (based on first order date)
  if (filters?.dateRange) {
    query = query
      .gte('first_order_at', filters.dateRange.from)
      .lte('first_order_at', filters.dateRange.to);
  }

  // Only include members with at least one order
  query = query.gt('order_count', 0);
  query = query.order('ltv_cents', { ascending: false });

  const { data: members, error } = await query;

  if (error) {
    console.error('Error fetching members for analysis:', error);
    return [];
  }

  return (members || []).map((m) =>
    mapMemberToAnalysisShape(m as MemberRowForAnalysis)
  );
}

// =============================================================================
// Short ID Lookup Functions (for AI Analysis user identification)
// @see doc/specs/completed/AI_ANALYSIS_v2.md §5.3
// =============================================================================

/**
 * Get member (user) ID by customer short_id
 *
 * @param shortId - Customer short ID (e.g., "C1", "C123")
 * @returns user_id (UUID) if found, null otherwise
 */
export async function getMemberIdByShortId(
  shortId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  // Validate short_id format (C followed by digits)
  if (!/^C\d+$/i.test(shortId)) {
    console.warn('Invalid short_id format:', shortId);
    return null;
  }

  // Normalize to uppercase C
  const normalizedShortId = shortId.toUpperCase();

  const { data, error } = await supabase
    .from('customer_profiles')
    .select('user_id')
    .eq('short_id', normalizedShortId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching member by short_id:', error);
    return null;
  }

  return data?.user_id ?? null;
}

/**
 * Get customer short_id by user_id
 *
 * @param userId - User UUID
 * @returns short_id (e.g., "C1") if found, null otherwise
 */
export async function getShortIdByMemberId(
  userId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('customer_profiles')
    .select('short_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching short_id by member:', error);
    return null;
  }

  return data?.short_id ?? null;
}
