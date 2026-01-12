/**
 * Gallery Categories JSON Formatter (Pure)
 *
 * Formats gallery categories to JSON export envelope.
 * Following PRD §2.4 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.4
 */

import type { GalleryCategory } from '@/lib/types/gallery';
import type {
  GalleryCategoriesExport,
  GalleryCategoryExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a GalleryCategory to export data format.
 * Only includes fields relevant for export (excludes id, created_at, updated_at).
 *
 * @param category - The gallery category to transform
 * @returns Export data object
 */
export function transformGalleryCategoryToExportData(
  category: GalleryCategory
): GalleryCategoryExportData {
  return {
    slug: category.slug,
    name_en: category.name_en,
    name_zh: category.name_zh,
    sort_order: category.sort_order,
    is_visible: category.is_visible,
  };
}

/**
 * Format an array of gallery categories to JSON export envelope.
 *
 * @param categories - Array of gallery categories to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatGalleryCategoriesToJson(
  categories: GalleryCategory[],
  exportedAt?: string
): GalleryCategoriesExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'gallery_categories',
    data: categories.map(transformGalleryCategoryToExportData),
  };
}

/**
 * Serialize gallery categories export to JSON string.
 *
 * @param categories - Array of gallery categories to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatGalleryCategoriesToJsonString(
  categories: GalleryCategory[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatGalleryCategoriesToJson(categories, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
