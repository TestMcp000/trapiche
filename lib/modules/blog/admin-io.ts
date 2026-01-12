/**
 * Blog admin data access layer
 *
 * Server-side IO helpers for admin blog operations.
 * Uses cookie-based Supabase server client for RLS authentication.
 *
 * @see lib/modules/blog/io.ts - Public reads (anon client)
 * @see lib/modules/blog/cached.ts - Cached public reads
 */

import 'server-only';
import { createClient } from '@/lib/infrastructure/supabase/server';
import type { Post, PostInput, PostSummary, Category, CategoryWithCount } from '@/lib/types/blog';

/**
 * Get all posts for admin (including drafts and private)
 * Supports search, category filter, and sorting
 */
export async function getAllPosts(options?: {
  search?: string;
  categoryId?: string;
  sort?: 'newest' | 'oldest' | 'title-asc' | 'title-desc';
}): Promise<PostSummary[]> {
  const supabase = await createClient();

  let query = supabase
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
      category_id,
      category:categories(id, name_en, name_zh, slug)
    `);

  // Search by title
  if (options?.search) {
    const searchTerm = `%${options.search}%`;
    query = query.or(`title_en.ilike.${searchTerm},title_zh.ilike.${searchTerm}`);
  }

  // Filter by category
  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }

  // Sort
  switch (options?.sort) {
    case 'oldest':
      query = query.order('created_at', { ascending: true });
      break;
    case 'title-asc':
      query = query.order('title_en', { ascending: true });
      break;
    case 'title-desc':
      query = query.order('title_en', { ascending: false });
      break;
    case 'newest':
    default:
      query = query.order('updated_at', { ascending: false });
      break;
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching all posts:', error);
    return [];
  }

  return data as unknown as PostSummary[];
}

/**
 * Get a single post by ID (for admin editing)
 */
export async function getPostById(id: string): Promise<Post | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('posts')
    .select(`
      *,
      category:categories(id, name_en, name_zh, slug)
    `)
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data as unknown as Post;
}

/**
 * Create a new post
 */
export async function createPost(post: PostInput, authorId: string): Promise<Post | null> {
  const supabase = await createClient();

  const now = new Date().toISOString();
  const publishedAt = post.visibility === 'public' ? now : null;

  const { data, error } = await supabase
    .from('posts')
    .insert({
      ...post,
      author_id: authorId,
      published_at: publishedAt,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating post:', error);
    return null;
  }

  return data as Post;
}

/**
 * Update an existing post
 */
export async function updatePost(id: string, post: Partial<PostInput>): Promise<Post | null> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    ...post,
    updated_at: new Date().toISOString(),
  };

  // Set published_at when first making public
  if (post.visibility === 'public') {
    const existing = await getPostById(id);
    if (existing && !existing.published_at) {
      updates.published_at = new Date().toISOString();
    }
  }

  const { data, error } = await supabase
    .from('posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating post:', error);
    return null;
  }

  return data as Post;
}

/**
 * Delete a post
 */
export async function deletePost(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting post:', error);
    return false;
  }

  return true;
}

/**
 * Get all categories (for admin forms)
 */
export async function getCategories(): Promise<Category[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('name_en');

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return data as Category[];
}

/**
 * Get all categories with post count (for admin category management)
 */
export async function getCategoriesWithPostCount(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();

  // Get all categories
  const { data: categoriesData, error: catError } = await supabase
    .from('categories')
    .select('*')
    .order('name_en');

  if (catError) {
    console.error('Error fetching categories:', catError);
    return [];
  }

  // Get public post counts per category
  const { data: postsData, error: postError } = await supabase
    .from('posts')
    .select('category_id')
    .eq('visibility', 'public');

  if (postError) {
    console.error('Error fetching post counts:', postError);
    return [];
  }

  // Build count map
  const countMap: Record<string, number> = {};
  for (const post of postsData || []) {
    if (!post.category_id) continue;
    countMap[post.category_id] = (countMap[post.category_id] || 0) + 1;
  }

  // Merge counts into categories
  return (categoriesData || []).map((cat) => ({
    ...cat,
    post_count: countMap[cat.id] || 0,
  })) as CategoryWithCount[];
}

/**
 * Create a new category
 */
export async function createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      ...category,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return data as Category;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<boolean> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }

  return true;
}
