/**
 * Idempotency Check Pure Module
 *
 * Pure functions for comparing embedding chunks to detect content changes.
 * Used by preprocess-use-case-io.ts to skip re-embedding unchanged content.
 *
 * @module lib/modules/preprocessing/idempotency
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §4.3 - Pure modules (no side effects)
 */

import type { EmbeddingQualityStatus } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** New chunk with computed hash for idempotency comparison */
export interface ChunkHashPair {
  text: string;
  hash: string;
}

/** Existing embedding info fetched from DB (via IO module) */
export interface ExistingChunkInfo {
  chunkIndex: number;
  contentHash: string;
  qualityStatus: EmbeddingQualityStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compare new chunks against existing embeddings to determine if re-embedding is needed.
 *
 * Returns true (idempotent, skip re-embedding) only when:
 * - Chunk count matches exactly
 * - All content hashes match at corresponding indices
 * - All existing chunks have qualityStatus === 'passed'
 *
 * @param existing - Existing embeddings from DB (via getExistingEmbeddingsForIdempotency)
 * @param newChunks - New chunks with computed hashes
 * @returns true if content is unchanged and re-embedding can be skipped
 */
export function compareChunksForIdempotency(
  existing: ExistingChunkInfo[],
  newChunks: ChunkHashPair[]
): boolean {
  // Different chunk count → needs re-embedding
  if (existing.length !== newChunks.length) {
    return false;
  }

  // Check if all hashes match and quality is passed
  for (let i = 0; i < newChunks.length; i++) {
    const existingChunk = existing.find((e) => e.chunkIndex === i);
    if (!existingChunk) {
      return false;
    }
    if (existingChunk.contentHash !== newChunks[i].hash) {
      return false;
    }
    if (existingChunk.qualityStatus !== 'passed') {
      return false;
    }
  }

  return true;
}
