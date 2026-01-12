/**
 * Comment Moderation Admin IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/modules/comment/moderation-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export types and transform from pure module
export type {
  AdminCommentFilters,
  AdminComment,
  AdminCommentResult,
} from '@/lib/modules/comment/moderation-transform';
export { transformAdminComment } from '@/lib/modules/comment/moderation-transform';

// Re-export read operations
export { getCommentsForAdmin } from '@/lib/modules/comment/moderation-read-admin-io';

// Re-export write operations
export {
  insertCommentModeration,
  approveComment,
  markAsSpam,
  adminDeleteComment,
  bulkApprove,
  bulkDelete,
  bulkMarkAsSpam,
} from '@/lib/modules/comment/moderation-write-admin-io';
