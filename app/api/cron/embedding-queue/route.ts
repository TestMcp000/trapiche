import 'server-only';

/**
 * Embedding Queue Cron Endpoint (Dispatcher)
 *
 * Dispatcher for the embedding queue. Claims pending items atomically
 * and publishes them to QStash for async processing by the worker.
 *
 * This endpoint only handles:
 * 1. Authentication (CRON_SECRET)
 * 2. Claiming queue items atomically (lease-based) (@see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md)
 * 3. Publishing to QStash (or direct worker fetch as fallback)
 * 4. Returning immediately (<200ms response time with QStash)
 *
 * Heavy processing (preprocess, embed) is handled by the worker endpoint.
 *
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 * @see doc/specs/completed/DATA_PREPROCESSING.md §6 - Orchestration
 * @see doc/specs/completed/SUPABASE_AI.md §4.3 - Queue processing
 */

import { NextResponse } from 'next/server';
import { claimQueueItems } from '@/lib/modules/embedding/embedding-generate-io';
import {
  publishEmbeddingQueueItem,
  isQStashConfigured,
} from '@/lib/queue/qstash-io';
import { SITE_URL } from '@/lib/site/site-url';

// =============================================================================
// Configuration
// =============================================================================

/** Maximum items to claim and dispatch per invocation */
const MAX_ITEMS_PER_RUN = 5;

/** Lease duration in seconds */
const LEASE_SECONDS = 120;

/** Worker endpoint path */
const WORKER_ENDPOINT = '/api/worker/embedding-queue';

// =============================================================================
// Authentication
// =============================================================================

/**
 * Validate cron request authentication.
 * Supports both external schedulers (e.g. cron-job.org with CRON_SECRET)
 * and Vercel Cron Authorization.
 */
function isValidCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Skip validation in development if no secret configured
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    console.warn('[Embedding Queue Cron] No CRON_SECRET configured, allowing in development mode');
    return true;
  }

  // Check custom header
  const customHeader = request.headers.get('x-cron-secret');
  if (customHeader && cronSecret && customHeader === cronSecret) {
    return true;
  }

  // Check Vercel Cron Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  return false;
}

// =============================================================================
// Dispatcher
// =============================================================================

interface DispatchResult {
  targetType: string;
  targetId: string;
  dispatched: boolean;
  messageId?: string;
  method: 'qstash' | 'direct';
  error?: string;
}

/**
 * Get the worker URL for QStash or direct dispatch.
 */
function getWorkerUrl(): string {
  // Canonical public URL (SSoT). In dev, SITE_URL falls back to localhost.
  return `${SITE_URL}${WORKER_ENDPOINT}`;
}

/**
 * Dispatch item via QStash.
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
async function dispatchViaQStash(
  url: string,
  targetType: string,
  targetId: string,
  processingToken: string,
  runId: string
): Promise<DispatchResult> {
  const result = await publishEmbeddingQueueItem({
    url,
    targetType,
    targetId,
    processingToken,
    runId,
  });

  return {
    targetType,
    targetId,
    dispatched: result.success,
    messageId: result.messageId,
    method: 'qstash',
    error: result.error,
  };
}

/**
 * Dispatch item directly to worker (fallback when QStash is not configured).
 * @see doc/specs/completed/embedding-queue-dispatcher-worker-spec.md
 */
async function dispatchDirectly(
  url: string,
  targetType: string,
  targetId: string,
  processingToken: string,
  runId: string
): Promise<DispatchResult> {
  const workerSecret = process.env.WORKER_SECRET;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(workerSecret ? { 'x-worker-secret': workerSecret } : {}),
      },
      body: JSON.stringify({
        targetType,
        targetId,
        processingToken,
        runId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      return {
        targetType,
        targetId,
        dispatched: false,
        method: 'direct',
        error: `Worker returned ${response.status}: ${errorData.error || 'Unknown error'}`,
      };
    }

    return {
      targetType,
      targetId,
      dispatched: true,
      method: 'direct',
    };
  } catch (error) {
    return {
      targetType,
      targetId,
      dispatched: false,
      method: 'direct',
      error: error instanceof Error ? error.message : 'Fetch failed',
    };
  }
}

/**
 * Dispatch a claimed item to the worker.
 * Uses QStash if configured, otherwise falls back to direct fetch.
 */
async function dispatchItem(
  url: string,
  targetType: string,
  targetId: string,
  processingToken: string,
  runId: string
): Promise<DispatchResult> {
  // Use QStash if configured, otherwise direct fetch
  if (isQStashConfigured()) {
    return dispatchViaQStash(url, targetType, targetId, processingToken, runId);
  }

  // Fallback: direct dispatch (for development or emergency)
  console.warn('[Embedding Queue Cron] QStash not configured, using direct dispatch');
  return dispatchDirectly(url, targetType, targetId, processingToken, runId);
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: Request) {
  // Validate authentication
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = `cron-${Date.now()}`;
  const dispatchMethod = isQStashConfigured() ? 'qstash' : 'direct';

  try {
    // Claim queue items atomically (Step 4.2 - lease-based claim)
    const claimedItems = await claimQueueItems(MAX_ITEMS_PER_RUN, LEASE_SECONDS);

    if (claimedItems.length === 0) {
      return NextResponse.json({
        message: 'No pending items',
        runId,
        dispatched: 0,
        method: dispatchMethod,
      });
    }

    console.log(
      `[Embedding Queue Cron] Claimed ${claimedItems.length} items (runId=${runId}, method=${dispatchMethod})`
    );

    const workerUrl = getWorkerUrl();

    // Dispatch all claimed items concurrently
    const dispatchPromises = claimedItems.map((item) =>
      dispatchItem(workerUrl, item.targetType, item.targetId, item.processingToken, runId)
    );

    const results = await Promise.allSettled(dispatchPromises);

    // Process results
    const dispatchResults: DispatchResult[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          targetType: claimedItems[index].targetType,
          targetId: claimedItems[index].targetId,
          dispatched: false,
          method: dispatchMethod,
          error: result.reason?.message || 'Promise rejected',
        };
      }
    });

    const successCount = dispatchResults.filter((r) => r.dispatched).length;
    const failedCount = dispatchResults.filter((r) => !r.dispatched).length;

    console.log(
      `[Embedding Queue Cron] Dispatched ${successCount}/${claimedItems.length} items (runId=${runId}, method=${dispatchMethod})`
    );

    return NextResponse.json({
      message: 'Dispatch complete',
      runId,
      method: dispatchMethod,
      dispatched: successCount,
      failed: failedCount,
      total: claimedItems.length,
      results: dispatchResults,
    });
  } catch (error) {
    console.error('[Embedding Queue Cron] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        runId,
        method: dispatchMethod,
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Optional: Vercel Cron configuration (if you don't use cron-job.org)
// To enable, add to vercel.json:
// {
//   "crons": [{
//     "path": "/api/cron/embedding-queue",
//     "schedule": "0 * * * *"  // Hourly
//   }]
// }
