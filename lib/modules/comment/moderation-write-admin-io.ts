/**
 * Comment Moderation Write Admin IO
 *
 * Admin-only write operations for comment moderation.
 * Includes RLS-bypassed writes using createAdminClient for moderation data.
 *
 * @module lib/modules/comment/moderation-write-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { createAdminClient } from '@/lib/infrastructure/supabase/admin';
import { transformAdminComment, type AdminCommentResult } from '@/lib/modules/comment/moderation-transform';

/**
 * Insert comment moderation data using admin client
 * Uses createAdminClient() to bypass RLS for admin-only table
 *
 * @param data - Moderation data to insert
 * @returns Success/error result
 */
export async function insertCommentModeration(data: {
  comment_id: string;
  user_email: string | null;
  ip_hash: string | null;
  spam_score: number | null;
  spam_reason: string | null;
  link_count: number;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();

  try {
    const { error } = await supabase
      .from('comment_moderation')
      .insert({
        comment_id: data.comment_id,
        user_email: data.user_email,
        ip_hash: data.ip_hash,
        spam_score: data.spam_score,
        spam_reason: data.spam_reason,
        link_count: data.link_count,
      });

    if (error) {
      console.error('Failed to insert comment moderation record:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in insertCommentModeration:', error);
    return { success: false, error: 'Failed to insert moderation record' };
  }
}

/**
 * Approve a comment (admin only)
 */
export async function approveComment(commentId: string): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .update({
      is_approved: true,
      is_spam: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('*, comment_moderation(user_email, spam_score, spam_reason, ip_hash, link_count)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, comment: transformAdminComment(data) };
}

/**
 * Mark a comment as spam (admin only)
 */
export async function markAsSpam(commentId: string): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('comments')
    .update({
      is_spam: true,
      is_approved: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .select('*, comment_moderation(user_email, spam_score, spam_reason, ip_hash, link_count)')
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, comment: transformAdminComment(data) };
}

/**
 * Delete a comment by admin (no user_id check)
 */
export async function adminDeleteComment(commentId: string): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Bulk approve comments
 */
export async function bulkApprove(commentIds: string[]): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({
      is_approved: true,
      is_spam: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', commentIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: `${commentIds.length} comments approved` };
}

/**
 * Bulk delete comments
 */
export async function bulkDelete(commentIds: string[]): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .delete()
    .in('id', commentIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: `${commentIds.length} comments deleted` };
}

/**
 * Bulk mark as spam
 */
export async function bulkMarkAsSpam(commentIds: string[]): Promise<AdminCommentResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .update({
      is_spam: true,
      is_approved: false,
      updated_at: new Date().toISOString(),
    })
    .in('id', commentIds);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, message: `${commentIds.length} comments marked as spam` };
}
