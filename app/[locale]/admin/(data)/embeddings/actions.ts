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
import { isOwner } from '@/lib/modules/auth';
import {
  getEmbeddingStats,
  getPendingQueueItems,
  initializeAllEmbeddings,
  retryFailedEmbeddings,
} from '@/lib/modules/embedding/io';
import type { EmbeddingStats, EmbeddingTargetType } from '@/lib/types/embedding';

// =============================================================================
// Types
// =============================================================================

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export interface InitializeResult {
  products: { queued: number; skipped: number };
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
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const stats = await getEmbeddingStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getEmbeddingStatsAction] Error:', error);
    return { success: false, error: 'Failed to fetch statistics.' };
  }
}

/**
 * Get pending queue items.
 */
export async function getQueueItemsAction(
  limit: number = 10
): Promise<ActionResult<QueueItem[]>> {
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const items = await getPendingQueueItems(limit);
    return { success: true, data: items };
  } catch (error) {
    console.error('[getQueueItemsAction] Error:', error);
    return { success: false, error: 'Failed to fetch queue items.' };
  }
}

/**
 * Initialize embeddings for all content types.
 */
export async function initializeAllEmbeddingsAction(): Promise<ActionResult<InitializeResult>> {
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const result = await initializeAllEmbeddings();
    
    if (result.error) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      data: {
        products: result.products,
        posts: result.posts,
        galleryItems: result.galleryItems,
        comments: result.comments,
      },
    };
  } catch (error) {
    console.error('[initializeAllEmbeddingsAction] Error:', error);
    return { success: false, error: 'Failed to initialize embeddings.' };
  }
}

/**
 * Retry failed embedding queue items.
 */
export async function retryFailedEmbeddingsAction(): Promise<ActionResult<{ retried: number }>> {
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const result = await retryFailedEmbeddings();
    
    if (result.error) {
      return { success: false, error: result.error };
    }

    return { success: true, data: { retried: result.retried } };
  } catch (error) {
    console.error('[retryFailedEmbeddingsAction] Error:', error);
    return { success: false, error: 'Failed to retry embeddings.' };
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
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const { getQualityMetrics } = await import('@/lib/modules/preprocessing/judge-io');
    const metrics = await getQualityMetrics();
    return { success: true, data: metrics };
  } catch (error) {
    console.error('[getQualityMetricsAction] Error:', error);
    return { success: false, error: 'Failed to fetch quality metrics.' };
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
  // Owner-only gate
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const { getFailedSamples } = await import('@/lib/modules/preprocessing/judge-io');
    const samples = await getFailedSamples(limit);
    return { success: true, data: samples };
  } catch (error) {
    console.error('[getFailedSamplesAction] Error:', error);
    return { success: false, error: 'Failed to fetch failed samples.' };
  }
}

