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
const REQUIRED_CATEGORY_FIELDS = ['slug'] as const;

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
    return 'JSON 結構無效：預期為物件';
  }

  const obj = envelope as Record<string, unknown>;

  if (typeof obj.exportedAt !== 'string') {
    return '缺少或無效的 "exportedAt" 欄位';
  }

  if (obj.type !== 'blog_categories') {
    return `type 無效：預期為 "blog_categories"，實際為 "${obj.type}"`;
  }

  if (!Array.isArray(obj.data)) {
    return '缺少或無效的 "data" 欄位：預期為陣列';
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
  const displayIndex = index + 1;
  if (!category || typeof category !== 'object') {
    return `第 ${displayIndex} 筆：預期為物件`;
  }

  const obj = category as Record<string, unknown>;

  for (const field of REQUIRED_CATEGORY_FIELDS) {
    if (typeof obj[field] !== 'string' || !obj[field]) {
      return `第 ${displayIndex} 筆：缺少必填欄位 "${field}" 或為空`;
    }
  }

  const nameCandidate = obj.name_zh ?? obj.name_en;
  if (typeof nameCandidate !== 'string' || nameCandidate.trim().length === 0) {
    return `第 ${displayIndex} 筆：缺少必填欄位 "name" 或為空`;
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
  const nameCandidate = obj.name_zh ?? obj.name_en ?? '';
  const name = String(nameCandidate);
  return {
    slug: String(obj.slug),
    // Single-language: mirror into legacy en/zh fields
    name_en: name,
    name_zh: name,
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
      error: `JSON 解析失敗：${error instanceof Error ? error.message : String(error)}`,
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
      error: `分類資料驗證失敗：\n${errors.join('\n')}`,
    };
  }

  // Warn if empty
  if (categories.length === 0) {
    warnings.push('data 陣列中找不到任何分類');
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
