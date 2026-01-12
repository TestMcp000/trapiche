/**
 * Cohere Re-ranker IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md §8
 * @see uiux_refactor.md §6.4.2 item 3
 *
 * Server-only module for Cohere Rerank API integration.
 * Uses raw fetch() to avoid adding Cohere SDK dependency.
 */
import 'server-only';

import type {
  RerankConfig,
  RetrievalCandidate,
  RerankResult,
  CohereRerankResponse,
} from './types';
import { RERANK_DEFAULTS } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const COHERE_RERANK_URL = 'https://api.cohere.com/v2/rerank';
const REQUEST_TIMEOUT_MS = 15000; // 15 seconds

// ─────────────────────────────────────────────────────────────────────────────
// Configuration Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if Cohere API is configured.
 * Returns true if COHERE_API_KEY environment variable is set.
 */
export function isCohereConfigured(): boolean {
  return Boolean(process.env.COHERE_API_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Re-rank Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Re-rank candidates using Cohere Rerank API.
 *
 * @param query - The query to rank against
 * @param candidates - Candidates from coarse retrieval
 * @param config - Rerank configuration (optional)
 * @returns Re-ranked results sorted by relevance
 *
 * @example
 * const results = await rerankWithCohere(
 *   'leather bag for gift',
 *   [{ content: 'Handmade leather tote...', coarseScore: 0.85, ... }]
 * );
 */
export async function rerankWithCohere(
  query: string,
  candidates: RetrievalCandidate[],
  config?: Partial<RerankConfig>
): Promise<RerankResult[]> {
  const apiKey = process.env.COHERE_API_KEY;

  // Graceful degradation: if no API key, return original order
  if (!apiKey) {
    console.warn('[rerankWithCohere] COHERE_API_KEY not configured, skipping re-rank');
    return candidatesToResults(candidates);
  }

  // Empty candidates edge case
  if (candidates.length === 0) {
    return [];
  }

  const model = config?.model ?? RERANK_DEFAULTS.model;
  const topN = Math.min(config?.topN ?? RERANK_DEFAULTS.topN, candidates.length);

  try {
    // Build request body
    const requestBody = {
      model,
      query,
      documents: candidates.map((c) => c.content),
      top_n: topN,
      return_documents: false, // We already have content in candidates
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Call Cohere API
    const response = await fetch(COHERE_RERANK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[rerankWithCohere] API error:', response.status, errorText);
      // Graceful degradation: return original order
      return candidatesToResults(candidates);
    }

    const data = (await response.json()) as CohereRerankResponse;

    // Map API response back to our result format
    const results: RerankResult[] = data.results.map((doc, rankIndex) => {
      const originalCandidate = candidates[doc.index];
      return {
        ...originalCandidate,
        fineScore: doc.relevance_score,
        finalRank: rankIndex + 1, // 1-based rank
      };
    });

    return results;
  } catch (error) {
    // Handle timeout or network errors
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[rerankWithCohere] Request timeout after', REQUEST_TIMEOUT_MS, 'ms');
    } else {
      console.error('[rerankWithCohere] Unexpected error:', error);
    }

    // Graceful degradation: return original order
    return candidatesToResults(candidates);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert candidates to results with default scores (for graceful degradation).
 */
function candidatesToResults(candidates: RetrievalCandidate[]): RerankResult[] {
  return candidates.map((candidate, index) => ({
    ...candidate,
    fineScore: candidate.coarseScore, // Use coarse score as fallback
    finalRank: index + 1,
  }));
}
