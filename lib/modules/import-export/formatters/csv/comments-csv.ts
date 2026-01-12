/**
 * Comments CSV Formatter (Pure, Export-only)
 *
 * Formats comments to CSV with flattened structure.
 * Replies are separate rows with parent_id to indicate relationship.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §3.6 (Comments CSV format)
 * @see uiux_refactor.md §4 item 2
 */

import type { CommentWithReplies, TargetSlugMap } from '../comments-json';
import type { CommentFull } from '@/lib/types/comments';
import {
  escapeCsvCell,
  nullToEmpty,
  toIsoUtc,
  boolToCsv,
  toCsv,
} from './csv-utils';

// =============================================================================
// Types
// =============================================================================

/** Options for comment CSV export */
export interface CommentCsvOptions {
  includeSensitive?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** CSV column headers (basic) */
const COMMENT_CSV_HEADERS = [
  'target_type',
  'target_slug',
  'user_display_name',
  'content',
  'is_approved',
  'like_count',
  'created_at',
  'parent_id',
] as const;

/** Additional sensitive columns */
const COMMENT_SENSITIVE_HEADERS = [
  'user_email',
  'ip_hash',
  'spam_score',
  'spam_reason',
] as const;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a comment (or reply) to a CSV row.
 *
 * @param comment - Comment data
 * @param targetSlug - Resolved target slug
 * @param parentId - Parent comment ID (empty for top-level)
 * @param options - Export options
 * @returns Array of escaped cell values
 */
function transformCommentToCsvRow(
  comment: CommentFull,
  targetSlug: string,
  parentId: string,
  options: CommentCsvOptions
): string[] {
  const row = [
    escapeCsvCell(comment.targetType),
    escapeCsvCell(targetSlug),
    escapeCsvCell(comment.userDisplayName),
    escapeCsvCell(comment.content),
    escapeCsvCell(boolToCsv(comment.isApproved)),
    escapeCsvCell(comment.likeCount),
    escapeCsvCell(toIsoUtc(comment.createdAt)),
    escapeCsvCell(parentId),
  ];

  if (options.includeSensitive) {
    row.push(
      escapeCsvCell(nullToEmpty(comment.userEmail)),
      escapeCsvCell(nullToEmpty(comment.ipHash)),
      escapeCsvCell(nullToEmpty(comment.spamScore)),
      escapeCsvCell(nullToEmpty(comment.spamReason))
    );
  }

  return row;
}

/**
 * Transform a comment with its replies to flattened CSV rows.
 *
 * @param comment - Comment with replies
 * @param targetSlugMap - Map of target ID to slug
 * @param options - Export options
 * @returns Array of CSV row arrays
 */
export function transformCommentWithRepliesToCsvRows(
  comment: CommentWithReplies,
  targetSlugMap: TargetSlugMap,
  options: CommentCsvOptions = {}
): string[][] {
  const targetSlug = targetSlugMap.get(comment.targetId) ?? 'unknown';
  const rows: string[][] = [];

  // Add top-level comment row
  rows.push(transformCommentToCsvRow(comment, targetSlug, '', options));

  // Add reply rows
  for (const reply of comment.replies ?? []) {
    rows.push(
      transformCommentToCsvRow(reply, targetSlug, comment.id, options)
    );
  }

  return rows;
}

/**
 * Format comments to CSV string.
 *
 * @param comments - Array of comments with replies
 * @param targetSlugMap - Map of target ID to slug
 * @param options - Export options
 * @returns CSV string
 */
export function formatCommentsToCsv(
  comments: CommentWithReplies[],
  targetSlugMap: TargetSlugMap,
  options: CommentCsvOptions = {}
): string {
  // Build headers based on options
  const headers: string[] = [...COMMENT_CSV_HEADERS];
  if (options.includeSensitive) {
    headers.push(...COMMENT_SENSITIVE_HEADERS);
  }

  // Flatten all comments and replies to rows
  const allRows = comments.flatMap((comment) =>
    transformCommentWithRepliesToCsvRows(comment, targetSlugMap, options)
  );

  return toCsv(headers, allRows);
}
