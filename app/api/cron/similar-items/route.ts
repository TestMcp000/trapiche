import 'server-only';

/**
 * Similar Items Cron Endpoint
 *
 * Background worker for updating precomputed similar items.
 * Called by Vercel Cron or external scheduler with CRON_SECRET header.
 *
 * @see uiux_refactor.md §6.3.2 - Similar items cron implementation
 * @see doc/specs/completed/SUPABASE_AI.md §3.2.0 - similar_items table design
 */

import { NextResponse } from 'next/server';
import { updateAllSimilarItems } from '@/lib/modules/embedding/similar-items-worker-io';

// =============================================================================
// Authentication
// =============================================================================

/**
 * Validate cron request authentication.
 * Supports both custom CRON_SECRET header and Vercel Cron Authorization.
 */
function isValidCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Skip validation in development if no secret configured
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    console.warn('[SimilarItems Cron] No CRON_SECRET configured, allowing in development mode');
    return true;
  }

  // Check custom header
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && cronSecret && customHeader === cronSecret) {
    return true;
  }

  // Check Vercel Cron Authorization header
  // See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
  const authHeader = request.headers.get('authorization');
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: Request) {
  // Validate authentication
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[SimilarItems Cron] Starting similar items update...');

    const result = await updateAllSimilarItems();

    console.log(
      `[SimilarItems Cron] Complete: ${result.totalProcessed} processed, ${result.totalUpdated} updated, ${result.totalErrors} errors`
    );

    return NextResponse.json({
      message: 'Similar items update complete',
      processed: result.totalProcessed,
      updated: result.totalUpdated,
      errors: result.totalErrors,
      results: {
        products: result.products,
        posts: result.posts,
        galleryItems: result.galleryItems,
      },
    });
  } catch (error) {
    console.error('[SimilarItems Cron] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Vercel Cron configuration
// To enable, add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/similar-items",
//     "schedule": "0 4 * * *"  // Daily at 04:00 UTC (after embedding-hourly)
//   }]
// }
