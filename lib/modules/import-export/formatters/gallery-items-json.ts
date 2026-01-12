/**
 * Gallery Items JSON Formatter (Pure)
 *
 * Formats gallery items to JSON export envelope.
 * Following PRD §2.3 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.3
 */

import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';
import type {
  GalleryItemsExport,
  GalleryItemExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a GalleryItem to export data format.
 *
 * @param item - The gallery item to transform
 * @param categorySlugMap - Map of category ID to slug
 * @returns Export data object
 */
export function transformGalleryItemToExportData(
  item: GalleryItem,
  categorySlugMap: Map<string, string>
): GalleryItemExportData {
  return {
    slug: item.slug,
    category: categorySlugMap.get(item.category_id) ?? '',
    title_en: item.title_en,
    title_zh: item.title_zh,
    description_en: item.description_en,
    description_zh: item.description_zh,
    image_url: item.image_url,
    image_alt_en: item.image_alt_en,
    image_alt_zh: item.image_alt_zh,
    material_en: item.material_en,
    material_zh: item.material_zh,
    tags_en: item.tags_en ?? [],
    tags_zh: item.tags_zh ?? [],
    is_visible: item.is_visible,
  };
}

/**
 * Build a map of category ID to slug from categories.
 *
 * @param categories - Array of gallery categories
 * @returns Map of category ID to slug
 */
export function buildCategorySlugMap(
  categories: GalleryCategory[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of categories) {
    map.set(cat.id, cat.slug);
  }
  return map;
}

/**
 * Format an array of gallery items to JSON export envelope.
 *
 * @param items - Array of gallery items to export
 * @param categories - Array of categories for slug resolution
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatGalleryItemsToJson(
  items: GalleryItem[],
  categories: GalleryCategory[],
  exportedAt?: string
): GalleryItemsExport {
  const categorySlugMap = buildCategorySlugMap(categories);
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'gallery_items',
    data: items.map((item) => transformGalleryItemToExportData(item, categorySlugMap)),
  };
}

/**
 * Serialize gallery items export to JSON string.
 *
 * @param items - Array of gallery items to export
 * @param categories - Array of categories for slug resolution
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatGalleryItemsToJsonString(
  items: GalleryItem[],
  categories: GalleryCategory[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatGalleryItemsToJson(items, categories, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
