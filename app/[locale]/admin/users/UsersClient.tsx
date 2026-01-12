'use client';

/**
 * Users List Client Component
 *
 * Displays users table with filtering and navigation.
 * All data fetching is done server-side; this component handles UI state only.
 * Uses admin i18n for UI text via NextIntlClientProvider.
 */

import Link from 'next/link';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { UserDirectorySummary } from '@/lib/types/user';
import type { TagSummary } from '@/lib/modules/user/user-tags-admin-io';
import { formatDateShortLocalized } from '@/lib/modules/user/user-helpers';

interface UsersClientProps {
  initialUsers: UserDirectorySummary[];
  routeLocale: string;
  activeTag?: string;
  availableTags?: TagSummary[];
  messages: AbstractIntlMessages;
}

function UsersClientContent({
  initialUsers,
  routeLocale,
  activeTag,
  availableTags = [],
}: Omit<UsersClientProps, 'messages'>) {
  const t = useTranslations('admin.users');

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('totalUsers', { count: initialUsers.length })}
        </p>
      </div>

      {/* Tag Filter Bar */}
      {availableTags.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400 mr-1">
              {t('filterByTag')}
            </span>
            {availableTags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={`/${routeLocale}/admin/users?tag=${encodeURIComponent(tag)}`}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  activeTag === tag
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {tag}
                <span className="text-xs opacity-70">({count})</span>
              </Link>
            ))}
            {activeTag && (
              <Link
                href={`/${routeLocale}/admin/users`}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 transition-colors"
              >
                {t('clearFilter')}
                <span className="ml-1">×</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Active Tag Filter Chip (when tags bar is empty but filter is active via URL) */}
      {activeTag && availableTags.length === 0 && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {t('filterByTag')}
          </span>
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {activeTag}
            <Link
              href={`/${routeLocale}/admin/users`}
              className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
              aria-label={t('clearFilter')}
            >
              ×
            </Link>
          </span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('shortId')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('userId')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('email')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('createdAt')}
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {initialUsers.length > 0 ? (
                initialUsers.map((user) => (
                  <tr
                    key={user.userId}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      {user.shortId ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {user.shortId}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm text-gray-900 dark:text-white">
                        {user.userId.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {user.email || t('none')}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDateShortLocalized(user.createdAt, routeLocale)}
                    </td>
                    <td className="px-4 py-4 text-right space-x-2">
                      {user.shortId && (
                        <Link
                          href={`/${routeLocale}/admin/ai-analysis?memberShortId=${user.shortId}`}
                          className="text-purple-600 hover:text-purple-800 text-sm font-medium"
                          title={t('aiAnalyzeTitle')}
                        >
                          {t('analyze')}
                        </Link>
                      )}
                      <Link
                        href={`/${routeLocale}/admin/users/${user.userId}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        {t('details')}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    {activeTag
                      ? t('noUsersWithTag', { tag: activeTag })
                      : t('noUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function UsersClient({
  initialUsers,
  routeLocale,
  activeTag,
  availableTags = [],
  messages,
}: UsersClientProps) {
  return (
    <NextIntlClientProvider messages={messages}>
      <UsersClientContent
        initialUsers={initialUsers}
        routeLocale={routeLocale}
        activeTag={activeTag}
        availableTags={availableTags}
      />
    </NextIntlClientProvider>
  );
}


