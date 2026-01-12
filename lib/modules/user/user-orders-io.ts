/**
 * User Orders IO (Cross-Domain Wrapper)
 *
 * Thin wrapper that queries shop domain for user's order history.
 * Follows single source principle - actual IO logic in shop domain.
 *
 * @module lib/modules/user/user-orders-io
 * @see ARCHITECTURE.md §3.4 - IO module boundaries
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { getOrdersByUserIdForAdmin } from '@/lib/modules/shop/orders-read-admin-io';
import type { OrderSummary } from '@/lib/types/shop';

/**
 * Get orders for a specific user
 * Requires authenticated admin session via RLS
 */
export async function getOrdersByUserId(
  userId: string
): Promise<OrderSummary[]> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return [];
  }

  // Delegate to shop domain (single source of truth for order queries)
  return getOrdersByUserIdForAdmin(userId);
}
