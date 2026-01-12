/**
 * Preprocessing IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md §6
 * @see uiux_refactor.md §6.4.2
 *
 * Server-only module that connects the pure preprocessing pipeline
 * to the embedding queue infrastructure.
 */
import 'server-only';

import type { EmbeddingTargetType, EmbeddingPriority } from '@/lib/types/embedding';
import { preprocessAndFilter } from './preprocess-pure';
import { getTargetContent } from '@/lib/modules/embedding/embedding-target-content-io';
import { enqueueEmbeddingBatch } from '@/lib/modules/embedding/embedding-generate-io';
import { getConfigForType } from './config-io';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreprocessAndEnqueueResult {
  success: boolean;
  chunks: number;
  passed: number;
  incomplete: number;
  failed: number;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main IO Function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Preprocess content and enqueue qualified chunks for embedding generation.
 *
 * Flow:
 * 1. Fetch dynamic config from DB
 * 2. Fetch raw content from business table
 * 3. Run preprocessing pipeline (clean → chunk → quality gate) with config
 * 4. Enqueue qualified chunks (passed/incomplete) to embedding_queue
 *
 * @param targetType - Type of content (product, post, gallery_item, comment)
 * @param targetId - UUID of the target item
 * @param priority - Queue priority (default: normal)
 * @returns Result with chunk counts and success status
 */
export async function preprocessAndEnqueue(
  targetType: EmbeddingTargetType,
  targetId: string,
  priority: EmbeddingPriority = 'normal'
): Promise<PreprocessAndEnqueueResult> {
  try {
    // Step 1: Fetch dynamic config from DB
    const typeConfig = await getConfigForType(targetType);

    // Step 2: Fetch raw content
    const contentResult = await getTargetContent(targetType, targetId);

    if (!contentResult) {
      return {
        success: false,
        chunks: 0,
        passed: 0,
        incomplete: 0,
        failed: 0,
        error: 'Content not found or not eligible for embedding',
      };
    }

    const { rawContent, context } = contentResult;

    // Skip empty content
    if (!rawContent || rawContent.trim().length === 0) {
      return {
        success: true,
        chunks: 0,
        passed: 0,
        incomplete: 0,
        failed: 0,
        error: 'Content is empty',
      };
    }

    // Step 3: Run preprocessing pipeline with dynamic config
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

    // No qualified chunks after filtering
    if (chunks.length === 0) {
      return {
        success: true,
        chunks: 0,
        passed: metadata.quality.passed,
        incomplete: metadata.quality.incomplete,
        failed: metadata.quality.failed,
        error: 'No chunks passed quality gate',
      };
    }

    // Step 3: Enqueue chunks for embedding generation
    // Note: Each chunk will be processed separately by the queue runner
    const _enqueueItems = chunks.map((_, _index) => ({
      targetType,
      targetId,
      // We store chunk index in the queue item for later retrieval
      // The actual chunk content is re-derived during processing
    }));

    // For now, enqueue the main item only (preprocessing happens at queue processing time)
    // This avoids storing chunk content in the queue table
    const enqueueResult = await enqueueEmbeddingBatch(
      [{ targetType, targetId }],
      priority
    );

    if (!enqueueResult.success) {
      return {
        success: false,
        chunks: chunks.length,
        passed: metadata.quality.passed,
        incomplete: metadata.quality.incomplete,
        failed: metadata.quality.failed,
        error: enqueueResult.error,
      };
    }

    return {
      success: true,
      chunks: chunks.length,
      passed: metadata.quality.passed,
      incomplete: metadata.quality.incomplete,
      failed: metadata.quality.failed,
    };
  } catch (error) {
    console.error('[preprocessAndEnqueue] Unexpected error:', error);
    return {
      success: false,
      chunks: 0,
      passed: 0,
      incomplete: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch preprocess and enqueue multiple items.
 *
 * @param items - Array of { targetType, targetId } to process
 * @param priority - Queue priority for all items
 * @returns Results per item
 */
export async function preprocessAndEnqueueBatch(
  items: Array<{ targetType: EmbeddingTargetType; targetId: string }>,
  priority: EmbeddingPriority = 'normal'
): Promise<{
  success: boolean;
  processed: number;
  failed: number;
  results: PreprocessAndEnqueueResult[];
}> {
  const results: PreprocessAndEnqueueResult[] = [];

  for (const item of items) {
    const result = await preprocessAndEnqueue(item.targetType, item.targetId, priority);
    results.push(result);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    processed: successful,
    failed,
    results,
  };
}
