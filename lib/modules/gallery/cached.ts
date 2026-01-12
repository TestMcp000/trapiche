/**
 * Cached gallery data access functions for public reads
 *
 * Wraps `lib/gallery.ts` (IO) with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type { GalleryCategory, GalleryItem, GalleryListParams, GalleryListResult, GalleryPin, GalleryPinSurface } from '@/lib/types/gallery';
import {
  getGalleryItemBySlug,
  getGalleryItemsPage,
  getGalleryPins,
  getVisibleGalleryCategories,
  getVisibleGalleryItemsForSitemap,
  getVisibleGalleryItemsByCategoryId,
  getVisibleGalleryItemsBySurface,
  findVisibleGalleryItemsBySlug,
} from '@/lib/modules/gallery/io';

const CACHE_REVALIDATE_SECONDS = 60;

export const getVisibleGalleryCategoriesCached = cachedQuery(
  async (): Promise<GalleryCategory[]> => getVisibleGalleryCategories(),
  ['visible-gallery-categories'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

export const getVisibleGalleryPinsCached = cachedQuery(
  async (surface: GalleryPinSurface): Promise<GalleryPin[]> => getGalleryPins(surface),
  ['visible-gallery-pins'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

export const getVisibleGalleryItemsPageCached = cachedQuery(
  async (params: GalleryListParams): Promise<GalleryListResult> => getGalleryItemsPage(params),
  ['visible-gallery-items-page'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);



export const getVisibleGalleryItemBySlugCached = cachedQuery(
  async (categorySlug: string, itemSlug: string): Promise<(GalleryItem & { category: GalleryCategory }) | null> =>
    getGalleryItemBySlug(categorySlug, itemSlug),
  ['visible-gallery-item-by-slug'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

export const getVisibleGalleryItemsForSitemapCached = cachedQuery(
  async (): Promise<Array<{ categorySlug: string; itemSlug: string; updatedAt: string }>> =>
    getVisibleGalleryItemsForSitemap(),
  ['visible-gallery-items-sitemap'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Find visible gallery items by slug across all categories (cached).
 * Used for canonical URL resolution when the category segment in URL is wrong.
 */
export const findVisibleGalleryItemsBySlugCached = cachedQuery(
  async (itemSlug: string): Promise<Array<GalleryItem & { category: GalleryCategory }>> =>
    findVisibleGalleryItemsBySlug(itemSlug),
  ['find-visible-gallery-items-by-slug'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

// ============================================
// Landing Section Gallery Helpers (Cached)
// ============================================

export const getVisibleGalleryItemsByCategoryIdCached = cachedQuery(
  async (categoryId: string, limit: number = 12): Promise<GalleryItem[]> =>
    getVisibleGalleryItemsByCategoryId(categoryId, limit),
  ['visible-gallery-items-by-category-id'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);

export const getVisibleGalleryItemsBySurfaceCached = cachedQuery(
  async (surface: 'home' | 'gallery', limit: number = 12): Promise<GalleryItem[]> =>
    getVisibleGalleryItemsBySurface(surface, limit),
  ['visible-gallery-items-by-surface'],
  ['gallery'],
  CACHE_REVALIDATE_SECONDS
);
