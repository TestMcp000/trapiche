/**
 * Blog Categories JSON Parser (Pure)
 *
 * Parses JSON export envelope to blog category data.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.2
 */

import type {
  BlogCategoriesExport,
  ParsedBlogCategory,
  ParseResult,
} from '@/lib/types/import-export';

// =============================================================================
// Constants
// =============================================================================

/** Required category fields */
const REQUIRED_CATEGORY_FIELDS = ['slug', 'name_en', 'name_zh'] as const;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validate the export envelope structure.
 *
 * @param envelope - The parsed JSON object
 * @returns Error message if invalid, undefined if valid
 */
export function validateEnvelopeStructure(
  envelope: unknown
): string | undefined {
  if (!envelope || typeof envelope !== 'object') {
    return 'Invalid JSON structure: expected an object';
  }

  const obj = envelope as Record<string, unknown>;

  if (typeof obj.exportedAt !== 'string') {
    return 'Missing or invalid "exportedAt" field';
  }

  if (obj.type !== 'blog_categories') {
    return `Invalid type: expected "blog_categories", got "${obj.type}"`;
  }

  if (!Array.isArray(obj.data)) {
    return 'Missing or invalid "data" field: expected an array';
  }

  return undefined;
}

/**
 * Validate a single category object.
 *
 * @param category - The category object to validate
 * @param index - The index in the array (for error messages)
 * @returns Error message if invalid, undefined if valid
 */
export function validateCategoryObject(
  category: unknown,
  index: number
): string | undefined {
  if (!category || typeof category !== 'object') {
    return `Item ${index}: expected an object`;
  }

  const obj = category as Record<string, unknown>;

  for (const field of REQUIRED_CATEGORY_FIELDS) {
    if (typeof obj[field] !== 'string' || !obj[field]) {
      return `Item ${index}: missing or empty required field "${field}"`;
    }
  }

  return undefined;
}

/**
 * Extract category data from validated object.
 *
 * @param obj - The validated category object
 * @returns ParsedBlogCategory
 */
export function extractCategoryData(
  obj: Record<string, unknown>
): ParsedBlogCategory {
  return {
    slug: String(obj.slug),
    name_en: String(obj.name_en),
    name_zh: String(obj.name_zh),
  };
}

// =============================================================================
// Parser Functions
// =============================================================================

/**
 * Parse JSON string to blog categories export envelope.
 *
 * @param jsonString - The raw JSON string
 * @returns ParseResult with parsed envelope or error
 */
export function parseBlogCategoriesJsonString(
  jsonString: string
): ParseResult<BlogCategoriesExport> {
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    return parseBlogCategoriesJson(parsed);
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Parse and validate blog categories from parsed JSON object.
 *
 * @param envelope - The parsed JSON object
 * @returns ParseResult with validated categories or error
 */
export function parseBlogCategoriesJson(
  envelope: unknown
): ParseResult<BlogCategoriesExport> {
  const warnings: string[] = [];

  // Validate envelope structure
  const envelopeError = validateEnvelopeStructure(envelope);
  if (envelopeError) {
    return { success: false, error: envelopeError };
  }

  const obj = envelope as Record<string, unknown>;
  const dataArray = obj.data as unknown[];

  // Validate and extract each category
  const categories: ParsedBlogCategory[] = [];
  const errors: string[] = [];

  for (let i = 0; i < dataArray.length; i++) {
    const categoryError = validateCategoryObject(dataArray[i], i);
    if (categoryError) {
      errors.push(categoryError);
      continue;
    }

    const categoryData = extractCategoryData(
      dataArray[i] as Record<string, unknown>
    );
    categories.push(categoryData);
  }

  // If any validation errors, fail
  if (errors.length > 0) {
    return {
      success: false,
      error: `Category validation failed:\n${errors.join('\n')}`,
    };
  }

  // Warn if empty
  if (categories.length === 0) {
    warnings.push('No categories found in data array');
  }

  const result: BlogCategoriesExport = {
    exportedAt: String(obj.exportedAt),
    type: 'blog_categories',
    data: categories,
  };

  return {
    success: true,
    data: result,
    ...(warnings.length > 0 && { warnings }),
  };
}

/**
 * Parse blog categories to array of ParsedBlogCategory.
 * Convenience function that extracts just the data array.
 *
 * @param jsonString - The raw JSON string
 * @returns ParseResult with category array or error
 */
export function parseBlogCategoriesArray(
  jsonString: string
): ParseResult<ParsedBlogCategory[]> {
  const result = parseBlogCategoriesJsonString(jsonString);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return {
    success: true,
    data: result.data!.data,
    warnings: result.warnings,
  };
}
