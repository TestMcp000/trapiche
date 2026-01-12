/**
 * Comment type definitions
 * 
 * Single source of truth for comment-related types.
 * Aligned with DB schema: supabase/02_add/02_comments.sql
 * 
 * 遵循 ARCHITECTURE.md §3.6：
 * - 所有 API request/response types 必須定義在 lib/types/*
 * - API routes 不得 export interface 給 client 用
 */

// =============================================================================
// Core Types
// =============================================================================

/**
 * Comment target type for polymorphic comments
 * - 'post': Blog post
 * - 'gallery_item': Gallery item
 */
export type CommentTargetType = 'post' | 'gallery_item';

/**
 * Comment target identifier
 */
export interface CommentTarget {
  targetType: CommentTargetType;
  targetId: string;
}

// =============================================================================
// DB Row Types (snake_case, matching Supabase schema)
// =============================================================================

/**
 * Comment DB row (snake_case, matching supabase/02_add/02_comments.sql)
 * P0-6: Sensitive fields moved to comment_moderation table
 */
export interface CommentRow {
  id: string;
  target_type: CommentTargetType;
  target_id: string;
  parent_id: string | null;
  user_id: string;
  user_display_name: string;
  user_avatar_url: string | null;
  content: string;
  is_spam: boolean;
  is_approved: boolean;
  like_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Comment Moderation DB row (admin-only sensitive data)
 * P0-6: Separated from comments table for security
 */
export interface CommentModerationRow {
  id: string;
  comment_id: string;
  user_email: string | null;
  ip_hash: string | null;
  spam_score: number | null;
  spam_reason: string | null;
  link_count: number;
  created_at: string;
}

// =============================================================================
// API Models (camelCase, for UI use)
// =============================================================================

/**
 * Comment public API response (SAFE - no sensitive fields)
 * Used by GET /api/comments for public consumption
 * 
 * Phase 5: Sensitive fields removed:
 * - userId (privacy)
 * - userEmail (privacy)
 * - ipHash (privacy)
 * - spamScore, spamReason, isSpam, isApproved (moderation data)
 * - linkCount (internal)
 */
export interface CommentPublicSafe {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  userDisplayName: string;
  userAvatarUrl: string | null;
  content: string;
  likeCount: number;
  createdAt: string;
  /** Server-computed ownership flag - true if comment belongs to current user */
  isMine?: boolean;
}

/**
 * Comment full model (internal/admin use only)
 * Contains all fields including sensitive moderation data
 */
export interface CommentFull {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  parentId: string | null;
  userId: string;
  userDisplayName: string;
  userAvatarUrl: string | null;
  userEmail: string | null;
  content: string;
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

/**
 * Comment with nested replies (tree structure) - PUBLIC SAFE
 */
export interface CommentPublicSafeWithReplies extends CommentPublicSafe {
  replies?: CommentPublicSafeWithReplies[];
  likedByMe?: boolean;
}

// =============================================================================
// GET /api/comments
// =============================================================================

/**
 * GET /api/comments query parameters
 */
export interface CommentsGetQuery {
  targetType: CommentTargetType;
  targetId: string;
  countOnly?: boolean;
}

/**
 * GET /api/comments response (full comments - PUBLIC SAFE)
 */
export interface CommentsApiResponse {
  comments: CommentPublicSafeWithReplies[];
}

/**
 * GET /api/comments?countOnly=true response
 */
export interface CommentsCountResponse {
  count: number;
}

// =============================================================================
// POST /api/comments
// =============================================================================

/**
 * Spam decision type
 */
export type CreateCommentDecision = 'allow' | 'pending' | 'spam';

/**
 * POST /api/comments request body
 */
export interface CreateCommentRequest {
  targetType: CommentTargetType;
  targetId: string;
  content: string;
  parentId?: string | null;
  isAnonymous?: boolean;
  honeypotValue?: string;
  recaptchaToken?: string;
}

/**
 * POST /api/comments success response
 * P0-6: Returns CommentPublicSafe (no sensitive fields)
 */
export interface CreateCommentSuccessResponse {
  success: true;
  comment: CommentPublicSafe;
  decision: CreateCommentDecision;
  message?: string;
}

// =============================================================================
// PATCH /api/comments
// =============================================================================

/**
 * PATCH /api/comments request body
 */
export interface UpdateCommentRequest {
  commentId: string;
  content: string;
}

/**
 * PATCH /api/comments success response
 * P0-6: Returns CommentPublicSafe (no sensitive fields)
 */
export interface UpdateCommentSuccessResponse {
  success: true;
  comment: CommentPublicSafe;
  message?: string;
}

// =============================================================================
// DELETE /api/comments
// =============================================================================

/**
 * DELETE /api/comments query parameters
 */
export interface DeleteCommentQuery {
  commentId: string;
}

/**
 * DELETE /api/comments success response
 */
export interface DeleteCommentSuccessResponse {
  success: true;
  message?: string;
}

// =============================================================================
// GET /api/comments/public-settings
// =============================================================================

/**
 * GET /api/comments/public-settings response
 */
export interface CommentPublicSettingsResponse {
  enable_recaptcha: boolean;
  max_content_length: number;
}

// =============================================================================
// Admin / Settings / Blacklist Types
// =============================================================================

/**
 * Blacklist item type
 */
export type CommentBlacklistType = 'keyword' | 'ip' | 'email' | 'domain';

/**
 * Blacklist item
 */
export interface CommentBlacklistItem {
  id: string;
  type: CommentBlacklistType;
  value: string;
  reason: string | null;
  created_at: string;
}

/**
 * Comment settings configuration status
 */
export interface CommentSettingsConfig {
  akismet_configured: boolean;
  recaptcha_site_key_configured: boolean;
  recaptcha_secret_configured: boolean;
}

/**
 * GET /api/comments/settings response
 */
export interface CommentSettingsResponse {
  settings: Record<string, string>;
  blacklist: CommentBlacklistItem[];
  config: CommentSettingsConfig;
}

/**
 * PATCH /api/comments/settings request
 */
export interface UpdateCommentSettingsRequest {
  settings: Record<string, string>;
}

/**
 * PATCH /api/comments/settings success response
 */
export interface UpdateCommentSettingsSuccessResponse {
  success: true;
  message: string;
}

/**
 * POST /api/comments/settings (add blacklist) request
 */
export interface AddCommentBlacklistRequest {
  type: CommentBlacklistType;
  value: string;
  reason?: string | null;
}

/**
 * POST /api/comments/settings (add blacklist) success response
 */
export interface AddCommentBlacklistSuccessResponse {
  success: true;
  item: CommentBlacklistItem;
}

/**
 * DELETE /api/comments/settings query
 */
export interface RemoveCommentBlacklistQuery {
  id: string;
}

/**
 * DELETE /api/comments/settings success response
 */
export interface RemoveCommentBlacklistSuccessResponse {
  success: true;
}

// =============================================================================
// Admin Comments Management
// =============================================================================

/**
 * Admin comment list item (subset of CommentFull for list display)
 */
export type AdminCommentListItem = Pick<
  CommentFull,
  | 'id'
  | 'targetType'
  | 'targetId'
  | 'userDisplayName'
  | 'userEmail'
  | 'content'
  | 'isApproved'
  | 'isSpam'
  | 'spamReason'
  | 'createdAt'
>;

/**
 * GET /api/comments/admin response
 */
export interface AdminCommentsListResponse {
  comments: AdminCommentListItem[];
  total: number;
}

/**
 * Admin comment action type
 */
export type AdminCommentAction = 'approve' | 'spam' | 'delete';

/**
 * PATCH /api/comments/admin request
 */
export interface AdminCommentPatchRequest {
  action: AdminCommentAction;
  commentId?: string;
  commentIds?: string[];
}

/**
 * PATCH /api/comments/admin success response
 */
export interface AdminCommentPatchSuccessResponse {
  success: true;
  message?: string;
  comment?: CommentFull;
}

/**
 * DELETE /api/comments/admin query
 */
export interface AdminCommentDeleteQuery {
  commentId: string;
}

/**
 * DELETE /api/comments/admin success response
 */
export interface AdminCommentDeleteSuccessResponse {
  success: true;
}

// =============================================================================
// Spam Feedback
// =============================================================================

/**
 * Spam feedback type
 */
export type CommentFeedbackType = 'spam' | 'ham';

/**
 * POST /api/comments/feedback request
 */
export interface CommentFeedbackRequest {
  commentId: string;
  feedbackType: CommentFeedbackType;
}

/**
 * POST /api/comments/feedback response
 */
export interface CommentFeedbackResponse {
  success: boolean;
  message: string;
}
