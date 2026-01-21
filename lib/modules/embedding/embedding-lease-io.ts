/**
 * Embedding Lease IO Module
 *
 * Lease-based queue operations and idempotency helpers.
 * Uses token-validated updates for distributed worker safety.
 *
 * @module lib/modules/embedding/embedding-lease-io
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
    EmbeddingTargetType,
    EmbeddingQualityStatus,
    ClaimedQueueItem,
} from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Lease-based Queue Operations
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
// Idempotency Helpers
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
