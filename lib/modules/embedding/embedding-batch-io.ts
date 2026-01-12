/**
 * Embedding Batch IO Module
 * @see doc/specs/completed/SUPABASE_AI.md
 * @see uiux_refactor.md §6.3
 *
 * Server-only module for batch embedding operations and statistics.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { EmbeddingTargetType, EmbeddingStats, EmbeddingTypeStats } from '@/lib/types/embedding';
import { enqueueEmbeddingBatch } from './embedding-generate-io';

const QUERY_PLACEHOLDER_TARGET_ID = '00000000-0000-0000-0000-000000000000';

// ─────────────────────────────────────────────────────────────────────────────
// Batch Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize embeddings for all content of a specific type.
 * Scans business table and enqueues items that don't have embeddings.
 * @see SUPABASE_AI.md §4.2
 */
export async function initializeEmbeddingsForType(
  targetType: EmbeddingTargetType
): Promise<{ queued: number; skipped: number; error?: string }> {
  const supabase = createAdminClient();

  // Get table and filter based on target type
  const tableConfig: Record<EmbeddingTargetType, { table: string; filter?: Record<string, unknown> }> = {
    product: { table: 'products', filter: { is_visible: true } },
    post: { table: 'posts', filter: { visibility: 'public' } },
    gallery_item: { table: 'gallery_items', filter: { is_visible: true } },
    comment: { table: 'comments', filter: { is_approved: true, is_spam: false } },
  };

  const config = tableConfig[targetType];
  if (!config) {
    return { queued: 0, skipped: 0, error: `Unknown target type: ${targetType}` };
  }

  // Get all IDs from business table
  let query = supabase.from(config.table).select('id');
  if (config.filter) {
    for (const [key, value] of Object.entries(config.filter)) {
      query = query.eq(key, value);
    }
  }

  const { data: businessItems, error: businessError } = await query;
  if (businessError) {
    console.error(`[initializeEmbeddingsForType] ${config.table} query error:`, businessError);
    return { queued: 0, skipped: 0, error: businessError.message };
  }

  if (!businessItems || businessItems.length === 0) {
    return { queued: 0, skipped: 0 };
  }

  // Get existing embedding IDs
  const { data: existingEmbeddings } = await supabase
    .from('embeddings')
    .select('target_id')
    .eq('target_type', targetType)
    .eq('chunk_index', 0);

  const existingIds = new Set(
    (existingEmbeddings ?? [])
      .map((e) => e.target_id)
      .filter((id) => !(targetType === 'post' && id === QUERY_PLACEHOLDER_TARGET_ID))
  );

  // Filter items that need embeddings
  const itemsToQueue = businessItems
    .filter((item) => !existingIds.has(item.id))
    .map((item) => ({ targetType, targetId: item.id }));

  if (itemsToQueue.length === 0) {
    return { queued: 0, skipped: businessItems.length };
  }

  // Enqueue in batches
  const result = await enqueueEmbeddingBatch(itemsToQueue, 'normal');

  return {
    queued: result.queued,
    skipped: existingIds.size,
    error: result.error,
  };
}

/**
 * Initialize embeddings for all content types.
 * @see SUPABASE_AI.md §4.2
 */
export async function initializeAllEmbeddings(): Promise<{
  products: { queued: number; skipped: number };
  posts: { queued: number; skipped: number };
  galleryItems: { queued: number; skipped: number };
  comments: { queued: number; skipped: number };
  error?: string;
}> {
  const [products, posts, galleryItems, comments] = await Promise.all([
    initializeEmbeddingsForType('product'),
    initializeEmbeddingsForType('post'),
    initializeEmbeddingsForType('gallery_item'),
    initializeEmbeddingsForType('comment'),
  ]);

  const errors = [products.error, posts.error, galleryItems.error, comments.error].filter(Boolean);

  return {
    products: { queued: products.queued, skipped: products.skipped },
    posts: { queued: posts.queued, skipped: posts.skipped },
    galleryItems: { queued: galleryItems.queued, skipped: galleryItems.skipped },
    comments: { queued: comments.queued, skipped: comments.skipped },
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Retry failed embedding queue items.
 * @see SUPABASE_AI.md §5.1
 */
export async function retryFailedEmbeddings(): Promise<{ retried: number; error?: string }> {
  const supabase = createAdminClient();

  // Reset failed items with < 3 attempts
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
    console.error('[retryFailedEmbeddings] Update error:', error);
    return { retried: 0, error: error.message };
  }

  return { retried: data?.length ?? 0 };
}

// ─────────────────────────────────────────────────────────────────────────────
// Statistics
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get embedding statistics for dashboard.
 * @see SUPABASE_AI.md §4.2
 */
export async function getEmbeddingStats(): Promise<EmbeddingStats> {
  const supabase = createAdminClient();

  // Query counts in parallel
  const [
    productStats,
    postStats,
    galleryStats,
    commentStats,
    queueStats,
  ] = await Promise.all([
    getTypeStats(supabase, 'product', 'products', { is_visible: true }),
    getTypeStats(supabase, 'post', 'posts', { visibility: 'public' }),
    getTypeStats(supabase, 'gallery_item', 'gallery_items', { is_visible: true }),
    getTypeStats(supabase, 'comment', 'comments', { is_approved: true, is_spam: false }),
    getQueueStats(supabase),
  ]);

  return {
    products: productStats,
    posts: postStats,
    galleryItems: galleryStats,
    comments: commentStats,
    queuePending: queueStats.pending,
    queueFailed: queueStats.failed,
  };
}

async function getTypeStats(
  supabase: ReturnType<typeof createAdminClient>,
  targetType: EmbeddingTargetType,
  tableName: string,
  filter: Record<string, unknown>
): Promise<EmbeddingTypeStats> {
  // Get total from business table
  let totalQuery = supabase.from(tableName).select('*', { count: 'exact', head: true });
  for (const [key, value] of Object.entries(filter)) {
    totalQuery = totalQuery.eq(key, value);
  }
  const { count: total } = await totalQuery;

  // Get count with embeddings
  let withEmbeddingQuery = supabase
    .from('embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('chunk_index', 0)
    .eq('quality_status', 'passed');
  if (targetType === 'post') {
    withEmbeddingQuery = withEmbeddingQuery.neq('target_id', QUERY_PLACEHOLDER_TARGET_ID);
  }
  const { count: withEmbedding } = await withEmbeddingQuery;

  // Get failed count
  let failedQuery = supabase
    .from('embeddings')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('chunk_index', 0)
    .eq('quality_status', 'failed');
  if (targetType === 'post') {
    failedQuery = failedQuery.neq('target_id', QUERY_PLACEHOLDER_TARGET_ID);
  }
  const { count: failed } = await failedQuery;

  return {
    total: total ?? 0,
    withEmbedding: withEmbedding ?? 0,
    failed: failed ?? 0,
  };
}

async function getQueueStats(
  supabase: ReturnType<typeof createAdminClient>
): Promise<{ pending: number; failed: number }> {
  const [{ count: pending }, { count: failed }] = await Promise.all([
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    supabase
      .from('embedding_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'failed'),
  ]);

  return {
    pending: pending ?? 0,
    failed: failed ?? 0,
  };
}
