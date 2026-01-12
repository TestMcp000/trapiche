'use server';

/**
 * Admin Comments Server Actions
 * 
 * Server-side actions for comment moderation.
 * All actions perform permission check before calling lib IO.
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
import {
  getCommentsForAdmin,
  approveComment,
  markAsSpam,
  adminDeleteComment,
  bulkApprove,
  bulkMarkAsSpam,
  bulkDelete,
  type AdminCommentFilters,
  type AdminComment,
} from '@/lib/modules/comment/admin-io';

// =============================================================================
// Types
// =============================================================================

export interface FetchCommentsResult {
  success: boolean;
  comments: AdminComment[];
  total: number;
  error?: string;
}

export interface CommentActionResult {
  success: boolean;
  comment?: AdminComment;
  message?: string;
  error?: string;
}

// =============================================================================
// Helper
// =============================================================================

async function checkAdmin(): Promise<boolean> {
  const supabase = await createClient();
  return isSiteAdmin(supabase);
}

// =============================================================================
// Fetch Actions
// =============================================================================

/**
 * Fetch comments for admin with filters
 */
export async function fetchAdminCommentsAction(
  filters: AdminCommentFilters
): Promise<FetchCommentsResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, comments: [], total: 0, error: 'Unauthorized' };
  }

  const result = await getCommentsForAdmin(filters);
  return {
    success: true,
    comments: result.comments,
    total: result.total,
  };
}

// =============================================================================
// Single Comment Actions
// =============================================================================

/**
 * Approve a single comment
 */
export async function approveCommentAction(
  commentId: string
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await approveComment(commentId);
  return result;
}

/**
 * Mark a single comment as spam
 */
export async function markSpamAction(
  commentId: string
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await markAsSpam(commentId);
  return result;
}

/**
 * Delete a single comment
 */
export async function deleteCommentAction(
  commentId: string
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  const result = await adminDeleteComment(commentId);
  return result;
}

// =============================================================================
// Bulk Actions
// =============================================================================

/**
 * Bulk approve comments
 */
export async function bulkApproveAction(
  commentIds: string[]
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (commentIds.length === 0) {
    return { success: false, error: 'No comments selected' };
  }

  const result = await bulkApprove(commentIds);
  return result;
}

/**
 * Bulk mark comments as spam
 */
export async function bulkMarkSpamAction(
  commentIds: string[]
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (commentIds.length === 0) {
    return { success: false, error: 'No comments selected' };
  }

  const result = await bulkMarkAsSpam(commentIds);
  return result;
}

/**
 * Bulk delete comments
 */
export async function bulkDeleteAction(
  commentIds: string[]
): Promise<CommentActionResult> {
  const isAdmin = await checkAdmin();
  if (!isAdmin) {
    return { success: false, error: 'Unauthorized' };
  }

  if (commentIds.length === 0) {
    return { success: false, error: 'No comments selected' };
  }

  const result = await bulkDelete(commentIds);
  return result;
}
