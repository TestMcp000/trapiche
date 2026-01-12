/**
 * Slug Validation (Pure Functions)
 *
 * Single source of truth for slug format validation across the application.
 * Used by: Blog Categories, Blog Posts, Shop Products, and any future modules.
 *
 * @see lib/utils/slug.ts - For slug generation (different from validation)
 * @see lib/validators/api-common.ts - For common validation patterns
 */

import { type ValidationResult, validResult, invalidResult } from './api-common';

// =============================================================================
// Constants
// =============================================================================

/**
 * Single source regex for URL-safe slug validation.
 * Format: lowercase alphanumeric, optionally separated by single hyphens.
 * Examples:
 * - Valid: "hello", "hello-world", "a1", "123"
 * - Invalid: "Hello" (uppercase), "a--b" (double hyphen), "-abc" (leading hyphen), "a_b" (underscore)
 */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// =============================================================================
// Validators
// =============================================================================

/**
 * Check if a string is a valid slug format.
 * @param slug - The string to validate
 * @returns true if valid slug format, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  return typeof slug === 'string' && slug.length > 0 && SLUG_REGEX.test(slug);
}

/**
 * Validate slug with detailed result (following api-common.ts pattern).
 * @param input - The string to validate
 * @returns ValidationResult with trimmed slug if valid, or error message if invalid
 */
export function validateSlug(input: string): ValidationResult<string> {
  if (typeof input !== 'string') {
    return invalidResult('Slug must be a string');
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    return invalidResult('Slug is required');
  }

  if (!SLUG_REGEX.test(trimmed)) {
    return invalidResult(
      'Slug must be URL-safe: lowercase letters, numbers, and hyphens only (no leading/trailing hyphens or consecutive hyphens)'
    );
  }

  return validResult(trimmed);
}
