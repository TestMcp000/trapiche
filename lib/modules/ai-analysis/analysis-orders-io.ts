/**
 * AI Analysis Orders Data Fetcher
 *
 * Server-only module to fetch orders data for AI analysis.
 * Returns minimal, AI-safe data shape with all PII excluded at query level.
 *
 * @module lib/modules/ai-analysis/analysis-orders-io
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisFilters } from '@/lib/types/ai-analysis';
import {
  mapOrderToAnalysisShape,
  type OrderAnalysisShape,
  type OrderRowForAnalysis,
} from './analysis-data-mappers';

// Re-export types for convenience
export { type OrderAnalysisShape } from './analysis-data-mappers';

// =============================================================================
// IO Functions (server-only)
// =============================================================================

/**
 * Fetch orders for AI analysis.
 * Applies optional filters and returns AI-safe data shape.
 * PII fields are excluded at query level (not selected).
 *
 * @param filters - Optional analysis filters
 * @returns Array of orders in AI-safe format
 */
export async function fetchOrdersForAnalysis(
  filters?: AnalysisFilters
): Promise<OrderAnalysisShape[]> {
  const supabase = createAdminClient();

  // Note: Deliberately NOT selecting any PII fields
  // (recipient_name, recipient_phone, recipient_address, customer_email, etc.)
  let query = supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      status,
      gateway,
      subtotal_cents,
      discount_cents,
      total_cents,
      currency,
      coupon_code,
      created_at,
      paid_at,
      completed_at,
      order_items (id)
    `
    );

  // Apply date range filter if specified
  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from)
      .lte('created_at', filters.dateRange.to);
  }

  // Exclude cancelled orders for cleaner analysis
  query = query.neq('status', 'cancelled');
  query = query.order('created_at', { ascending: false });

  const { data: orders, error } = await query;

  if (error) {
    console.error('Error fetching orders for analysis:', error);
    return [];
  }

  return (orders || []).map((o) =>
    mapOrderToAnalysisShape(o as OrderRowForAnalysis)
  );
}
