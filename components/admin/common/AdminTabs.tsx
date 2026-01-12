'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { Locale } from '@/lib/i18n/locales';

interface TabItem {
  href: string;
  /** Translation key under admin namespace (e.g., 'shop.tabs.dashboard') */
  labelKey?: string;
  /** @deprecated Use labelKey instead */
  labelEn?: string;
  /** @deprecated Use labelKey instead */
  labelZh?: string;
}

interface AdminTabsProps {
  /** Route locale for href construction */
  locale: string;
  /** Admin UI locale for label display (optional, defaults to route locale) */
  adminLocale?: Locale;
  items: TabItem[];
}

/**
 * Reusable admin module tabs component.
 * Renders a horizontal tab bar with active state detection.
 *
 * Supports i18n via labelKey (preferred) or legacy labelEn/labelZh.
 */
export default function AdminTabs({ locale, adminLocale, items }: AdminTabsProps) {
  const pathname = usePathname();
  const t = useTranslations('admin');
  
  // Use adminLocale for labels if provided, otherwise fall back to route locale
  const displayLocale = adminLocale ?? locale;

  const isActive = (href: string): boolean => {
    const fullHref = `/${locale}${href}`;
    return pathname === fullHref || pathname.startsWith(fullHref + '/');
  };

  const getLabel = (item: TabItem): string => {
    if (item.labelKey) {
      return t(item.labelKey);
    }
    // Fallback to legacy labelEn/labelZh for backward compatibility
    return displayLocale === 'zh' ? (item.labelZh ?? '') : (item.labelEn ?? '');
  };

  return (
    <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
      <nav className="flex gap-6" aria-label="Module tabs">
        {items.map((item) => {
          const active = isActive(item.href);
          const label = getLabel(item);
          
          return (
            <Link
              key={item.href}
              href={`/${locale}${item.href}`}
              prefetch={false}
              className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                active
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
