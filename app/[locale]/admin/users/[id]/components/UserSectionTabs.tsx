'use client';

/**
 * User Section Tabs Component
 *
 * Navigation tabs for profile/orders/comments/schedule sections.
 * Route-local presentational component.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 */

import { useTranslations } from 'next-intl';

export type UserSection = 'profile' | 'orders' | 'comments' | 'schedule';

interface UserSectionTabsProps {
  activeSection: UserSection;
  onSectionChange: (section: UserSection) => void;
  ordersCount: number;
  commentsCount: number;
}

export default function UserSectionTabs({
  activeSection,
  onSectionChange,
  ordersCount,
  commentsCount,
}: UserSectionTabsProps) {
  const t = useTranslations('admin.users.detail');
  const sections: UserSection[] = ['profile', 'orders', 'comments', 'schedule'];

  const labels: Record<UserSection, string> = {
    profile: t('profile'),
    orders: t('orders', { count: ordersCount }),
    comments: t('comments', { count: commentsCount }),
    schedule: t('schedule'),
  };

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <nav className="flex gap-6">
        {sections.map((section) => (
          <button
            key={section}
            type="button"
            onClick={() => onSectionChange(section)}
            className={`pb-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              activeSection === section
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            {labels[section]}
          </button>
        ))}
      </nav>
    </div>
  );
}

