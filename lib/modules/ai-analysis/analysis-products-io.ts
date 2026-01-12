/**
 * AI Analysis Products Data Fetcher
 *
 * Server-only module to fetch products data for AI analysis.
 * Returns minimal, AI-safe data shape without sensitive information.
 *
 * @module lib/modules/ai-analysis/analysis-products-io
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisFilters } from '@/lib/types/ai-analysis';
import {
  mapProductToAnalysisShape,
  type ProductAnalysisShape,
  type ProductWithVariants,
} from './analysis-data-mappers';

// Re-export types for convenience
export { type ProductAnalysisShape } from './analysis-data-mappers';

// =============================================================================
// IO Functions (server-only)
// =============================================================================

/**
 * Fetch products for AI analysis.
 * Applies optional filters and returns AI-safe data shape.
 *
 * @param filters - Optional analysis filters
 * @returns Array of products in AI-safe format
 */
export async function fetchProductsForAnalysis(
  filters?: AnalysisFilters
): Promise<ProductAnalysisShape[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('products')
    .select(
      `
      id,
      slug,
      name_en,
      name_zh,
      category,
      is_visible,
      created_at,
      product_variants (
        price_cents,
        stock,
        is_enabled
      )
    `
    )
    .eq('is_visible', true);

  // Apply product ID filter if specified
  if (filters?.productIds && filters.productIds.length > 0) {
    query = query.in('id', filters.productIds);
  }

  // Apply date range filter if specified
  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from)
      .lte('created_at', filters.dateRange.to);
  }

  query = query.order('created_at', { ascending: false });

  const { data: products, error } = await query;

  if (error) {
    console.error('Error fetching products for analysis:', error);
    return [];
  }

  return (products || []).map((p) =>
    mapProductToAnalysisShape(p as ProductWithVariants)
  );
}
