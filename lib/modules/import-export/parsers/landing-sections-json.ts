/**
 * Landing Sections JSON Parser (Pure)
 *
 * Parses JSON import data for landing sections.
 * Following PRD §2.10 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.10
 */

import type {
  LandingSectionsExport,
  LandingSectionExportData,
  LandingSectionImportData,
  ParseResult,
} from '@/lib/types/import-export';

// =============================================================================
// Constants
// =============================================================================

const VALID_SECTION_TYPES = ['text', 'text_image', 'cards', 'gallery', 'cta'];

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
 * Validate a single landing section export data.
 *
 * @param data - The data to validate
 * @returns Array of error messages
 */
export function validateLandingSectionFields(
  data: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  if (!isNonEmptyString(data.section_key)) {
    errors.push('section_key is required');
  }
  if (!isNonEmptyString(data.section_type)) {
    errors.push('section_type is required');
  } else if (!VALID_SECTION_TYPES.includes(data.section_type as string)) {
    errors.push(`section_type must be one of: ${VALID_SECTION_TYPES.join(', ')}`);
  }

  return errors;
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
  data: LandingSectionExportData
): LandingSectionImportData {
  return {
    section_key: data.section_key,
    section_type: data.section_type,
    sort_order: typeof data.sort_order === 'number' ? data.sort_order : 0,
    is_visible: typeof data.is_visible === 'boolean' ? data.is_visible : true,
    title_en: data.title_en ?? null,
    title_zh: data.title_zh ?? null,
    subtitle_en: data.subtitle_en ?? null,
    subtitle_zh: data.subtitle_zh ?? null,
    content_en: data.content_en ?? null,
    content_zh: data.content_zh ?? null,
  };
}

/**
 * Parse landing sections JSON string.
 *
 * @param jsonString - The JSON string to parse
 * @returns Parse result with validated data or error
 */
export function parseLandingSectionsJson(
  jsonString: string
): ParseResult<LandingSectionImportData[]> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;

    // Validate envelope structure
    if (typeof parsed !== 'object' || parsed === null) {
      return { success: false, error: 'Invalid JSON: expected object' };
    }

    const envelope = parsed as Record<string, unknown>;

    if (envelope.type !== 'landing_sections') {
      return {
        success: false,
        error: `Invalid type: expected 'landing_sections', got '${envelope.type}'`,
      };
    }

    if (!Array.isArray(envelope.data)) {
      return { success: false, error: 'Invalid data: expected array' };
    }

    // Validate and transform each item
    const sections: LandingSectionImportData[] = [];

    for (let i = 0; i < envelope.data.length; i++) {
      const item = envelope.data[i] as Record<string, unknown>;
      const errors = validateLandingSectionFields(item);

      if (errors.length > 0) {
        return {
          success: false,
          error: `Section ${i + 1}: ${errors.join('; ')}`,
        };
      }

      sections.push(transformToImportData(item as unknown as LandingSectionExportData));
    }

    return { success: true, data: sections };
  } catch (error) {
    return {
      success: false,
      error: `JSON parse error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse a raw JSON object as landing sections export.
 *
 * @param data - The parsed JSON object
 * @returns Parse result with validated data or error
 */
export function parseLandingSectionsObject(
  data: unknown
): ParseResult<LandingSectionImportData[]> {
  if (typeof data !== 'object' || data === null) {
    return { success: false, error: 'Invalid input: expected object' };
  }

  const envelope = data as LandingSectionsExport;

  if (envelope.type !== 'landing_sections') {
    return {
      success: false,
      error: `Invalid type: expected 'landing_sections', got '${envelope.type}'`,
    };
  }

  if (!Array.isArray(envelope.data)) {
    return { success: false, error: 'Invalid data: expected array' };
  }

  const sections: LandingSectionImportData[] = [];

  for (let i = 0; i < envelope.data.length; i++) {
    const item = envelope.data[i];
    const errors = validateLandingSectionFields(item as unknown as Record<string, unknown>);

    if (errors.length > 0) {
      return {
        success: false,
        error: `Section ${i + 1}: ${errors.join('; ')}`,
      };
    }

    sections.push(transformToImportData(item));
  }

  return { success: true, data: sections };
}
