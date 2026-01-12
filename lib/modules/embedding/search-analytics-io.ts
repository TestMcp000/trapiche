import 'server-only';

/**
 * Search Analytics IO Module (Server-only)
 *
 * IO operations for search logging and analytics.
 * Used by Control Center to track search queries and identify low-quality searches.
 *
 * @see doc/specs/completed/SUPABASE_AI.md Phase 8
 * @see uiux_refactor.md §4 item 8
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import type {
  SearchLog,
  SearchLogListItem,
  SearchLogStats,
  CreateSearchLogRequest,
} from '@/lib/types/embedding';

// =============================================================================
// Types
// =============================================================================

interface ListSearchLogsParams {
  limit?: number;
  lowQualityOnly?: boolean;
}

// =============================================================================
// Log Search
// =============================================================================

/**
 * Log a search query to the database.
 * Called after each search action returns results.
 */
export async function logSearch(
  request: CreateSearchLogRequest,
  userId: string | null
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('search_logs').insert({
    query: request.query,
    mode: request.mode,
    weights: request.weights ?? null,
    threshold: request.threshold ?? null,
    result_limit: request.resultLimit ?? null,
    target_types: request.targetTypes ?? null,
    results_count: request.resultsCount,
    top_score: request.topScore ?? null,
    is_low_quality: request.isLowQuality,
    created_by: userId,
    metadata: request.metadata ?? null,
  });

  if (error) {
    console.error('[logSearch] Error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

// =============================================================================
// List Search Logs
// =============================================================================

/**
 * List recent search logs for analytics panel.
 */
export async function listSearchLogs(
  params: ListSearchLogsParams = {}
): Promise<SearchLogListItem[]> {
  const { limit = 50, lowQualityOnly = false } = params;
  const supabase = await createClient();

  let query = supabase
    .from('search_logs')
    .select('id, query, mode, results_count, top_score, is_low_quality, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (lowQualityOnly) {
    query = query.eq('is_low_quality', true);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[listSearchLogs] Error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    query: row.query,
    mode: row.mode as SearchLog['mode'],
    resultsCount: row.results_count,
    topScore: row.top_score,
    isLowQuality: row.is_low_quality,
    createdAt: row.created_at,
  }));
}

// =============================================================================
// Get Search Log Stats
// =============================================================================

/**
 * Get aggregated search log statistics.
 */
export async function getSearchLogStats(): Promise<SearchLogStats> {
  const supabase = await createClient();

  // Get all logs for statistics (limit to recent 1000 for performance)
  const { data, error } = await supabase
    .from('search_logs')
    .select('mode, results_count, top_score, is_low_quality')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('[getSearchLogStats] Error:', error);
    return {
      totalQueries: 0,
      lowQualityCount: 0,
      lowQualityPercentage: 0,
      byMode: { semantic: 0, keyword: 0, hybrid: 0 },
      avgResultsCount: 0,
      avgTopScore: null,
    };
  }

  const logs = data ?? [];
  const totalQueries = logs.length;

  if (totalQueries === 0) {
    return {
      totalQueries: 0,
      lowQualityCount: 0,
      lowQualityPercentage: 0,
      byMode: { semantic: 0, keyword: 0, hybrid: 0 },
      avgResultsCount: 0,
      avgTopScore: null,
    };
  }

  const lowQualityCount = logs.filter((l) => l.is_low_quality).length;
  const byMode = {
    semantic: logs.filter((l) => l.mode === 'semantic').length,
    keyword: logs.filter((l) => l.mode === 'keyword').length,
    hybrid: logs.filter((l) => l.mode === 'hybrid').length,
  };

  const totalResultsCount = logs.reduce((sum, l) => sum + l.results_count, 0);
  const scoresWithValues = logs.filter((l) => l.top_score !== null);
  const avgTopScore =
    scoresWithValues.length > 0
      ? scoresWithValues.reduce((sum, l) => sum + (l.top_score ?? 0), 0) /
        scoresWithValues.length
      : null;

  return {
    totalQueries,
    lowQualityCount,
    lowQualityPercentage:
      totalQueries > 0 ? Math.round((lowQualityCount / totalQueries) * 100) : 0,
    byMode,
    avgResultsCount: Math.round(totalResultsCount / totalQueries),
    avgTopScore: avgTopScore !== null ? Math.round(avgTopScore * 1000) / 1000 : null,
  };
}

// =============================================================================
// Get Low Quality Queries
// =============================================================================

/**
 * Get unique low-quality queries for improvement targeting.
 * Groups by query text and returns most recent occurrence.
 */
export async function getLowQualityQueries(
  limit: number = 20
): Promise<SearchLogListItem[]> {
  const supabase = await createClient();

  // Get low-quality logs, most recent first
  // Note: We do basic deduplication in application layer since
  // Supabase doesn't support DISTINCT ON in the same way as raw PostgreSQL
  const { data, error } = await supabase
    .from('search_logs')
    .select('id, query, mode, results_count, top_score, is_low_quality, created_at')
    .eq('is_low_quality', true)
    .order('created_at', { ascending: false })
    .limit(limit * 3); // Fetch extra for deduplication

  if (error) {
    console.error('[getLowQualityQueries] Error:', error);
    return [];
  }

  // Deduplicate by query text, keeping most recent
  const seen = new Set<string>();
  const unique: SearchLogListItem[] = [];

  for (const row of data ?? []) {
    const normalizedQuery = row.query.toLowerCase().trim();
    if (!seen.has(normalizedQuery)) {
      seen.add(normalizedQuery);
      unique.push({
        id: row.id,
        query: row.query,
        mode: row.mode as SearchLog['mode'],
        resultsCount: row.results_count,
        topScore: row.top_score,
        isLowQuality: row.is_low_quality,
        createdAt: row.created_at,
      });
      if (unique.length >= limit) break;
    }
  }

  return unique;
}

// =============================================================================
// Delete Search Logs (Owner-only cleanup)
// =============================================================================

/**
 * Delete old search logs (Owner-only, for cleanup).
 * @param olderThanDays Delete logs older than this many days
 */
export async function deleteOldSearchLogs(
  olderThanDays: number = 30
): Promise<{ success: boolean; deletedCount: number; error?: string }> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

  const { data, error } = await supabase
    .from('search_logs')
    .delete()
    .lt('created_at', cutoffDate.toISOString())
    .select('id');

  if (error) {
    console.error('[deleteOldSearchLogs] Error:', error);
    return { success: false, deletedCount: 0, error: error.message };
  }

  return { success: true, deletedCount: data?.length ?? 0 };
}
