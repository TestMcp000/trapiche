'use client';

/**
 * User Info Card Component
 *
 * Displays user_directory basic information (userId, email, dates).
 * Route-local presentational component.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 */

import { useTranslations } from 'next-intl';
import type { UserDirectorySummary } from '@/lib/types/user';

interface UserInfoCardProps {
  directory: UserDirectorySummary;
}

export default function UserInfoCard({ directory }: UserInfoCardProps) {
  const t = useTranslations('admin.users.detail');

  // Format dates with browser locale (use en-US for consistent formatting)
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
        {t('title')}
      </h1>

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('profile')}
          </dt>
          <dd className="mt-1 font-mono text-sm text-gray-900 dark:text-white">
            {directory.userId}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Email
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
            {directory.email || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('orderHistory').split(' ')[0]}
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
            {formatDate(directory.createdAt)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {t('updatedAt')}
          </dt>
          <dd className="mt-1 text-sm text-gray-900 dark:text-white">
            {formatDate(directory.updatedAt)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

