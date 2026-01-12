/**
 * Comment Moderation Types (Pure Module)
 *
 * Type definitions and transform helpers for comment moderation.
 * These are pure functions with no I/O dependencies.
 *
 * @module lib/modules/comment/moderation-transform
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

/** Filters for admin comment queries */
export interface AdminCommentFilters {
  status?: 'all' | 'approved' | 'pending' | 'spam';
  targetType?: 'post' | 'gallery_item';
  targetId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Admin comment with moderation data joined
 * Includes userEmail, spamReason from comment_moderation
 */
export interface AdminComment {
  id: string;
  targetType: 'post' | 'gallery_item';
  targetId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  userEmail: string | null;
  content: string;
  parentId: string | null;
  isSpam: boolean;
  isApproved: boolean;
  spamScore: number | null;
  spamReason: string | null;
  ipHash: string | null;
  linkCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

/** Result type for admin comment operations */
export interface AdminCommentResult {
  success: boolean;
  comment?: AdminComment;
  error?: string;
  message?: string;
}

/**
 * Transform DB row with moderation join to AdminComment
 */
export function transformAdminComment(row: Record<string, unknown>): AdminComment {
  // Extract moderation data from joined table
  const moderation = row.comment_moderation as Record<string, unknown> | null;

  return {
    id: row.id as string,
    targetType: (row.target_type as 'post' | 'gallery_item') || 'post',
    targetId: row.target_id as string,
    userId: row.user_id as string,
    userDisplayName: row.user_display_name as string,
    userAvatarUrl: row.user_avatar_url as string | null,
    userEmail: moderation?.user_email as string | null ?? null,
    content: row.content as string,
    parentId: row.parent_id as string | null,
    isSpam: row.is_spam as boolean,
    isApproved: row.is_approved as boolean,
    spamScore: moderation?.spam_score as number | null ?? null,
    spamReason: moderation?.spam_reason as string | null ?? null,
    ipHash: moderation?.ip_hash as string | null ?? null,
    linkCount: (moderation?.link_count as number) ?? 0,
    likeCount: (row.like_count as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
