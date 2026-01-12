/**
 * Preprocessing Monitoring IO Module
 * @see doc/specs/completed/DATA_PREPROCESSING.md
 * @see uiux_refactor.md §6.4.2 item 4
 *
 * Server-only module for preprocessing monitoring metrics:
 * - Queue stats (pending/processing/completed/failed)
 * - Throughput (processing rate over time)
 * - Error logs
 * - Queue management (retry/purge)
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType } from '@/lib/types/embedding';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface PreprocessingQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  total: number;
}

export interface PreprocessingThroughput {
  last1h: number;
  last24h: number;
  avgProcessingTimeMs: number | null;
}

export interface PreprocessingErrorLog {
  id: string;
  targetType: EmbeddingTargetType;
  targetId: string;
  errorMessage: string;
  attempts: number;
  createdAt: string;
  processedAt: string | null;
}

export interface PreprocessingMonitoringStats {
  queue: PreprocessingQueueStats;
  throughput: PreprocessingThroughput;
  errorLogs: PreprocessingErrorLog[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue Stats
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get preprocessing queue statistics.
 * Counts items by status in the embedding_queue table.
 */
export async function getPreprocessingQueueStats(): Promise<PreprocessingQueueStats> {
  const supabase = createAdminClient();

  const [
    { count: pending },
    { count: processing },
    { count: completed },
    { count: failed },
  ] = await Promise.all([
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'processing'),
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  return {
    pending: pending ?? 0,
    processing: processing ?? 0,
    completed: completed ?? 0,
    failed: failed ?? 0,
    total: (pending ?? 0) + (processing ?? 0) + (completed ?? 0) + (failed ?? 0),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Throughput
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get preprocessing throughput metrics.
 * Calculates processing rates for the last 1h and 24h.
 */
export async function getPreprocessingThroughput(): Promise<PreprocessingThroughput> {
  const supabase = createAdminClient();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const [{ count: last1h }, { count: last24h }] = await Promise.all([
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('processed_at', oneHourAgo),
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('processed_at', twentyFourHoursAgo),
  ]);

  // Calculate average processing time from recent completed items
  const { data: recentItems } = await supabase
    .from('embedding_queue')
    .select('created_at, processed_at')
    .eq('status', 'completed')
    .not('processed_at', 'is', null)
    .order('processed_at', { ascending: false })
    .limit(100);

  let avgProcessingTimeMs: number | null = null;

  if (recentItems && recentItems.length > 0) {
    const totalMs = recentItems.reduce((sum, item) => {
      const created = new Date(item.created_at).getTime();
      const processed = new Date(item.processed_at!).getTime();
      return sum + (processed - created);
    }, 0);
    avgProcessingTimeMs = Math.round(totalMs / recentItems.length);
  }

  return {
    last1h: last1h ?? 0,
    last24h: last24h ?? 0,
    avgProcessingTimeMs,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Error Logs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get recent preprocessing error logs.
 * Returns failed queue items with error messages.
 */
export async function getPreprocessingErrorLogs(
  limit: number = 20
): Promise<PreprocessingErrorLog[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embedding_queue')
    .select('id, target_type, target_id, error_message, attempts, created_at, processed_at')
    .eq('status', 'failed')
    .not('error_message', 'is', null)
    .order('processed_at', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error) {
    console.error('[getPreprocessingErrorLogs] Query error:', error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    targetType: row.target_type as EmbeddingTargetType,
    targetId: row.target_id,
    errorMessage: row.error_message ?? 'Unknown error',
    attempts: row.attempts,
    createdAt: row.created_at,
    processedAt: row.processed_at,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Queue Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retry failed preprocessing items.
 * Resets status to 'pending' for items with < 3 attempts.
 */
export async function retryFailedPreprocessingItems(): Promise<{
  retried: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embedding_queue')
    .update({
      status: 'pending',
      error_message: null,
    })
    .eq('status', 'failed')
    .lt('attempts', 3)
    .select('id');

  if (error) {
    console.error('[retryFailedPreprocessingItems] Update error:', error);
    return { retried: 0, error: error.message };
  }

  return { retried: data?.length ?? 0 };
}

/**
 * Purge failed queue items.
 * Permanently removes failed items from the queue.
 */
export async function purgeFailedQueueItems(): Promise<{
  purged: number;
  error?: string;
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('embedding_queue')
    .delete()
    .eq('status', 'failed')
    .select('id');

  if (error) {
    console.error('[purgeFailedQueueItems] Delete error:', error);
    return { purged: 0, error: error.message };
  }

  return { purged: data?.length ?? 0 };
}

/**
 * Get full monitoring stats in one call.
 * Combined query for dashboard initial data.
 */
export async function getPreprocessingMonitoringStats(
  errorLogLimit: number = 10
): Promise<PreprocessingMonitoringStats> {
  const [queue, throughput, errorLogs] = await Promise.all([
    getPreprocessingQueueStats(),
    getPreprocessingThroughput(),
    getPreprocessingErrorLogs(errorLogLimit),
  ]);

  return {
    queue,
    throughput,
    errorLogs,
  };
}
