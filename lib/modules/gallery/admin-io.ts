/**
 * Gallery Admin IO Layer (Facade)
 *
 * Thin re-export module that provides backward compatibility.
 * All implementations are in capability-focused submodules.
 *
 * @module lib/modules/gallery/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 *
 * Submodules:
 * - items-admin-io.ts: Gallery item CRUD
 * - categories-admin-io.ts: Category CRUD
 * - pins-admin-io.ts: Featured pins management
 */

import 'server-only';

// =============================================================================
// Gallery Items
// =============================================================================

export {
  // Types
  type GalleryItemWithCategory,
  type GalleryItemDbPayload,
  // Read operations
  getAllGalleryItemsForAdmin,
  searchGalleryItemsForFeatured,
  // Write operations
  saveGalleryItemAdmin,
  deleteGalleryItemAdmin,
} from './items-admin-io';

// =============================================================================
// Gallery Categories
// =============================================================================

export {
  // Types
  type CategoryWithCount,
  type GalleryCategoryDbPayload,
  // Read operations
  getAllGalleryCategories,
  getGalleryCategoriesWithCounts,
  // Write operations
  createGalleryCategoryAdmin,
  updateGalleryCategoryAdmin,
  updateGalleryCategoryShowInNavAdmin,
  hasItemsInCategoryAdmin,
  deleteGalleryCategoryAdmin,
} from './categories-admin-io';

// =============================================================================
// Featured Pins
// =============================================================================

export {
  // Types
  type PinWithItem,
  // Read operations
  getFeaturedPinsBySurface,
  getGalleryFeaturedLimits,
  // Write operations
  addFeaturedPinAdmin,
  removeFeaturedPinAdmin,
  saveFeaturedPinOrderAdmin,
} from './pins-admin-io';
