/**
 * Re-ranker Validators (Pure)
 * @see doc/specs/completed/DATA_PREPROCESSING.md §8
 * @see uiux_refactor.md §6.4.2 item 3
 *
 * Pure validation functions for re-ranking configuration.
 */

import type { RerankConfig, RerankProvider, CohereRerankModel } from '@/lib/rerank/types';
import { RERANK_DEFAULTS } from '@/lib/rerank/types';

// ─────────────────────────────────────────────────────────────────────────────
// Validation Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VALID_PROVIDERS: RerankProvider[] = ['cohere', 'none'];

const VALID_COHERE_MODELS: CohereRerankModel[] = [
  'rerank-english-v3.0',
  'rerank-multilingual-v3.0',
];

// ─────────────────────────────────────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate re-rank configuration.
 * Returns validated config or error.
 */
export function validateRerankConfig(
  config: Partial<RerankConfig> | undefined
): ValidationResult<RerankConfig> {
  const merged: RerankConfig = {
    ...RERANK_DEFAULTS,
    ...config,
  };

  // Validate provider
  if (!VALID_PROVIDERS.includes(merged.provider)) {
    return {
      success: false,
      error: `Invalid provider: ${merged.provider}. Valid: ${VALID_PROVIDERS.join(', ')}`,
    };
  }

  // Validate model (only if provider is cohere)
  if (merged.provider === 'cohere' && !VALID_COHERE_MODELS.includes(merged.model)) {
    return {
      success: false,
      error: `Invalid model: ${merged.model}. Valid: ${VALID_COHERE_MODELS.join(', ')}`,
    };
  }

  // Validate topK
  if (typeof merged.topK !== 'number' || merged.topK < 1 || merged.topK > 1000) {
    return {
      success: false,
      error: `Invalid topK: ${merged.topK}. Must be 1-1000.`,
    };
  }

  // Validate topN
  if (typeof merged.topN !== 'number' || merged.topN < 1 || merged.topN > merged.topK) {
    return {
      success: false,
      error: `Invalid topN: ${merged.topN}. Must be 1-${merged.topK}.`,
    };
  }

  return { success: true, data: merged };
}

/**
 * Check if re-ranking is enabled based on config.
 * Pure function - does not check API key availability.
 */
export function isRerankEnabledByConfig(config?: Partial<RerankConfig>): boolean {
  if (config?.enabled === false) return false;
  if (config?.provider === 'none') return false;
  return true;
}

/**
 * Get list of valid Cohere models.
 */
export function getValidCohereModels(): CohereRerankModel[] {
  return [...VALID_COHERE_MODELS];
}
