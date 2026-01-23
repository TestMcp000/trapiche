/**
 * Keyword Search IO Module
 * @see doc/specs/completed/SUPABASE_AI.md Phase 7
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for keyword search using PostgreSQL Full-Text Search.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  KeywordSearchParams,
  KeywordSearchResult,
  EmbeddingTargetType,
} from '@/lib/types/embedding';
import { SEMANTIC_SEARCH_DEFAULTS } from '@/lib/validators/embedding';

/**
 * Perform keyword search using PostgreSQL Full-Text Search.
 * @see SUPABASE_AI.md Phase 7
 *
 * Uses chunk_tsv tsvector column with GIN index for fast text matching.
 */
export async function keywordSearch(
  params: KeywordSearchParams
): Promise<KeywordSearchResult[]> {
  const supabase = createAdminClient();

  const limit = params.limit ?? SEMANTIC_SEARCH_DEFAULTS.limit;
  const targetTypes = params.targetTypes ?? ['post', 'gallery_item'];

  const { data, error } = await supabase.rpc('search_embeddings_keyword', {
    query_text: params.query,
    result_limit: limit,
    filter_types: targetTypes,
  });

  if (error) {
    console.warn('[keywordSearch] RPC error:', error.message);
    return [];
  }

  return (data ?? []).map(
    (row: {
      target_type: string;
      target_id: string;
      chunk_index: number;
      ts_rank: number;
    }) => ({
      targetType: row.target_type as EmbeddingTargetType,
      targetId: row.target_id,
      chunkIndex: row.chunk_index,
      tsRank: row.ts_rank,
    })
  );
}
