/**
 * Comments API Validators (Pure Functions)
 * 
 * 驗證 Comments API 的 request。
 * 遵循 ARCHITECTURE.md：純函式，無 side effects (no fetch/DB/Next/console/window/document)。
 */

import {
  isValidUUID,
  isNonEmptyString,
  type ValidationResult,
  validResult,
  invalidResult,
} from './api-common';
import type {
  CommentTargetType,
  CommentsGetQuery,
  CreateCommentRequest,
  UpdateCommentRequest,
  DeleteCommentQuery,
  CommentFeedbackRequest,
  CommentFeedbackType,
  AdminCommentAction,
} from '@/lib/types/comments';

// =============================================================================
// Constants
// =============================================================================

/**
 * Maximum content length for comments (hard limit).
 * Actual limits may be stricter from DB settings via spam pipeline.
 */
const MAX_CONTENT_LENGTH = 10000;

/**
 * Valid target types for comments
 */
const VALID_TARGET_TYPES: CommentTargetType[] = ['post', 'gallery_item'];

/**
 * Valid admin comment status filters
 */
const VALID_ADMIN_STATUS_FILTERS = ['approved', 'pending', 'spam'] as const;
type AdminStatusFilter = (typeof VALID_ADMIN_STATUS_FILTERS)[number];

/**
 * Valid spam feedback types
 */
const VALID_FEEDBACK_TYPES: CommentFeedbackType[] = ['spam', 'ham'];

/**
 * Valid admin comment actions
 */
const VALID_ADMIN_ACTIONS: AdminCommentAction[] = ['approve', 'spam', 'delete'];

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if value is a valid CommentTargetType
 */
export function isValidTargetType(value: unknown): value is CommentTargetType {
  return typeof value === 'string' && VALID_TARGET_TYPES.includes(value as CommentTargetType);
}

/**
 * Check if value is a valid admin status filter
 */
function isValidAdminStatusFilter(value: unknown): value is AdminStatusFilter {
  return typeof value === 'string' && VALID_ADMIN_STATUS_FILTERS.includes(value as AdminStatusFilter);
}

/**
 * Check if value is a valid feedback type
 */
function isValidFeedbackType(value: unknown): value is CommentFeedbackType {
  return typeof value === 'string' && VALID_FEEDBACK_TYPES.includes(value as CommentFeedbackType);
}

/**
 * Check if value is a valid admin action
 */
function isValidAdminAction(value: unknown): value is AdminCommentAction {
  return typeof value === 'string' && VALID_ADMIN_ACTIONS.includes(value as AdminCommentAction);
}

// =============================================================================
// GET /api/comments Query Validation
// =============================================================================

/**
 * Validate GET /api/comments query parameters
 */
export function validateCommentsGetQuery(
  searchParams: URLSearchParams
): ValidationResult<CommentsGetQuery> {
  const targetType = searchParams.get('targetType');
  const targetId = searchParams.get('targetId');
  const countOnlyParam = searchParams.get('countOnly');

  // Validate required parameters
  if (!targetType || !targetId) {
    return invalidResult('targetType 與 targetId 為必填');
  }

  // Validate targetType
  if (!isValidTargetType(targetType)) {
    return invalidResult('targetType 必須是 "post" 或 "gallery_item"');
  }

  // Validate targetId (should be UUID)
  if (!isValidUUID(targetId)) {
    return invalidResult('targetId 必須是有效的 UUID');
  }

  // countOnly: only 'true' string is treated as true
  const countOnly = countOnlyParam === 'true';

  return validResult({
    targetType,
    targetId,
    countOnly,
  });
}

// =============================================================================
// POST /api/comments Request Validation
// =============================================================================

/**
 * Validate POST /api/comments request body
 */
