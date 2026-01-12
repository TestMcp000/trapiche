/**
 * Comment IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/modules/comment/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export types and mappers from pure module
export type { Comment, CommentResult } from '@/lib/modules/comment/mappers';
export {
  commentToPublicSafe,
  transformComment,
  transformCommentToPublicSafe,
} from '@/lib/modules/comment/mappers';

// Re-export for backwards compatibility
export type { CommentTargetType } from '@/lib/types/comments';

// Re-export read operations
export {
  getOwnedCommentIds,
  getCommentsForTarget,
  getCommentCountForTarget,
} from '@/lib/modules/comment/comments-read-io';

// Re-export public settings
export { getCommentPublicSettings } from '@/lib/modules/comment/public-settings-io';

// Re-export permalink builder
export { buildPermalink } from '@/lib/modules/comment/permalink-io';

// Re-export write operations
export type { CreateCommentParams } from '@/lib/modules/comment/comments-write-io';
export {
  createComment,
  updateComment,
  deleteComment,
} from '@/lib/modules/comment/comments-write-io';
