/**
 * Analytics Page Views Dashboard (Admin-only, Server Component)
 *
 * Displays page view analytics with:
 * - Summary cards (total views, date range)
 * - Top pages table (paginated)
 * - Filter form (date range, locale)
 *
 * Server-first: No client component needed (uses <form method="GET">).
 *
 * @see lib/analytics/pageviews-admin-io.ts
 * @see lib/validators/page-views-admin.ts
 * @see doc/specs/completed/page-views-analytics-spec.md (dashboard contract)
 */
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { getAdminRole } from '@/lib/modules/auth';
import { getPageViewDashboardData } from '@/lib/analytics/pageviews-admin-io';
import { validatePageViewsAdminQuery } from '@/lib/validators/page-views-admin';

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    from?: string;
    to?: string;
    locale?: string;
    page?: string;
    pageSize?: string;
  }>;
}

export default async function PageViewsPage({ params, searchParams }: PageProps) {
  const { locale: routeLocale } = await params;
  const rawParams = await searchParams;
  const t = await getTranslations('admin');

  // Auth check
  const supabase = await createClient();
  const role = await getAdminRole(supabase);

  if (!role) {
    redirect(`/${routeLocale}`);
  }

  // Validate query parameters
  const validationResult = validatePageViewsAdminQuery(rawParams);
  const validatedParams = validationResult.data!;

  // Fetch dashboard data
  const dashboardData = await getPageViewDashboardData({
    from: validatedParams.from,
    to: validatedParams.to,
    locale: validatedParams.locale,
    limit: validatedParams.limit,
    offset: validatedParams.offset,
  });

  const { summary, topPages, totalPagesCount } = dashboardData;
  const totalPagesForPagination = Math.ceil(totalPagesCount / validatedParams.pageSize);

  // Build base URL for pagination links
  const baseUrl = `/${routeLocale}/admin/analytics/pageviews`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('analytics.pageviews.title')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('analytics.pageviews.description')}
        </p>
      </div>

      {/* Filter Form */}
      <form method="GET" className="flex flex-wrap gap-4 items-end p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex flex-col gap-1">
          <label htmlFor="from" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('analytics.pageviews.from')}
          </label>
          <input
            type="date"
            id="from"
            name="from"
            defaultValue={validatedParams.from}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="to" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('analytics.pageviews.to')}
          </label>
          <input
            type="date"
            id="to"
            name="to"
            defaultValue={validatedParams.to}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="locale" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('analytics.pageviews.locale')}
          </label>
          <select
            id="locale"
            name="locale"
            defaultValue={validatedParams.locale}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{t('analytics.pageviews.localeAll')}</option>
            <option value="zh">中文 (zh)</option>
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pageSize" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('analytics.pageviews.pageSize')}
          </label>
          <select
            id="pageSize"
            name="pageSize"
            defaultValue={validatedParams.pageSize.toString()}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          {t('analytics.pageviews.apply')}
        </button>
      </form>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('analytics.pageviews.totalViews')}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {summary.totalViews.toLocaleString()}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('analytics.pageviews.dateRange')}
          </p>
          <p className="text-lg font-medium text-gray-900 dark:text-white mt-1">
            {summary.dateRange.from} ~ {summary.dateRange.to}
          </p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {t('analytics.pageviews.uniquePages')}
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
            {totalPagesCount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('analytics.pageviews.topPages')}
          </h2>
        </div>

        {topPages.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {t('analytics.pageviews.noData')}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('analytics.pageviews.path')}
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('analytics.pageviews.views')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {topPages.map((page, index) => (
                  <tr key={page.path} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {validatedParams.offset + index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-mono">
                      {page.path}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white text-right font-medium">
                      {page.viewCount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPagesForPagination > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('analytics.pageviews.page')} {validatedParams.page} / {totalPagesForPagination}
            </p>
            <div className="flex gap-2">
              {validatedParams.page > 1 && (
                <Link
                  href={`${baseUrl}?from=${validatedParams.from}&to=${validatedParams.to}&locale=${validatedParams.locale}&pageSize=${validatedParams.pageSize}&page=${validatedParams.page - 1}`}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('analytics.pageviews.prev')}
                </Link>
              )}
              {validatedParams.page < totalPagesForPagination && (
                <Link
                  href={`${baseUrl}?from=${validatedParams.from}&to=${validatedParams.to}&locale=${validatedParams.locale}&pageSize=${validatedParams.pageSize}&page=${validatedParams.page + 1}`}
                  className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('analytics.pageviews.next')}
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
