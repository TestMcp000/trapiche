'use server';

/**
 * Embeddings Admin Server Actions
 *
 * Server actions for embedding management operations.
 * RBAC: Owner-only.
 *
 * @see doc/specs/completed/SUPABASE_AI.md §4.2
 * @see uiux_refactor.md §6.3.2 item 5
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireOwner } from '@/lib/modules/auth/admin-guard';
import {
  getEmbeddingStats,
  getPendingQueueItems,
  initializeAllEmbeddings,
  retryFailedEmbeddings,
} from '@/lib/modules/embedding/io';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
import type { EmbeddingStats, EmbeddingTargetType } from '@/lib/types/embedding';

export interface InitializeResult {
  posts: { queued: number; skipped: number };
  galleryItems: { queued: number; skipped: number };
  comments: { queued: number; skipped: number };
}

export interface QueueItem {
  targetType: EmbeddingTargetType;
  targetId: string;
  attempts: number;
}

// =============================================================================
// Actions
// =============================================================================

/**
 * Get embedding statistics.
 */
export async function getEmbeddingStatsAction(): Promise<ActionResult<EmbeddingStats>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const stats = await getEmbeddingStats();
    return actionSuccess(stats);
  } catch (error) {
    console.error('[getEmbeddingStatsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get pending queue items.
 */
export async function getQueueItemsAction(
  limit: number = 10
): Promise<ActionResult<QueueItem[]>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const items = await getPendingQueueItems(limit);
    return actionSuccess(items);
  } catch (error) {
    console.error('[getQueueItemsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Initialize embeddings for all content types.
 */
export async function initializeAllEmbeddingsAction(): Promise<ActionResult<InitializeResult>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await initializeAllEmbeddings();
    
    if (result.error) {
      console.error('[initializeAllEmbeddingsAction] initializeAllEmbeddings error:', result.error);
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    return actionSuccess({
      posts: result.posts,
      galleryItems: result.galleryItems,
      comments: result.comments,
    });
  } catch (error) {
    console.error('[initializeAllEmbeddingsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }
}

/**
 * Retry failed embedding queue items.
 */
export async function retryFailedEmbeddingsAction(): Promise<ActionResult<{ retried: number }>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await retryFailedEmbeddings();
    
    if (result.error) {
      console.error('[retryFailedEmbeddingsAction] retryFailedEmbeddings error:', result.error);
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    return actionSuccess({ retried: result.retried });
  } catch (error) {
    console.error('[retryFailedEmbeddingsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }
}

// =============================================================================
// Quality Metrics Actions (LLM-as-a-Judge)
// =============================================================================

/**
 * Get quality metrics for embeddings (pass rate, average score, etc.).
 */
export async function getQualityMetricsAction(): Promise<ActionResult<{
  totalEmbeddings: number;
  withQualityScore: number;
  passedCount: number;
  incompleteCount: number;
  failedCount: number;
  averageScore: number | null;
  passRate: number;
}>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const { getQualityMetrics } = await import('@/lib/modules/preprocessing/judge-io');
    const metrics = await getQualityMetrics();
    return actionSuccess(metrics);
  } catch (error) {
    console.error('[getQualityMetricsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get failed samples for inspection.
 */
export async function getFailedSamplesAction(
  limit: number = 10
): Promise<ActionResult<Array<{
  targetType: EmbeddingTargetType;
  targetId: string;
  chunkIndex: number;
  chunkContent: string | null;
  qualityScore: number | null;
  preprocessingMetadata: Record<string, unknown> | null;
}>>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const { getFailedSamples } = await import('@/lib/modules/preprocessing/judge-io');
    const samples = await getFailedSamples(limit);
    return actionSuccess(samples);
  } catch (error) {
    console.error('[getFailedSamplesAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}
