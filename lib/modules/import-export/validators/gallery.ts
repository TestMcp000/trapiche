/**
 * Gallery Validators (Pure)
 *
 * Validation functions for gallery items and categories import/export.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.3, §2.4
 */

import { isValidSlug } from '@/lib/validators/slug';
import type {
  GalleryItemImportData,
  GalleryCategoryImportData,
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
// Gallery Item Validators
// =============================================================================

/**
 * Validate a gallery item for import.
 *
 * @param item - The item to validate
 * @param existingCategorySlugs - Set of valid category slugs
 * @returns Validation result
 */
export function validateGalleryItem(
  item: GalleryItemImportData,
  existingCategorySlugs: Set<string>
): ValidationResult {
  const errors: ValidationError[] = [];

  // Slug validation
  if (!item.slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  } else if (!isValidSlug(item.slug)) {
    errors.push({ field: 'slug', message: 'Invalid slug format (lowercase alphanumeric with hyphens)' });
  }

  // Category validation
  if (!item.category_slug) {
    errors.push({ field: 'category', message: 'Category is required' });
  } else if (!existingCategorySlugs.has(item.category_slug)) {
    errors.push({ field: 'category', message: `Category '${item.category_slug}' does not exist` });
  }

  // Title validation
  if (!item.title_en?.trim()) {
    errors.push({ field: 'title_en', message: 'English title is required' });
  }
  if (!item.title_zh?.trim()) {
    errors.push({ field: 'title_zh', message: 'Chinese title is required' });
  }

  // Image URL validation
  if (!item.image_url?.trim()) {
    errors.push({ field: 'image_url', message: 'Image URL is required' });
  } else if (!isValidUrl(item.image_url)) {
    errors.push({ field: 'image_url', message: 'Invalid image URL format' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple gallery items for import.
 *
 * @param items - Array of items to validate
 * @param existingCategorySlugs - Set of valid category slugs
 * @returns Map of item slug to validation result
 */
export function validateGalleryItems(
  items: GalleryItemImportData[],
  existingCategorySlugs: Set<string>
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const item of items) {
    results.set(item.slug, validateGalleryItem(item, existingCategorySlugs));
  }

  return results;
}

// =============================================================================
// Gallery Category Validators
// =============================================================================

/**
 * Validate a gallery category for import.
 *
 * @param category - The category to validate
 * @returns Validation result
 */
export function validateGalleryCategory(
  category: GalleryCategoryImportData
): ValidationResult {
  const errors: ValidationError[] = [];

  // Slug validation
  if (!category.slug) {
    errors.push({ field: 'slug', message: 'Slug is required' });
  } else if (!isValidSlug(category.slug)) {
    errors.push({ field: 'slug', message: 'Invalid slug format (lowercase alphanumeric with hyphens)' });
  }

  // Name validation
  if (!category.name_en?.trim()) {
    errors.push({ field: 'name_en', message: 'English name is required' });
  }
  if (!category.name_zh?.trim()) {
    errors.push({ field: 'name_zh', message: 'Chinese name is required' });
  }

  // Sort order validation
  if (typeof category.sort_order !== 'number' || category.sort_order < 0) {
    errors.push({ field: 'sort_order', message: 'Sort order must be a non-negative number' });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple gallery categories for import.
 *
 * @param categories - Array of categories to validate
 * @returns Map of category slug to validation result
 */
export function validateGalleryCategories(
  categories: GalleryCategoryImportData[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const category of categories) {
    results.set(category.slug, validateGalleryCategory(category));
  }

  return results;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a string is a valid URL.
 */
function isValidUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Extract all category slugs from import data.
 * Useful for checking if imported items reference categories within the same bundle.
 *
 * @param categories - Array of category import data
 * @returns Set of category slugs
 */
export function extractCategorySlugs(
  categories: GalleryCategoryImportData[]
): Set<string> {
  return new Set(categories.map((c) => c.slug));
}
