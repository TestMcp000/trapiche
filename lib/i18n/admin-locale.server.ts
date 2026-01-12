/**
 * Admin Locale Server Helper
 *
 * Server-only module for reading admin locale from cookies/headers.
 * Following ARCHITECTURE.md §3.4 for IO separation.
 *
 * This helper reads the admin locale preference:
 * 1. First from cookie (set by client toggle)
 * 2. Fallback to Accept-Language header
 */

import 'server-only';

import { cookies, headers } from 'next/headers';
import {
  ADMIN_LOCALE_KEY,
  normalizeAdminLocale,
  inferLocaleFromAcceptLanguage,
} from './admin-locale';
import type { Locale } from './locales';

/**
 * Get admin locale from cookies or Accept-Language header.
 * Priority: cookie > Accept-Language > DEFAULT_LOCALE
 *
 * @returns Promise<Locale> - The admin locale preference
 */
export async function getAdminLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(ADMIN_LOCALE_KEY)?.value;

  if (cookieValue) {
    return normalizeAdminLocale(cookieValue);
  }

  // Fallback to Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language');
  return inferLocaleFromAcceptLanguage(acceptLang);
}

/**
 * Get messages for admin locale (for NextIntlClientProvider).
 * Loads the full messages file for the given locale.
 *
 * @param locale - Locale to load messages for
 * @returns Promise<Record<string, unknown>> - Messages object
 */
export async function getAdminMessages(locale: Locale): Promise<Record<string, unknown>> {
  // Dynamic import to load locale-specific messages
  const messages = (await import(`@/messages/${locale}.json`)).default;
  return messages;
}

