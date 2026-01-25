/**
 * Gallery Pins Admin IO
 *
 * Admin-only featured pins management operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/gallery/pins-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import type { GalleryPinSurface } from '@/lib/types/gallery';
import type { GalleryItemWithCategory } from './items-admin-io';

// =============================================================================
// Types
// =============================================================================

/** Pin with joined item and category data */
export interface PinWithItem {
  id: string;
  surface: GalleryPinSurface;
  item_id: string;
  sort_order: number;
  created_at: string;
  item: GalleryItemWithCategory;
}

// =============================================================================
// Pin Read Operations
// =============================================================================

/**
 * Get featured pins by surface with joined item and category data
 * Filters out pins with deleted items (null item)
 */
export async function getFeaturedPinsBySurface(surface: GalleryPinSurface): Promise<PinWithItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gallery_pins')
    .select(`
      *,
      item:gallery_items(*, category:gallery_categories(*))
    `)
    .eq('surface', surface)
    .order('sort_order');

  if (error) {
    console.error('Error fetching featured pins:', error);
    throw error;
  }

  // Filter out pins with null items (deleted items)
  const validPins = (data || []).filter(
    (pin): pin is PinWithItem => pin.item !== null
  );

  return validPins;
}

/**
 * Get featured limits from company_settings
 * Returns default values if settings are not found
 */
export async function getGalleryFeaturedLimits(): Promise<{ home: number; gallery: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('company_settings')
    .select('key, value')
    .in('key', ['gallery_featured_limit_home', 'gallery_featured_limit_gallery']);

  if (error) {
    console.error('Error fetching gallery featured limits:', error);
    // Return defaults on error
    return { home: 6, gallery: 12 };
  }

  let home = 6;
  let gallery = 12;

  for (const setting of data || []) {
    if (setting.key === 'gallery_featured_limit_home') {
      home = parseInt(setting.value) || 6;
    } else if (setting.key === 'gallery_featured_limit_gallery') {
      gallery = parseInt(setting.value) || 12;
    }
  }

  return { home, gallery };
}

// =============================================================================
// Pin Write Operations
// =============================================================================

/**
 * Add a new featured pin
 */
export async function addFeaturedPinAdmin(
  surface: GalleryPinSurface,
  itemId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Get the next sort order
  const { data: existingPins } = await supabase
    .from('gallery_pins')
    .select('sort_order')
    .eq('surface', surface)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextSortOrder = existingPins && existingPins.length > 0 ? existingPins[0].sort_order + 1 : 0;

  const { error } = await supabase.from('gallery_pins').insert({
    surface,
    item_id: itemId,
    sort_order: nextSortOrder,
  });

  if (error) {
    if (error.code === '23505') {
      return { error: 'This item is already pinned.' };
    }
    return { error: error.message };
  }

  return { success: true };
}

/**
 * Remove a featured pin
 */
export async function removeFeaturedPinAdmin(
  pinId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase.from('gallery_pins').delete().eq('id', pinId);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function saveFeaturedPinOrderAdmin(
  surface: GalleryPinSurface,
  orderedPinIds: string[]
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Fetch existing pins for this surface to prevent accidental inserts via upsert.
  const { data: existingPins, error: readError } = await supabase
    .from('gallery_pins')
    .select('id, item_id')
    .eq('surface', surface);

  if (readError) {
    console.error('Error fetching existing pins:', readError);
    return { error: readError.message };
  }

  const pins = existingPins || [];
  const existingIds = new Set(pins.map((p) => p.id));
  const orderedSet = new Set(orderedPinIds);

  if (orderedPinIds.length !== orderedSet.size) {
    return { error: '排序清單包含重複的置頂項目 ID' };
  }

  if (orderedSet.size !== existingIds.size) {
    return { error: '排序清單必須包含此分頁的所有置頂項目' };
  }

  const invalidIds = orderedPinIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    return {
      error: `無效的置頂項目 ID: ${invalidIds.slice(0, 3).join(', ')}${invalidIds.length > 3 ? '...' : ''}`,
    };
  }

  const itemIdByPinId = new Map(pins.map((p) => [p.id, p.item_id]));
  const updates = orderedPinIds.map((id, i) => ({
    id,
    surface,
    item_id: itemIdByPinId.get(id),
    sort_order: i,
  }));

  const { error } = await supabase
    .from('gallery_pins')
    .upsert(updates, { onConflict: 'id' });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

// =============================================================================
// Hero Operations (surface='hero'; max 1 per site)
// =============================================================================

/**
 * Get current hero pin (if any)
 * Returns the single hero pin with joined item data, or null if none set
 */
export async function getHeroPin(): Promise<PinWithItem | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('gallery_pins')
    .select(`
      *,
      item:gallery_items(*, category:gallery_categories(*))
    `)
    .eq('surface', 'hero')
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Error fetching hero pin:', error);
    return null;
  }

  // Return null if no hero or item is deleted
  if (!data || !data.item) {
    return null;
  }

  return data as PinWithItem;
}

/**
 * Set an item as the Home Hero
 * Clears any existing hero first (DB constraint ensures max 1)
 * @param itemId - Gallery item ID to set as hero
 */
export async function setHeroAdmin(
  itemId: string
): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  // Clear existing hero first (there can be only one)
  const { error: deleteError } = await supabase
    .from('gallery_pins')
    .delete()
    .eq('surface', 'hero');

  if (deleteError) {
    console.error('Error clearing existing hero:', deleteError);
    return { error: deleteError.message };
  }

  // Insert new hero
  const { error: insertError } = await supabase.from('gallery_pins').insert({
    surface: 'hero',
    item_id: itemId,
    sort_order: 0, // Fixed for hero (no ordering semantic)
  });

  if (insertError) {
    // Handle duplicate key (shouldn't happen after delete, but safety first)
    if (insertError.code === '23505') {
      return { error: '此作品已設為主視覺。' };
    }
    return { error: insertError.message };
  }

  return { success: true };
}

/**
 * Clear the current Home Hero selection
 */
export async function clearHeroAdmin(): Promise<{ success: true } | { error: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('gallery_pins')
    .delete()
    .eq('surface', 'hero');

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

