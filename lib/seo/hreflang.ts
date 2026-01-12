/**
 * SEO Utilities - hreflang and Language Alternates
 * 
 * Generates alternate language URLs for SEO and sitemap generation.
 * Used for hreflang link tags and sitemap xhtml:link alternates.
 * 
 * Pure module: Uses centralized locale constants from lib/i18n/locales.ts
 */

import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/i18n/locales';
import { SITE_URL } from '@/lib/site/site-url';

// Re-export for backwards compatibility
export { LOCALES, DEFAULT_LOCALE, type Locale, SITE_URL };

export interface AlternateLanguage {
  hreflang: string;
  href: string;
}

/**
 * Generate alternate language URLs for a given path
 * @param pathname - The path without locale prefix (e.g., '/blog/technology/my-post')
 * @param includeXDefault - Whether to include x-default (points to default locale)
 * @returns Array of alternate language objects with hreflang and href
 */
export function getAlternateLanguages(
  pathname: string,
  includeXDefault: boolean = true
): AlternateLanguage[] {
  const alternates: AlternateLanguage[] = [];
  
  // Ensure pathname starts with /
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  
  // Add each locale
  for (const locale of LOCALES) {
    alternates.push({
      hreflang: locale === 'zh' ? 'zh-Hant' : locale,
      href: `${SITE_URL}/${locale}${normalizedPath}`,
    });
  }
  
  // Add x-default pointing to default locale (English)
  if (includeXDefault) {
    alternates.push({
      hreflang: 'x-default',
      href: `${SITE_URL}/${DEFAULT_LOCALE}${normalizedPath}`,
    });
  }
  
  return alternates;
}

/**
 * Generate Next.js Metadata alternates object
 * Used in generateMetadata for automatic hreflang generation
 * @param pathname - The path without locale prefix
 * @returns Object compatible with Next.js Metadata.alternates
 */
export function getMetadataAlternates(pathname: string, locale: string = DEFAULT_LOCALE) {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  
  return {
    canonical: `${SITE_URL}/${locale}${normalizedPath}`,
    languages: {
      'en': `${SITE_URL}/en${normalizedPath}`,
      'zh-Hant': `${SITE_URL}/zh${normalizedPath}`,
      'x-default': `${SITE_URL}/${DEFAULT_LOCALE}${normalizedPath}`,
    },
  };
}

/**
 * Get the canonical URL for a page
 * @param locale - Current locale
 * @param pathname - Path without locale prefix
 * @returns Full canonical URL
 */
export function getCanonicalUrl(locale: string, pathname: string): string {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return `${SITE_URL}/${locale}${normalizedPath}`;
}

/**
 * Check if a post has content in a specific locale
 * Used to determine if we should include the post in that locale's sitemap
 */
export function postHasLocaleContent(
  post: { content_en: string | null; content_zh: string | null },
  locale: Locale
): boolean {
  if (locale === 'zh') {
    return !!post.content_zh;
  }
  // English is always available if the post exists
  return !!post.content_en;
}
