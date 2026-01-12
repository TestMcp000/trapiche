/**
 * Comment Admin IO Layer (Facade)
 *
 * Thin re-export module that provides backward compatibility.
 * All implementations are in capability-focused submodules.
 *
 * @module lib/modules/comment/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 *
 * Submodules:
 * - moderation-admin-io.ts: Comment moderation and admin CRUD
 * - settings-admin-io.ts: Settings and blacklist management
 * - feedback-admin-io.ts: Akismet feedback reporting
 */

import 'server-only';

// =============================================================================
// Moderation (includes RLS-bypassed writes and admin CRUD)
// =============================================================================

export {
  // Types
  type AdminCommentFilters,
  type AdminComment,
  type AdminCommentResult,
  // RLS-bypassed insert
  insertCommentModeration,
  // Read operations
  getCommentsForAdmin,
  // Write operations
  approveComment,
  markAsSpam,
  adminDeleteComment,
  // Bulk operations
  bulkApprove,
  bulkDelete,
  bulkMarkAsSpam,
} from './moderation-admin-io';

// =============================================================================
// Settings & Blacklist
// =============================================================================

export {
  // Read operations
  getCommentSettingsAndBlacklist,
  // Write operations
  updateCommentSettings,
  addCommentBlacklistItem,
  removeCommentBlacklistItem,
} from './settings-admin-io';

// =============================================================================
// Akismet Feedback
// =============================================================================

export {
  getCommentForFeedback,
} from './feedback-admin-io';
