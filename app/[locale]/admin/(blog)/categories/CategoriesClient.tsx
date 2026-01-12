'use client';

/**
 * Blog Categories Management Client Component
 *
 * Follows ARCHITECTURE.md Clean Code principles:
 * - Client component for interactive UI only
 * - Uses server actions for all write operations
 * - No direct Supabase queries in client
 * - Uses admin i18n via useTranslations (wrapped in NextIntlClientProvider)
 *
 * @see ./actions.ts - Server actions (route-local)
 * @see lib/blog/admin-io.ts - IO layer
 */

import { useState, useTransition } from 'react';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { generateSlug } from '@/lib/utils/slug';
import {
  createCategoryAction,
  deleteCategoryAction,
  fetchCategoriesAction,
} from './actions';
import { getErrorLabel } from '@/lib/types/action-result';
import type { CategoryWithCount } from '@/lib/types/blog';

// ============================================================================
// Types
// ============================================================================

interface CategoriesClientProps {
  initialCategories: CategoryWithCount[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

interface FormData {
  name_en: string;
  name_zh: string;
  slug: string;
}

// ============================================================================
// Component
// ============================================================================

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function CategoriesClient(props: CategoriesClientProps) {
  return (
    <NextIntlClientProvider messages={props.messages}>
      <CategoriesClientContent {...props} />
    </NextIntlClientProvider>
  );
}

function CategoriesClientContent({
  initialCategories,
  routeLocale,
}: CategoriesClientProps) {
  const t = useTranslations('admin.blog.categoriesPage');
  const [categories, setCategories] =
    useState<CategoryWithCount[]>(initialCategories);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    name_en: '',
    name_zh: '',
    slug: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Handle English name change with auto-slug
  const handleNameEnChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, name_en: value };
      // Auto-generate slug if not manually edited
      const shouldAutoSlug = !prev.slug || prev.slug === generateSlug(prev.name_en);
      if (shouldAutoSlug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  // Refresh categories from server
  const refreshCategories = async () => {
    const result = await fetchCategoriesAction();
    if (result.success && result.data) {
      setCategories(result.data);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createCategoryAction(formData, routeLocale);

      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }

      // Reset form and refresh
      setFormData({ name_en: '', name_zh: '', slug: '' });
      setShowForm(false);
      await refreshCategories();
    });
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm(t('deleteConfirm'))) return;

    startTransition(async () => {
      const result = await deleteCategoryAction(id, routeLocale);

      if (!result.success) {
        setError(getErrorLabel(result.errorCode, routeLocale));
        return;
      }

      await refreshCategories();
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('subtitle')}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          {t('newCategory')}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Add Category Form */}
      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('addCategory')}
          </h2>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('nameEn')}
              </label>
              <input
                type="text"
                required
                value={formData.name_en}
                onChange={(e) => handleNameEnChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Technology"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('nameZh')}
              </label>
              <input
                type="text"
                required
                value={formData.name_zh}
                onChange={(e) =>
                  setFormData({ ...formData, name_zh: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="科技"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('slug')}
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="technology"
                disabled={isPending}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                disabled={isPending}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isPending ? t('loading') : t('addCategory')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {categories.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Name (EN)
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  名稱 (中文)
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  Slug
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('posts')}
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {category.name_en}
                  </td>
                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                    {category.name_zh}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {category.post_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(category.id)}
                      disabled={isPending}
                      className="p-2 text-gray-500 hover:text-red-600 transition-colors disabled:opacity-50"
                      title={t('delete')}
                    >
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center">
            <svg
              className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {t('noCategories')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('noCategoriesDesc')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
