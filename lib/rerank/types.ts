/**
 * Re-ranker Types (SSOT)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §8
 * @see uiux_refactor.md §6.4.2 item 3
 *
 * Type definitions for re-ranking pipeline.
 */

import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Provider Types
// ─────────────────────────────────────────────────────────────────────────────

/** Supported re-rank providers */
export type RerankProvider = 'cohere' | 'none';

/** Cohere re-rank models */
export type CohereRerankModel =
  | 'rerank-english-v3.0'
  | 'rerank-multilingual-v3.0';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-ranking configuration
 * @see DATA_PREPROCESSING.md §8.3
 */
export interface RerankConfig {
  /** Whether re-ranking is enabled (default: true if API key configured) */
  enabled: boolean;
  /** Re-rank provider */
  provider: RerankProvider;
  /** Cohere model to use */
  model: CohereRerankModel;
  /** Number of candidates from coarse search (default: 50) */
  topK: number;
  /** Number of results to return after re-ranking (default: 10) */
  topN: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Candidate Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Candidate from coarse retrieval (embedding similarity)
 * @see DATA_PREPROCESSING.md §8.2
 */
export interface RetrievalCandidate {
  /** Target type (product/post/gallery_item) */
  targetType: EmbeddingTargetType;
  /** Target ID */
  targetId: string;
  /** Chunk index within target */
  chunkIndex: number;
  /** Chunk content for re-ranking */
  content: string;
  /** Coarse score from embedding similarity (0-1) */
  coarseScore: number;
}

/**
 * Result after re-ranking
 */
export interface RerankResult extends RetrievalCandidate {
  /** Fine score from re-ranker (0-1, higher = more relevant) */
  fineScore: number;
  /** Final rank (1-based) */
  finalRank: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cohere API Types (Response shapes)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cohere Rerank API response document
 * @see https://docs.cohere.com/v2/reference/rerank
 */
export interface CohereRerankDocument {
  /** Original document index */
  index: number;
  /** Relevance score (0-1) */
  relevance_score: number;
}

/**
 * Cohere Rerank API response
 */
export interface CohereRerankResponse {
  /** Re-ranked documents */
  results: CohereRerankDocument[];
  /** API meta (tokens billed, etc.) */
  meta?: {
    api_version?: { version: string };
    billed_units?: { search_units: number };
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults
// ─────────────────────────────────────────────────────────────────────────────

/** Default re-rank configuration per PRD §8.3 */
export const RERANK_DEFAULTS: RerankConfig = {
  enabled: true,
  provider: 'cohere',
  model: 'rerank-multilingual-v3.0',
  topK: 50,
  topN: 10,
};
