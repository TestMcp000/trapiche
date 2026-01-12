/**
 * Comment Read IO
 *
 * Read operations for comments (public reads).
 * Uses authenticated Supabase client for protected queries.
 *
 * @module lib/modules/comment/comments-read-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { buildCommentTree } from '@/lib/modules/comment/tree';
import { transformCommentToPublicSafe } from '@/lib/modules/comment/mappers';
import type { CommentTargetType, CommentPublicSafe } from '@/lib/types/comments';

/**
 * Get set of comment IDs owned by a specific user
 * Used by API route to calculate isMine flag without exposing user_id
 */
export async function getOwnedCommentIds(
  commentIds: string[],
  targetType: CommentTargetType,
  targetId: string,
  userId: string
): Promise<Set<string>> {
  if (commentIds.length === 0) {
    return new Set();
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('comments')
    .select('id, user_id')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .in('id', commentIds);

  const ownedIds = new Set<string>();
  data?.forEach(row => {
    if (row.user_id === userId) {
      ownedIds.add(row.id);
    }
  });

  return ownedIds;
}

/**
 * Get approved comments for a target (polymorphic) - PUBLIC SAFE
 * Returns CommentPublicSafe with sensitive fields stripped
 */
export async function getCommentsForTarget(
  targetType: CommentTargetType,
  targetId: string
): Promise<CommentPublicSafe[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('is_approved', true)
    .eq('is_spam', false)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch comments:', error);
    return [];
  }

  const comments = (data || []).map(transformCommentToPublicSafe);
  return buildCommentTree(comments);
}

/**
 * Get comment count for a target (polymorphic)
 */
export async function getCommentCountForTarget(
  targetType: CommentTargetType,
  targetId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('comments')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', targetType)
    .eq('target_id', targetId)
    .eq('is_approved', true)
    .eq('is_spam', false);

  if (error) {
    console.error('Failed to count comments:', error);
    return 0;
  }

  return count || 0;
}
