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
  if (typeof data.content_en !== 'object' || data.content_en === null) missing.push('content_en');
  if (typeof data.content_zh !== 'object' || data.content_zh === null) missing.push('content_zh');

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
  return {
    section_key: data.section_key,
    is_published: typeof data.is_published === 'boolean' ? data.is_published : true,
    content_en: data.content_en ?? {},
    content_zh: data.content_zh ?? {},
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
      return { success: false, error: 'Invalid JSON: expected object' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'site_content') {
      return {
        success: false,
        error: `Invalid type: expected 'site_content', got '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'Invalid data: expected array' };
    }

    // Validate and transform each item
    const contents: SiteContentImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const item = envelope.data[i] as Record<string, unknown>;
      const missing = validateSiteContentFields(item);

      if (missing.length > 0) {
        return {
          success: false,
          error: `Item ${i + 1}: missing required fields: ${missing.join(', ')}`,
        };
      }

      contents.push(transformToImportData(item as unknown as SiteContentExportData));
    }

    return { success: true, data: contents };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
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
    return { success: false, error: 'Invalid input: expected object' };
  }

  const envelope = data as SiteContentExport;

  if (envelope.type !== 'site_content') {
    return {
      success: false,
      error: `Invalid type: expected 'site_content', got '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'Invalid data: expected array' };
  }

  const contents: SiteContentImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const item = envelope.data[i];
    const missing = validateSiteContentFields(item as unknown as Record<string, unknown>);

    if (missing.length > 0) {
      return {
        success: false,
        error: `Item ${i + 1}: missing required fields: ${missing.join(', ')}`,
      };
    }

    contents.push(transformToImportData(item));
  }

  return { success: true, data: contents };
}
