'use client';

/**
 * Users List Client Component
 *
 * Displays users table with filtering, search, and pagination.
 * All data fetching is done server-side; this component handles UI state only.
 * Uses admin i18n for UI text via NextIntlClientProvider.
 */

import Link from 'next/link';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { UserDirectorySummary } from '@/lib/types/user';
import type { TagSummary } from '@/lib/modules/user/user-tags-admin-io';
import { formatDateShortLocalized } from '@/lib/modules/user/user-helpers';

interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
}

interface UsersClientProps {
  initialUsers: UserDirectorySummary[];
  routeLocale: string;
  activeTag?: string;
  activeQuery?: string;
  availableTags?: TagSummary[];
  messages: AbstractIntlMessages;
  pagination: PaginationInfo;
}

/**
 * Build URL with preserved query params
 */
function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | undefined>
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

function UsersClientContent({
  initialUsers,
  routeLocale,
  activeTag,
  activeQuery,
  availableTags = [],
  pagination,
}: Omit<UsersClientProps, 'messages'>) {
  const t = useTranslations('admin.users');

  const baseUrl = `/${routeLocale}/admin/users`;
  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startItem = pagination.total > 0 ? pagination.page * pagination.pageSize - pagination.pageSize + 1 : 0;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.total);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('totalUsers', { count: pagination.total })}
        </p>
      </div>

      {/* Search Form */}
      <form method="GET" action={baseUrl} className="mb-4">
        {/* Preserve tag filter */}
        {activeTag && <input type="hidden" name="tag" value={activeTag} />}
        <div className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={activeQuery || ''}
            placeholder={t('searchPlaceholder')}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('search')}
          </button>
          {activeQuery && (
            <Link
              href={buildUrl(baseUrl, { tag: activeTag })}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('clear')}
            </Link>
          )}
        </div>
      </form>

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
                href={buildUrl(baseUrl, { tag, q: activeQuery })}
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
                href={buildUrl(baseUrl, { q: activeQuery })}
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
              href={buildUrl(baseUrl, { q: activeQuery })}
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
                      : activeQuery
                        ? t('noSearchResults', { query: activeQuery })
                        : t('noUsers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('pagination.showing', {
              from: startItem,
              to: endItem,
              total: pagination.total,
            })}
          </div>
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            {pagination.page > 1 ? (
              <Link
                href={buildUrl(baseUrl, {
                  tag: activeTag,
                  q: activeQuery,
                  page: pagination.page - 1,
                  pageSize: pagination.pageSize,
                })}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('pagination.prev')}
              </Link>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed">
                {t('pagination.prev')}
              </span>
            )}

            {/* Page Info */}
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {t('pagination.pageOf', { page: pagination.page, total: totalPages })}
            </span>

            {/* Next Button */}
            {pagination.page < totalPages ? (
              <Link
                href={buildUrl(baseUrl, {
                  tag: activeTag,
                  q: activeQuery,
                  page: pagination.page + 1,
                  pageSize: pagination.pageSize,
                })}
                className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {t('pagination.next')}
              </Link>
            ) : (
              <span className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed">
                {t('pagination.next')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Page Size Selector */}
      {pagination.total > 20 && (
        <div className="mt-2 flex justify-end">
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>{t('pagination.pageSize')}</span>
            {[20, 50, 100].map((size) => (
              <Link
                key={size}
                href={buildUrl(baseUrl, {
                  tag: activeTag,
                  q: activeQuery,
                  page: 1,
                  pageSize: size,
                })}
                className={`px-2 py-1 rounded ${
                  pagination.pageSize === size
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                } transition-colors`}
              >
                {size}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UsersClient({
  initialUsers,
  routeLocale,
  activeTag,
  activeQuery,
  availableTags = [],
  messages,
  pagination,
}: UsersClientProps) {
  return (
    <NextIntlClientProvider messages={messages}>
      <UsersClientContent
        initialUsers={initialUsers}
        routeLocale={routeLocale}
        activeTag={activeTag}
        activeQuery={activeQuery}
        availableTags={availableTags}
        pagination={pagination}
      />
    </NextIntlClientProvider>
  );
}
