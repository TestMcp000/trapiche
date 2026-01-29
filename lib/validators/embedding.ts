/**
 * Embedding Validators (Pure Module)
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Pure validation schemas for embedding inputs.
 * No IO, no side effects, fully testable.
 */

import { z } from 'zod';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const EMBEDDING_TARGET_TYPES = ['post', 'gallery_item', 'comment', 'safety_slang', 'safety_case'] as const;
export const SIMILAR_ITEM_TARGET_TYPES = ['post', 'gallery_item'] as const;
export const EMBEDDING_PRIORITIES = ['high', 'normal', 'low'] as const;

/**
 * Default semantic search settings.
 * @see SUPABASE_AI.md §3.1
 */
export const SEMANTIC_SEARCH_DEFAULTS = {
  limit: 20,
  threshold: 0.7,
} as const;

/**
 * Default similar items settings.
 * @see SUPABASE_AI.md §3.2
 */
export const SIMILAR_ITEMS_DEFAULTS = {
  limit: 4,
} as const;

/**
 * Search modes for Control Center.
 * @see SUPABASE_AI.md Phase 7
 */
export const SEARCH_MODES = ['semantic', 'keyword', 'hybrid'] as const;

/**
 * Default hybrid search settings.
 * @see SUPABASE_AI.md Phase 7
 */
export const HYBRID_SEARCH_DEFAULTS = {
  limit: 20,
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  threshold: 0.5,
} as const;

/**
 * Token limits for embedding.
 * @see SUPABASE_AI.md §5.1
 */
