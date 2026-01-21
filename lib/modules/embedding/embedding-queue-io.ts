/**
 * Embedding Queue IO Module
 *
 * Queue operations for embedding generation.
 * Handles enqueueing, status updates, and pending item retrieval.
 *
 * @module lib/modules/embedding/embedding-queue-io
 * @see doc/specs/completed/SUPABASE_AI.md §4.3
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type {
    EmbeddingTargetType,
    EmbeddingPriority,
    EnqueueEmbeddingRequest,
} from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Enqueue Operations
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

// ─────────────────────────────────────────────────────────────────────────────
// Status Operations
// ─────────────────────────────────────────────────────────────────────────────

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