export function validateCreateCommentRequest(
  body: unknown
): ValidationResult<CreateCommentRequest> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const {
    targetType,
    targetId,
    content,
    parentId,
    isAnonymous,
    honeypotValue,
    recaptchaToken,
  } = body as Record<string, unknown>;

  // Validate required: targetType
  if (!isValidTargetType(targetType)) {
    return invalidResult('targetType 必須是 "post" 或 "gallery_item"');
  }

  // Validate required: targetId
  if (!isValidUUID(targetId)) {
    return invalidResult('targetId 必須是有效的 UUID');
  }

  // Validate required: content
  if (!isNonEmptyString(content)) {
    return invalidResult('content 為必填且不可為空');
  }

  // Validate content length
  if ((content as string).length > MAX_CONTENT_LENGTH) {
    return invalidResult(`content 不得超過 ${MAX_CONTENT_LENGTH} 字元`);
  }

  // Validate optional: parentId (must be UUID if provided)
  if (parentId !== undefined && parentId !== null) {
    if (!isValidUUID(parentId)) {
      return invalidResult('parentId 必須是有效的 UUID');
    }
  }

  return validResult({
    targetType: targetType as CommentTargetType,
    targetId: targetId as string,
    content: content as string,
    parentId: parentId as string | undefined,
    isAnonymous: Boolean(isAnonymous),
    honeypotValue: typeof honeypotValue === 'string' ? honeypotValue : undefined,
    recaptchaToken: typeof recaptchaToken === 'string' ? recaptchaToken : undefined,
  });
}

// =============================================================================
// PATCH /api/comments Request Validation
// =============================================================================

/**
 * Validate PATCH /api/comments request body
 */
export function validateUpdateCommentRequest(
  body: unknown
): ValidationResult<UpdateCommentRequest> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const { commentId, content } = body as Record<string, unknown>;

  // Validate required: commentId
  if (!isValidUUID(commentId)) {
    return invalidResult('commentId 必須是有效的 UUID');
  }

  // Validate required: content
  if (!isNonEmptyString(content)) {
    return invalidResult('content 為必填且不可為空');
  }

  // Validate content length
  if ((content as string).length > MAX_CONTENT_LENGTH) {
    return invalidResult(`content 不得超過 ${MAX_CONTENT_LENGTH} 字元`);
  }

  return validResult({
    commentId: commentId as string,
    content: content as string,
  });
}

// =============================================================================
// DELETE /api/comments Query Validation
// =============================================================================

/**
 * Validate DELETE /api/comments query parameters
 */
export function validateDeleteCommentQuery(
  searchParams: URLSearchParams
): ValidationResult<DeleteCommentQuery> {
  const commentId = searchParams.get('commentId');

  if (!isValidUUID(commentId)) {
    return invalidResult('commentId 必須是有效的 UUID');
  }

  return validResult({
    commentId: commentId as string,
  });
}

// =============================================================================
// GET /api/comments/admin Query Validation
// =============================================================================

/**
 * Validated admin comments query parameters
 */
export interface AdminCommentsQueryParams {
  status?: AdminStatusFilter;
  targetType?: CommentTargetType;
  targetId?: string;
  search?: string;
  limit: number;
  offset: number;
}

/**
 * Validate GET /api/comments/admin query parameters
 */
