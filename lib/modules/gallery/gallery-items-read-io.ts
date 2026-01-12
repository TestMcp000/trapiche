/**
 * Gallery Items Read IO
 *
 * Database operations for reading gallery items by slug/id.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-items-read-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryCategory, GalleryItem } from '@/lib/types/gallery';

/**
 * Get a gallery item by category slug and item slug
 */
export async function getGalleryItemBySlug(
  categorySlug: string,
  itemSlug: string
): Promise<(GalleryItem & { category: GalleryCategory }) | null> {
  const supabase = createAnonClient();

  // First get the category
  const { data: category, error: catError } = await supabase
    .from('gallery_categories')
    .select('*')
    .eq('slug', categorySlug)
    .eq('is_visible', true)
    .single();

  if (catError || !category) {
    return null;
  }

  // Then get the item in that category
  const { data: item, error: itemError } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('category_id', category.id)
    .eq('slug', itemSlug)
    .eq('is_visible', true)
    .single();

  if (itemError || !item) {
    return null;
  }

  return { ...item, category };
}

/**
 * Find visible gallery items by item slug across all categories.
 * Used for canonical URL resolution when the category segment in URL is wrong.
 */
export async function findVisibleGalleryItemsBySlug(
  itemSlug: string
): Promise<Array<GalleryItem & { category: GalleryCategory }>> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*, category:gallery_categories(*)')
    .eq('slug', itemSlug)
    .eq('is_visible', true);

  if (error || !data) {
    console.error('Error finding gallery items by slug:', error);
    return [];
  }

  // Filter to only items with visible categories
  return data
    .filter(item => item.category && item.category.is_visible)
    .map(item => ({
      ...item,
      category: item.category as GalleryCategory,
    }));
}

/**
 * Get a gallery item by ID
 */
export async function getGalleryItemById(id: string): Promise<GalleryItem | null> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}
