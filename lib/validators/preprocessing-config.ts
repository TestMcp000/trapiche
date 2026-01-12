/**
 * Preprocessing Config Validators (SSOT)
 * @see doc/specs/completed/DATA_PREPROCESSING.md Phase 7
 * @see uiux_refactor.md §6.4
 *
 * Zod schemas for validating preprocessing configuration.
 * Used by config-io.ts and config-admin-io.ts.
 */

import { z } from 'zod';
import type { ChunkingConfig, ChunkingStrategy, QualityGateConfig } from '@/lib/modules/preprocessing/types';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Constants (bounds for validation)
// ─────────────────────────────────────────────────────────────────────────────

/** Valid chunking strategies */
export const CHUNKING_STRATEGIES: ChunkingStrategy[] = [
  'sentence',
  'paragraph',
  'semantic',
  'fixed',
];

/** Bounds for chunking config values */
export const CHUNKING_BOUNDS = {
  targetSize: { min: 50, max: 2000 },
  overlap: { min: 0, max: 500 },
  minSize: { min: 1, max: 1000 },
  maxSize: { min: 100, max: 5000 },
} as const;

/** Bounds for quality gate config values */
export const QUALITY_BOUNDS = {
  minLength: { min: 1, max: 1000 },
  maxLength: { min: 100, max: 10000 },
  minQualityScore: { min: 0, max: 1 },
  maxNoiseRatio: { min: 0, max: 1 },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schemas
// ─────────────────────────────────────────────────────────────────────────────

/** Schema for ChunkingConfig */
export const chunkingConfigSchema = z.object({
  targetSize: z
    .number()
    .int()
    .min(CHUNKING_BOUNDS.targetSize.min)
    .max(CHUNKING_BOUNDS.targetSize.max),
  overlap: z
    .number()
    .int()
    .min(CHUNKING_BOUNDS.overlap.min)
    .max(CHUNKING_BOUNDS.overlap.max),
  splitBy: z.enum(['sentence', 'paragraph', 'semantic', 'fixed']),
  minSize: z
    .number()
    .int()
    .min(CHUNKING_BOUNDS.minSize.min)
    .max(CHUNKING_BOUNDS.minSize.max),
  maxSize: z
    .number()
    .int()
    .min(CHUNKING_BOUNDS.maxSize.min)
    .max(CHUNKING_BOUNDS.maxSize.max),
  useHeadingsAsBoundary: z.boolean(),
});

/** Schema for QualityGateConfig */
export const qualityGateConfigSchema = z.object({
  minLength: z
    .number()
    .int()
    .min(QUALITY_BOUNDS.minLength.min)
    .max(QUALITY_BOUNDS.minLength.max),
  maxLength: z
    .number()
    .int()
    .min(QUALITY_BOUNDS.maxLength.min)
    .max(QUALITY_BOUNDS.maxLength.max),
  minQualityScore: z
    .number()
    .min(QUALITY_BOUNDS.minQualityScore.min)
    .max(QUALITY_BOUNDS.minQualityScore.max),
  maxNoiseRatio: z
    .number()
    .min(QUALITY_BOUNDS.maxNoiseRatio.min)
    .max(QUALITY_BOUNDS.maxNoiseRatio.max),
});

/** Schema for per-type config (partial) */
export const typePreprocessingConfigSchema = z.object({
  chunking: chunkingConfigSchema.partial().optional(),
  quality: qualityGateConfigSchema.partial().optional(),
});

/** Schema for the entire preprocessing_config JSONB */
export const preprocessingConfigSchema = z.record(
  z.enum(['product', 'post', 'gallery_item', 'comment']),
  typePreprocessingConfigSchema
);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Validated preprocessing config type */
export type PreprocessingConfig = z.infer<typeof preprocessingConfigSchema>;

/** Validated per-type config (with optional fields) */
export type PartialTypeConfig = z.infer<typeof typePreprocessingConfigSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Validate preprocessing config.
 * @pure
 */
export function validatePreprocessingConfig(
  config: unknown
): ValidationResult<PreprocessingConfig> {
  const result = preprocessingConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
  };
}

/**
 * Validate a single type's chunking config.
 * @pure
 */
export function validateChunkingConfig(
  config: unknown
): ValidationResult<Partial<ChunkingConfig>> {
  const result = chunkingConfigSchema.partial().safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Merge / Default Functions (Pure)
// ─────────────────────────────────────────────────────────────────────────────

/** Default chunking configs (copy from chunkers.ts for reference) */
export const DEFAULT_CHUNKING_CONFIGS: Record<EmbeddingTargetType, ChunkingConfig> = {
  product: {
    targetSize: 300,
    overlap: 45,
    splitBy: 'semantic',
    minSize: 64,
    maxSize: 600,
    useHeadingsAsBoundary: true,
  },
  post: {
    targetSize: 500,
    overlap: 75,
    splitBy: 'semantic',
    minSize: 128,
    maxSize: 1000,
    useHeadingsAsBoundary: true,
  },
  gallery_item: {
    targetSize: 128,
    overlap: 20,
    splitBy: 'sentence',
    minSize: 32,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
  comment: {
    targetSize: 128,
    overlap: 0,
    splitBy: 'sentence',
    minSize: 16,
    maxSize: 256,
    useHeadingsAsBoundary: false,
  },
};

/** Default quality gate config */
export const DEFAULT_QUALITY_CONFIG: QualityGateConfig = {
  minLength: 16,
  maxLength: 5000,
  minQualityScore: 0.3,
  maxNoiseRatio: 0.7,
};

/**
 * Merge DB config with defaults for a specific target type.
 * DB config takes precedence where specified.
 * @pure
 */
export function mergeChunkingWithDefaults(
  targetType: EmbeddingTargetType,
  dbConfig: Partial<ChunkingConfig> | undefined
): ChunkingConfig {
  const defaults = DEFAULT_CHUNKING_CONFIGS[targetType];

  if (!dbConfig) {
    return defaults;
  }

  return {
    targetSize: dbConfig.targetSize ?? defaults.targetSize,
    overlap: dbConfig.overlap ?? defaults.overlap,
    splitBy: dbConfig.splitBy ?? defaults.splitBy,
    minSize: dbConfig.minSize ?? defaults.minSize,
    maxSize: dbConfig.maxSize ?? defaults.maxSize,
    useHeadingsAsBoundary: dbConfig.useHeadingsAsBoundary ?? defaults.useHeadingsAsBoundary,
  };
}

/**
 * Merge quality gate config with defaults.
 * @pure
 */
export function mergeQualityWithDefaults(
  dbConfig: Partial<QualityGateConfig> | undefined
): QualityGateConfig {
  if (!dbConfig) {
    return DEFAULT_QUALITY_CONFIG;
  }

  return {
    minLength: dbConfig.minLength ?? DEFAULT_QUALITY_CONFIG.minLength,
    maxLength: dbConfig.maxLength ?? DEFAULT_QUALITY_CONFIG.maxLength,
    minQualityScore: dbConfig.minQualityScore ?? DEFAULT_QUALITY_CONFIG.minQualityScore,
    maxNoiseRatio: dbConfig.maxNoiseRatio ?? DEFAULT_QUALITY_CONFIG.maxNoiseRatio,
  };
}
