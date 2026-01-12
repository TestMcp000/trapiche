/**
 * AI Analysis Comments Data Fetcher
 *
 * Server-only module to fetch comments data for AI analysis.
 * Returns minimal, AI-safe data shape with user_id/ip_hash excluded.
 *
 * @module lib/modules/ai-analysis/analysis-comments-io
 * @see uiux_refactor.md §6.2.2 - Data collection layer
 * @see doc/specs/completed/AI_ANALYSIS_v2.md §5 - Data privacy
 */

import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { AnalysisFilters } from '@/lib/types/ai-analysis';
import {
  mapCommentToAnalysisShape,
  type CommentAnalysisShape,
  type CommentRowForAnalysis,
} from './analysis-data-mappers';

// Re-export types for convenience
export { type CommentAnalysisShape } from './analysis-data-mappers';

// =============================================================================
// IO Functions (server-only)
// =============================================================================

/**
 * Fetch comments for AI analysis.
 * Applies optional filters and returns AI-safe data shape.
 * Sensitive fields (user_id, ip_hash, user_email) are excluded at query level.
 *
 * @param filters - Optional analysis filters
 * @returns Array of comments in AI-safe format
 */
export async function fetchCommentsForAnalysis(
  filters?: AnalysisFilters
): Promise<CommentAnalysisShape[]> {
  const supabase = createAdminClient();

  // Note: Deliberately NOT selecting any sensitive fields
  // (user_id, user_display_name, user_avatar_url - all could identify users)
  // The comment_moderation table with ip_hash/user_email is not joined at all
  let query = supabase
    .from('comments')
    .select(
      `
      id,
      target_type,
      target_id,
      parent_id,
      content,
      like_count,
      is_approved,
      created_at
    `
    )
    .eq('is_spam', false); // Exclude spam comments

  // Apply date range filter if specified
  if (filters?.dateRange) {
    query = query
      .gte('created_at', filters.dateRange.from)
      .lte('created_at', filters.dateRange.to);
  }

  query = query.order('created_at', { ascending: false });

  const { data: comments, error } = await query;

  if (error) {
    console.error('Error fetching comments for analysis:', error);
    return [];
  }

  return (comments || []).map((c) =>
    mapCommentToAnalysisShape(c as CommentRowForAnalysis)
  );
}
