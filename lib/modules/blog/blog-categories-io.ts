/**
 * Blog Categories IO
 *
 * Database operations for blog categories.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/blog/blog-categories-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { Category, CategoryWithCount } from '@/lib/types/blog';

/**
 * Get all categories
 */
export async function getCategories(): Promise<Category[]> {
  const { data } = await createAnonClient()
    .from('categories')
    .select('*')
    .order('name_en');

  return (data ?? []) as Category[];
}

/**
 * Get all categories with their public post counts
 * Used for blog sidebar display
 */
export async function getCategoriesWithCounts(): Promise<{
  categories: CategoryWithCount[];
  uncategorizedCount: number;
}> {
  // Get all categories
  const { data: categoriesData } = await createAnonClient()
    .from('categories')
    .select('*')
    .order('name_en');

  if (!categoriesData) {
    return { categories: [], uncategorizedCount: 0 };
  }

  // Get post counts per category
  const { data: postsData } = await createAnonClient()
    .from('posts')
    .select('category_id')
    .eq('visibility', 'public');

  if (!postsData) {
    return {
      categories: categoriesData.map(cat => ({ ...cat, post_count: 0 })),
      uncategorizedCount: 0
    };
  }

  // Count posts per category
  const countMap: Record<string, number> = {};
  let uncategorizedCount = 0;

  for (const post of postsData) {
    if (post.category_id) {
      countMap[post.category_id] = (countMap[post.category_id] || 0) + 1;
    } else {
      uncategorizedCount++;
    }
  }

  // Map categories with counts
  const categoriesWithCounts: CategoryWithCount[] = categoriesData.map(cat => ({
    ...cat,
    post_count: countMap[cat.id] || 0,
  }));

  return { categories: categoriesWithCounts, uncategorizedCount };
}
