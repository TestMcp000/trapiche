/**
 * Similar Items Worker IO Module
 * @see doc/specs/completed/SUPABASE_AI.md §3.2.0
 * @see uiux_refactor.md §6.3.2
 *
 * Server-only module for computing and updating similar items.
 * Called by Cron job to refresh precomputed recommendations.
 */
import 'server-only';

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import type { SimilarItemTargetType } from '@/lib/types/embedding';
import { updateSimilarItems } from './embedding-search-io';
import {
  initializeEmbeddingsForType,
  retryFailedEmbeddings,
} from './embedding-batch-io';

// =============================================================================
// Configuration
// =============================================================================

/** Maximum similar items to compute per source */
const MAX_SIMILAR_ITEMS = 10;

/** Minimum similarity threshold for inclusion */
const MIN_SIMILARITY_THRESHOLD = 0.5;

/** Batch size for processing sources */
const BATCH_SIZE = 50;

// =============================================================================
// Types
// =============================================================================

export interface SimilarItemsTypeResult {
  processed: number;
  updated: number;
  errors: number;
  errorMessages?: string[];
}

export interface SimilarItemsUpdateResult {
  products: SimilarItemsTypeResult;
  posts: SimilarItemsTypeResult;
  galleryItems: SimilarItemsTypeResult;
  totalProcessed: number;
  totalUpdated: number;
  totalErrors: number;
}

// =============================================================================
// Worker Functions
// =============================================================================

/**
 * Ensure embeddings are available for a type.
 * Initializes if necessary and retries failed items.
 */
async function ensureEmbeddingsReady(): Promise<{ initialized: boolean; error?: string }> {
  try {
    // First retry any failed embeddings
    await retryFailedEmbeddings();

    return { initialized: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SimilarItemsWorker] ensureEmbeddingsReady error:', error);
    return { initialized: false, error: message };
  }
}

/**
 * Update similar items for all sources of a specific type.
 * @see SUPABASE_AI.md §3.2.0
 */
export async function updateSimilarItemsForType(
  targetType: SimilarItemTargetType
): Promise<SimilarItemsTypeResult> {
  const supabase = createAdminClient();
  const result: SimilarItemsTypeResult = {
    processed: 0,
    updated: 0,
    errors: 0,
    errorMessages: [],
  };

  try {
    // Get all source IDs with embeddings for this type
    const { data: sources, error: sourcesError } = await supabase
      .from('embeddings')
      .select('target_id')
      .eq('target_type', targetType)
      .eq('chunk_index', 0)
      .eq('quality_status', 'passed');

    if (sourcesError) {
      console.error(`[SimilarItemsWorker] Failed to get sources for ${targetType}:`, sourcesError);
      result.errors++;
      result.errorMessages?.push(`Failed to get sources: ${sourcesError.message}`);
      return result;
    }

    if (!sources || sources.length === 0) {
      console.log(`[SimilarItemsWorker] No embeddings found for ${targetType}`);
      return result;
    }

    // Process sources in batches
    const sourceIds = sources.map((s) => s.target_id);
    
    for (let i = 0; i < sourceIds.length; i += BATCH_SIZE) {
      const batch = sourceIds.slice(i, i + BATCH_SIZE);
      
      for (const sourceId of batch) {
        try {
          // Find similar items using RPC
          const { data: similarData, error: similarError } = await supabase.rpc(
            'find_similar_embeddings',
            {
              source_type: targetType,
              source_id: sourceId,
              match_threshold: MIN_SIMILARITY_THRESHOLD,
              match_count: MAX_SIMILAR_ITEMS + 1, // +1 to exclude self
            }
          );

          if (similarError) {
            // RPC might not exist - log and skip
            console.warn(
              `[SimilarItemsWorker] RPC find_similar_embeddings not available for ${targetType}/${sourceId}:`,
              similarError.message
            );
            result.errors++;
            result.errorMessages?.push(`RPC error for ${sourceId}: ${similarError.message}`);
            continue;
          }

          result.processed++;

          // Filter out self and format for update
          const items = (similarData ?? [])
            .filter((row: { target_id: string }) => row.target_id !== sourceId)
            .slice(0, MAX_SIMILAR_ITEMS)
            .map((row: { target_type: string; target_id: string; similarity: number }) => ({
              targetType: row.target_type as SimilarItemTargetType,
              targetId: row.target_id,
              similarity: row.similarity,
            }));

          if (items.length > 0) {
            await updateSimilarItems(targetType, sourceId, items);
            result.updated++;
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[SimilarItemsWorker] Error processing ${targetType}/${sourceId}:`, error);
          result.errors++;
          result.errorMessages?.push(`${sourceId}: ${message}`);
        }
      }
    }

    // Clean up error messages if empty
    if (result.errorMessages?.length === 0) {
      delete result.errorMessages;
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[SimilarItemsWorker] Fatal error for ${targetType}:`, error);
    result.errors++;
    result.errorMessages?.push(`Fatal: ${message}`);
    return result;
  }
}

/**
 * Update similar items for all eligible types.
 * Comments are excluded as per SUPABASE_AI.md spec.
 */
export async function updateAllSimilarItems(): Promise<SimilarItemsUpdateResult> {
  console.log('[SimilarItemsWorker] Starting similar items update...');

  // Ensure embeddings are ready
  const { error: prepError } = await ensureEmbeddingsReady();
  if (prepError) {
    console.warn('[SimilarItemsWorker] Embedding preparation warning:', prepError);
    // Continue anyway - we'll work with what we have
  }

  // Process each type (comments excluded per spec)
  const [products, posts, galleryItems] = await Promise.all([
    updateSimilarItemsForType('product'),
    updateSimilarItemsForType('post'),
    updateSimilarItemsForType('gallery_item'),
  ]);

  const result: SimilarItemsUpdateResult = {
    products,
    posts,
    galleryItems,
    totalProcessed: products.processed + posts.processed + galleryItems.processed,
    totalUpdated: products.updated + posts.updated + galleryItems.updated,
    totalErrors: products.errors + posts.errors + galleryItems.errors,
  };

  console.log(
    `[SimilarItemsWorker] Complete: ${result.totalProcessed} processed, ${result.totalUpdated} updated, ${result.totalErrors} errors`
  );

  return result;
}

/**
 * Initialize similar items for a specific type.
 * First ensures embeddings exist, then computes similar items.
 */
export async function initializeSimilarItemsForType(
  targetType: SimilarItemTargetType
): Promise<SimilarItemsTypeResult & { embeddingsQueued: number }> {
  console.log(`[SimilarItemsWorker] Initializing similar items for ${targetType}...`);

  // First ensure embeddings exist
  const embeddingResult = await initializeEmbeddingsForType(targetType);

  if (embeddingResult.error) {
    console.error(
      `[SimilarItemsWorker] Failed to initialize embeddings for ${targetType}:`,
      embeddingResult.error
    );
  }

  // Then compute similar items
  const similarResult = await updateSimilarItemsForType(targetType);

  return {
    ...similarResult,
    embeddingsQueued: embeddingResult.queued,
  };
}
