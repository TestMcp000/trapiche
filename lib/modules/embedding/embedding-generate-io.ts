/**
 * Embedding Generate IO Module
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 *
 * Server-only module for embedding generation operations.
 * Invokes Edge Function and manages embedding queue.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
  EmbeddingTargetType,
  EmbeddingPriority,
  EmbeddingQualityStatus,
  GenerateEmbeddingRequest,
  GenerateEmbeddingResponse,
  EnqueueEmbeddingRequest,
  ClaimedQueueItem,
} from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Generate Embedding via Edge Function
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Embedding Queue Operations
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Enqueue an item for embedding generation.
 * Uses upsert to handle duplicate requests.
 * @see SUPABASE_AI.md §4.3
 */
export async function enqueueEmbedding(
  request: EnqueueEmbeddingRequest
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('embedding_queue')
    .upsert(
      {
        target_type: request.targetType,
        target_id: request.targetId,
        priority: request.priority ?? 'normal',
        status: 'pending',
        attempts: 0,
        error_message: null,
        processed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'target_type,target_id',
        ignoreDuplicates: false, // Update priority if different
      }
    );

  if (error) {
    console.error('[enqueueEmbedding] Queue insert error:', error);
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Enqueue multiple items for embedding generation.
 * @see SUPABASE_AI.md §4.3
 */
export async function enqueueEmbeddingBatch(
  items: Array<{ targetType: EmbeddingTargetType; targetId: string }>,
  priority: EmbeddingPriority = 'normal'
): Promise<{ success: boolean; queued: number; error?: string }> {
  if (items.length === 0) {
    return { success: true, queued: 0 };
  }

  const supabase = createAdminClient();

  const rows = items.map((item) => ({
    target_type: item.targetType,
    target_id: item.targetId,
    priority,
    status: 'pending',
    attempts: 0,
    error_message: null,
    processed_at: null,
    created_at: new Date().toISOString(),
  }));

  const { error, count } = await supabase
    .from('embedding_queue')
    .upsert(rows, {
      onConflict: 'target_type,target_id',
      count: 'exact',
    });

  if (error) {
    console.error('[enqueueEmbeddingBatch] Queue insert error:', error);
    return { success: false, queued: 0, error: error.message };
  }

  return { success: true, queued: count ?? items.length };
}

/**
 * Update queue item status.
 */
export async function updateQueueItemStatus(
  targetType: EmbeddingTargetType,
  targetId: string,
  status: 'processing' | 'completed' | 'failed',
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient();

  const update: Record<string, unknown> = {
    status,
    processed_at: status === 'completed' || status === 'failed' ? new Date().toISOString() : null,
    error_message: status === 'failed' ? (errorMessage ?? 'Unknown error') : null,
  };

  if (status === 'processing') {
    // Increment attempts
    const { data } = await supabase
      .from('embedding_queue')
      .select('attempts')
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .single();

    update.attempts = (data?.attempts ?? 0) + 1;
  }

  await supabase
    .from('embedding_queue')
    .update(update)
    .eq('target_type', targetType)
    .eq('target_id', targetId);
}

/**
 * Get pending queue items for processing.
 * @see SUPABASE_AI.md §4.3
 */
export async function getPendingQueueItems(
  limit: number = 10
): Promise<Array<{ targetType: EmbeddingTargetType; targetId: string; attempts: number }>> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embedding_queue')
    .select('target_type, target_id, attempts')
    .eq('status', 'pending')
    .lt('attempts', 3) // Max 3 retries
    .order('priority', { ascending: false }) // high > normal > low
    .order('created_at', { ascending: true }) // FIFO within priority
    .limit(limit);

  if (error) {
    console.error('[getPendingQueueItems] Query error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    targetType: row.target_type as EmbeddingTargetType,
    targetId: row.target_id,
    attempts: row.attempts,
  }));
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

// ─────────────────────────────────────────────────────────────────────────────
// Lease-based Queue Operations (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Claim pending/stale queue items atomically via RPC.
 * Uses FOR UPDATE SKIP LOCKED to prevent race conditions.
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export async function claimQueueItems(
  limit: number = 5,
  leaseSeconds: number = 120
): Promise<ClaimedQueueItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('claim_embedding_queue_items', {
    claim_limit: limit,
    lease_seconds: leaseSeconds,
  });

  if (error) {
    console.error('[claimQueueItems] RPC error:', error);
    return [];
  }

  return (data ?? []).map((row: { target_type: string; target_id: string; processing_token: string; lease_expires_at: string }) => ({
    targetType: row.target_type as EmbeddingTargetType,
    targetId: row.target_id,
    processingToken: row.processing_token,
    leaseExpiresAt: row.lease_expires_at,
  }));
}

/**
 * Update queue item status with token validation.
 * Returns false if token doesn't match (item was claimed by another worker).
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export async function updateQueueItemWithToken(
  targetType: EmbeddingTargetType,
  targetId: string,
  processingToken: string,
  status: 'completed' | 'failed',
  options?: {
    errorMessage?: string;
    processingMetadata?: Record<string, unknown>;
  }
): Promise<boolean> {
  const supabase = createAdminClient();

  const update: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
    // Clear lease on completion
    processing_token: null,
    lease_expires_at: null,
  };

  if (status === 'failed' && options?.errorMessage) {
    update.error_message = options.errorMessage;
  }

  if (options?.processingMetadata) {
    update.processing_metadata = options.processingMetadata;
  }

  const { data, error } = await supabase
    .from('embedding_queue')
    .update(update)
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('processing_token', processingToken)
    .select('id');

  if (error) {
    console.error('[updateQueueItemWithToken] Update error:', error);
    return false;
  }

  // If no rows updated, token didn't match
  return (data?.length ?? 0) > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Idempotency Helpers (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Embedding chunk info for idempotency check.
 */
interface ExistingChunkInfo {
  chunkIndex: number;
  contentHash: string;
  qualityStatus: EmbeddingQualityStatus;
}

/**
 * Get existing embeddings for idempotency comparison.
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export async function getExistingEmbeddingsForIdempotency(
  targetType: EmbeddingTargetType,
  targetId: string
): Promise<ExistingChunkInfo[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embeddings')
    .select('chunk_index, content_hash, quality_status')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .order('chunk_index', { ascending: true });

  if (error) {
    console.error('[getExistingEmbeddingsForIdempotency] Query error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    chunkIndex: row.chunk_index,
    contentHash: row.content_hash,
    qualityStatus: row.quality_status as EmbeddingQualityStatus,
  }));
}

/**
 * Delete stale chunks after content shrinks.
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
export async function deleteStaleChunks(
  targetType: EmbeddingTargetType,
  targetId: string,
  validChunkCount: number
): Promise<number> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embeddings')
    .delete()
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .gte('chunk_index', validChunkCount)
    .select('id');

  if (error) {
    console.error('[deleteStaleChunks] Delete error:', error);
    return 0;
  }

  return data?.length ?? 0;
}
