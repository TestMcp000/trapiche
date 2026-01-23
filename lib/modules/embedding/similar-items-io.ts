/**
 * Similar Items IO Module
 * @see doc/specs/completed/SUPABASE_AI.md §3.2
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for precomputed similar items queries and updates.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  GetSimilarItemsParams,
  SimilarItemResult,
  SimilarItemTargetType,
} from '@/lib/types/embedding';
import { SIMILAR_ITEMS_DEFAULTS } from '@/lib/validators/embedding';

/**
 * Get similar items from precomputed table.
 * @see SUPABASE_AI.md §3.2
 */
export async function getSimilarItems(
  params: GetSimilarItemsParams
): Promise<SimilarItemResult[]> {
  const supabase = createAdminClient();

  const limit = params.limit ?? SIMILAR_ITEMS_DEFAULTS.limit;

  const { data, error } = await supabase
    .from('similar_items')
    .select('target_type, target_id, similarity_score, rank')
    .eq('source_type', params.sourceType)
    .eq('source_id', params.sourceId)
    .order('rank', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('[getSimilarItems] Query error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    targetType: row.target_type as SimilarItemTargetType,
    targetId: row.target_id,
    similarity: row.similarity_score,
    rank: row.rank,
  }));
}

/**
 * Update similar items for a source.
 * Called by Cron job to refresh precomputed recommendations.
 * @see SUPABASE_AI.md §3.2.0
 */
export async function updateSimilarItems(
  sourceType: SimilarItemTargetType,
  sourceId: string,
  items: Array<{
    targetType: SimilarItemTargetType;
    targetId: string;
    similarity: number;
  }>
): Promise<void> {
  if (items.length === 0) return;

  const supabase = createAdminClient();

  // Delete existing similar items for this source
  await supabase
    .from('similar_items')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  // Insert new similar items with ranks
  const rows = items
    .slice(0, 10) // Max 10 similar items
    .map((item, index) => ({
      source_type: sourceType,
      source_id: sourceId,
      target_type: item.targetType,
      target_id: item.targetId,
      similarity_score: item.similarity,
      rank: index + 1,
      computed_at: new Date().toISOString(),
    }));

  await supabase.from('similar_items').insert(rows);
}