export function validateAdminCommentsQuery(
  searchParams: URLSearchParams
): ValidationResult<AdminCommentsQueryParams> {
  const statusParam = searchParams.get('status');
  const targetTypeParam = searchParams.get('targetType');
  const targetIdParam = searchParams.get('targetId');
  const searchParam = searchParams.get('search');
  const limitParam = searchParams.get('limit');
  const offsetParam = searchParams.get('offset');

  // Validate optional: status
  let status: AdminStatusFilter | undefined;
  if (statusParam && statusParam !== 'all') {
    if (!isValidAdminStatusFilter(statusParam)) {
      return invalidResult('status 必須是 "approved"、"pending"、"spam" 或 "all"');
    }
    status = statusParam;
  }

  // Validate optional: targetType
  let targetType: CommentTargetType | undefined;
  if (targetTypeParam) {
    if (!isValidTargetType(targetTypeParam)) {
      return invalidResult('targetType 必須是 "post" 或 "gallery_item"');
    }
    targetType = targetTypeParam;
  }

  // Validate optional: targetId (must be UUID if provided)
  let targetId: string | undefined;
  if (targetIdParam) {
    if (!isValidUUID(targetIdParam)) {
      return invalidResult('targetId 必須是有效的 UUID');
    }
    targetId = targetIdParam;
  }

  // Parse limit: default 20, range 1..100
  let limit = 20;
  if (limitParam) {
    const parsed = parseInt(limitParam, 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 100) {
      return invalidResult('limit 必須介於 1 到 100');
    }
    limit = parsed;
  }

  // Parse offset: default 0, range 0..10000
  let offset = 0;
  if (offsetParam) {
    const parsed = parseInt(offsetParam, 10);
    if (isNaN(parsed) || parsed < 0 || parsed > 10000) {
      return invalidResult('offset 必須介於 0 到 10000');
    }
    offset = parsed;
  }

  return validResult({
    status,
    targetType,
    targetId,
    search: searchParam || undefined,
    limit,
    offset,
  });
}

// =============================================================================
// PATCH /api/comments/admin Request Validation
// =============================================================================

/**
 * Validated admin comment patch request
 */
export interface AdminCommentPatchValidated {
  action: AdminCommentAction;
  commentId?: string;
  commentIds?: string[];
}

/**
 * Validate PATCH /api/comments/admin request body
 */
export function validateAdminCommentPatchRequest(
  body: unknown
): ValidationResult<AdminCommentPatchValidated> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const { action, commentId, commentIds } = body as Record<string, unknown>;

  // Validate required: action
  if (!isValidAdminAction(action)) {
    return invalidResult('action 必須是 "approve"、"spam" 或 "delete"');
  }

  // Validate commentIds for bulk actions
  if (commentIds !== undefined) {
    if (!Array.isArray(commentIds)) {
      return invalidResult('commentIds 必須是陣列');
    }
    if (commentIds.length === 0) {
      return invalidResult('commentIds 不可為空');
    }
    // Validate each ID is UUID
    for (const id of commentIds) {
      if (!isValidUUID(id)) {
        return invalidResult('commentIds 內所有值都必須是有效的 UUID');
      }
    }
    return validResult({
      action: action as AdminCommentAction,
      commentIds: commentIds as string[],
    });
  }

  // Single comment action
  if (!isValidUUID(commentId)) {
    return invalidResult('commentId 必須是有效的 UUID');
  }

  return validResult({
    action: action as AdminCommentAction,
    commentId: commentId as string,
  });
}

// =============================================================================
// DELETE /api/comments/admin Query Validation
// =============================================================================

/**
 * Validate DELETE /api/comments/admin query parameters
 */
export function validateAdminCommentDeleteQuery(
  searchParams: URLSearchParams
): ValidationResult<{ commentId: string }> {
  const commentId = searchParams.get('commentId');

  if (!isValidUUID(commentId)) {
    return invalidResult('commentId 必須是有效的 UUID');
  }

  return validResult({
    commentId: commentId as string,
  });
}

// =============================================================================
// POST /api/comments/feedback Request Validation
// =============================================================================

/**
 * Validate POST /api/comments/feedback request body
 */
export function validateCommentFeedbackRequest(
  body: unknown
): ValidationResult<CommentFeedbackRequest> {
  if (!body || typeof body !== 'object') {
    return invalidResult('請求內容必須是物件');
  }

  const { commentId, feedbackType } = body as Record<string, unknown>;

  // Validate required: commentId
  if (!isValidUUID(commentId)) {
    return invalidResult('commentId 必須是有效的 UUID');
  }

  // Validate required: feedbackType
  if (!isValidFeedbackType(feedbackType)) {
    return invalidResult('feedbackType 必須是 "spam" 或 "ham"');
  }

  return validResult({
    commentId: commentId as string,
    feedbackType: feedbackType as CommentFeedbackType,
  });
}
