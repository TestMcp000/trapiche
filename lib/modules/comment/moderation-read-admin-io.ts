/**
 * Comment Moderation Read Admin IO
 *
 * Admin-only read operations for comment moderation.
 *
 * @module lib/modules/comment/moderation-read-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import {
  transformAdminComment,
  type AdminComment,
  type AdminCommentFilters,
} from '@/lib/modules/comment/moderation-transform';

/**
 * Get all comments for admin with moderation data joined
 * Includes userEmail, spamReason from comment_moderation
 */
export async function getCommentsForAdmin(filters: AdminCommentFilters = {}): Promise<{
  comments: AdminComment[];
  total: number;
}> {
  const supabase = await createClient();
  const { status = 'all', targetType, targetId, search, limit = 50, offset = 0 } = filters;

  // Join comment_moderation for admin UI
  let query = supabase
    .from('comments')
    .select('*, comment_moderation(user_email, spam_score, spam_reason, ip_hash, link_count)', { count: 'exact' });

  // Apply status filter
  switch (status) {
    case 'approved':
      query = query.eq('is_approved', true).eq('is_spam', false);
      break;
    case 'pending':
      query = query.eq('is_approved', false).eq('is_spam', false);
      break;
    case 'spam':
      query = query.eq('is_spam', true);
      break;
    // 'all' - no filter
  }

  // Apply target filter
  if (targetType) {
    query = query.eq('target_type', targetType);
  }
  if (targetId) {
    query = query.eq('target_id', targetId);
  }

  // Apply search filter
  if (search) {
    query = query.or(`content.ilike.%${search}%,user_display_name.ilike.%${search}%`);
  }

  // Apply pagination
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Failed to fetch admin comments:', error);
    return { comments: [], total: 0 };
  }

  return {
    comments: (data || []).map(transformAdminComment),
    total: count || 0,
  };
}

/**
 * Get comments for a specific user (for admin)
 * Used by user domain for cross-domain queries
 * Requires authenticated admin session via RLS
 */
export async function getCommentsForAdminByUserId(
  userId: string
): Promise<AdminComment[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*, comment_moderation(user_email, spam_score, spam_reason, ip_hash, link_count)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching comments for user:', error);
    return [];
  }

  return (data || []).map(transformAdminComment);
}
