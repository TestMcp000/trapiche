/**
 * Pick Locale Content Helpers
 *
 * Pure utility functions for selecting locale-specific content.
 * Single source of truth for locale branching logic.
 *
 * @module lib/i18n/pick-locale
 */

import type { SiteContent } from '@/lib/types/content';

/**
 * Pick localized content from a SiteContent row.
 * Selects content_zh for 'zh' locale, content_en otherwise.
 *
 * @param content - SiteContent row from database (or undefined)
 * @param locale - Current locale ('en' | 'zh')
 * @returns Typed content object or null if content is undefined
 *
 * @example
 * const nav = pickLocaleContent<NavContent>(navContent, locale);
 */
export function pickLocaleContent<T>(
  content: SiteContent | undefined,
  locale: string
): T | null {
  if (!content) return null;
  return (locale === 'zh' ? content.content_zh : content.content_en) as T;
}

/**
 * Pick between en/zh values based on locale.
 * Useful for simple bilingual string/object mappings.
 *
 * @param values - Object with 'en' and 'zh' keys
 * @param locale - Current locale ('en' | 'zh')
 * @returns The value corresponding to the locale
 *
 * @example
 * const title = pickLocale({ en: 'Hello', zh: '你好' }, locale);
 */
export function pickLocale<T>(values: { en: T; zh: T }, locale: string): T {
  return locale === 'zh' ? values.zh : values.en;
}
