/**
 * Page View Validators (Pure Functions)
 *
 * Validation functions for page view tracking requests.
 * All functions are pure (no side effects, no IO).
 *
 * @see lib/types/page-views.ts - Type definitions
 * @see supabase/02_add/16_page_views.sql - DB constraints
 * @see ARCHITECTURE.md §3.6 - Runtime Validators
 */

import type { ValidationResult } from './api-common';
import { validResult, invalidResult } from './api-common';
import type { PageViewRequest, PageViewLocale } from '@/lib/types/page-views';

// =============================================================================
// Constants
// =============================================================================

/**
 * Valid path pattern matching DB constraint.
 * Allows: /, /blog, /blog/my-post, /gallery/category/slug
 * Rejects: paths with special chars, query strings, etc.
 */
const PATH_PATTERN = /^\/[a-zA-Z0-9/_-]*$/;

/** Maximum path length (matches DB constraint) */
const MAX_PATH_LENGTH = 500;

/** Valid locales (matches DB constraint) */
const VALID_LOCALES: readonly PageViewLocale[] = ['en', 'zh'] as const;

/** Paths to exclude from tracking (noise reduction) */
const EXCLUDED_PATH_PREFIXES = ['/admin', '/api', '/_next'] as const;

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a canonical page path.
 * Path should already have locale prefix stripped.
 */
export function isValidPageViewPath(path: unknown): path is string {
  if (typeof path !== 'string') return false;
  if (path.length === 0 || path.length > MAX_PATH_LENGTH) return false;
  return PATH_PATTERN.test(path);
}

/**
 * Validates a page view locale.
 */
export function isValidPageViewLocale(locale: unknown): locale is PageViewLocale {
  return typeof locale === 'string' && VALID_LOCALES.includes(locale as PageViewLocale);
}

/**
 * Checks if a path should be excluded from tracking.
 * Excludes admin, API, and Next.js internal paths.
 */
export function isExcludedPath(path: string): boolean {
  return EXCLUDED_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * Validates a complete page view request.
 * Returns a ValidationResult with the validated data or error message.
 */
export function validatePageViewRequest(
  body: unknown
): ValidationResult<PageViewRequest> {
  // Check body is object
  if (typeof body !== 'object' || body === null) {
    return invalidResult('Request body must be an object');
  }

  const { path, locale } = body as Record<string, unknown>;

  // Validate path
  if (!isValidPageViewPath(path)) {
    return invalidResult(
      'Invalid path: must be a string matching /^/[a-zA-Z0-9/_-]*$/ with max 500 chars'
    );
  }

  // Validate locale
  if (!isValidPageViewLocale(locale)) {
    return invalidResult('Invalid locale: must be "en" or "zh"');
  }

  // Check excluded paths
  if (isExcludedPath(path)) {
    return invalidResult('Path is excluded from tracking');
  }

  return validResult({ path, locale });
}

/**
 * Extracts locale and canonical path from a full pathname.
 * e.g., '/en/blog/post' -> { locale: 'en', path: '/blog/post' }
 * e.g., '/zh' -> { locale: 'zh', path: '/' }
 *
 * Returns null if locale cannot be determined.
 */
export function parsePathname(
  pathname: string
): { locale: PageViewLocale; path: string } | null {
  // Match pattern: /en/... or /zh/...
  const match = pathname.match(/^\/(en|zh)(\/.*)?$/);
  if (!match) return null;

  const locale = match[1] as PageViewLocale;
  const path = match[2] || '/';

  return { locale, path };
}
