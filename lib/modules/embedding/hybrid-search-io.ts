/**
 * Hybrid Search IO Module
 * @see doc/specs/completed/SUPABASE_AI.md Phase 7
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for hybrid search combining semantic and keyword search.
 */
import 'server-only';

import type {
  HybridSearchParams,
  HybridSearchResult,
  EmbeddingTargetType,
} from '@/lib/types/embedding';
import { HYBRID_SEARCH_DEFAULTS } from '@/lib/validators/embedding';
import { semanticSearch } from './semantic-search-io';
import { keywordSearch } from './keyword-search-io';

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
  const semanticWeight =
    params.semanticWeight ?? HYBRID_SEARCH_DEFAULTS.semanticWeight;
  const keywordWeight =
    params.keywordWeight ?? HYBRID_SEARCH_DEFAULTS.keywordWeight;
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
  const maxTsRank =
    keywordResults.length > 0
      ? Math.max(...keywordResults.map((r) => r.tsRank))
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
    const combinedScore =
      semanticScore * semanticWeight + keywordScore * keywordWeight;

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
