/**
 * Embedding IO Facade
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Re-exports all embedding IO functions from capability-scoped modules.
 * This maintains backward compatibility for existing imports.
 */
import 'server-only';

// ─────────────────────────────────────────────────────────────────────────────
// Types (re-export for convenience)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  EmbeddingTargetType,
  SimilarItemTargetType,
  EmbeddingQualityStatus,
  EmbeddingPriority,
  EmbeddingQueueStatus,
  Embedding,
  EmbeddingQueueItem,
  SimilarItem,
  GenerateEmbeddingRequest,
  GenerateEmbeddingResponse,
  SemanticSearchParams,
  SemanticSearchResult,
  GetSimilarItemsParams,
  SimilarItemResult,
  EmbeddingStats,
  EmbeddingTypeStats,
  EnqueueEmbeddingRequest,
  ProductEmbeddingData,
  PostEmbeddingData,
  GalleryItemEmbeddingData,
  CommentEmbeddingData,
  // Phase 7: Hybrid Search
  SearchMode,
  KeywordSearchParams,
  KeywordSearchResult,
  HybridSearchParams,
  HybridSearchResult,
} from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Generate Operations
// ─────────────────────────────────────────────────────────────────────────────

export {
  generateEmbedding,
  getEmbeddingHash,
  enqueueEmbedding,
  enqueueEmbeddingBatch,
  updateQueueItemStatus,
  getPendingQueueItems,
  deleteEmbedding,
} from './embedding-generate-io';

// ─────────────────────────────────────────────────────────────────────────────
// Search Operations
// ─────────────────────────────────────────────────────────────────────────────

export {
  semanticSearch,
  getSimilarItems,
  updateSimilarItems,
  isSemanticSearchEnabled,
  // Phase 7: Hybrid Search
  keywordSearch,
  hybridSearch,
} from './embedding-search-io';

// ─────────────────────────────────────────────────────────────────────────────
// Batch Operations
// ─────────────────────────────────────────────────────────────────────────────

export {
  initializeEmbeddingsForType,
  initializeAllEmbeddings,
  retryFailedEmbeddings,
  getEmbeddingStats,
} from './embedding-batch-io';

// ─────────────────────────────────────────────────────────────────────────────
// Similar Items Worker Operations
// ─────────────────────────────────────────────────────────────────────────────

export type {
  SimilarItemsTypeResult,
  SimilarItemsUpdateResult,
} from './similar-items-worker-io';

export {
  updateSimilarItemsForType,
  updateAllSimilarItems,
  initializeSimilarItemsForType,
} from './similar-items-worker-io';

// ─────────────────────────────────────────────────────────────────────────────
// Target Content Operations
// ─────────────────────────────────────────────────────────────────────────────

export type { RawContentResult } from './embedding-target-content-io';

export { getTargetContent } from './embedding-target-content-io';

// ─────────────────────────────────────────────────────────────────────────────
// Quality Metrics (LLM-as-a-Judge)
// ─────────────────────────────────────────────────────────────────────────────

export type { QualityMetrics, FailedSample } from '@/lib/modules/preprocessing/judge-io';

export {
  getQualityMetrics,
  getFailedSamples,
} from '@/lib/modules/preprocessing/judge-io';

// ─────────────────────────────────────────────────────────────────────────────
// Re-ranking Operations (Phase 6.5+)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  RerankConfig,
  RetrievalCandidate,
  RerankResult,
} from '@/lib/rerank/types';

export {
  rerank,
  isRerankEnabled,
  isCohereConfigured,
} from '@/lib/rerank/io';
