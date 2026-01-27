/**
 * Blog Taxonomy IO Aggregator Module (Server-only)
 *
 * Re-exports all PUBLIC READ taxonomy IO functions from submodules.
 * This is a facade aggregator module per ARCHITECTURE.md §3.4.
 *
 * For admin CRUD operations, use taxonomy-admin-io.ts instead.
 *
 * @see lib/modules/blog/taxonomy-groups-io.ts - Blog Groups (public read)
 * @see lib/modules/blog/taxonomy-topics-io.ts - Blog Topics (public read)
 * @see lib/modules/blog/taxonomy-tags-io.ts - Blog Tags (public read)
 * @see lib/modules/blog/taxonomy-post-relations-io.ts - Post-Taxonomy relations (public read)
 * @see lib/modules/blog/taxonomy-admin-io.ts - Admin CRUD operations
 * @see lib/types/blog-taxonomy.ts - Type definitions
 * @see supabase/02_add/21_blog_taxonomy_v2.sql - DB schema
 */

import 'server-only';

// Blog Groups
export {
  getVisibleBlogGroups,
  getBlogGroupBySlug,
  getBlogGroupsWithTopics,
  getBlogGroupsWithCounts,
} from './taxonomy-groups-io';

// Blog Topics
export {
  getVisibleBlogTopics,
  getTopicsByGroupId,
  getBlogTopicBySlug,
  getBlogTopicWithGroup,
  getBlogTopicsWithCounts,
} from './taxonomy-topics-io';

// Blog Tags
export {
  getAllBlogTags,
  getBlogTagBySlug,
  getBlogTagsWithCounts,
} from './taxonomy-tags-io';

// Post-Taxonomy Relations
export {
  getPostTaxonomySummary,
  getTopicsForPost,
  getTagsForPost,
} from './taxonomy-post-relations-io';
