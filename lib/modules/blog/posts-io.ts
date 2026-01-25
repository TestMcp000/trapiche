/**
 * Blog Posts IO
 *
 * Database operations for blog posts.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/blog/posts-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { Post, PostSummary } from '@/lib/types/blog';

/**
 * Get all public posts for the blog listing page
 * Filters by locale, category, search query, and sorting
 */
export async function getPublicPosts(options?: {
  categorySlug?: string;
  limit?: number;
  offset?: number;
  locale?: string;
  search?: string;
  sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
}): Promise<PostSummary[]> {
  // First, if filtering by category, get the category ID
  let categoryId: string | null = null;
  if (options?.categorySlug) {
    const { data: categoryData } = await createAnonClient()
      .from('categories')
      .select('id')
      .eq('slug', options.categorySlug)
      .single();

    if (categoryData) {
      categoryId = categoryData.id;
    } else {
      // Category not found, return empty array
      return [];
    }
  }

  let query = createAnonClient()
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      slug,
      excerpt_en,
      excerpt_zh,
      content_en,
      content_zh,
      cover_image_url,
      visibility,
      published_at,
      created_at,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('visibility', 'public');

  // Filter by locale - only show posts that have content in the selected language
  if (options?.locale === 'zh') {
    query = query.not('content_zh', 'is', null);
  }

  // Filter by category using category_id
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  // Search by title (both languages)
  if (options?.search) {
    const searchTerm = `%${options.search}%`;
    query = query.or(`title_en.ilike.${searchTerm},title_zh.ilike.${searchTerm}`);
  }

  // Sort
  switch (options?.sort) {
    case 'oldest':
      query = query.order('published_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title_en', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title_en', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('published_at', { ascending: false });
      break;
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
  }

  const { data } = await query;

  return (data ?? []) as unknown as PostSummary[];
}

/**
 * Get a single post by slug (public only) - includes category info
 * Used for: /{locale}/blog/{category}/{slug} route
 */
export async function getPostBySlugWithCategory(slug: string): Promise<Post | null> {
  const { data } = await createAnonClient()
    .from('posts')
    .select(`
      *,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('slug', slug)
    .eq('visibility', 'public')
    .single();

  if (!data) {
    return null;
  }

  return data as unknown as Post;
}

/**
 * Get related posts for a given post
 * Priority: same category > recent posts
 * Excludes the current post from results
 */
export async function getRelatedPosts(
  currentPostId: string,
  categoryId: string | null,
  limit: number = 4
): Promise<PostSummary[]> {
  let query = createAnonClient()
    .from('posts')
    .select(`
      id,
      title_en,
      title_zh,
      slug,
      excerpt_en,
      excerpt_zh,
      cover_image_url,
      visibility,
      published_at,
      created_at,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('visibility', 'public')
    .neq('id', currentPostId)
    .order('published_at', { ascending: false })
    .limit(limit);

  // If we have a category, prioritize posts from the same category
  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data } = await query;

  // If we got less than limit posts from same category, fetch more from other categories
  if (data && data.length < limit && categoryId) {
    const needed = limit - data.length;
    const existingIds = data.map(p => p.id);
    existingIds.push(currentPostId);

    const { data: morePosts } = await createAnonClient()
      .from('posts')
      .select(`
        id,
        title_en,
        title_zh,
        slug,
        excerpt_en,
        excerpt_zh,
        cover_image_url,
        visibility,
        published_at,
        created_at,
        category:categories(id, name_en, name_zh, slug)
      `)
      .eq('visibility', 'public')
      .not('id', 'in', `(${existingIds.join(',')})`)
      .order('published_at', { ascending: false })
      .limit(needed);

    if (morePosts) {
      return [...data, ...morePosts] as unknown as PostSummary[];
    }
  }

  return (data || []) as unknown as PostSummary[];
}

/**
 * Get author information
 * Note: Currently returns static author info since we can't easily query auth.users
 */
export async function getAuthorInfo(_authorId: string): Promise<{
  name: string;
  email?: string;
} | null> {
  // We can't query auth.users from anon context.
  // Keep this non-identifying and move to a dedicated authors table if needed.
  return {
    name: '網站管理者',
  };
}

/**
 * Get all public posts for sitemap generation
 * Returns minimal data needed for sitemap URLs
 */
export async function getPublicPostsForSitemap(): Promise<Array<{
  slug: string;
  categorySlug: string;
  updatedAt: string;
  hasEnglish: boolean;
  hasChinese: boolean;
}>> {
  const { data } = await createAnonClient()
    .from('posts')
    .select(`
      slug,
      updated_at,
      content_en,
      content_zh,
      category:categories(slug)
    `)
    .eq('visibility', 'public');

  return (data || []).map((post: Record<string, unknown>) => ({
    slug: post.slug as string,
    categorySlug: (post.category as { slug?: string })?.slug || 'uncategorized',
    updatedAt: post.updated_at as string,
    hasEnglish: !!post.content_en,
    hasChinese: !!post.content_zh,
  }));
}
