/**
 * Embedding Search IO Module - Facade
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Thin facade re-exporting from sub-modules:
 * - semantic-search-io.ts: Vector similarity search
 * - keyword-search-io.ts: PostgreSQL Full-Text Search
 * - hybrid-search-io.ts: Combined semantic + keyword search
 * - similar-items-io.ts: Precomputed recommendations
 */
import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Re-exports from sub-modules
// ─────────────────────────────────────────────────────────────────────────────

// Semantic search (vector similarity)
export { semanticSearch, isSemanticSearchEnabled } from './semantic-search-io';

// Keyword search (PostgreSQL FTS)
export { keywordSearch } from './keyword-search-io';

// Hybrid search (semantic + keyword)
export { hybridSearch } from './hybrid-search-io';

// Similar items (precomputed recommendations)
export { getSimilarItems, updateSimilarItems } from './similar-items-io';
