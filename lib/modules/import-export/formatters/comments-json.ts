/**
 * Comments JSON Formatter (Pure, Export-only)
 *
 * Formats comments with replies to JSON export envelope.
 * Following PRD §2.11 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.11
 */

import type { CommentFull } from '@/lib/types/comments';
import type {
  CommentsExport,
  CommentExportData,
  CommentReplyExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Comment with nested replies for export */
export interface CommentWithReplies extends CommentFull {
  replies: CommentFull[];
}

/** Options for comment export */
export interface CommentExportOptions {
  includeSensitive?: boolean;
}

/** Map of target ID to slug */
export type TargetSlugMap = Map<string, string>;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a reply to export data format.
 *
 * @param reply - The reply comment
 * @param options - Export options
 * @returns Export data object
 */
export function transformReplyToExportData(
  reply: CommentFull,
  options: CommentExportOptions = {}
): CommentReplyExportData {
  const data: CommentReplyExportData = {
    user_display_name: reply.userDisplayName,
    content: reply.content,
    created_at: reply.createdAt,
  };

  if (options.includeSensitive && reply.userEmail) {
    data.user_email = reply.userEmail;
  }

  return data;
}

/**
 * Transform a comment with replies to export data format.
 *
 * @param comment - The comment with replies
 * @param targetSlugMap - Map of target ID to slug
 * @param options - Export options
 * @returns Export data object
 */
export function transformCommentToExportData(
  comment: CommentWithReplies,
  targetSlugMap: TargetSlugMap,
  options: CommentExportOptions = {}
): CommentExportData {
  const data: CommentExportData = {
    target_type: comment.targetType as 'post' | 'gallery_item' | 'product',
    target_slug: targetSlugMap.get(comment.targetId) ?? 'unknown',
    user_display_name: comment.userDisplayName,
    content: comment.content,
    is_approved: comment.isApproved,
    like_count: comment.likeCount,
    created_at: comment.createdAt,
    replies: comment.replies.map((reply) => transformReplyToExportData(reply, options)),
  };

  // Include sensitive fields if requested
  if (options.includeSensitive) {
    if (comment.userEmail) data.user_email = comment.userEmail;
    if (comment.ipHash) data.ip_hash = comment.ipHash;
    if (comment.spamScore !== null) data.spam_score = comment.spamScore;
    if (comment.spamReason) data.spam_reason = comment.spamReason;
  }

  return data;
}

/**
 * Format an array of comments to JSON export envelope.
 *
 * @param comments - Array of comments with replies to export
 * @param targetSlugMap - Map of target ID to slug
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatCommentsToJson(
  comments: CommentWithReplies[],
  targetSlugMap: TargetSlugMap,
  options: CommentExportOptions = {},
  exportedAt?: string
): CommentsExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'comments',
    includeSensitive: options.includeSensitive ?? false,
    data: comments.map((comment) => transformCommentToExportData(comment, targetSlugMap, options)),
  };
}

/**
 * Serialize comments export to JSON string.
 *
 * @param comments - Array of comments with replies to export
 * @param targetSlugMap - Map of target ID to slug
 * @param options - Export options
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatCommentsToJsonString(
  comments: CommentWithReplies[],
  targetSlugMap: TargetSlugMap,
  options: CommentExportOptions = {},
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatCommentsToJson(comments, targetSlugMap, options, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
