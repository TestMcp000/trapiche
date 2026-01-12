/**
 * Gallery IO Facade
 *
 * Re-exports from semantic submodules for backward compatibility.
 * This file maintains the original import paths while delegating
 * to focused submodules.
 *
 * @module lib/modules/gallery/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// Re-export category operations
export { getVisibleGalleryCategories } from '@/lib/modules/gallery/gallery-categories-io';

// Re-export item read operations
export {
  getGalleryItemBySlug,
  findVisibleGalleryItemsBySlug,
  getGalleryItemById,
} from '@/lib/modules/gallery/gallery-items-read-io';

// Re-export pins operations
export { getGalleryPins } from '@/lib/modules/gallery/gallery-pins-io';

// Re-export pagination operations
export { getGalleryItemsPage } from '@/lib/modules/gallery/gallery-items-page-io';

// Re-export sitemap operations
export { getVisibleGalleryItemsForSitemap } from '@/lib/modules/gallery/gallery-items-sitemap-io';

// Re-export landing operations
export {
  getVisibleGalleryItemsByCategoryId,
  getVisibleGalleryItemsBySurface,
} from '@/lib/modules/gallery/gallery-items-landing-io';
