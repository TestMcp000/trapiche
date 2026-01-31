'use server';

/**
 * Server Actions for Gallery Categories Management
 *
 * Provides server-side mutations with cache revalidation for the
 * gallery categories admin page.
 */

import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/infrastructure/supabase/server';
import { requireSiteAdmin } from '@/lib/modules/auth/admin-guard';
import { syncHamburgerNavAutogen } from '@/lib/modules/content/hamburger-nav-autogen-io';
import {
  getGalleryCategoriesWithCounts,
  createGalleryCategoryAdmin,
  updateGalleryCategoryAdmin,
  updateGalleryCategoryShowInNavAdmin,
  deleteGalleryCategoryAdmin,
  hasItemsInCategoryAdmin,
  type CategoryWithCount,
  type GalleryCategoryDbPayload,
} from '@/lib/modules/gallery/admin-io';
import {
  ADMIN_ERROR_CODES,
  actionError,
  actionSuccess,
  type ActionResult,
} from '@/lib/types/action-result';

// Re-export type for client component
export type { CategoryWithCount };

/**
 * Category payload for create/update operations
 */
export interface CategoryPayload {
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
  const nameZh = payload.name_zh.trim();
  return {
    // Single-language site: mirror zh to legacy en column
    name_en: nameZh,
    name_zh: nameZh,
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
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  const result = await createGalleryCategoryAdmin(toDbPayload(payload));

  if ('error' in result) {
    return actionError(ADMIN_ERROR_CODES.CREATE_FAILED);
  }

  revalidateGalleryCache(locale);
  return actionSuccess();
}

/**
 * Update an existing gallery category
 */
export async function updateGalleryCategory(
  id: string,
  payload: CategoryPayload,
  locale: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!id) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateGalleryCategoryAdmin(id, toDbPayload(payload));

  if ('error' in result) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  revalidateGalleryCache(locale);
  return actionSuccess();
}

/**
 * Delete a gallery category
 * Blocks deletion if category has items
 */
export async function deleteGalleryCategory(
  id: string,
  locale: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!id) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  // Check for items in this category
  const hasItems = await hasItemsInCategoryAdmin(id);
  if (hasItems) {
    return actionError(ADMIN_ERROR_CODES.CATEGORY_HAS_ITEMS);
  }

  const result = await deleteGalleryCategoryAdmin(id);

  if ('error' in result) {
    return actionError(ADMIN_ERROR_CODES.DELETE_FAILED);
  }

  revalidateGalleryCache(locale);
  return actionSuccess();
}

/**
 * Toggle category "show in hamburger nav" flag
 */
export async function toggleGalleryCategoryShowInNav(
  id: string,
  showInNav: boolean,
  locale: string
): Promise<ActionResult<void>> {
  const supabase = await createClient();
  const guard = await requireSiteAdmin(supabase);
  if (!guard.ok) {
    return actionError(guard.errorCode);
  }

  if (!id) {
    return actionError(ADMIN_ERROR_CODES.VALIDATION_ERROR);
  }

  const result = await updateGalleryCategoryShowInNavAdmin(id, showInNav);
  if ('error' in result) {
    return actionError(ADMIN_ERROR_CODES.UPDATE_FAILED);
  }

  const sync = await syncHamburgerNavAutogen(guard.userId);
  if (sync.updated) {
    revalidateTag('site-content', { expire: 0 });
    revalidatePath('/' + locale);
    revalidatePath('/' + locale + '/admin/settings/navigation');
  }

  revalidateGalleryCache(locale);
  revalidatePath('/' + locale + '/admin/gallery/categories');

  return actionSuccess();
}
