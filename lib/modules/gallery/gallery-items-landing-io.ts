/**
 * Gallery Items Landing IO
 *
 * Database operations for landing page gallery sections.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-items-landing-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryItem } from '@/lib/types/gallery';

/**
 * Get visible gallery items by category ID for landing sections
 */
export async function getVisibleGalleryItemsByCategoryId(
  categoryId: string,
  limit: number = 12
): Promise<GalleryItem[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_items')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching gallery items by category:', error);
    return [];
  }

  return data || [];
}

/**
 * Get visible gallery items by surface (from pins) for landing sections
 */
export async function getVisibleGalleryItemsBySurface(
  surface: 'home' | 'gallery',
  limit: number = 12
): Promise<GalleryItem[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_pins')
    .select('item:gallery_items(*)')
    .eq('surface', surface)
    .order('sort_order')
    .limit(limit);

  if (error) {
    console.error('Error fetching gallery items by surface:', error);
    return [];
  }

  // Extract and filter visible items
  const items: GalleryItem[] = [];
  for (const pin of data || []) {
    const item = pin.item as unknown as GalleryItem | null;
    if (item && item.is_visible) {
      items.push(item);
    }
  }
  return items;
}
