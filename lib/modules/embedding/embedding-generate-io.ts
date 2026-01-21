/**
 * Embedding Generate IO Module (Aggregator)
 *
 * Core embedding generation and re-exports of queue/lease operations.
 * This module maintains backward compatibility for existing imports.
 *
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see ARCHITECTURE.md §3.4 - IO module split pattern
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  EmbeddingTargetType,
  GenerateEmbeddingRequest,
  GenerateEmbeddingResponse,
} from '@/lib/types/embedding';

// =============================================================================
// Re-export Queue Operations
// =============================================================================

export {
  enqueueEmbedding,
  enqueueEmbeddingBatch,
  updateQueueItemStatus,
  getPendingQueueItems,
} from './embedding-queue-io';

// =============================================================================
// Re-export Lease Operations
// =============================================================================

export {
  claimQueueItems,
  updateQueueItemWithToken,
  getExistingEmbeddingsForIdempotency,
  deleteStaleChunks,
} from './embedding-lease-io';

// =============================================================================
// Core Generate Operations
// =============================================================================

/**
 * Generate embedding for content by invoking Edge Function.
 * @see SUPABASE_AI.md §4.1
 */
export async function generateEmbedding(
  request: GenerateEmbeddingRequest
): Promise<GenerateEmbeddingResponse> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.functions.invoke('generate-embedding', {
    body: {
      content: request.content,
      targetType: request.targetType,
      targetId: request.targetId,
      chunkIndex: request.chunkIndex ?? 0,
      chunkTotal: request.chunkTotal ?? 1,
    },
  });

  if (error) {
    console.error('[generateEmbedding] Edge Function error:', error);
    return {
      success: false,
      error: error.message || 'Edge Function invocation failed',
    };
  }

  return data as GenerateEmbeddingResponse;
}

/**
 * Check if embedding exists and is up-to-date.
 * Returns null if no embedding exists, or the content hash if it does.
 */
export async function getEmbeddingHash(
  targetType: EmbeddingTargetType,
  targetId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embeddings')
    .select('content_hash')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('chunk_index', 0)
    .single();

  if (error || !data) {
    return null;
  }

  return data.content_hash;
}

/**
 * Delete embedding and associated queue item.
 */
export async function deleteEmbedding(
  targetType: EmbeddingTargetType,
  targetId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Delete from embeddings
  await supabase
    .from('embeddings')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId);

  // Delete from queue
  await supabase
    .from('embedding_queue')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId);
}
