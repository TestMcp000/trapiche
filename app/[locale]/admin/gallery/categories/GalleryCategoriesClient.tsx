'use client';

/**
 * Gallery Categories Client Component
 *
 * Handles the interactive UI for managing gallery categories.
 * Uses server actions for all mutations.
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { generateSlug } from '@/lib/utils/slug';
import { getErrorLabel } from '@/lib/types/action-result';
import {
  loadGalleryCategories,
  createGalleryCategory,
  updateGalleryCategory,
  deleteGalleryCategory,
  toggleGalleryCategoryShowInNav,
  type CategoryWithCount,
  type CategoryPayload,
} from './actions';

interface GalleryCategoriesClientProps {
  initialCategories: CategoryWithCount[];
  locale: string;
}

export default function GalleryCategoriesClient({
  initialCategories,
  locale,
}: GalleryCategoriesClientProps) {
  const t = useTranslations('admin.gallery.categories');
  const [categories, setCategories] = useState<CategoryWithCount[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryPayload>({
    name_zh: '',
    slug: '',
    sort_order: 0,
    is_visible: true,
  });
  const [error, setError] = useState<string | null>(null);

  const refetchCategories = async () => {
    setLoading(true);
    try {
      const data = await loadGalleryCategories();
      setCategories(data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
    setLoading(false);
  };

  const handleNameChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, name_zh: value };
      const shouldAutoSlug = !editingId && (!prev.slug || prev.slug === generateSlug(prev.name_zh));
      if (shouldAutoSlug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      name_zh: '',
      slug: '',
      sort_order: 0,
      is_visible: true,
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (category: CategoryWithCount) => {
    setFormData({
      name_zh: category.name_zh || category.name_en,
      slug: category.slug,
      sort_order: category.sort_order,
      is_visible: category.is_visible,
    });
    setEditingId(category.id);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: CategoryPayload = {
      name_zh: formData.name_zh.trim(),
      slug: formData.slug.trim(),
      sort_order: formData.sort_order,
      is_visible: formData.is_visible,
    };

    let result;
    if (editingId) {
      result = await updateGalleryCategory(editingId, payload, locale);
    } else {
      result = await createGalleryCategory(payload, locale);
    }

    if (!result.success) {
      setError(getErrorLabel(result.errorCode, locale));
      return;
    }

    resetForm();
    await refetchCategories();
  };

  const handleDelete = async (category: CategoryWithCount) => {
    if (category.item_count > 0) {
      setError(
        t('cannotDeleteHasItems', {
          name: category.name_zh || category.name_en,
          count: category.item_count,
        })
      );
      return;
    }

    if (!confirm(t('confirmDelete', { name: category.name_zh || category.name_en }))) return;

    const result = await deleteGalleryCategory(category.id, locale);

    if (!result.success) {
      setError(getErrorLabel(result.errorCode, locale));
      return;
    }

    await refetchCategories();
  };

  const handleToggleShowInNav = async (category: CategoryWithCount) => {
    setLoading(true);
    setError(null);

    try {
      const result = await toggleGalleryCategoryShowInNav(
        category.id,
        !category.show_in_nav,
        locale,
      );

      if (!result.success) {
        setError(getErrorLabel(result.errorCode, locale));
        return;
      }

      setCategories((prev) =>
        prev.map((c) =>
          c.id === category.id
            ? { ...c, show_in_nav: !category.show_in_nav }
            : c,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('description')}</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('addCategory')}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-red-500 hover:text-red-700 mt-1"
          >
            {t('close')}
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? t('editCategory') : t('addCategory')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('name')} *
              </label>
              <input
                type="text"
                required
                value={formData.name_zh}
                onChange={(e) => handleNameChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="繪畫"
              />
            </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('slug')} *
                  </label>
                <input
                  type="text"
                  required
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="paintings"
                />
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('sortOrder')}
                  </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_visible}
                    onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{t('visible')}</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingId ? t('updateCategory') : t('createCategory')}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : categories.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('sortOrder')}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('name')}
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('slug')}
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('items')}
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('visible')}
                </th>
                <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('showInNav')}
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
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                    {category.sort_order}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                    {category.name_zh || category.name_en}
                  </td>
                  <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono text-sm">
                    {category.slug}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                      {category.item_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {category.is_visible ? (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ) : (
                      <span className="text-gray-400">✗</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleShowInNav(category)}
                      disabled={loading}
                      className={`px-2 py-1 text-xs rounded-full ${
                        category.show_in_nav
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                      title={t('showInNav')}
                    >
                      {category.show_in_nav ? t('inNav') : t('notInNav')}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                        title={t('edit')}
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
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(category)}
                        className="p-2 text-gray-500 hover:text-red-600 transition-colors"
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
                    </div>
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
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
              {t('emptyTitle')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              {t('emptyDescription')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
