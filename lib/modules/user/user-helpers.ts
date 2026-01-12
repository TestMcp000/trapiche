/**
 * User Domain Pure Helpers
 *
 * Pure functions for user-related data formatting and parsing.
 * No server-only/Next.js/React/Supabase dependencies — can be used in client components.
 *
 * 遵循 ARCHITECTURE.md 規範：pure module
 *
 * @module lib/modules/user/user-helpers
 */

/**
 * Format date string with locale-aware display.
 * @param dateStr - ISO 8601 date string
 * @param locale - 'en' | 'zh'
 * @returns Formatted date string (e.g., "Dec 29, 2024, 08:15 PM" or "2024年12月29日 20:15")
 */
export function formatDateLocalized(dateStr: string, locale: string): string {
  return new Date(dateStr).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );
}

/**
 * Format date string with locale-aware display (date only, no time).
 * @param dateStr - ISO 8601 date string
 * @param locale - 'en' | 'zh'
 * @returns Formatted date string (e.g., "Dec 29, 2024" or "2024年12月29日")
 */
export function formatDateShortLocalized(
  dateStr: string,
  locale: string
): string {
  return new Date(dateStr).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : 'en-US',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
}

/**
 * Parse comma-separated tags string into array.
 * Handles: split, trim, remove empty, dedupe.
 * @param tagsStr - Comma-separated tags (e.g., "vip, premium, vip")
 * @returns Unique, trimmed tags array (e.g., ["vip", "premium"])
 */
export function parseTagsString(tagsStr: string): string[] {
  if (!tagsStr || !tagsStr.trim()) return [];

  const tags = tagsStr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  // Dedupe while preserving order
  return [...new Set(tags)];
}

/**
 * Join tags array into comma-separated string.
 * @param tags - Array of tags
 * @returns Comma-separated string (e.g., "vip, premium")
 */
export function joinTagsArray(tags: string[]): string {
  return tags.join(', ');
}
