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
import { requireOwner } from '@/lib/modules/auth/admin-guard';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';
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
// Stats Actions
// =============================================================================

/**
 * Get queue statistics.
 */
export async function getQueueStatsAction(): Promise<ActionResult<PreprocessingQueueStats>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const stats = await getPreprocessingQueueStats();
    return actionSuccess(stats);
  } catch (error) {
    console.error('[getQueueStatsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get throughput metrics.
 */
export async function getThroughputAction(): Promise<ActionResult<PreprocessingThroughput>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const throughput = await getPreprocessingThroughput();
    return actionSuccess(throughput);
  } catch (error) {
    console.error('[getThroughputAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get quality metrics.
 */
export async function getQualityMetricsAction(): Promise<ActionResult<QualityMetrics>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const metrics = await getQualityMetrics();
    return actionSuccess(metrics);
  } catch (error) {
    console.error('[getQualityMetricsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get error logs.
 */
export async function getErrorLogsAction(
  limit: number = 20
): Promise<ActionResult<PreprocessingErrorLog[]>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const logs = await getPreprocessingErrorLogs(limit);
    return actionSuccess(logs);
  } catch (error) {
    console.error('[getErrorLogsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Get failed samples for inspection.
 */
export async function getFailedSamplesAction(
  limit: number = 10
): Promise<ActionResult<FailedSample[]>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const samples = await getFailedSamples(limit);
    return actionSuccess(samples);
  } catch (error) {
    console.error('[getFailedSamplesAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
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
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await retryFailedPreprocessingItems();
    if (result.error) {
      console.error('[retryFailedAction] retryFailedPreprocessingItems error:', result.error);
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }
    return actionSuccess({ retried: result.retried });
  } catch (error) {
    console.error('[retryFailedAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }
}

/**
 * Purge failed queue items.
 */
export async function purgeFailedAction(): Promise<ActionResult<{ purged: number }>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await purgeFailedQueueItems();
    if (result.error) {
      console.error('[purgeFailedAction] purgeFailedQueueItems error:', result.error);
      return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
    }
    return actionSuccess({ purged: result.purged });
  } catch (error) {
    console.error('[purgeFailedAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
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
import type { EmbeddingTargetType, PreprocessableTargetType } from '@/lib/types/embedding';
import type { ChunkingConfig, QualityGateConfig } from '@/lib/modules/preprocessing/types';

/** Config for all target types */
export type AllConfigsResult = Record<PreprocessableTargetType, TypeConfigResult>;

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
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const configs = await getAllConfigs();
    return actionSuccess(configs);
  } catch (error) {
    console.error('[getPreprocessingConfigsAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.INTERNAL_ERROR);
  }
}

/**
 * Update preprocessing config (Owner-only).
 */
export async function updatePreprocessingConfigAction(
  config: UpdateConfigRequest
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireOwner(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  try {
    const result = await updatePreprocessingConfig(config as Record<EmbeddingTargetType, { chunking?: Partial<ChunkingConfig>; quality?: Partial<QualityGateConfig> }>);
    if (!result.success) {
      console.error('[updatePreprocessingConfigAction] updatePreprocessingConfig error:', result.error);
      return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
    }

    // Revalidate related caches
    revalidateTag('site-config', { expire: 0 });
    revalidateTag('preprocessing-config', { expire: 0 });

    return actionSuccess();
  } catch (error) {
    console.error('[updatePreprocessingConfigAction] Error:', error);
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }
}
