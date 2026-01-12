/**
 * Gallery Items JSON Parser (Pure)
 *
 * Parses JSON import data for gallery items.
 * Following PRD §2.3 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.3
 */

import type {
  GalleryItemsExport,
  GalleryItemExportData,
  GalleryItemImportData,
  ParseResult,
} from '@/lib/types/import-export';

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Check if a value is a non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Check if a value is a valid string array.
 */
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

/**
 * Validate a single gallery item export data.
 *
 * @param data - The data to validate
 * @returns Array of missing/invalid field names
 */
export function validateGalleryItemFields(
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  if (!isNonEmptyString(data.slug)) missing.push('slug');
  if (!isNonEmptyString(data.category)) missing.push('category');
  if (!isNonEmptyString(data.title_en)) missing.push('title_en');
  if (!isNonEmptyString(data.title_zh)) missing.push('title_zh');
  if (!isNonEmptyString(data.image_url)) missing.push('image_url');

  return missing;
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Transform parsed export data to import data format.
 *
 * @param data - The export data
 * @returns Import data
 */
export function transformToImportData(
  data: GalleryItemExportData
): GalleryItemImportData {
  return {
    slug: data.slug,
    category_slug: data.category,
    title_en: data.title_en,
    title_zh: data.title_zh,
    description_en: data.description_en ?? '',
    description_zh: data.description_zh ?? '',
    image_url: data.image_url,
    image_alt_en: data.image_alt_en ?? null,
    image_alt_zh: data.image_alt_zh ?? null,
    material_en: data.material_en ?? null,
    material_zh: data.material_zh ?? null,
    tags_en: isStringArray(data.tags_en) ? data.tags_en : [],
    tags_zh: isStringArray(data.tags_zh) ? data.tags_zh : [],
    is_visible: typeof data.is_visible === 'boolean' ? data.is_visible : true,
  };
}

/**
 * Parse gallery items JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseGalleryItemsJson(
  jsonString: string
): ParseResult<GalleryItemImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid JSON: expected object' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'gallery_items') {
      return {
        success: false,
        error: `Invalid type: expected 'gallery_items', got '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'Invalid data: expected array' };
    }

    // Validate and transform each item
    const items: GalleryItemImportData[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const item = envelope.data[i] as Record<string, unknown>;
      const missing = validateGalleryItemFields(item);

      if (missing.length > 0) {
        return {
          success: false,
          error: `Item ${i + 1}: missing required fields: ${missing.join(', ')}`,
        };
      }

      items.push(transformToImportData(item as unknown as GalleryItemExportData));
    }

    return { success: true, data: items, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as gallery items export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseGalleryItemsObject(
  data: unknown
): ParseResult<GalleryItemImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Invalid input: expected object' };
  }

  const envelope = data as GalleryItemsExport;

  if (envelope.type !== 'gallery_items') {
    return {
      success: false,
      error: `Invalid type: expected 'gallery_items', got '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'Invalid data: expected array' };
  }

  const items: GalleryItemImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const item = envelope.data[i];
    const missing = validateGalleryItemFields(item as unknown as Record<string, unknown>);

    if (missing.length > 0) {
      return {
        success: false,
        error: `Item ${i + 1}: missing required fields: ${missing.join(', ')}`,
      };
    }

    items.push(transformToImportData(item));
  }

  return { success: true, data: items };
}
