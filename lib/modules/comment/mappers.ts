/**
 * Comment Mappers (Pure Module)
 *
 * Transform functions for converting between Comment database rows
 * and typed models. These are pure functions with no I/O dependencies.
 *
 * @module lib/modules/comment/mappers
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import type {
  CommentTargetType,
  CommentPublicSafe,
} from '@/lib/types/comments';
import type { SpamDecision } from '@/lib/spam/engine';

/**
 * Comment model for internal use
 * P0-6: Sensitive fields (userEmail, spamScore, spamReason, ipHash, linkCount)
 * are optional and only populated when joining with comment_moderation table.
 */
export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  userEmail?: string | null; // From comment_moderation join
  content: string;
  parentId: string | null;
  isSpam: boolean;
  isApproved: boolean;
  spamScore?: number | null; // From comment_moderation join
  spamReason?: string | null; // From comment_moderation join
  ipHash?: string | null; // From comment_moderation join
  linkCount?: number; // From comment_moderation join
  likeCount: number;
  createdAt: string;
  updatedAt: string;
  replies?: Comment[];
}

export interface CommentResult {
  success: boolean;
  comment?: Comment;
  decision?: SpamDecision;
  error?: string;
  message?: string;
}

/**
 * Convert Comment model to CommentPublicSafe (strips sensitive fields)
 * P0-6: Used by API routes to return safe public response
 */
export function commentToPublicSafe(comment: Comment): CommentPublicSafe {
  return {
    id: comment.id,
    targetType: comment.targetType,
    targetId: comment.targetId,
    parentId: comment.parentId,
    userDisplayName: comment.userDisplayName,
    userAvatarUrl: comment.userAvatarUrl,
    content: comment.content,
    likeCount: comment.likeCount,
    createdAt: comment.createdAt,
  };
}

/**
 * Transform database row to Comment type (FULL - internal/admin use)
 * P0-6: Sensitive fields (userEmail, spamScore, spamReason, ipHash, linkCount)
 * are now in comment_moderation table. This function returns nulls for those.
 * For admin queries needing full data, join comment_moderation.
 */
export function transformComment(row: Record<string, unknown>): Comment {
  const targetType = (row.target_type as CommentTargetType) || 'post';
  const targetId = row.target_id as string;

  return {
    id: row.id as string,
    targetType,
    targetId,
    userId: row.user_id as string,
    userDisplayName: row.user_display_name as string,
    userAvatarUrl: row.user_avatar_url as string | null,
    // P0-6: userEmail now in comment_moderation, default to null here
    userEmail: (row.user_email as string | null) ?? null,
    content: row.content as string,
    parentId: row.parent_id as string | null,
    isSpam: row.is_spam as boolean,
    isApproved: row.is_approved as boolean,
    // P0-6: These fields now in comment_moderation, default to null/0 here
    spamScore: (row.spam_score as number | null) ?? null,
    spamReason: (row.spam_reason as string | null) ?? null,
    ipHash: (row.ip_hash as string | null) ?? null,
    linkCount: (row.link_count as number) ?? 0,
    likeCount: (row.like_count as number) || 0,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Transform database row to CommentPublicSafe (PUBLIC - no sensitive fields)
 * Phase 5: Sensitive fields stripped for public API response
 * P0-6: Exported for use by API routes
 */
export function transformCommentToPublicSafe(row: Record<string, unknown>): CommentPublicSafe {
  const targetType = (row.target_type as CommentTargetType) || 'post';
  const targetId = row.target_id as string;

  return {
    id: row.id as string,
    targetType,
    targetId,
    parentId: row.parent_id as string | null,
    userDisplayName: row.user_display_name as string,
    userAvatarUrl: row.user_avatar_url as string | null,
    content: row.content as string,
    likeCount: (row.like_count as number) || 0,
    createdAt: row.created_at as string,
  };
}
