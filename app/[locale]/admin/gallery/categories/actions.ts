'use server';

/**
 * Server Actions for Gallery Categories Management
 *
 * Provides server-side mutations with cache revalidation for the
 * gallery categories admin page.
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import {
  getGalleryCategoriesWithCounts,
  createGalleryCategoryAdmin,
  updateGalleryCategoryAdmin,
  deleteGalleryCategoryAdmin,
  hasItemsInCategoryAdmin,
  type CategoryWithCount,
  type GalleryCategoryDbPayload,
} from '@/lib/modules/gallery/admin-io';

// Re-export type for client component
export type { CategoryWithCount };

/**
 * Category payload for create/update operations
 */
export interface CategoryPayload {
  name_en: string;
  name_zh: string;
  slug: string;
  sort_order: number;
  is_visible: boolean;
}

/**
 * Load gallery categories with item counts
 */
export async function loadGalleryCategories(): Promise<CategoryWithCount[]> {
  return getGalleryCategoriesWithCounts();
}

/**
 * Revalidate gallery-related cache paths
 */
function revalidateGalleryCache(locale: string) {
  revalidateTag('gallery', { expire: 0 });
  revalidatePath('/' + locale);
  revalidatePath('/' + locale + '/gallery');
  revalidatePath('/sitemap.xml');
}

function toDbPayload(payload: CategoryPayload): GalleryCategoryDbPayload {
  return {
    name_en: payload.name_en.trim(),
    name_zh: payload.name_zh.trim(),
    slug: payload.slug.trim(),
    sort_order: payload.sort_order,
    is_visible: payload.is_visible,
  };
}

/**
 * Create a new gallery category
 */
export async function createGalleryCategory(
  payload: CategoryPayload,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const result = await createGalleryCategoryAdmin(toDbPayload(payload));

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  revalidateGalleryCache(locale);
  return { success: true };
}

/**
 * Update an existing gallery category
 */
export async function updateGalleryCategory(
  id: string,
  payload: CategoryPayload,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  const result = await updateGalleryCategoryAdmin(id, toDbPayload(payload));

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  revalidateGalleryCache(locale);
  return { success: true };
}

/**
 * Delete a gallery category
 * Blocks deletion if category has items
 */
export async function deleteGalleryCategory(
  id: string,
  locale: string
): Promise<{ success: boolean; error?: string }> {
  // Check for items in this category
  const hasItems = await hasItemsInCategoryAdmin(id);
  if (hasItems) {
    return {
      success: false,
      error: 'Cannot delete category because it contains items. Please move or delete the items first.',
    };
  }

  const result = await deleteGalleryCategoryAdmin(id);

  if ('error' in result) {
    return { success: false, error: result.error };
  }

  revalidateGalleryCache(locale);
  return { success: true };
}
