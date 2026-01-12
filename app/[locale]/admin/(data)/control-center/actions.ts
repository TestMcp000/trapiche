'use server';

/**
 * Control Center Server Actions
 *
 * Server actions for semantic search operations and analytics.
 * RBAC: Owner/Editor can access search; Owner can view analytics.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §3.1
 * @see uiux_refactor.md §6.3.2 item 1
 * @see uiux_refactor.md §4 item 8 (Search Analytics)
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin, isOwner } from '@/lib/modules/auth';
import {
  validateSemanticSearchParams,
  validateKeywordSearchParams,
  validateHybridSearchParams,
  validateListSearchLogsParams,
  isLowQualitySearch,
} from '@/lib/validators/embedding';
import {
  semanticSearch,
  keywordSearch,
  hybridSearch,
  isSemanticSearchEnabled,
} from '@/lib/modules/embedding/io';
import {
  logSearch,
  listSearchLogs,
  getSearchLogStats,
  getLowQualityQueries,
  deleteOldSearchLogs,
} from '@/lib/modules/embedding/search-analytics-io';
import type {
  SemanticSearchResult,
  KeywordSearchResult,
  HybridSearchResult,
  EmbeddingTargetType,
  SearchLogListItem,
  SearchLogStats,
} from '@/lib/types/embedding';

// =============================================================================
// Types
// =============================================================================

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Helper: Get User ID for logging
// =============================================================================

async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// =============================================================================
// Semantic Search Action
// =============================================================================

/**
 * Perform semantic search across embeddings.
 * @see SUPABASE_AI.md §3.1.1
 */
export async function semanticSearchAction(
  query: string,
  targetTypes?: EmbeddingTargetType[],
  limit?: number
): Promise<ActionResult<SemanticSearchResult[]>> {
  // RBAC Gate
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Feature Gate
  const enabled = await isSemanticSearchEnabled();
  if (!enabled) {
    return { success: false, error: 'Semantic search is not available. No embeddings found.' };
  }

  // Validate input
  const validation = validateSemanticSearchParams({ query, targetTypes, limit });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const results = await semanticSearch({
      query: validation.data.query,
      targetTypes: validation.data.targetTypes,
      limit: validation.data.limit,
    });

    // Log search for analytics (fire and forget)
    const topScore = results[0]?.similarity;
    const userId = await getCurrentUserId();
    void logSearch({
      query: validation.data.query,
      mode: 'semantic',
      threshold: validation.data.threshold,
      resultLimit: validation.data.limit,
      targetTypes: validation.data.targetTypes,
      resultsCount: results.length,
      topScore,
      isLowQuality: isLowQualitySearch(results.length, topScore, validation.data.threshold),
    }, userId);

    return { success: true, data: results };
  } catch (error) {
    console.error('[semanticSearchAction] Error:', error);
    return { success: false, error: 'Search failed. Please try again.' };
  }
}

// =============================================================================
// Keyword Search Action (Phase 7)
// =============================================================================

/**
 * Perform keyword search using PostgreSQL FTS.
 * @see SUPABASE_AI.md Phase 7
 */
export async function keywordSearchAction(
  query: string,
  targetTypes?: EmbeddingTargetType[],
  limit?: number
): Promise<ActionResult<KeywordSearchResult[]>> {
  // RBAC Gate
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Feature Gate
  const enabled = await isSemanticSearchEnabled();
  if (!enabled) {
    return { success: false, error: 'Search is not available. No embeddings found.' };
  }

  // Validate input
  const validation = validateKeywordSearchParams({ query, targetTypes, limit });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const results = await keywordSearch({
      query: validation.data.query,
      targetTypes: validation.data.targetTypes,
      limit: validation.data.limit,
    });

    // Log search for analytics (fire and forget)
    // For keyword search, normalize tsRank to 0-1 range (max tsRank ~0.5)
    const topScore = results[0]?.tsRank ? Math.min(results[0].tsRank * 2, 1) : undefined;
    const userId = await getCurrentUserId();
    void logSearch({
      query: validation.data.query,
      mode: 'keyword',
      resultLimit: validation.data.limit,
      targetTypes: validation.data.targetTypes,
      resultsCount: results.length,
      topScore,
      isLowQuality: isLowQualitySearch(results.length, topScore),
    }, userId);

    return { success: true, data: results };
  } catch (error) {
    console.error('[keywordSearchAction] Error:', error);
    return { success: false, error: 'Search failed. Please try again.' };
  }
}

// =============================================================================
// Hybrid Search Action (Phase 7)
// =============================================================================

/**
 * Perform hybrid search (semantic + keyword with weighted scoring).
 * @see SUPABASE_AI.md Phase 7
 */
