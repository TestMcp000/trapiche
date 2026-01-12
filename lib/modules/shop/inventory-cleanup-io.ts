import 'server-only';

/**
 * Inventory Cleanup IO Module
 *
 * Server-only module for releasing expired inventory reservations.
 *
 * @see supabase/02_add/08_shop_functions.sql - release_expired_reservations() RPC
 * @see doc/meta/STEP_PLAN.md - PR-2
 */

import { createAdminClient } from '@/lib/infrastructure/supabase/admin';

export interface CleanupResult {
  success: boolean;
  releasedCount: number;
  error?: string;
}

/**
 * Release expired inventory reservations.
 *
 * Calls the `release_expired_reservations()` RPC which:
 * - Deletes expired reservations from `inventory_reservations` table
 * - Cancels associated `pending_payment` orders
 * - Writes audit log entry to `audit_logs` table
 *
 * @returns The result containing success status and number of reservations released
 */
export async function releaseExpiredReservations(): Promise<CleanupResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('release_expired_reservations');

  if (error) {
    return { success: false, releasedCount: 0, error: error.message };
  }

  return { success: true, releasedCount: data ?? 0 };
}
