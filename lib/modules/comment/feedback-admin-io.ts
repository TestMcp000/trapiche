/**
 * Comment Feedback Admin IO
 *
 * Admin-only operations for Akismet spam/ham feedback reporting.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/comment/feedback-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { buildPermalink } from '@/lib/modules/comment/permalink-io';
import type { AkismetCheckParams } from '@/lib/infrastructure/akismet/akismet-io';
import type { CommentTargetType } from '@/lib/types/comments';

// =============================================================================
// Feedback Operations
// =============================================================================

/**
 * Get comment data needed for Akismet feedback.
 * Used by POST /api/comments/feedback.
 *
 * Returns the comment content + permalink info for reporting spam/ham to Akismet.
 * Uses buildPermalink() for consistent v2 canonical URL output.
 */
export async function getCommentForFeedback(
  commentId: string
): Promise<{ success: boolean; params?: AkismetCheckParams; error?: string }> {
  const supabase = await createClient();

  try {
    // Get comment details with moderation data (P0-6: user_email is in comment_moderation)
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*, comment_moderation(user_email)')
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      return { success: false, error: 'Comment not found' };
    }

    // Extract user_email from joined comment_moderation
    const moderation = comment.comment_moderation;
    const userEmail = Array.isArray(moderation)
      ? moderation[0]?.user_email
      : (moderation as { user_email?: string } | null)?.user_email;

    // Build permalink using centralized v2 canonical builder
    const permalink = await buildPermalink(
      comment.target_type as CommentTargetType,
      comment.target_id
    );

    // Prepare Akismet params
    // Note: We don't have the original IP/user-agent, so we use placeholders
    // This is a limitation, but Akismet still uses other data for training
    const params: AkismetCheckParams = {
      user_ip: '0.0.0.0', // Original IP not stored for privacy
      user_agent: 'Unknown', // Original user-agent not stored
      comment_content: comment.content,
      comment_author: comment.user_display_name,
      comment_author_email: userEmail || '',
      permalink,
    };

    return { success: true, params };
  } catch (error) {
    console.error('Error getting comment for feedback:', error);
    return { success: false, error: 'Failed to get comment' };
  }
}

