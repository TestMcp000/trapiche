'use server';

/**
 * Admin Comments Server Actions
 * 
 * Server-side actions for comment moderation.
 * All actions perform permission check before calling lib IO.
 */

import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
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
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

// =============================================================================
// Types
// =============================================================================

export interface FetchAdminCommentsData {
  comments: AdminComment[];
  total: number;
}

// =============================================================================
// Fetch Actions
// =============================================================================

/**
 * Fetch comments for admin with filters
 */
export async function fetchAdminCommentsAction(
  filters: AdminCommentFilters
): Promise<ActionResult<FetchAdminCommentsData>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await getCommentsForAdmin(filters);
  return actionSuccess({ comments: result.comments, total: result.total });
}

// =============================================================================
// Single Comment Actions
// =============================================================================

/**
 * Approve a single comment
 */
export async function approveCommentAction(
  commentId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!commentId) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await approveComment(commentId);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

/**
 * Mark a single comment as spam
 */
export async function markSpamAction(
  commentId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!commentId) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await markAsSpam(commentId);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

/**
 * Delete a single comment
 */
export async function deleteCommentAction(
  commentId: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!commentId) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await adminDeleteComment(commentId);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  return actionSuccess();
}

// =============================================================================
// Bulk Actions
// =============================================================================

/**
 * Bulk approve comments
 */
export async function bulkApproveAction(
  commentIds: string[]
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!Array.isArray(commentIds) || commentIds.length === 0) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await bulkApprove(commentIds);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

/**
 * Bulk mark comments as spam
 */
export async function bulkMarkSpamAction(
  commentIds: string[]
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!Array.isArray(commentIds) || commentIds.length === 0) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await bulkMarkAsSpam(commentIds);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  return actionSuccess();
}

/**
 * Bulk delete comments
 */
export async function bulkDeleteAction(
  commentIds: string[]
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!Array.isArray(commentIds) || commentIds.length === 0) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await bulkDelete(commentIds);
  if (!result.success) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  return actionSuccess();
}
