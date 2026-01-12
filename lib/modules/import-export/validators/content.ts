/**
 * Content Validators (Pure)
 *
 * Validation functions for site content and landing sections import/export.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.9, §2.10
 */

import type {
  SiteContentImportData,
  LandingSectionImportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// Constants
// =============================================================================

const VALID_SECTION_TYPES = ['text', 'text_image', 'cards', 'gallery', 'cta'];

const VALID_SECTION_KEYS = [
  'hero',
  'about',
  'services',
  'platforms',
  'product_design',
  'portfolio',
  'contact',
  'custom_1',
  'custom_2',
  'custom_3',
  'custom_4',
  'custom_5',
  'custom_6',
  'custom_7',
  'custom_8',
  'custom_9',
  'custom_10',
];

// =============================================================================
// Site Content Validators
// =============================================================================

/**
 * Validate a site content section for import.
 *
 * @param content - The content to validate
 * @returns Validation result
 */
export function validateSiteContent(
  content: SiteContentImportData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Section key validation
  if (!content.section_key?.trim()) {
    errors.push({ field: 'section_key', message: 'Section key is required' });
  }

  // Content structure validation
  if (typeof content.content_en !== 'object' || content.content_en === null) {
    errors.push({ field: 'content_en', message: 'English content must be a valid object' });
  }
  if (typeof content.content_zh !== 'object' || content.content_zh === null) {
    errors.push({ field: 'content_zh', message: 'Chinese content must be a valid object' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple site content sections for import.
 *
 * @param contents - Array of content sections to validate
 * @returns Map of section_key to validation result
 */
export function validateSiteContents(
  contents: SiteContentImportData[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const content of contents) {
    results.set(content.section_key, validateSiteContent(content));
  }

  return results;
}

// =============================================================================
// Landing Section Validators
// =============================================================================

/**
 * Validate a landing section for import.
 *
 * @param section - The section to validate
 * @returns Validation result
 */
export function validateLandingSection(
  section: LandingSectionImportData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Section key validation
  if (!section.section_key?.trim()) {
    errors.push({ field: 'section_key', message: 'Section key is required' });
  } else if (!VALID_SECTION_KEYS.includes(section.section_key)) {
    errors.push({
      field: 'section_key',
      message: `Invalid section key. Must be one of: ${VALID_SECTION_KEYS.slice(0, 7).join(', ')}, or custom_1 to custom_10`,
    });
  }

  // Section type validation
  if (!section.section_type?.trim()) {
    errors.push({ field: 'section_type', message: 'Section type is required' });
  } else if (!VALID_SECTION_TYPES.includes(section.section_type)) {
    errors.push({
      field: 'section_type',
      message: `Invalid section type. Must be one of: ${VALID_SECTION_TYPES.join(', ')}`,
    });
  }

  // Sort order validation
  if (typeof section.sort_order !== 'number' || section.sort_order < 0) {
    errors.push({ field: 'sort_order', message: 'Sort order must be a non-negative number' });
  }

  // Content structure validation (if provided)
  if (section.content_en !== null && typeof section.content_en !== 'object') {
    errors.push({ field: 'content_en', message: 'English content must be an object or null' });
  }
  if (section.content_zh !== null && typeof section.content_zh !== 'object') {
    errors.push({ field: 'content_zh', message: 'Chinese content must be an object or null' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple landing sections for import.
 *
 * @param sections - Array of landing sections to validate
 * @returns Map of section_key to validation result
 */
export function validateLandingSections(
  sections: LandingSectionImportData[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const section of sections) {
    results.set(section.section_key, validateLandingSection(section));
  }

  // Check for duplicate section keys
  const keys = sections.map((s) => s.section_key);
  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    // Add error to the first duplicate
    const firstDuplicate = duplicates[0];
    const existingResult = results.get(firstDuplicate);
    if (existingResult) {
      existingResult.valid = false;
      existingResult.errors.push({
        field: 'section_key',
        message: `Duplicate section key: ${firstDuplicate}`,
      });
    }
  }

  return results;
}
