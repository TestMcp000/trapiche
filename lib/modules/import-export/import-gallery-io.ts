/**
 * Gallery Import IO Module (Server-only) - Facade
 *
 * Re-exports gallery import operations from capability-scoped modules.
 * This file exists for backwards compatibility with existing consumers.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 * @see uiux_refactor.md §6.1.3 Phase 2
 */
import 'server-only';

// Re-export types from items module (single source)
export type {
  ImportPreviewItem,
  GalleryImportPreview,
  GalleryImportResult,
} from './import-gallery-items-io';

// Re-export items operations
export {
  previewGalleryItemsImport,
  applyGalleryItemsImport,
} from './import-gallery-items-io';

// Re-export categories operations
export {
  previewGalleryCategoriesImport,
  applyGalleryCategoriesImport,
} from './import-gallery-categories-io';
