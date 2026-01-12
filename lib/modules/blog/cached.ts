/**
 * Cached blog data access functions for public reads
 *
 * Wraps `lib/modules/blog/io.ts` (IO) with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 *
 * @see lib/modules/blog/io.ts - Raw IO functions
 * @see lib/modules/blog/admin-io.ts - Admin operations (not cached)
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type { Post, PostSummary, Category, CategoryWithCount } from '@/lib/types/blog';
import {
  getPublicPosts,
  getPostBySlugWithCategory,
  getCategories,
  getCategoriesWithCounts,
  getRelatedPosts,
  getPublicPostsForSitemap,
} from '@/lib/modules/blog/io';

const CACHE_REVALIDATE_SECONDS = 60;

export const getPublicPostsCached = cachedQuery(
  async (options?: {
    categorySlug?: string;
    limit?: number;
    offset?: number;
    locale?: string;
    search?: string;
    sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
  }): Promise<PostSummary[]> => getPublicPosts(options),
  ['public-posts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getPostBySlugWithCategoryCached = cachedQuery(
  async (slug: string): Promise<Post | null> => getPostBySlugWithCategory(slug),
  ['post-by-slug'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getCategoriesCached = cachedQuery(
  async (): Promise<Category[]> => getCategories(),
  ['categories'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getCategoriesWithCountsCached = cachedQuery(
  async (): Promise<{ categories: CategoryWithCount[]; uncategorizedCount: number }> =>
    getCategoriesWithCounts(),
  ['categories-with-counts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getRelatedPostsCached = cachedQuery(
  async (currentPostId: string, categoryId: string | null, limit: number = 4): Promise<PostSummary[]> =>
    getRelatedPosts(currentPostId, categoryId, limit),
  ['related-posts'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

export const getPublicPostsForSitemapCached = cachedQuery(
  async (): Promise<Array<{
    slug: string;
    categorySlug: string;
    updatedAt: string;
    hasEnglish: boolean;
    hasChinese: boolean;
  }>> => getPublicPostsForSitemap(),
  ['public-posts-sitemap'],
  ['blog'],
  CACHE_REVALIDATE_SECONDS
);

// Re-export getAuthorInfo directly (no caching needed - returns static values)
export { getAuthorInfo } from '@/lib/modules/blog/io';
