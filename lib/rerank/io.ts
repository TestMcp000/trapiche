/**
 * Re-ranker IO Facade
 * @see doc/specs/completed/DATA_PREPROCESSING.md §8
 * @see uiux_refactor.md §6.4.2 item 3
 *
 * Server-only facade for re-ranking operations.
 * Re-exports from capability-scoped modules.
 */
import 'server-only';

import type { RerankConfig, RetrievalCandidate, RerankResult } from './types';
import { RERANK_DEFAULTS } from './types';
import { rerankWithCohere, isCohereConfigured } from './cohere-io';
import { isRerankEnabledByConfig } from '@/lib/validators/rerank';

// ─────────────────────────────────────────────────────────────────────────────
// Type Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export type {
  RerankProvider,
  CohereRerankModel,
  RerankConfig,
  RetrievalCandidate,
  RerankResult,
} from './types';

export { RERANK_DEFAULTS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Function Re-exports
// ─────────────────────────────────────────────────────────────────────────────

export { rerankWithCohere, isCohereConfigured } from './cohere-io';
export { validateRerankConfig, isRerankEnabledByConfig, getValidCohereModels } from '@/lib/validators/rerank';

// ─────────────────────────────────────────────────────────────────────────────
// Unified Rerank Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-rank candidates using configured provider.
 *
 * Unified interface that:
 * 1. Checks if re-ranking is enabled
 * 2. Routes to appropriate provider (currently only Cohere)
 * 3. Returns original order if disabled or on error
 *
 * @param query - Query to rank against
 * @param candidates - Candidates from coarse retrieval
 * @param config - Optional re-rank configuration
 * @returns Re-ranked results
 */
export async function rerank(
  query: string,
  candidates: RetrievalCandidate[],
  config?: Partial<RerankConfig>
): Promise<RerankResult[]> {
  // Check if re-ranking is enabled by config
  if (!isRerankEnabledByConfig(config)) {
    return candidatesToResultsPreservingOrder(candidates);
  }

  // Check if provider is configured
  const provider = config?.provider ?? RERANK_DEFAULTS.provider;

  if (provider === 'none') {
    return candidatesToResultsPreservingOrder(candidates);
  }

  if (provider === 'cohere') {
    if (!isCohereConfigured()) {
      console.warn('[rerank] Cohere provider selected but COHERE_API_KEY not configured');
      return candidatesToResultsPreservingOrder(candidates);
    }
    return rerankWithCohere(query, candidates, config);
  }

  // Unknown provider - graceful degradation
  console.warn('[rerank] Unknown provider:', provider);
  return candidatesToResultsPreservingOrder(candidates);
}

/**
 * Check if re-ranking is available and enabled.
 * Combines config check with API key availability.
 */
export function isRerankEnabled(config?: Partial<RerankConfig>): boolean {
  if (!isRerankEnabledByConfig(config)) return false;

  const provider = config?.provider ?? RERANK_DEFAULTS.provider;
  if (provider === 'none') return false;
  if (provider === 'cohere') return isCohereConfigured();

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert candidates to results preserving original order.
 */
function candidatesToResultsPreservingOrder(
  candidates: RetrievalCandidate[]
): RerankResult[] {
  return candidates.map((candidate, index) => ({
    ...candidate,
    fineScore: candidate.coarseScore,
    finalRank: index + 1,
  }));
}
