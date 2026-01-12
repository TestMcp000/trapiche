/**
 * Embedding Cached Reads
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3.2 item 3
 *
 * SSR cached reads for embedding-related queries (public UI).
 * Uses cachedQuery for efficient server-side rendering.
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type {
  SimilarItemTargetType,
  SimilarItemResult,
} from '@/lib/types/embedding';
import { getSimilarItems, isSemanticSearchEnabled } from './embedding-search-io';

const CACHE_REVALIDATE_SECONDS = 300; // 5 minutes for similar items

// ─────────────────────────────────────────────────────────────────────────────
// Similar Items Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cached similar items query.
 * @see SUPABASE_AI.md §3.2
 */
export function getSimilarItemsCached(
  sourceType: SimilarItemTargetType,
  sourceId: string,
  limit = 4
): Promise<SimilarItemResult[]> {
  return cachedQuery(
    async (): Promise<SimilarItemResult[]> => {
      try {
        return await getSimilarItems({ sourceType, sourceId, limit });
      } catch (error) {
        console.error(`[getSimilarItemsCached] Error for ${sourceType}/${sourceId}:`, error);
        return [];
      }
    },
    [`similar-items-${sourceType}-${sourceId}`],
    ['embeddings'],
    CACHE_REVALIDATE_SECONDS
  )();
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature Gate Cache
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cached check for semantic search availability.
 * Returns true if embeddings table has data.
 */
export const isSemanticSearchEnabledCached = cachedQuery(
  async (): Promise<boolean> => {
    try {
      return await isSemanticSearchEnabled();
    } catch (error) {
      console.error('[isSemanticSearchEnabledCached] Error:', error);
      return false;
    }
  },
  ['semantic-search-enabled'],
  ['embeddings'],
  CACHE_REVALIDATE_SECONDS
);
