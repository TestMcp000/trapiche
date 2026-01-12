'use client';

/**
 * useAdminLocale Hook
 *
 * Client hook for managing admin locale preference.
 * Syncs preference to localStorage and cookie, then triggers router.refresh()
 * to re-render server components with the new locale.
 *
 * Following ARCHITECTURE.md §3.3 for hooks placement.
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_LOCALE_KEY, ADMIN_LOCALE_MAX_AGE } from '@/lib/i18n/admin-locale';
import type { Locale } from '@/lib/i18n/locales';

interface UseAdminLocaleReturn {
  /** Current admin locale */
  adminLocale: Locale;
  /** Toggle between 'en' and 'zh' */
  toggleLocale: () => void;
  /** Set a specific locale */
  setLocale: (locale: Locale) => void;
}

/**
 * Hook for managing admin locale preference.
 *
 * @param initialLocale - Initial admin locale from server
 * @returns Object with adminLocale state and toggle/set functions
 */
export function useAdminLocale(initialLocale: Locale): UseAdminLocaleReturn {
  const router = useRouter();
  const [adminLocale, setAdminLocaleState] = useState<Locale>(initialLocale);

  const persistLocale = useCallback(
    (newLocale: Locale) => {
      // Save to localStorage
      try {
        localStorage.setItem(ADMIN_LOCALE_KEY, newLocale);
      } catch {
        // localStorage might be unavailable in some contexts
      }

      // Save to cookie (for SSR fallback)
      document.cookie = `${ADMIN_LOCALE_KEY}=${newLocale}; path=/; max-age=${ADMIN_LOCALE_MAX_AGE}; SameSite=Lax`;

      // Update local state
      setAdminLocaleState(newLocale);

      // Trigger server component refresh
      router.refresh();
    },
    [router]
  );

  const toggleLocale = useCallback(() => {
    const newLocale: Locale = adminLocale === 'zh' ? 'en' : 'zh';
    persistLocale(newLocale);
  }, [adminLocale, persistLocale]);

  const setLocale = useCallback(
    (locale: Locale) => {
      if (locale !== adminLocale) {
        persistLocale(locale);
      }
    },
    [adminLocale, persistLocale]
  );

  return { adminLocale, toggleLocale, setLocale };
}
