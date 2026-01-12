/**
 * Embedding Types (SSOT)
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Type definitions for vector embedding operations.
 * These types are used by:
 * - lib/modules/embedding/*-io.ts (server-only IO modules)
 * - lib/validators/embedding.ts (validation schemas)
 * - Edge Functions (generate-embedding)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Target Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entities that can have embeddings.
 * @see SUPABASE_AI.md §2.2 for content composition per type
 */
export type EmbeddingTargetType = 'product' | 'post' | 'gallery_item' | 'comment';

/**
 * Entities that can have similar items (excludes comments).
 * @see SUPABASE_AI.md §3.2
 */
export type SimilarItemTargetType = 'product' | 'post' | 'gallery_item';

/**
 * Quality status for embedding verification.
 * @see SUPABASE_AI.md §5 for quality gate logic
 */
export type EmbeddingQualityStatus = 'passed' | 'incomplete' | 'failed';

/**
 * Priority levels for embedding queue.
 * @see SUPABASE_AI.md §4.3
 */
export type EmbeddingPriority = 'high' | 'normal' | 'low';

/**
 * Queue item status.
 */
export type EmbeddingQueueStatus = 'pending' | 'processing' | 'completed' | 'failed';

// ─────────────────────────────────────────────────────────────────────────────
// Database Row Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Embedding row from database.
 * @see SUPABASE_AI.md §2.1.1
 */
