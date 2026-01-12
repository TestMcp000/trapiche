/**
 * Gallery Pins IO
 *
 * Database operations for gallery pins (featured items).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/gallery/gallery-pins-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { GalleryPin, GalleryPinSurface } from '@/lib/types/gallery';

/**
 * Get gallery pins for a specific surface
 */
export async function getGalleryPins(surface: GalleryPinSurface): Promise<GalleryPin[]> {
  const supabase = createAnonClient();

  const { data, error } = await supabase
    .from('gallery_pins')
    .select('*, item:gallery_items(*, category:gallery_categories(*))')
    .eq('surface', surface)
    .order('sort_order');

  if (error) {
    console.error('Error fetching gallery pins:', error);
    return [];
  }

  // Filter out pins whose items are not visible
  return (data || []).filter(pin => pin.item && pin.item.is_visible);
}
