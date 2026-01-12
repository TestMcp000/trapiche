/**
 * Gallery Categories Admin IO
 *
 * Admin-only gallery category CRUD operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/gallery/categories-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { GalleryCategory } from '@/lib/types/gallery';

// =============================================================================
// Types
// =============================================================================

/** Category with item count for admin list */
export interface CategoryWithCount extends GalleryCategory {
  item_count: number;
}

/** DB payload for gallery category creation/update */
export interface GalleryCategoryDbPayload {
  name_en: string;
  name_zh: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
}

// =============================================================================
// Category Read Operations
// =============================================================================

/**
 * Get all gallery categories for admin dropdown
 */
export async function getAllGalleryCategories(): Promise<GalleryCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gallery_categories')
    .select('*')
    .order('sort_order');

  if (error) {
    console.error('Error fetching gallery categories:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * Get all gallery categories with item counts for admin page
 * Returns categories ordered by sort_order and name_en
 */
export async function getGalleryCategoriesWithCounts(): Promise<CategoryWithCount[]> {
  const supabase = await createClient();

  // Fetch categories
  const { data: categories, error } = await supabase
    .from('gallery_categories')
    .select('*')
    .order('sort_order')
    .order('name_en');

  if (error) {
    console.error('Error fetching gallery categories:', error);
    throw error;
  }

  // Fetch item counts
  const { data: items } = await supabase
    .from('gallery_items')
    .select('category_id');

  const countMap: Record<string, number> = {};
  for (const item of items || []) {
    if (!item.category_id) continue;
    countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
  }

  return (categories || []).map((cat) => ({
    ...cat,
    item_count: countMap[cat.id] || 0,
  }));
}

// =============================================================================
// Category Write Operations
// =============================================================================

/**
 * Create a new gallery category
 */
export async function createGalleryCategoryAdmin(
  payload: GalleryCategoryDbPayload
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('gallery_categories').insert({
    name_en: payload.name_en.trim(),
    name_zh: payload.name_zh.trim(),
    slug: payload.slug.trim(),
    sort_order: payload.sort_order,
    is_visible: payload.is_visible,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'This slug already exists. Please use a different slug.' };
    }
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Update an existing gallery category
 */
export async function updateGalleryCategoryAdmin(
  id: string,
  payload: GalleryCategoryDbPayload
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('gallery_categories')
    .update({
      name_en: payload.name_en.trim(),
      name_zh: payload.name_zh.trim(),
      slug: payload.slug.trim(),
      sort_order: payload.sort_order,
      is_visible: payload.is_visible,
    })
    .eq('id', id);

  if (error) {
    if (error.code === '23505') {
      return { error: 'This slug already exists. Please use a different slug.' };
    }
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Check if a category has items (for delete validation)
 */
export async function hasItemsInCategoryAdmin(categoryId: string): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('id')
    .eq('category_id', categoryId)
    .limit(1);

  if (error) {
    console.error('Error checking category items:', error);
    return true; // Assume has items on error to prevent accidental deletion
  }

  return (data?.length ?? 0) > 0;
}

/**
 * Delete a gallery category
 */
export async function deleteGalleryCategoryAdmin(
  id: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('gallery_categories').delete().eq('id', id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
