/**
 * Blog Import Validators (Pure)
 *
 * Validation functions for blog post and category import data.
 * Uses lib/validators/slug.ts for slug validation (Single Source).
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §4
 */

import { isValidSlug } from '@/lib/validators/slug';
import {
  type ValidationResult,
  validResult,
  invalidResult,
  invalidResults,
} from '@/lib/validators/api-common';
import type {
  ParsedBlogPost,
  ParsedBlogCategory,
  BlogPostImportData,
  BlogCategoryImportData,
} from '@/lib/types/import-export';

// =============================================================================
// Constants
// =============================================================================

/** Valid visibility values */
const VALID_VISIBILITIES = ['draft', 'private', 'public'] as const;
type Visibility = (typeof VALID_VISIBILITIES)[number];

// =============================================================================
// Visibility Validator
// =============================================================================

/**
 * Validate visibility field value.
 *
 * @param value - The value to validate
 * @returns True if valid visibility
 */
export function isValidVisibility(value: unknown): value is Visibility {
  return (
    typeof value === 'string' &&
    VALID_VISIBILITIES.includes(value as Visibility)
  );
}

/**
 * Validate visibility with result.
 *
 * @param value - The visibility value
 * @returns ValidationResult
 */
export function validateVisibility(value: string): ValidationResult<Visibility> {
  if (!isValidVisibility(value)) {
    return invalidResult(
      `Invalid visibility "${value}". Must be one of: ${VALID_VISIBILITIES.join(', ')}`
    );
  }
  return validResult(value);
}

// =============================================================================
// Blog Post Validators
// =============================================================================

/**
 * Validate blog post slug.
 * Reuses the single-source slug validator.
 *
 * @param slug - The slug to validate
 * @returns True if valid
 */
export function validateBlogPostSlug(slug: string): boolean {
  return isValidSlug(slug);
}

/**
 * Validate parsed blog post data for import.
 *
 * @param data - The parsed blog post data
 * @returns ValidationResult with import-ready data or errors
 */
export function validateBlogPostData(
  data: ParsedBlogPost
): ValidationResult<BlogPostImportData> {
  const errors: Record<string, string> = {};

  // Validate slug
  if (!data.frontmatter.slug) {
    errors.slug = 'Slug is required';
  } else if (!isValidSlug(data.frontmatter.slug)) {
    errors.slug =
      'Invalid slug format. Must be lowercase alphanumeric with hyphens.';
  }

  // Validate category
  if (!data.frontmatter.category) {
    errors.category = 'Category slug is required';
  } else if (!isValidSlug(data.frontmatter.category)) {
    errors.category =
      'Invalid category slug format. Must be lowercase alphanumeric with hyphens.';
  }

  // Validate visibility
  if (!isValidVisibility(data.frontmatter.visibility)) {
    errors.visibility = `Invalid visibility. Must be one of: ${VALID_VISIBILITIES.join(', ')}`;
  }

  // Validate title_en
  if (!data.frontmatter.title_en || !data.frontmatter.title_en.trim()) {
    errors.title_en = 'English title is required';
  }

  // Validate content_en
  if (!data.content_en || !data.content_en.trim()) {
    errors.content_en = 'English content is required';
  }

  // Return errors if any
  if (Object.keys(errors).length > 0) {
    return invalidResults<BlogPostImportData>(errors);
  }

  // Build import data
  const importData: BlogPostImportData = {
    slug: data.frontmatter.slug,
    category_slug: data.frontmatter.category,
    visibility: data.frontmatter.visibility,
    created_at: data.frontmatter.created_at,
    title_en: data.frontmatter.title_en,
    title_zh: data.frontmatter.title_zh ?? null,
    content_en: data.content_en,
    content_zh: data.content_zh ?? null,
    excerpt_en: data.frontmatter.excerpt_en ?? null,
    excerpt_zh: data.frontmatter.excerpt_zh ?? null,
    cover_image_url_en: data.frontmatter.cover_image_url_en ?? null,
    cover_image_url_zh: data.frontmatter.cover_image_url_zh ?? null,
    cover_image_alt_en: data.frontmatter.cover_image_alt_en ?? null,
    cover_image_alt_zh: data.frontmatter.cover_image_alt_zh ?? null,
  };

  return validResult(importData);
}

// =============================================================================
// Blog Category Validators
// =============================================================================

/**
 * Validate parsed blog category data for import.
 *
 * @param data - The parsed blog category data
 * @returns ValidationResult with import-ready data or errors
 */
export function validateBlogCategoryData(
  data: ParsedBlogCategory
): ValidationResult<BlogCategoryImportData> {
  const errors: Record<string, string> = {};

  // Validate slug
  if (!data.slug) {
    errors.slug = 'Slug is required';
  } else if (!isValidSlug(data.slug)) {
    errors.slug =
      'Invalid slug format. Must be lowercase alphanumeric with hyphens.';
  }

  // Validate name_en
  if (!data.name_en || !data.name_en.trim()) {
    errors.name_en = 'English name is required';
  }

  // Validate name_zh
  if (!data.name_zh || !data.name_zh.trim()) {
    errors.name_zh = 'Chinese name is required';
  }

  // Return errors if any
  if (Object.keys(errors).length > 0) {
    return invalidResults<BlogCategoryImportData>(errors);
  }

  // Build import data
  const importData: BlogCategoryImportData = {
    slug: data.slug,
    name_en: data.name_en.trim(),
    name_zh: data.name_zh.trim(),
  };

  return validResult(importData);
}

/**
 * Validate an array of categories.
 *
 * @param categories - Array of parsed categories
 * @returns Object with valid categories and errors by index
 */
export function validateBlogCategoriesArray(categories: ParsedBlogCategory[]): {
  valid: BlogCategoryImportData[];
  errors: Array<{ index: number; errors: Record<string, string> }>;
} {
  const valid: BlogCategoryImportData[] = [];
  const errors: Array<{ index: number; errors: Record<string, string> }> = [];

  for (let i = 0; i < categories.length; i++) {
    const result = validateBlogCategoryData(categories[i]);
    if (result.valid && result.data) {
      valid.push(result.data);
    } else if (result.errors) {
      errors.push({ index: i, errors: result.errors });
    }
  }

  return { valid, errors };
}

/**
 * Check for duplicate slugs in category array.
 *
 * @param categories - Array of parsed categories
 * @returns Array of duplicate slugs found
 */
export function findDuplicateCategorySlugs(
  categories: ParsedBlogCategory[]
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const category of categories) {
    if (seen.has(category.slug)) {
      if (!duplicates.includes(category.slug)) {
        duplicates.push(category.slug);
      }
    } else {
      seen.add(category.slug);
    }
  }

  return duplicates;
}
