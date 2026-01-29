/**
 * Gallery Categories JSON Parser (Pure)
 *
 * Parses JSON import data for gallery categories.
 * Following PRD §2.4 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.4
 */

import type {
  GalleryCategoriesExport,
  GalleryCategoryExportData,
  GalleryCategoryImportData,
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
 * Validate a single gallery category export data.
 *
 * @param data - The data to validate
 * @returns Array of missing/invalid field names
 */
export function validateGalleryCategoryFields(
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  if (!isNonEmptyString(data.slug)) missing.push('slug');

  const nameCandidate = data.name_zh ?? data.name_en;
  if (!isNonEmptyString(nameCandidate)) missing.push('name');

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
  data: GalleryCategoryExportData
): GalleryCategoryImportData {
  const name = (data.name_zh ?? data.name_en ?? '').trim();
  return {
    slug: data.slug,
    // Single-language: mirror into legacy en/zh fields
    name_en: name,
    name_zh: name,
    sort_order: typeof data.sort_order === 'number' ? data.sort_order : 0,
    is_visible: typeof data.is_visible === 'boolean' ? data.is_visible : true,
  };
}

/**
 * Parse gallery categories JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseGalleryCategoriesJson(
  jsonString: string
): ParseResult<GalleryCategoryImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'JSON 格式無效：預期為物件' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'gallery_categories') {
      return {
        success: false,
        error: `type 無效：預期為 'gallery_categories'，實際為 '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'data 欄位無效：預期為陣列' };
    }

    // Validate and transform each item
    const categories: GalleryCategoryImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const item = envelope.data[i] as Record<string, unknown>;
      const missing = validateGalleryCategoryFields(item);

      if (missing.length > 0) {
        return {
          success: false,
          error: `第 ${i + 1} 個分類：缺少必填欄位：${missing.join(', ')}`,
        };
      }

      categories.push(transformToImportData(item as unknown as GalleryCategoryExportData));
    }

    return { success: true, data: categories };
  } catch (error) {
    return {
      success: false,
      error: `JSON 解析失敗：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as gallery categories export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseGalleryCategoriesObject(
  data: unknown
): ParseResult<GalleryCategoryImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: '輸入格式無效：預期為物件' };
  }

  const envelope = data as GalleryCategoriesExport;

  if (envelope.type !== 'gallery_categories') {
    return {
      success: false,
      error: `type 無效：預期為 'gallery_categories'，實際為 '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'data 欄位無效：預期為陣列' };
  }

  const categories: GalleryCategoryImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const item = envelope.data[i];
    const missing = validateGalleryCategoryFields(item as unknown as Record<string, unknown>);

    if (missing.length > 0) {
      return {
        success: false,
        error: `第 ${i + 1} 個分類：缺少必填欄位：${missing.join(', ')}`,
      };
    }

    categories.push(transformToImportData(item));
  }

  return { success: true, data: categories };
}
