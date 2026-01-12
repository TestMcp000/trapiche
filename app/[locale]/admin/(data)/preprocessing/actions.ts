'use server';

/**
 * Preprocessing Admin Server Actions
 *
 * Server actions for preprocessing monitoring operations.
 * RBAC: Owner-only.
 *
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4.2 item 4
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isOwner } from '@/lib/modules/auth';
import {
  getPreprocessingQueueStats,
  getPreprocessingThroughput,
  getPreprocessingErrorLogs,
  retryFailedPreprocessingItems,
  purgeFailedQueueItems,
  getQualityMetrics,
  getFailedSamples,
  type PreprocessingQueueStats,
  type PreprocessingThroughput,
  type PreprocessingErrorLog,
  type QualityMetrics,
  type FailedSample,
} from '@/lib/modules/preprocessing/io';

// =============================================================================
// Types
// =============================================================================

export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// Stats Actions
// =============================================================================

/**
 * Get queue statistics.
 */
export async function getQueueStatsAction(): Promise<ActionResult<PreprocessingQueueStats>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const stats = await getPreprocessingQueueStats();
    return { success: true, data: stats };
  } catch (error) {
    console.error('[getQueueStatsAction] Error:', error);
    return { success: false, error: 'Failed to fetch queue statistics.' };
  }
}

/**
 * Get throughput metrics.
 */
export async function getThroughputAction(): Promise<ActionResult<PreprocessingThroughput>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const throughput = await getPreprocessingThroughput();
    return { success: true, data: throughput };
  } catch (error) {
    console.error('[getThroughputAction] Error:', error);
    return { success: false, error: 'Failed to fetch throughput metrics.' };
  }
}

/**
 * Get quality metrics.
 */
export async function getQualityMetricsAction(): Promise<ActionResult<QualityMetrics>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const metrics = await getQualityMetrics();
    return { success: true, data: metrics };
  } catch (error) {
    console.error('[getQualityMetricsAction] Error:', error);
    return { success: false, error: 'Failed to fetch quality metrics.' };
  }
}

/**
 * Get error logs.
 */
export async function getErrorLogsAction(
  limit: number = 20
): Promise<ActionResult<PreprocessingErrorLog[]>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const logs = await getPreprocessingErrorLogs(limit);
    return { success: true, data: logs };
  } catch (error) {
    console.error('[getErrorLogsAction] Error:', error);
    return { success: false, error: 'Failed to fetch error logs.' };
  }
}

/**
 * Get failed samples for inspection.
 */
export async function getFailedSamplesAction(
  limit: number = 10
): Promise<ActionResult<FailedSample[]>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const samples = await getFailedSamples(limit);
    return { success: true, data: samples };
  } catch (error) {
    console.error('[getFailedSamplesAction] Error:', error);
    return { success: false, error: 'Failed to fetch failed samples.' };
  }
}

// =============================================================================
// Queue Management Actions
// =============================================================================

/**
 * Retry failed queue items.
 */
export async function retryFailedAction(): Promise<ActionResult<{ retried: number }>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const result = await retryFailedPreprocessingItems();
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: { retried: result.retried } };
  } catch (error) {
    console.error('[retryFailedAction] Error:', error);
    return { success: false, error: 'Failed to retry failed items.' };
  }
}

/**
 * Purge failed queue items.
 */
export async function purgeFailedAction(): Promise<ActionResult<{ purged: number }>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const result = await purgeFailedQueueItems();
    if (result.error) {
      return { success: false, error: result.error };
    }
    return { success: true, data: { purged: result.purged } };
  } catch (error) {
    console.error('[purgeFailedAction] Error:', error);
    return { success: false, error: 'Failed to purge failed items.' };
  }
}

// =============================================================================
// Config Actions (Phase 7 - DB SSOT)
// =============================================================================

import {
  getAllConfigs,
  updatePreprocessingConfig,
  type TypeConfigResult,
} from '@/lib/modules/preprocessing/io';
import { revalidateTag } from 'next/cache';
import type { EmbeddingTargetType } from '@/lib/types/embedding';
import type { ChunkingConfig, QualityGateConfig } from '@/lib/modules/preprocessing/types';

/** Config for all target types */
export type AllConfigsResult = Record<EmbeddingTargetType, TypeConfigResult>;

/** Update request format */
export interface UpdateConfigRequest {
  [key: string]: {
    chunking?: Partial<ChunkingConfig>;
    quality?: Partial<QualityGateConfig>;
  };
}

/**
 * Get all preprocessing configs (merged with defaults).
 */
export async function getPreprocessingConfigsAction(): Promise<ActionResult<AllConfigsResult>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const configs = await getAllConfigs();
    return { success: true, data: configs };
  } catch (error) {
    console.error('[getPreprocessingConfigsAction] Error:', error);
    return { success: false, error: 'Failed to fetch preprocessing configs.' };
  }
}

/**
 * Update preprocessing config (Owner-only).
 */
export async function updatePreprocessingConfigAction(
  config: UpdateConfigRequest
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const owner = await isOwner(supabase);
  if (!owner) {
    return { success: false, error: 'Unauthorized. Owner access required.' };
  }

  try {
    const result = await updatePreprocessingConfig(config as Record<EmbeddingTargetType, { chunking?: Partial<ChunkingConfig>; quality?: Partial<QualityGateConfig> }>);
    if (!result.success) {
      return { success: false, error: result.error ?? 'Failed to update config.' };
    }

    // Revalidate related caches
    revalidateTag('site-config', { expire: 0 });
    revalidateTag('preprocessing-config', { expire: 0 });

    return { success: true, data: undefined };
  } catch (error) {
    console.error('[updatePreprocessingConfigAction] Error:', error);
    return { success: false, error: 'Failed to update preprocessing config.' };
  }
}
