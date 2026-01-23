/**
 * Semantic Search IO Module
 * @see doc/specs/completed/SUPABASE_AI.md §3.1.1
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for semantic search using vector similarity.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  SemanticSearchParams,
  SemanticSearchResult,
} from '@/lib/types/embedding';
import { SEMANTIC_SEARCH_DEFAULTS } from '@/lib/validators/embedding';

const QUERY_PLACEHOLDER_TARGET_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Perform semantic search using vector similarity.
 * @see SUPABASE_AI.md §3.1.1
 *
 * Flow:
 * 1. Generate embedding for query text (via Edge Function)
 * 2. Find similar embeddings in DB using cosine similarity
 * 3. Return ranked results above threshold
 */
export async function semanticSearch(
  params: SemanticSearchParams
): Promise<SemanticSearchResult[]> {
  const supabase = createAdminClient();

  const limit = params.limit ?? SEMANTIC_SEARCH_DEFAULTS.limit;
  const threshold = params.threshold ?? SEMANTIC_SEARCH_DEFAULTS.threshold;

  // 1. Generate query embedding via Edge Function
  const { data: embeddingResult, error: embeddingError } =
    await supabase.functions.invoke('generate-embedding', {
      body: {
        content: params.query,
        targetType: 'post', // Query type doesn't affect embedding
        targetId: QUERY_PLACEHOLDER_TARGET_ID, // Placeholder for query
        store: false, // Do not persist query embeddings
      },
    });

  if (
    embeddingError ||
    !embeddingResult?.success ||
    !embeddingResult?.embedding
  ) {
    console.error('[semanticSearch] Query embedding failed:', embeddingError);
    return [];
  }

  const queryEmbedding = embeddingResult.embedding as number[];

  // 2. Build type filter
  const targetTypes = params.targetTypes ?? ['post', 'gallery_item'];

  // 3. Query similar embeddings using pgvector
  // Note: We use a raw query for vector similarity as Supabase client doesn't have native pgvector support
  // The similarity is calculated as: 1 - (embedding <=> query_embedding)
  const { data, error } = await supabase.rpc('match_embeddings', {
    query_embedding: queryEmbedding,
    match_threshold: threshold,
    match_count: limit,
    filter_types: targetTypes,
  });

  if (error) {
    // RPC may not exist yet - fall back to empty results
    console.warn(
      '[semanticSearch] RPC not available, returning empty results:',
      error.message
    );
    return [];
  }

  return (data ?? [])
    .filter(
      (row: { target_id: string }) =>
        row.target_id !== QUERY_PLACEHOLDER_TARGET_ID
    )
    .map(
      (row: {
        target_type: string;
        target_id: string;
        similarity: number;
        chunk_index: number;
      }) => ({
        targetType: row.target_type as SemanticSearchResult['targetType'],
        targetId: row.target_id,
        similarity: row.similarity,
        chunkIndex: row.chunk_index,
      })
    );
}

/**
 * Check if semantic search is available.
 * Returns true if embeddings table has data.
 * @see SUPABASE_AI.md §5.2.1
 */
export async function isSemanticSearchEnabled(): Promise<boolean> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from('embeddings')
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error('[isSemanticSearchEnabled] Error:', error);
    return false;
  }

  return (count ?? 0) > 0;
}