export interface Embedding {
  id: string;
  target_type: EmbeddingTargetType;
  target_id: string;
  chunk_index: number;
  chunk_total: number;
  embedding: number[]; // vector(1536)
  content_hash: string;
  chunk_content: string | null;
  preprocessing_metadata: Record<string, unknown> | null;
  enrichment_metadata: Record<string, unknown> | null;
  quality_status: EmbeddingQualityStatus;
  quality_score: number | null;
  quality_check_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Embedding queue item from database.
 * @see SUPABASE_AI.md §4.3
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export interface EmbeddingQueueItem {
  id: string;
  target_type: EmbeddingTargetType;
  target_id: string;
  priority: EmbeddingPriority;
  status: EmbeddingQueueStatus;
  attempts: number;
  error_message: string | null;
  quality_status: EmbeddingQualityStatus | null;
  processing_metadata: Record<string, unknown> | null;
  created_at: string;
  processed_at: string | null;
  // Lease fields for concurrency control
  processing_token: string | null;
  lease_expires_at: string | null;
  processing_started_at: string | null;
}

/**
 * Result from claim_embedding_queue_items RPC.
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export interface ClaimedQueueItem {
  targetType: EmbeddingTargetType;
  targetId: string;
  processingToken: string;
  leaseExpiresAt: string;
}

/**
 * Similar item (precomputed recommendation).
 * @see SUPABASE_AI.md §3.2.0
 */
export interface SimilarItem {
  id: string;
  source_type: SimilarItemTargetType;
  source_id: string;
  target_type: SimilarItemTargetType;
  target_id: string;
  similarity_score: number; // 0.000 - 1.000
  rank: number; // 1-10
  computed_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request/Response Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Request to generate embedding via Edge Function.
 * @see SUPABASE_AI.md §4.1
 */
export interface GenerateEmbeddingRequest {
  content: string;
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex?: number;
  chunkTotal?: number;
}

/**
 * Response from Edge Function embedding generation.
 */
export interface GenerateEmbeddingResponse {
  success: boolean;
  embedding?: number[];
  model?: string;
  dimensions?: number;
  contentHash?: string;
  error?: string;
}

/**
 * Parameters for semantic search.
 * @see SUPABASE_AI.md §3.1.1
 */
export interface SemanticSearchParams {
  query: string;
  targetTypes?: EmbeddingTargetType[];
  limit?: number; // default: 20
  threshold?: number; // default: 0.7
}

/**
 * Result from semantic search (without full content).
 * @see SUPABASE_AI.md §3.1.1
 */
export interface SemanticSearchResult {
  targetType: EmbeddingTargetType;
  targetId: string;
  similarity: number; // 0-1, higher = more similar
  chunkIndex?: number;
}

/**
 * Parameters for getting similar items.
 * @see SUPABASE_AI.md §3.2
 */
export interface GetSimilarItemsParams {
  sourceType: SimilarItemTargetType;
  sourceId: string;
  limit?: number; // default: 4
}

/**
 * Result from similar items query.
 */
export interface SimilarItemResult {
  targetType: SimilarItemTargetType;
  targetId: string;
  similarity: number;
  rank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hybrid Search Types (Phase 7)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search mode for Control Center.
 * @see SUPABASE_AI.md Phase 7
 */
export type SearchMode = 'semantic' | 'keyword' | 'hybrid';

/**
 * Parameters for keyword search.
 * @see SUPABASE_AI.md Phase 7
 */
export interface KeywordSearchParams {
  query: string;
  targetTypes?: EmbeddingTargetType[];
  limit?: number;
}

/**
 * Parameters for hybrid search.
 * @see SUPABASE_AI.md Phase 7
 */
export interface HybridSearchParams {
  query: string;
  targetTypes?: EmbeddingTargetType[];
  limit?: number;
  semanticWeight?: number; // default: 0.7
  keywordWeight?: number;  // default: 0.3
  threshold?: number;      // minimum combined score
}

/**
 * Result from keyword search.
 */
export interface KeywordSearchResult {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex?: number;
  tsRank: number; // Raw ts_rank score from PostgreSQL FTS
}

/**
 * Result from hybrid search with combined scoring.
 * @see SUPABASE_AI.md Phase 7 for scoring algorithm
 */
export interface HybridSearchResult {
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex?: number;
  semanticScore: number;  // Normalized 0-1
  keywordScore: number;   // Normalized 0-1
  combinedScore: number;  // Weighted combination
}

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard/Status Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Embedding statistics for admin dashboard.
 * @see SUPABASE_AI.md §4.2
 */
export interface EmbeddingStats {
  products: EmbeddingTypeStats;
  posts: EmbeddingTypeStats;
  galleryItems: EmbeddingTypeStats;
  comments: EmbeddingTypeStats;
  queuePending: number;
  queueFailed: number;
}

/**
 * Stats for a single target type.
 */
export interface EmbeddingTypeStats {
  total: number;
  withEmbedding: number;
  failed: number;
}

/**
 * Enqueue request for embedding generation.
 */
export interface EnqueueEmbeddingRequest {
  targetType: EmbeddingTargetType;
  targetId: string;
  priority?: EmbeddingPriority;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Composition Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Product data for embedding composition.
 * @see SUPABASE_AI.md §2.2
 */
export interface ProductEmbeddingData {
  name: string;
  description_en?: string | null;
  description_zh?: string | null;
  tags?: string[];
}

/**
 * Post data for embedding composition.
 * @see SUPABASE_AI.md §2.2
 */
export interface PostEmbeddingData {
  title_en?: string | null;
  title_zh?: string | null;
  excerpt_en?: string | null;
  excerpt_zh?: string | null;
}

/**
 * Gallery item data for embedding composition.
 * @see SUPABASE_AI.md §2.2
 */
export interface GalleryItemEmbeddingData {
  title_en?: string | null;
  title_zh?: string | null;
  description_en?: string | null;
  description_zh?: string | null;
}

/**
 * Comment data for embedding composition.
 * @see SUPABASE_AI.md §2.2
 */
export interface CommentEmbeddingData {
  content: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Analytics Types (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Search mode for analytics.
 * @see SUPABASE_AI.md Phase 8
 */
export type SearchLogMode = 'semantic' | 'keyword' | 'hybrid';

/**
 * Search log entry from database.
 * @see SUPABASE_AI.md Phase 8: Search Analytics
 */
export interface SearchLog {
  id: string;
  query: string;
  mode: SearchLogMode;
  weights: { semanticWeight?: number; keywordWeight?: number } | null;
  threshold: number | null;
  resultLimit: number | null;
  targetTypes: EmbeddingTargetType[] | null;
  resultsCount: number;
  topScore: number | null;
  isLowQuality: boolean;
  createdBy: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
}

/**
 * Search log list item for analytics panel.
 */
export interface SearchLogListItem {
  id: string;
  query: string;
  mode: SearchLogMode;
  resultsCount: number;
  topScore: number | null;
  isLowQuality: boolean;
  createdAt: string;
}

/**
 * Aggregated search log statistics.
 */
export interface SearchLogStats {
  totalQueries: number;
  lowQualityCount: number;
  lowQualityPercentage: number;
  byMode: {
    semantic: number;
    keyword: number;
    hybrid: number;
  };
  avgResultsCount: number;
  avgTopScore: number | null;
}

/**
 * Request to create a search log entry.
 */
export interface CreateSearchLogRequest {
  query: string;
  mode: SearchLogMode;
  weights?: { semanticWeight?: number; keywordWeight?: number };
  threshold?: number;
  resultLimit?: number;
  targetTypes?: EmbeddingTargetType[];
  resultsCount: number;
  topScore?: number;
  isLowQuality: boolean;
  metadata?: Record<string, unknown>;
}
