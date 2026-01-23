/**
 * Embedding Batch IO Module
 *
 * Handles batch embedding generation with concurrency control.
 * Split from preprocess-use-case-io.ts for readability.
 *
 * @module lib/modules/preprocessing/embedding-batch-io
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */
import 'server-only';

import pLimit from 'p-limit';
import type { EmbeddingTargetType } from '@/lib/types/embedding';
import { generateEmbedding } from '@/lib/embeddings';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Concurrent embedding generation limit */
const EMBEDDING_CONCURRENCY = parseInt(process.env.EMBEDDING_WORKER_CHUNK_CONCURRENCY ?? '2', 10);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ChunkToEmbed {
  text: string;
}

export interface EmbeddingBatchResult {
  successCount: number;
  failedCount: number;
  lastError?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Embedding Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate embeddings for a batch of chunks with concurrency control.
 *
 * @param chunks - Array of chunks to embed
 * @param targetType - Target type for embedding
 * @param targetId - Target ID for embedding
 * @param logPrefix - Prefix for log messages
 * @returns Result with success/fail counts
 */
export async function generateEmbeddingsBatch(
  chunks: ChunkToEmbed[],
  targetType: EmbeddingTargetType,
  targetId: string,
  logPrefix: string
): Promise<EmbeddingBatchResult> {
  const limit = pLimit(EMBEDDING_CONCURRENCY);
  const results: Array<{ success: boolean; index: number; error?: string }> = [];

  const embeddingPromises = chunks.map((chunk, i) =>
    limit(async () => {
      const embeddingResult = await generateEmbedding({
        content: chunk.text,
        targetType,
        targetId,
        chunkIndex: i,
        chunkTotal: chunks.length,
      });

      if (embeddingResult.success) {
        return { success: true, index: i };
      } else {
        console.error(
          `${logPrefix} Failed to generate embedding for ${targetType}/${targetId} chunk ${i}:`,
          embeddingResult.error
        );
        return { success: false, index: i, error: embeddingResult.error };
      }
    })
  );

  const settledResults = await Promise.allSettled(embeddingPromises);

  for (const result of settledResults) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
    } else {
      results.push({ success: false, index: -1, error: result.reason?.message ?? 'Unknown' });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const lastError = results.find((r) => !r.success)?.error;

  return {
    successCount,
    failedCount,
    lastError,
  };
}
