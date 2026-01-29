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
const VALID_LOCALES: readonly PageViewLocale[] = ['zh'] as const;

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
    return invalidResult('請求內容必須是物件');
  }

  const { path, locale } = body as Record<string, unknown>;

  // Validate path
  if (!isValidPageViewPath(path)) {
    return invalidResult(
      '路徑無效：必須符合 /^/[a-zA-Z0-9/_-]*$/ 且長度不超過 500 字元'
    );
  }

  // Validate locale
  if (!isValidPageViewLocale(locale)) {
    return invalidResult('語系無效：必須是 "zh"');
  }

  // Check excluded paths
  if (isExcludedPath(path)) {
    return invalidResult('此路徑不納入追蹤');
  }

  return validResult({ path, locale });
}

/**
 * Extracts locale and canonical path from a full pathname.
 * e.g., '/zh' -> { locale: 'zh', path: '/' }
 *
 * Returns null if locale cannot be determined.
 */
export function parsePathname(
  pathname: string
): { locale: PageViewLocale; path: string } | null {
  // Match pattern: /zh/...
  const match = pathname.match(/^\/(zh)(\/.*)?$/);
  if (!match) return null;

  const locale = match[1] as PageViewLocale;
  const path = match[2] || '/';

  return { locale, path };
}
