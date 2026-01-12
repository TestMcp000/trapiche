/**
 * Preprocessing Pipeline Orchestrator (Pure Functions)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §11
 * @see uiux_refactor.md §6.4
 *
 * Pure pipeline that orchestrates: clean → chunk → quality gate.
 *
 * IMPORTANT: This module contains ONLY pure functions.
 * No IO, no side effects, no external dependencies.
 */

import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type {
  CleanerConfig,
  ChunkingConfig,
  PreprocessingInput,
  PreprocessingOutput,
  PreprocessingMetadata,
  QualityGateConfig,
  TypePreprocessingConfig,
} from './types';

import { cleanContent, DEFAULT_CLEANER_CONFIG } from './cleaners';
import { chunkContent, CHUNKING_CONFIGS, DEFAULT_CHUNKER_CONFIG } from './chunkers';
import { qualityGateChunks, QUALITY_GATE_CONFIGS, DEFAULT_QUALITY_CONFIG, getQualitySummary } from './quality';

// ─────────────────────────────────────────────────────────────────────────────
// Per-Type Preprocessing Configs (PRD §2.4, §3.5, §5)
// ─────────────────────────────────────────────────────────────────────────────

const TYPE_CONFIGS: Record<EmbeddingTargetType, TypePreprocessingConfig> = {
  product: {
    cleaning: {
      ...DEFAULT_CLEANER_CONFIG,
      removeMarkdown: true,
      preserveHeadingStructure: true,
    },
    chunking: CHUNKING_CONFIGS.product,
    quality: QUALITY_GATE_CONFIGS.product,
  },
  post: {
    cleaning: {
      ...DEFAULT_CLEANER_CONFIG,
      removeMarkdown: true,
      preserveHeadingStructure: true,
    },
    chunking: CHUNKING_CONFIGS.post,
    quality: QUALITY_GATE_CONFIGS.post,
  },
  gallery_item: {
    cleaning: {
      ...DEFAULT_CLEANER_CONFIG,
      removeMarkdown: false, // Gallery usually doesn't have markdown
      preserveHeadingStructure: false,
    },
    chunking: CHUNKING_CONFIGS.gallery_item,
    quality: QUALITY_GATE_CONFIGS.gallery_item,
  },
  comment: {
    cleaning: {
      ...DEFAULT_CLEANER_CONFIG,
      removeMarkdown: false, // Comments usually plain text
      preserveHeadingStructure: false,
    },
    chunking: CHUNKING_CONFIGS.comment,
    quality: QUALITY_GATE_CONFIGS.comment,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Config Getters
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get cleaning config for target type.
 * @pure
 */
export function getCleaningConfig(targetType: EmbeddingTargetType): CleanerConfig {
  return TYPE_CONFIGS[targetType]?.cleaning ?? DEFAULT_CLEANER_CONFIG;
}

/**
 * Get chunking config for target type.
 * @pure
 */
export function getChunkingConfig(targetType: EmbeddingTargetType): ChunkingConfig {
  return TYPE_CONFIGS[targetType]?.chunking ?? DEFAULT_CHUNKER_CONFIG;
}

/**
 * Get quality gate config for target type.
 * @pure
 */
export function getQualityConfig(targetType: EmbeddingTargetType): QualityGateConfig {
  return TYPE_CONFIGS[targetType]?.quality ?? DEFAULT_QUALITY_CONFIG;
}

/**
 * Get full preprocessing config for target type.
 * @pure
 */
export function getPreprocessingConfig(targetType: EmbeddingTargetType): TypePreprocessingConfig {
  return TYPE_CONFIGS[targetType] ?? {
    cleaning: DEFAULT_CLEANER_CONFIG,
    chunking: DEFAULT_CHUNKER_CONFIG,
    quality: DEFAULT_QUALITY_CONFIG,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Pipeline Orchestrator
// ─────────────────────────────────────────────────────────────────────────────

/** Optional config override for dynamic configuration */
export interface PreprocessingConfigOverride {
  chunking?: Partial<ChunkingConfig>;
  quality?: Partial<QualityGateConfig>;
}

/**
 * Merge config override with base config.
 * @pure
 */
function mergeConfigOverride(
  base: TypePreprocessingConfig,
  override?: PreprocessingConfigOverride
): TypePreprocessingConfig {
  if (!override) return base;

  return {
    cleaning: base.cleaning, // Cleaning config not overridable for now
    chunking: override.chunking
      ? { ...base.chunking, ...override.chunking }
      : base.chunking,
    quality: override.quality
      ? { ...base.quality, ...override.quality }
      : base.quality,
  };
}

/**
 * Preprocess content through the full pipeline.
 * Stages: Clean → Chunk → Quality Gate
 * @param input - Preprocessing input with targetType and rawContent
 * @param configOverride - Optional config override from DB (takes precedence)
 * @pure
 */
export function preprocessContent(
  input: PreprocessingInput,
  configOverride?: PreprocessingConfigOverride
): PreprocessingOutput {
  const baseConfig = getPreprocessingConfig(input.targetType);
  const config = mergeConfigOverride(baseConfig, configOverride);

  // Stage 1: Sanitization (Clean)
  const cleanResult = cleanContent(input.rawContent, config.cleaning);

  // Stage 2: Semantic Chunking
  const chunkResult = chunkContent(cleanResult.cleaned, config.chunking);

  // Stage 3: Quality Gate
  const qualifiedChunks = qualityGateChunks(chunkResult.chunks, config.quality);

  // Build metadata
  const qualitySummary = getQualitySummary(qualifiedChunks);

  const metadata: PreprocessingMetadata = {
    cleaning: cleanResult.metadata,
    chunking: chunkResult.metadata,
    quality: qualitySummary,
  };

  return {
    chunks: qualifiedChunks,
    metadata,
  };
}

/**
 * Preprocess and filter to only passed/incomplete chunks.
 * Failed chunks are excluded from the result.
 * @param input - Preprocessing input with targetType and rawContent
 * @param configOverride - Optional config override from DB (takes precedence)
 * @pure
 */
export function preprocessAndFilter(
  input: PreprocessingInput,
  configOverride?: PreprocessingConfigOverride
): PreprocessingOutput {
  const result = preprocessContent(input, configOverride);

  // Filter out failed chunks
  const filteredChunks = result.chunks.filter(
    (chunk) => chunk.qualityStatus !== 'failed'
  );

  return {
    chunks: filteredChunks,
    metadata: result.metadata, // Keep original metadata for auditing
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Exports
// ─────────────────────────────────────────────────────────────────────────────

export { TYPE_CONFIGS };
