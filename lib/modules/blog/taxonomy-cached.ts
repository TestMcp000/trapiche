/**
 * Cached Blog Taxonomy Data Access Functions
 *
 * Wraps `lib/modules/blog/taxonomy-io.ts` with global cache versioning
 * so public routes can reuse server-side results and keep TTFB/LCP stable.
 *
 * @see lib/modules/blog/taxonomy-io.ts - Raw IO functions
 * @see lib/types/blog-taxonomy.ts - Type definitions
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type {
  BlogGroup,
  BlogGroupWithTopics,
  BlogGroupWithCounts,
  BlogTopic,
  BlogTopicWithGroup,
  BlogTopicWithCounts,
  BlogTag,
  BlogTagWithCounts,
  PostTaxonomySummary,
} from '@/lib/types/blog-taxonomy';
import {
  getVisibleBlogGroups,
  getBlogGroupBySlug,
  getBlogGroupsWithTopics,
  getBlogGroupsWithCounts,
  getVisibleBlogTopics,
  getTopicsByGroupId,
  getBlogTopicBySlug,
  getBlogTopicWithGroup,
  getBlogTopicsWithCounts,
  getAllBlogTags,
  getBlogTagBySlug,
  getBlogTagsWithCounts,
  getPostTaxonomySummary,
  getTopicsForPost,
  getTagsForPost,
} from '@/lib/modules/blog/taxonomy-io';

const CACHE_REVALIDATE_SECONDS = 60;

// =============================================================================
// Blog Groups (Cached)
// =============================================================================

export const getVisibleBlogGroupsCached = cachedQuery(
  async (): Promise<BlogGroup[]> => getVisibleBlogGroups(),
  ['blog-groups'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogGroupBySlugCached = cachedQuery(
  async (slug: string): Promise<BlogGroup | null> => getBlogGroupBySlug(slug),
  ['blog-group-by-slug'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogGroupsWithTopicsCached = cachedQuery(
  async (): Promise<BlogGroupWithTopics[]> => getBlogGroupsWithTopics(),
  ['blog-groups-with-topics'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogGroupsWithCountsCached = cachedQuery(
  async (): Promise<BlogGroupWithCounts[]> => getBlogGroupsWithCounts(),
  ['blog-groups-with-counts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Blog Topics (Cached)
// =============================================================================

export const getVisibleBlogTopicsCached = cachedQuery(
  async (): Promise<BlogTopic[]> => getVisibleBlogTopics(),
  ['blog-topics'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getTopicsByGroupIdCached = cachedQuery(
  async (groupId: string): Promise<BlogTopic[]> => getTopicsByGroupId(groupId),
  ['blog-topics-by-group'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogTopicBySlugCached = cachedQuery(
  async (slug: string): Promise<BlogTopic | null> => getBlogTopicBySlug(slug),
  ['blog-topic-by-slug'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogTopicWithGroupCached = cachedQuery(
  async (slug: string): Promise<BlogTopicWithGroup | null> => getBlogTopicWithGroup(slug),
  ['blog-topic-with-group'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogTopicsWithCountsCached = cachedQuery(
  async (): Promise<BlogTopicWithCounts[]> => getBlogTopicsWithCounts(),
  ['blog-topics-with-counts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Blog Tags (Cached)
// =============================================================================

export const getAllBlogTagsCached = cachedQuery(
  async (): Promise<BlogTag[]> => getAllBlogTags(),
  ['blog-tags'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogTagBySlugCached = cachedQuery(
  async (slug: string): Promise<BlogTag | null> => getBlogTagBySlug(slug),
  ['blog-tag-by-slug'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getBlogTagsWithCountsCached = cachedQuery(
  async (): Promise<BlogTagWithCounts[]> => getBlogTagsWithCounts(),
  ['blog-tags-with-counts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Post Taxonomy Relations (Cached)
// =============================================================================

export const getPostTaxonomySummaryCached = cachedQuery(
  async (postId: string): Promise<PostTaxonomySummary> => getPostTaxonomySummary(postId),
  ['post-taxonomy-summary'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getTopicsForPostCached = cachedQuery(
  async (postId: string): Promise<BlogTopic[]> => getTopicsForPost(postId),
  ['post-topics'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getTagsForPostCached = cachedQuery(
  async (postId: string): Promise<BlogTag[]> => getTagsForPost(postId),
  ['post-tags'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);
