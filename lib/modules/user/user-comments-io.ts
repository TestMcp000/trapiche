/**
 * User Comments IO (Cross-Domain Wrapper)
 *
 * Thin wrapper that queries comment domain for user's comment history.
 * Follows single source principle - actual IO logic in comment domain.
 *
 * @module lib/modules/user/user-comments-io
 * @see ARCHITECTURE.md §3.4 - IO module boundaries
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import { getCommentsForAdminByUserId } from '@/lib/modules/comment/moderation-read-admin-io';
import type { AdminComment } from '@/lib/modules/comment/moderation-transform';

/**
 * Get comments for a specific user
 * Requires authenticated admin session via RLS
 */
export async function getCommentsByUserId(
  userId: string
): Promise<AdminComment[]> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return [];
  }

  // Delegate to comment domain (single source of truth for comment queries)
  return getCommentsForAdminByUserId(userId);
}
