'use server';

/**
 * Server Actions for Gallery Featured Pins Management
 * 
 * Provides server-side mutations with cache revalidation for the
 * gallery featured pins admin page.
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import {
  getFeaturedPinsBySurface,
  getGalleryFeaturedLimits,
  searchGalleryItemsForFeatured,
  addFeaturedPinAdmin,
  removeFeaturedPinAdmin,
  saveFeaturedPinOrderAdmin,
  type PinWithItem,
  type GalleryItemWithCategory,
} from '@/lib/modules/gallery/admin-io';
import type { GalleryPinSurface } from '@/lib/types/gallery';

// Re-export types for client component
export type { PinWithItem, GalleryItemWithCategory };

/**
 * Load featured pins for a surface
 */
export async function loadFeaturedPins(surface: GalleryPinSurface): Promise<PinWithItem[]> {
  return getFeaturedPinsBySurface(surface);
}

/**
 * Get featured limits from company_settings
 */
export async function getFeaturedLimits(): Promise<{ home: number; gallery: number }> {
  return getGalleryFeaturedLimits();
}

/**
 * Add a new featured pin
 */
export async function addFeaturedPin(
  surface: GalleryPinSurface,
  itemId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const result = await addFeaturedPinAdmin(surface, itemId);

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  // Revalidate cache
  revalidateTag('gallery', { expire: 0 });
  revalidatePath('/' + locale);
  revalidatePath('/' + locale + '/gallery');

  return { success: true };
}

/**
 * Remove a featured pin
 */
export async function removeFeaturedPin(
  pinId: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const result = await removeFeaturedPinAdmin(pinId);

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  // Revalidate cache
  revalidateTag('gallery', { expire: 0 });
  revalidatePath('/' + locale);
  revalidatePath('/' + locale + '/gallery');

  return { success: true };
}

/**
 * Save featured pin order
 */
export async function saveFeaturedPinOrder(
  surface: GalleryPinSurface,
  orderedPinIds: string[],
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const result = await saveFeaturedPinOrderAdmin(orderedPinIds);

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  // Revalidate cache
  revalidateTag('gallery', { expire: 0 });
  revalidatePath('/' + locale);
  revalidatePath('/' + locale + '/gallery');

  return { success: true };
}

/**
 * Search gallery items for adding as featured pins
 * Filters out items that are already pinned
 */
export async function searchGalleryItems(
  query: string,
  pinnedIds: string[]
): Promise<GalleryItemWithCategory[]> {
  const items = await searchGalleryItemsForFeatured(query);
  
  // Filter out already pinned items
  const pinnedSet = new Set(pinnedIds);
  return items.filter(item => !pinnedSet.has(item.id));
}
