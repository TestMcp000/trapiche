import 'server-only';

/**
 * Inventory Cleanup Cron Endpoint
 *
 * Releases expired inventory reservations by calling the
 * `release_expired_reservations()` RPC. This prevents stale reservations
 * from accumulating and blocking product stock.
 *
 * Security:
 * - Validates CRON_SECRET header (per SECURITY.md §3.5)
 * - Returns 401 if secret is missing or invalid
 * - In development, allows requests if CRON_SECRET is not configured
 *
 * @see doc/SECURITY.md §3.5 - Cron Secret validation
 * @see supabase/02_add/08_shop_functions.sql - RPC definition
 * @see doc/meta/STEP_PLAN.md - PR-2
 */

import { NextResponse } from 'next/server';
import { releaseExpiredReservations } from '@/lib/modules/shop/inventory-cleanup-io';

/**
 * Validate cron request authentication.
 * Supports both custom x-cron-secret header and Vercel Cron Authorization.
 */
function isValidCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;

  // Skip validation in development if no secret configured
  if (process.env.NODE_ENV === 'development' && !cronSecret) {
    console.warn(
      '[Inventory Cleanup] No CRON_SECRET configured, allowing in development mode'
    );
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

export async function GET(request: Request) {
  // Validate authentication
  if (!isValidCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const runId = `cleanup-${Date.now()}`;

  try {
    const result = await releaseExpiredReservations();

    if (!result.success) {
      console.error(`[Inventory Cleanup] RPC error (runId=${runId}): ${result.error}`);
      return NextResponse.json(
        {
          error: 'RPC execution failed',
          runId,
          message: result.error,
        },
        { status: 500 }
      );
    }

    console.log(
      `[Inventory Cleanup] Released ${result.releasedCount} expired reservations (runId=${runId})`
    );

    return NextResponse.json({
      message: 'Cleanup complete',
      runId,
      releasedCount: result.releasedCount,
    });
  } catch (error) {
    console.error('[Inventory Cleanup] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        runId,
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
//     "path": "/api/cron/inventory-cleanup",
//     "schedule": "*/5 * * * *"  // Every 5 minutes
//   }]
// }
