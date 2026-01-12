/**
 * Preprocessing Config IO (Read-only)
 * @see doc/specs/completed/DATA_PREPROCESSING.md Phase 7
 * @see uiux_refactor.md §6.4
 * @see doc/archive/2025-12-31-admin-performance-archive.md (Server-side Caching)
 *
 * Server-only module for reading preprocessing configuration from DB.
 * All reads go through cached wrapper for efficient SSR.
 */
import 'server-only';

import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type { ChunkingConfig, QualityGateConfig } from './types';
import type { PreprocessingConfig } from '@/lib/validators/preprocessing-config';
import {
  mergeChunkingWithDefaults,
  mergeQualityWithDefaults,
} from '@/lib/validators/preprocessing-config';
import { getPreprocessingConfigCached } from './cached';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreprocessingConfigResult {
  success: boolean;
  config?: Partial<PreprocessingConfig>;
  error?: string;
}

export interface TypeConfigResult {
  chunking: ChunkingConfig;
  quality: QualityGateConfig;
}

// ─────────────────────────────────────────────────────────────────────────────
// IO Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get raw preprocessing config from DB (cached).
 * Returns empty object if not set.
 *
 * Cache TTL: 30 seconds
 * Cache invalidation: revalidateTag('preprocessing-config') or revalidateTag('site-config')
 */
export async function getPreprocessingConfig(): Promise<PreprocessingConfigResult> {
  return getPreprocessingConfigCached();
}

/**
 * Get merged config for a specific target type.
 * Merges DB config with code defaults (DB takes precedence).
 */
export async function getConfigForType(
  targetType: EmbeddingTargetType
): Promise<TypeConfigResult> {
  const result = await getPreprocessingConfig();

  if (!result.success || !result.config) {
    // Fallback to pure defaults
    return {
      chunking: mergeChunkingWithDefaults(targetType, undefined),
      quality: mergeQualityWithDefaults(undefined),
    };
  }

  const typeConfig = result.config[targetType];

  return {
    chunking: mergeChunkingWithDefaults(targetType, typeConfig?.chunking),
    quality: mergeQualityWithDefaults(typeConfig?.quality),
  };
}

/**
 * Get all merged configs for all target types.
 * Useful for Admin UI display.
 */
export async function getAllConfigs(): Promise<Record<EmbeddingTargetType, TypeConfigResult>> {
  const targetTypes: EmbeddingTargetType[] = ['product', 'post', 'gallery_item', 'comment'];
  const result = await getPreprocessingConfig();

  const configs: Record<EmbeddingTargetType, TypeConfigResult> = {} as Record<
    EmbeddingTargetType,
    TypeConfigResult
  >;

  for (const targetType of targetTypes) {
    const typeConfig = result.success ? result.config?.[targetType] : undefined;

    configs[targetType] = {
      chunking: mergeChunkingWithDefaults(targetType, typeConfig?.chunking),
      quality: mergeQualityWithDefaults(typeConfig?.quality),
    };
  }

  return configs;
}
