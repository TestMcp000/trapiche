/**
 * Preprocess Use Case IO Module
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §3.0 - Decision tree
 *
 * Single entry point for preprocessing + embedding operations.
 * Used by worker endpoint to process queue items.
 */
import 'server-only';

import type { EmbeddingTargetType } from '@/lib/types/embedding';
import { getConfigForType } from './config-io';
import { preprocessAndFilter } from './preprocess-pure';
import { compareChunksForIdempotency, type ChunkHashPair } from './idempotency';
import { generateEmbeddingsBatch } from './embedding-batch-io';
import {
  deleteStaleChunks,
  getExistingEmbeddingsForIdempotency,
  getTargetContent,
  hashContent,
  updateQueueItemStatus,
  updateQueueItemWithToken,
} from '@/lib/embeddings';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreprocessUseCaseInput {
  targetType: EmbeddingTargetType;
  targetId: string;
  source: 'cron' | 'manual' | 'webhook';
  runId?: string;
  /** Token from claim RPC for lease validation (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md) */
  processingToken?: string;
}

export interface PreprocessUseCaseOutput {
  success: boolean;
  chunksTotal: number;
  chunksQualified: number;
  chunksEmbedded: number;
  durationMs: number;
  error?: string;
  /** True if processing was skipped due to idempotency check */
  skippedIdempotent?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Use Case Implementation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Run the complete preprocessing + embedding generation use case.
 *
 * Flow:
 * 1. Mark item as processing (legacy) or validate token (new lease mode)
 * 2. Read config via cached getConfigForType()
 * 3. Fetch content via getTargetContent()
 * 4. Run preprocessing pipeline (clean → chunk → quality gate)
 * 5. Idempotency check: skip if content unchanged (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
 * 6. Generate embeddings for qualified chunks with concurrency limit (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
 * 7. Update queue status (completed/failed) with token if provided
 * 8. Clean up stale chunks if content shrunk
 *
 * @param input - Target item and source metadata
 * @returns Result with chunk counts and timing
 */
export async function runPreprocessUseCase(
  input: PreprocessUseCaseInput
): Promise<PreprocessUseCaseOutput> {
  const startTime = Date.now();
  const { targetType, targetId, source, runId, processingToken } = input;

  const logPrefix = `[PreprocessUseCase:${runId ?? 'no-run-id'}]`;

  // Helper to complete with token-validated update if token provided
  const completeItem = async (
    status: 'completed' | 'failed',
    errorMessage?: string,
    metadata?: Record<string, unknown>
  ): Promise<boolean> => {
    if (processingToken) {
      return updateQueueItemWithToken(targetType, targetId, processingToken, status, {
        errorMessage,
        processingMetadata: metadata,
      });
    } else {
      // Legacy mode without token
      await updateQueueItemStatus(targetType, targetId, status, errorMessage);
      return true;
    }
  };

  try {
    // Step 1: Mark as processing (legacy mode only - token mode already marked by claim RPC)
    if (!processingToken) {
      await updateQueueItemStatus(targetType, targetId, 'processing');
    }

    // Step 2: Fetch dynamic config from DB (cached)
    const typeConfig = await getConfigForType(targetType);

    // Step 3: Fetch raw content
    const contentResult = await getTargetContent(targetType, targetId);

    if (!contentResult) {
      await completeItem('failed', 'Content not found or not eligible');

      const durationMs = Date.now() - startTime;
      console.log(
        `${logPrefix} ${targetType}/${targetId} failed: content not found (${durationMs}ms, source=${source})`
      );

      return {
        success: false,
        chunksTotal: 0,
        chunksQualified: 0,
        chunksEmbedded: 0,
        durationMs,
        error: 'Content not found',
      };
    }

    const { rawContent, context } = contentResult;

    // Skip empty content
    if (!rawContent || rawContent.trim().length === 0) {
      await completeItem('completed');

      const durationMs = Date.now() - startTime;
      console.log(
        `${logPrefix} ${targetType}/${targetId} completed: empty content (${durationMs}ms, source=${source})`
      );

      return {
        success: true,
        chunksTotal: 0,
        chunksQualified: 0,
        chunksEmbedded: 0,
        durationMs,
      };
    }

    // Step 4: Run preprocessing pipeline with dynamic config
    const preprocessResult = preprocessAndFilter(
      {
        targetType,
        rawContent,
        context,
      },
      {
        chunking: typeConfig.chunking,
        quality: typeConfig.quality,
      }
    );

    const { chunks, metadata } = preprocessResult;
    const chunksTotal = metadata.chunking.totalChunks;
    const chunksQualified = chunks.length;

    // No qualified chunks after filtering
    if (chunksQualified === 0) {
      await completeItem('completed');

      const durationMs = Date.now() - startTime;
      console.log(
        `${logPrefix} ${targetType}/${targetId} completed: no qualified chunks (total=${chunksTotal}, ${durationMs}ms, source=${source})`
      );

      return {
        success: true,
        chunksTotal,
        chunksQualified: 0,
        chunksEmbedded: 0,
        durationMs,
      };
    }

    // Step 5: Idempotency check - compute hashes and compare with existing
    const chunkHashes: ChunkHashPair[] = chunks.map((chunk) => ({
      text: chunk.text,
      hash: hashContent(chunk.text),
    }));

    const existingEmbeddings = await getExistingEmbeddingsForIdempotency(targetType, targetId);
    const isIdempotent = compareChunksForIdempotency(existingEmbeddings, chunkHashes);

    if (isIdempotent) {
      await completeItem('completed', undefined, { skipped_reason: 'idempotent' });

      const durationMs = Date.now() - startTime;
      console.log(
        `${logPrefix} ${targetType}/${targetId} skipped: idempotent (${chunksQualified} chunks unchanged, ${durationMs}ms, source=${source})`
      );

      return {
        success: true,
        chunksTotal,
        chunksQualified,
        chunksEmbedded: chunksQualified, // Already embedded
        durationMs,
        skippedIdempotent: true,
      };
    }

    // Step 6: Generate embeddings with concurrency limit
    const batchResult = await generateEmbeddingsBatch(chunks, targetType, targetId, logPrefix);
    const { successCount, lastError } = batchResult;

    // Step 7: Update queue status based on results
    const durationMs = Date.now() - startTime;

    if (successCount === chunks.length) {
      // Full success - also clean up stale chunks
      const staleDeleted = await deleteStaleChunks(targetType, targetId, chunks.length);
      if (staleDeleted > 0) {
        console.log(`${logPrefix} ${targetType}/${targetId} deleted ${staleDeleted} stale chunks`);
      }

      await completeItem('completed');

      console.log(
        `${logPrefix} ${targetType}/${targetId} completed: ${successCount}/${chunksQualified} chunks embedded (total=${chunksTotal}, ${durationMs}ms, source=${source})`
      );

      return {
        success: true,
        chunksTotal,
        chunksQualified,
        chunksEmbedded: successCount,
        durationMs,
      };
    } else if (successCount > 0) {
      // Partial success - still mark as completed but log warning
      await completeItem('completed');

      console.warn(
        `${logPrefix} ${targetType}/${targetId} partial: ${successCount}/${chunksQualified} chunks embedded (total=${chunksTotal}, ${durationMs}ms, source=${source})`
      );

      return {
        success: true,
        chunksTotal,
        chunksQualified,
        chunksEmbedded: successCount,
        durationMs,
        error: `Partial: ${successCount}/${chunksQualified} chunks generated`,
      };
    } else {
      // All failed
      await completeItem('failed', lastError ?? 'All chunks failed');

      console.error(
        `${logPrefix} ${targetType}/${targetId} failed: 0/${chunksQualified} chunks embedded (${durationMs}ms, source=${source})`
      );

      return {
        success: false,
        chunksTotal,
        chunksQualified,
        chunksEmbedded: 0,
        durationMs,
        error: lastError,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const durationMs = Date.now() - startTime;

    console.error(
      `${logPrefix} ${targetType}/${targetId} unexpected error (${durationMs}ms, source=${source}):`,
      error
    );

    await completeItem('failed', errorMessage);

    return {
      success: false,
      chunksTotal: 0,
      chunksQualified: 0,
      chunksEmbedded: 0,
      durationMs,
      error: errorMessage,
    };
  }
}
