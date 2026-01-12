/**
 * Embedding Search IO Module
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for semantic search and similar items queries.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  SemanticSearchParams,
  SemanticSearchResult,
  GetSimilarItemsParams,
  SimilarItemResult,
  SimilarItemTargetType,
  KeywordSearchParams,
  KeywordSearchResult,
  HybridSearchParams,
  HybridSearchResult,
  EmbeddingTargetType,
} from '@/lib/types/embedding';
import {
  SEMANTIC_SEARCH_DEFAULTS,
  SIMILAR_ITEMS_DEFAULTS,
  HYBRID_SEARCH_DEFAULTS,
} from '@/lib/validators/embedding';

const QUERY_PLACEHOLDER_TARGET_ID = '00000000-0000-0000-0000-000000000000';

// ─────────────────────────────────────────────────────────────────────────────
// Semantic Search
// ─────────────────────────────────────────────────────────────────────────────

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
  const { data: embeddingResult, error: embeddingError } = await supabase.functions.invoke(
    'generate-embedding',
    {
      body: {
        content: params.query,
        targetType: 'post', // Query type doesn't affect embedding
        targetId: QUERY_PLACEHOLDER_TARGET_ID, // Placeholder for query
        store: false, // Do not persist query embeddings
      },
    }
  );

  if (embeddingError || !embeddingResult?.success || !embeddingResult?.embedding) {
    console.error('[semanticSearch] Query embedding failed:', embeddingError);
    return [];
  }

  const queryEmbedding = embeddingResult.embedding as number[];

  // 2. Build type filter
  const targetTypes = params.targetTypes ?? ['product', 'post', 'gallery_item'];

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
    console.warn('[semanticSearch] RPC not available, returning empty results:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((row: { target_id: string }) => row.target_id !== QUERY_PLACEHOLDER_TARGET_ID)
    .map((row: { target_type: string; target_id: string; similarity: number; chunk_index: number }) => ({
      targetType: row.target_type as SemanticSearchResult['targetType'],
      targetId: row.target_id,
      similarity: row.similarity,
      chunkIndex: row.chunk_index,
    }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Similar Items (Precomputed)
// ─────────────────────────────────────────────────────────────────────────────

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
  items: Array<{ targetType: SimilarItemTargetType; targetId: string; similarity: number }>
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

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Search (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────

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
  const targetTypes = params.targetTypes ?? ['product', 'post', 'gallery_item'];

  const { data, error } = await supabase.rpc('search_embeddings_keyword', {
    query_text: params.query,
    result_limit: limit,
    filter_types: targetTypes,
  });

  if (error) {
    console.warn('[keywordSearch] RPC error:', error.message);
    return [];
  }

  return (data ?? []).map((row: { target_type: string; target_id: string; chunk_index: number; ts_rank: number }) => ({
    targetType: row.target_type as EmbeddingTargetType,
    targetId: row.target_id,
    chunkIndex: row.chunk_index,
    tsRank: row.ts_rank,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid Search (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Perform hybrid search combining semantic and keyword search.
 * @see SUPABASE_AI.md Phase 7
 * 
 * Algorithm:
 * 1. Run semantic and keyword searches in parallel
 * 2. Normalize scores (semantic: already 0-1, keyword: max normalization)
 * 3. Combine: final_score = (semantic × α) + (keyword × β)
 * 4. Return union of results sorted by combined score
 */
export async function hybridSearch(
  params: HybridSearchParams
): Promise<HybridSearchResult[]> {
  const semanticWeight = params.semanticWeight ?? HYBRID_SEARCH_DEFAULTS.semanticWeight;
  const keywordWeight = params.keywordWeight ?? HYBRID_SEARCH_DEFAULTS.keywordWeight;
  const limit = params.limit ?? HYBRID_SEARCH_DEFAULTS.limit;
  const threshold = params.threshold ?? HYBRID_SEARCH_DEFAULTS.threshold;

  // Run both searches in parallel (fetch more to account for union deduplication)
  const [semanticResults, keywordResults] = await Promise.all([
    semanticSearch({
      query: params.query,
      targetTypes: params.targetTypes,
      limit: limit * 2,
      threshold: 0.4, // Lower threshold for hybrid (combined score may push above threshold)
    }),
    keywordSearch({
      query: params.query,
      targetTypes: params.targetTypes,
      limit: limit * 2,
    }),
  ]);

  // Create maps for score lookup (use composite key to avoid duplicates)
  const semanticMap = new Map<string, number>();
  for (const r of semanticResults) {
    const key = `${r.targetType}:${r.targetId}`;
    // Keep the highest similarity if there are multiple chunks
    semanticMap.set(key, Math.max(semanticMap.get(key) ?? 0, r.similarity));
  }

  const keywordMap = new Map<string, number>();
  // Max-normalize keyword scores (ts_rank is unbounded, so normalize to 0-1)
  const maxTsRank = keywordResults.length > 0
    ? Math.max(...keywordResults.map(r => r.tsRank))
    : 1;
  
  for (const r of keywordResults) {
    const key = `${r.targetType}:${r.targetId}`;
    const normalizedScore = maxTsRank > 0 ? r.tsRank / maxTsRank : 0;
    // Keep the highest score if there are multiple chunks
    keywordMap.set(key, Math.max(keywordMap.get(key) ?? 0, normalizedScore));
  }

  // Combine all unique results
  const allKeys = new Set([...semanticMap.keys(), ...keywordMap.keys()]);
  const results: HybridSearchResult[] = [];

  for (const key of allKeys) {
    const [targetType, targetId] = key.split(':');
    const semanticScore = semanticMap.get(key) ?? 0;
    const keywordScore = keywordMap.get(key) ?? 0;
    const combinedScore = (semanticScore * semanticWeight) + (keywordScore * keywordWeight);

    // Only include results above threshold
    if (combinedScore >= threshold) {
      results.push({
        targetType: targetType as EmbeddingTargetType,
        targetId,
        semanticScore,
        keywordScore,
        combinedScore,
      });
    }
  }

  // Sort by combined score descending and limit results
  results.sort((a, b) => b.combinedScore - a.combinedScore);

  return results.slice(0, limit);
}

