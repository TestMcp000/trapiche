/**
 * Blog Posts Admin Page (Server Component)
 *
 * Follows ARCHITECTURE.md principles:
 * - Server component for data fetching
 * - Located in (blog) route group for shared tabs layout
 * - Uses lib/blog/admin-io.ts for IO operations
 * - Uses admin i18n via getTranslations
 *
 * @see lib/blog/admin-io.ts - Data access layer
 */

import { getAllPosts, getCategories } from '@/lib/modules/blog/admin-io';
import { getAdminLocale } from '@/lib/i18n/admin-locale.server';
import { getTranslations, getMessages } from 'next-intl/server';
import type { AbstractIntlMessages } from 'next-intl';
import Link from 'next/link';
import { format } from 'date-fns';
import DeletePostButton from './components/DeletePostButton';
import AdminPostsFilter from '@/components/admin/posts/AdminPostsFilter';

export default async function PostsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ search?: string; category?: string; sort?: string }>;
}) {
  const { locale: routeLocale } = await params;
  const { search, category: categoryId, sort } = await searchParams;
  
  // Get admin UI locale
  const adminLocale = await getAdminLocale();
  
  // Get translations for admin blog namespace
  const t = await getTranslations({ locale: adminLocale, namespace: 'admin.blog' });
  
  // Get messages for client component
  const allMessages = await getMessages({ locale: adminLocale });
  const adminMessages = { admin: allMessages.admin } as AbstractIntlMessages;
  
  const [posts, categories] = await Promise.all([
    getAllPosts({ 
      search, 
      categoryId, 
      sort: sort as 'newest' | 'oldest' | 'title-asc' | 'title-desc' 
    }),
    getCategories(),
  ]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <Link
          href={`/${routeLocale}/admin/posts/new`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('newPost')}
        </Link>
      </div>
      
      {/* Filters */}
      <AdminPostsFilter routeLocale={routeLocale} categories={categories} messages={adminMessages} />
      
      {/* Results count */}
      {(search || categoryId) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {t('foundPosts', { count: posts.length })}
        </p>
      )}
      
      {/* Posts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {posts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('tableHeaders.title')}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('tableHeaders.status')}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('tableHeaders.category')}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('tableHeaders.date')}
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('tableHeaders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {posts.map((post) => (
                <tr key={post.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900 dark:text-white">
                      {post.title_en || post.title_zh || t('noTitle')}
                    </p>
                    {post.title_en && post.title_zh && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {post.title_zh}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${
                      post.visibility === 'public' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      post.visibility === 'draft' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                    }`}>
                      {t(`visibility.${post.visibility}`)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                    {post.category 
                      ? post.category.name_en
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(post.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      {post.visibility === 'public' && (
                        <Link
                          href={`/${routeLocale}/blog/${post.category?.slug || 'uncategorized'}/${post.slug}`}
                          target="_blank"
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title={t('actions.view')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      )}
                      <Link
                        href={`/${routeLocale}/admin/posts/${post.id}/edit`}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        title={t('actions.edit')}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </Link>
                      <DeletePostButton postId={post.id} routeLocale={routeLocale} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <svg className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('noPosts')}</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('noPostsDesc')}</p>
            <Link
              href={`/${routeLocale}/admin/posts/new`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {t('createFirst')}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