export async function hybridSearchAction(
  query: string,
  targetTypes?: EmbeddingTargetType[],
  limit?: number,
  semanticWeight?: number,
  keywordWeight?: number
): Promise<ActionResult<HybridSearchResult[]>> {
  // RBAC Gate
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Feature Gate
  const enabled = await isSemanticSearchEnabled();
  if (!enabled) {
    return { success: false, error: 'Search is not available. No embeddings found.' };
  }

  // Validate input
  const validation = validateHybridSearchParams({
    query,
    targetTypes,
    limit,
    semanticWeight,
    keywordWeight,
  });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const results = await hybridSearch({
      query: validation.data.query,
      targetTypes: validation.data.targetTypes,
      limit: validation.data.limit,
      semanticWeight: validation.data.semanticWeight,
      keywordWeight: validation.data.keywordWeight,
      threshold: validation.data.threshold,
    });

    // Log search for analytics (fire and forget)
    const topScore = results[0]?.combinedScore;
    const userId = await getCurrentUserId();
    void logSearch({
      query: validation.data.query,
      mode: 'hybrid',
      weights: {
        semanticWeight: validation.data.semanticWeight,
        keywordWeight: validation.data.keywordWeight,
      },
      threshold: validation.data.threshold,
      resultLimit: validation.data.limit,
      targetTypes: validation.data.targetTypes,
      resultsCount: results.length,
      topScore,
      isLowQuality: isLowQualitySearch(results.length, topScore, validation.data.threshold),
    }, userId);

    return { success: true, data: results };
  } catch (error) {
    console.error('[hybridSearchAction] Error:', error);
    return { success: false, error: 'Search failed. Please try again.' };
  }
}

// =============================================================================
// Feature Check
// =============================================================================

/**
 * Check if semantic search is enabled.
 */
export async function checkSemanticSearchEnabled(): Promise<ActionResult<boolean>> {
  // RBAC Gate
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const enabled = await isSemanticSearchEnabled();
  return { success: true, data: enabled };
}

// =============================================================================
// Search Analytics Actions (Phase 8)
// =============================================================================

/**
 * List recent search logs.
 * @see SUPABASE_AI.md Phase 8
 */
export async function listSearchLogsAction(
  limit?: number,
  lowQualityOnly?: boolean
): Promise<ActionResult<SearchLogListItem[]>> {
  // RBAC Gate (Owner/Editor can view)
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  // Validate input
  const validation = validateListSearchLogsParams({ limit, lowQualityOnly });
  if (!validation.success) {
    return { success: false, error: validation.error.issues[0]?.message ?? 'Invalid input' };
  }

  try {
    const logs = await listSearchLogs({
      limit: validation.data.limit,
      lowQualityOnly: validation.data.lowQualityOnly,
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error('[listSearchLogsAction] Error:', error);
    return { success: false, error: 'Failed to fetch search logs.' };
  }
}

/**
 * Get search log statistics.
 * @see SUPABASE_AI.md Phase 8
 */
export async function getSearchLogStatsAction(): Promise<ActionResult<SearchLogStats>> {
  // RBAC Gate (Owner/Editor can view)
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const stats = await getSearchLogStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getSearchLogStatsAction] Error:', error);
    return { success: false, error: 'Failed to fetch search statistics.' };
  }
}

/**
 * Get low-quality queries for improvement targeting.
 * @see SUPABASE_AI.md Phase 8
 */
export async function getLowQualityQueriesAction(
  limit?: number
): Promise<ActionResult<SearchLogListItem[]>> {
  // RBAC Gate (Owner/Editor can view)
  const supabase = await createClient();
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    const queries = await getLowQualityQueries(limit ?? 20);
    return { success: true, data: queries };
  } catch (error) {
    console.error('[getLowQualityQueriesAction] Error:', error);
    return { success: false, error: 'Failed to fetch low-quality queries.' };
  }
}

/**
 * Delete old search logs (Owner-only cleanup).
 * @see SUPABASE_AI.md Phase 8
 */
export async function deleteOldSearchLogsAction(
  olderThanDays: number = 30
): Promise<ActionResult<{ deletedCount: number }>> {
  // RBAC Gate (Owner-only)
  const supabase = await createClient();
  const ownerCheck = await isOwner(supabase);
  if (!ownerCheck) {
    return { success: false, error: 'Only owner can delete search logs.' };
  }

  if (olderThanDays < 1 || olderThanDays > 365) {
    return { success: false, error: 'olderThanDays must be between 1 and 365.' };
  }

  try {
    const result = await deleteOldSearchLogs(olderThanDays);
    if (!result.success) {
      return { success: false, error: result.error ?? 'Delete failed.' };
    }
    return { success: true, data: { deletedCount: result.deletedCount } };
  } catch (error) {
    console.error('[deleteOldSearchLogsAction] Error:', error);
    return { success: false, error: 'Failed to delete old search logs.' };
  }
}
