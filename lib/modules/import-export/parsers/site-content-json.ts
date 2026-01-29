/**
 * Site Content JSON Parser (Pure)
 *
 * Parses JSON import data for site content sections.
 * Following PRD §2.9 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.9
 */

import type {
  SiteContentExport,
  SiteContentExportData,
  SiteContentImportData,
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
 * Validate a single site content export data.
 *
 * @param data - The data to validate
 * @returns Array of missing/invalid field names
 */
export function validateSiteContentFields(
  data: Record<string, unknown>
): string[] {
  const missing: string[] = [];

  if (!isNonEmptyString(data.section_key)) missing.push('section_key');

  const hasContentEn = typeof data.content_en === 'object' && data.content_en !== null;
  const hasContentZh = typeof data.content_zh === 'object' && data.content_zh !== null;
  if (!hasContentEn && !hasContentZh) missing.push('content');

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
  data: SiteContentExportData
): SiteContentImportData {
  const content =
    (typeof data.content_zh === 'object' && data.content_zh !== null
      ? data.content_zh
      : typeof data.content_en === 'object' && data.content_en !== null
        ? data.content_en
        : {}) ?? {};

  return {
    section_key: data.section_key,
    is_published: typeof data.is_published === 'boolean' ? data.is_published : true,
    // Single-language: mirror into legacy en/zh fields
    content_en: content,
    content_zh: content,
  };
}

/**
 * Parse site content JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseSiteContentJson(
  jsonString: string
): ParseResult<SiteContentImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'JSON 格式無效：預期為物件' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'site_content') {
      return {
        success: false,
        error: `type 無效：預期為 'site_content'，實際為 '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'data 欄位無效：預期為陣列' };
    }

    // Validate and transform each item
    const contents: SiteContentImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const item = envelope.data[i] as Record<string, unknown>;
      const missing = validateSiteContentFields(item);

      if (missing.length > 0) {
        return {
          success: false,
          error: `第 ${i + 1} 筆：缺少必填欄位：${missing.join(', ')}`,
        };
      }

      contents.push(transformToImportData(item as unknown as SiteContentExportData));
    }

    return { success: true, data: contents };
  } catch (error) {
    return {
      success: false,
      error: `JSON 解析失敗：${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as site content export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseSiteContentObject(
  data: unknown
): ParseResult<SiteContentImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: '輸入格式無效：預期為物件' };
  }

  const envelope = data as SiteContentExport;

  if (envelope.type !== 'site_content') {
    return {
      success: false,
      error: `type 無效：預期為 'site_content'，實際為 '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'data 欄位無效：預期為陣列' };
  }

  const contents: SiteContentImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const item = envelope.data[i];
    const missing = validateSiteContentFields(item as unknown as Record<string, unknown>);

    if (missing.length > 0) {
      return {
        success: false,
        error: `第 ${i + 1} 筆：缺少必填欄位：${missing.join(', ')}`,
      };
    }

    contents.push(transformToImportData(item));
  }

  return { success: true, data: contents };
}
