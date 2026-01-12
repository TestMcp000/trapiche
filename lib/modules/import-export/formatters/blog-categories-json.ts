/**
 * Blog Categories JSON Formatter (Pure)
 *
 * Formats blog categories to JSON export envelope.
 * Following PRD §2.2 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.2
 */

import type { Category } from '@/lib/types/blog';
import type {
  BlogCategoriesExport,
  BlogCategoryExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a Category to export data format.
 * Only includes fields relevant for export (excludes id, created_at).
 *
 * @param category - The category to transform
 * @returns Export data object
 */
export function transformCategoryToExportData(
  category: Category
): BlogCategoryExportData {
  return {
    slug: category.slug,
    name_en: category.name_en,
    name_zh: category.name_zh,
  };
}

/**
 * Format an array of categories to JSON export envelope.
 *
 * @param categories - Array of categories to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatBlogCategoriesToJson(
  categories: Category[],
  exportedAt?: string
): BlogCategoriesExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'blog_categories',
    data: categories.map(transformCategoryToExportData),
  };
}

/**
 * Serialize blog categories export to JSON string.
 *
 * @param categories - Array of categories to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatBlogCategoriesToJsonString(
  categories: Category[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatBlogCategoriesToJson(categories, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
