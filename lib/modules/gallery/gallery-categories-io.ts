/**
 * Gallery Categories IO
 *
 * Database operations for gallery categories.
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-categories-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryCategory } from '@/lib/types/gallery';

/**
 * Get all visible gallery categories
 */
export async function getVisibleGalleryCategories(): Promise<GalleryCategory[]> {
  const { data, error } = await createAnonClient()
    .from('gallery_categories')
    .select('*')
    .eq('is_visible', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching gallery categories:', error);
    return [];
  }

  return data || [];
}
