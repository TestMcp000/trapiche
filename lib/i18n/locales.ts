/**
 * Locale Constants - Single Source of Truth
 *
 * This is the ONLY place where locale values should be defined.
 * All other modules should import from here.
 *
 * Pure module: No side effects, no imports from Next.js or Supabase.
 */

/**
 * All supported locales in the application.
 * Order matters: first locale is used as fallback in some contexts.
 */
export const LOCALES = ['en', 'zh'] as const;

/**
 * The default locale used when no locale is specified.
 */
export const DEFAULT_LOCALE = 'en' as const;

/**
 * Type representing a valid locale.
 */
export type Locale = (typeof LOCALES)[number];

/**
 * Type guard to check if a string is a valid locale.
 */
export function isValidLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}