export const EMBEDDING_LIMITS = {
  maxTokens: 8000, // buffer from ada-002's 8191 limit
  maxChunkSize: 6000, // tokens per chunk (with overlap)
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Target type schema.
 */
export const embeddingTargetTypeSchema = z.enum(EMBEDDING_TARGET_TYPES);

/**
 * Similar item target type schema (excludes comments).
 */
export const similarItemTargetTypeSchema = z.enum(SIMILAR_ITEM_TARGET_TYPES);

/**
 * Priority schema.
 */
export const embeddingPrioritySchema = z.enum(EMBEDDING_PRIORITIES);

/**
 * Generate embedding request schema.
 */
export const generateEmbeddingRequestSchema = z.object({
  content: z.string().min(1, '內容為必填').max(100000, '內容過長'),
  targetType: embeddingTargetTypeSchema,
  targetId: z.string().uuid('targetId 無效'),
  chunkIndex: z.number().int().min(0).optional(),
  chunkTotal: z.number().int().min(1).optional(),
});

/**
 * Semantic search params schema.
 * @see SUPABASE_AI.md §3.1.1
 */
export const semanticSearchParamsSchema = z.object({
  query: z.string().min(1, 'query 為必填').max(1000, 'query 過長'),
  targetTypes: z.array(embeddingTargetTypeSchema).optional(),
  limit: z.number().int().min(1).max(100).optional().default(SEMANTIC_SEARCH_DEFAULTS.limit),
  threshold: z.number().min(0).max(1).optional().default(SEMANTIC_SEARCH_DEFAULTS.threshold),
});

/**
 * Get similar items params schema.
 * @see SUPABASE_AI.md §3.2
 */
export const getSimilarItemsParamsSchema = z.object({
  sourceType: similarItemTargetTypeSchema,
  sourceId: z.string().uuid('sourceId 無效'),
  limit: z.number().int().min(1).max(10).optional().default(SIMILAR_ITEMS_DEFAULTS.limit),
});

/**
 * Enqueue embedding request schema.
 */
export const enqueueEmbeddingRequestSchema = z.object({
  targetType: embeddingTargetTypeSchema,
  targetId: z.string().uuid('targetId 無效'),
  priority: embeddingPrioritySchema.optional().default('normal'),
});

/**
 * Search mode schema.
 */
export const searchModeSchema = z.enum(SEARCH_MODES);

/**
 * Keyword search params schema.
 * @see SUPABASE_AI.md Phase 7
 */
export const keywordSearchParamsSchema = z.object({
  query: z.string().min(1, 'query 為必填').max(1000, 'query 過長'),
  targetTypes: z.array(embeddingTargetTypeSchema).optional(),
  limit: z.number().int().min(1).max(100).optional().default(SEMANTIC_SEARCH_DEFAULTS.limit),
});

/**
 * Hybrid search params schema.
 * @see SUPABASE_AI.md Phase 7
 */
export const hybridSearchParamsSchema = z.object({
  query: z.string().min(1, 'query 為必填').max(1000, 'query 過長'),
  targetTypes: z.array(embeddingTargetTypeSchema).optional(),
  limit: z.number().int().min(1).max(100).optional().default(HYBRID_SEARCH_DEFAULTS.limit),
  semanticWeight: z.number().min(0).max(1).optional().default(HYBRID_SEARCH_DEFAULTS.semanticWeight),
  keywordWeight: z.number().min(0).max(1).optional().default(HYBRID_SEARCH_DEFAULTS.keywordWeight),
  threshold: z.number().min(0).max(1).optional().default(HYBRID_SEARCH_DEFAULTS.threshold),
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate semantic search params.
 */
export function validateSemanticSearchParams(params: unknown) {
  return semanticSearchParamsSchema.safeParse(params);
}

/**
 * Validate similar items params.
 */
export function validateGetSimilarItemsParams(params: unknown) {
  return getSimilarItemsParamsSchema.safeParse(params);
}

/**
 * Validate generate embedding request.
 */
export function validateGenerateEmbeddingRequest(request: unknown) {
  return generateEmbeddingRequestSchema.safeParse(request);
}

/**
 * Validate enqueue embedding request.
 */
export function validateEnqueueEmbeddingRequest(request: unknown) {
  return enqueueEmbeddingRequestSchema.safeParse(request);
}

/**
 * Validate keyword search params.
 */
export function validateKeywordSearchParams(params: unknown) {
  return keywordSearchParamsSchema.safeParse(params);
}

/**
 * Validate hybrid search params.
 */
export function validateHybridSearchParams(params: unknown) {
  return hybridSearchParamsSchema.safeParse(params);
}

// ─────────────────────────────────────────────────────────────────────────────
// Search Analytics (Phase 8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default search analytics settings.
 * @see SUPABASE_AI.md Phase 8
 */
export const SEARCH_ANALYTICS_DEFAULTS = {
  listLimit: 50,
  lowQualityThreshold: 0.5, // top_score below this = low quality
} as const;

/**
 * Search log mode schema.
 */
export const searchLogModeSchema = z.enum(SEARCH_MODES);

/**
 * Create search log request schema.
 * @see SUPABASE_AI.md Phase 8
 */
export const createSearchLogRequestSchema = z.object({
  query: z.string().min(1, 'query 為必填'),
  mode: searchLogModeSchema,
  weights: z.object({
    semanticWeight: z.number().min(0).max(1).optional(),
    keywordWeight: z.number().min(0).max(1).optional(),
  }).optional(),
  threshold: z.number().min(0).max(1).optional(),
  resultLimit: z.number().int().min(1).max(100).optional(),
  targetTypes: z.array(embeddingTargetTypeSchema).optional(),
  resultsCount: z.number().int().min(0),
  topScore: z.number().min(0).max(1).optional(),
  isLowQuality: z.boolean(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

/**
 * List search logs params schema.
 */
export const listSearchLogsParamsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional().default(SEARCH_ANALYTICS_DEFAULTS.listLimit),
  lowQualityOnly: z.boolean().optional().default(false),
});

/**
 * Validate create search log request.
 */
export function validateCreateSearchLogRequest(request: unknown) {
  return createSearchLogRequestSchema.safeParse(request);
}

/**
 * Validate list search logs params.
 */
export function validateListSearchLogsParams(params: unknown) {
  return listSearchLogsParamsSchema.safeParse(params);
}

/**
 * Check if a search result is low quality.
 * @param resultsCount Number of results returned
 * @param topScore The highest score from results
 * @param threshold The search threshold used
 */
export function isLowQualitySearch(
  resultsCount: number,
  topScore: number | undefined,
  threshold: number = SEARCH_ANALYTICS_DEFAULTS.lowQualityThreshold
): boolean {
  if (resultsCount === 0) return true;
  if (topScore !== undefined && topScore < threshold) return true;
  return false;
}
