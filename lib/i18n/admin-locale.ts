/**
 * Admin Locale Pure Functions
 *
 * Pure module for admin locale handling.
 * Following ARCHITECTURE.md §3.4 for pure modules.
 *
 * Key concept: adminLocale (UI preference) is separate from routeLocale (URL path).
 * - routeLocale: from /{locale}/... URL — used for hrefs, redirects
 * - adminLocale: from cookie/localStorage — used only for admin UI text
 */

import { DEFAULT_LOCALE, type Locale } from './locales';

/**
 * Cookie/localStorage key for admin locale preference.
 */
export const ADMIN_LOCALE_KEY = 'admin-locale';

/**
 * Cookie max age in seconds (1 year).
 */
export const ADMIN_LOCALE_MAX_AGE = 31536000;

/**
 * Normalize a raw string value to a valid Locale.
 * Returns DEFAULT_LOCALE if value is invalid or empty.
 *
 * @param value - Raw string value (e.g., 'zh-TW', 'en-US', 'zh', 'en')
 * @returns Valid Locale ('en' or 'zh')
 */
export function normalizeAdminLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const normalized = value.toLowerCase().trim();

  // Match zh-TW, zh-Hant, zh-CN, etc.
  if (normalized.startsWith('zh')) return 'zh';
  // Match en-US, en-GB, etc.
  if (normalized.startsWith('en')) return 'en';

  return DEFAULT_LOCALE;
}

/**
 * Infer locale from Accept-Language header.
 * Parses the primary language from the header value.
 *
 * @param header - Accept-Language header value (e.g., 'zh-TW,zh;q=0.9,en;q=0.8')
 * @returns Inferred Locale
 */
export function inferLocaleFromAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;

  // Extract the primary language (first entry before any comma or semicolon)
  const primary = header.split(',')[0]?.split(';')[0]?.trim();
  return normalizeAdminLocale(primary);
}
