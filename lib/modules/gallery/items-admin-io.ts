/**
 * Gallery Items Admin IO
 *
 * Admin-only gallery item CRUD operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/gallery/items-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';

// =============================================================================
// Types
// =============================================================================

/** Gallery item with its associated category */
export interface GalleryItemWithCategory extends GalleryItem {
  category?: GalleryCategory;
}

/** DB payload for gallery item creation/update */
export interface GalleryItemDbPayload {
  category_id: string;
  title_en: string;
  title_zh: string;
  slug: string;
  description_en?: string;
  description_zh?: string;
  image_url: string;
  image_width?: number | null;
  image_height?: number | null;
  og_image_format?: 'jpg' | 'png';
  image_alt_en?: string | null;
  image_alt_zh?: string | null;
  material_en?: string | null;
  material_zh?: string | null;
  tags_en?: string[];
  tags_zh?: string[];
  is_visible?: boolean;
}

// =============================================================================
// Item Read Operations
// =============================================================================

/**
 * Get all gallery items for admin (includes hidden items)
 * Returns items with their category relation, ordered by creation date descending.
 */
export async function getAllGalleryItemsForAdmin(): Promise<GalleryItemWithCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gallery_items')
    .select('*, category:gallery_categories(*)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching admin gallery items:', error);
    throw error;
  }

  return data ?? [];
}

/**
 * Search gallery items for featured pins selection
 * Returns visible items that match the query, limited to 20 results
 */
export async function searchGalleryItemsForFeatured(query: string): Promise<GalleryItemWithCategory[]> {
  if (!query.trim()) {
    return [];
  }

  const supabase = await createClient();
  const q = `%${query.trim()}%`;

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*, category:gallery_categories(*)')
    .or(`title_en.ilike.${q},title_zh.ilike.${q}`)
    .eq('is_visible', true)
    .limit(20);

  if (error) {
    console.error('Error searching gallery items:', error);
    throw error;
  }

  return data ?? [];
}

// =============================================================================
// Item Write Operations
// =============================================================================

/**
 * Save (create or update) a gallery item
 */
export async function saveGalleryItemAdmin(
  itemId: string | null,
  payload: GalleryItemDbPayload
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  if (itemId) {
    // Update existing
    const { error } = await supabase
      .from('gallery_items')
      .update(payload)
      .eq('id', itemId);

    if (error) {
      if (error.code === '23505') {
        return { error: 'This slug already exists in this category. Please use a different slug.' };
      }
      return { error: error.message };
    }
  } else {
    // Create new
    const { error } = await supabase.from('gallery_items').insert(payload);

    if (error) {
      if (error.code === '23505') {
        return { error: 'This slug already exists in this category. Please use a different slug.' };
      }
      return { error: error.message };
    }
  }

  return { success: true };
}

/**
 * Delete a gallery item
 */
export async function deleteGalleryItemAdmin(
  itemId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('gallery_items').delete().eq('id', itemId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
