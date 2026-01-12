/**
 * Blog IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/modules/blog/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export post operations
export {
  getPublicPosts,
  getPostBySlugWithCategory,
  getRelatedPosts,
  getAuthorInfo,
  getPublicPostsForSitemap,
} from '@/lib/modules/blog/posts-io';

// Re-export category operations
export {
  getCategories,
  getCategoriesWithCounts,
} from '@/lib/modules/blog/blog-categories-io';
