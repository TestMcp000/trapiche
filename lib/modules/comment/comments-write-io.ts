/**
 * Comment Write IO
 *
 * Write operations for comments (create, update, delete).
 * Uses authenticated Supabase client for protected operations.
 *
 * @module lib/modules/comment/comments-write-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { checkForSpam, type SpamCheckParams } from '@/lib/spam/io';
import { sanitizeContent } from '@/lib/security/sanitize';
import { insertCommentModeration } from '@/lib/modules/comment/admin-io';
import { transformComment, type Comment as _Comment, type CommentResult } from '@/lib/modules/comment/mappers';
import type { CommentTargetType } from '@/lib/types/comments';

export interface CreateCommentParams {
  /** Target type for polymorphic comments */
  targetType: CommentTargetType;
  /** Target ID (post ID or gallery item ID) */
  targetId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl?: string;
  userEmail: string;
  content: string;
  parentId?: string;
  userAgent: string;
  headers: Headers;
  permalink: string;
  honeypotValue?: string;
  recaptchaToken?: string;
}

/**
 * Create a new comment
 */
export async function createComment(params: CreateCommentParams): Promise<CommentResult> {
  const supabase = await createClient();

  // Run spam check pipeline
  const spamCheckParams: SpamCheckParams = {
    content: params.content,
    userDisplayName: params.userDisplayName,
    userEmail: params.userEmail,
    targetType: params.targetType,
    targetId: params.targetId,
    userId: params.userId,
    userAgent: params.userAgent,
    headers: params.headers,
    permalink: params.permalink,
    honeypotValue: params.honeypotValue,
    recaptchaToken: params.recaptchaToken,
  };

  const spamResult = await checkForSpam(spamCheckParams);

  // Handle rejection
  if (spamResult.decision === 'reject') {
    return {
      success: false,
      decision: 'reject',
      error: 'Comment rejected',
      message: 'Your comment could not be submitted. Please try again.',
    };
  }

  // Handle rate limiting
  if (spamResult.decision === 'rate_limited') {
    return {
      success: false,
      decision: 'rate_limited',
      error: 'Rate limited',
      message: 'You are commenting too frequently. Please wait a moment and try again.',
    };
  }

  // P0-6: Insert comment WITHOUT sensitive fields
  // Sensitive fields go to comment_moderation table
  const { data, error } = await supabase
    .from('comments')
    .insert({
      target_type: params.targetType,
      target_id: params.targetId,
      user_id: params.userId,
      user_display_name: params.userDisplayName,
      user_avatar_url: params.userAvatarUrl || null,
      // P0-6: user_email removed from comments table
      content: spamResult.content, // Use sanitized content
      parent_id: params.parentId || null,
      is_spam: spamResult.isSpam,
      is_approved: spamResult.isApproved,
      // P0-6: spam_score, spam_reason, ip_hash, link_count removed from comments table
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create comment:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to submit comment. Please try again.',
    };
  }

  // P0-6: Insert sensitive fields into comment_moderation (admin-only table)
  // Phase 2.2: Use admin-io function with createAdminClient() to bypass RLS
  const moderationResult = await insertCommentModeration({
    comment_id: data.id,
    user_email: params.userEmail,
    ip_hash: spamResult.ipHash,
    spam_score: spamResult.spamScore || null,
    spam_reason: spamResult.spamReason || null,
    link_count: spamResult.linkCount,
  });

  if (!moderationResult.success) {
    // Log but don't fail - the comment was created successfully
    console.error('Failed to create comment moderation record:', moderationResult.error);
  }

  const comment = transformComment(data);

  // Return appropriate message based on decision
  let message = 'Comment posted successfully!';
  if (spamResult.decision === 'pending') {
    message = 'Your comment has been submitted and is awaiting moderation.';
  } else if (spamResult.decision === 'spam') {
    message = 'Your comment has been submitted for review.';
  }

  return {
    success: true,
    comment,
    decision: spamResult.decision,
    message,
  };
}

/**
 * Update a comment (user can only update their own)
 */
export async function updateComment(
  commentId: string,
  userId: string,
  content: string
): Promise<CommentResult> {
  const supabase = await createClient();

  // Sanitize content
  const sanitized = sanitizeContent(content);

  if (sanitized.rejected) {
    return {
      success: false,
      error: 'Invalid content',
      message: sanitized.rejectReason,
    };
  }

  const { data, error } = await supabase
    .from('comments')
    .update({
      content: sanitized.content,
      // P0-6: link_count now in comment_moderation table, not updated here
      updated_at: new Date().toISOString(),
    })
    .eq('id', commentId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Failed to update comment:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to update comment.',
    };
  }

  return {
    success: true,
    comment: transformComment(data),
    message: 'Comment updated successfully!',
  };
}

/**
 * Delete a comment (user can only delete their own)
 */
export async function deleteComment(commentId: string, userId: string): Promise<CommentResult> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId);

  if (error) {
    console.error('Failed to delete comment:', error);
    return {
      success: false,
      error: error.message,
      message: 'Failed to delete comment.',
    };
  }

  return {
    success: true,
    message: 'Comment deleted successfully!',
  };
}
