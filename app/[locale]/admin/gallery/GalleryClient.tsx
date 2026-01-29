'use client';

/**
 * Gallery Admin Client Component
 *
 * Client-side UI for gallery items management.
 * Receives initial data from server component, uses server actions for mutations.
 * Uses admin i18n via useTranslations (wrapped in NextIntlClientProvider).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { generateSlug } from '@/lib/utils/slug';
import { getErrorLabel } from '@/lib/types/action-result';
import ImageUploader from '@/components/admin/common/ImageUploader';
import type { GalleryItem, GalleryCategory } from '@/lib/types/gallery';
import { saveGalleryItemAction, deleteGalleryItemAction } from './actions';

export interface GalleryItemWithCategory extends GalleryItem {
  category?: GalleryCategory;
}

interface GalleryClientProps {
  initialItems: GalleryItemWithCategory[];
  initialCategories: GalleryCategory[];
  routeLocale: string;
  messages: AbstractIntlMessages;
}

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function GalleryClient(props: GalleryClientProps) {
  return (
    <NextIntlClientProvider locale={props.routeLocale} messages={props.messages}>
      <GalleryClientContent {...props} />
    </NextIntlClientProvider>
  );
}

function GalleryClientContent({
  initialItems,
  initialCategories,
  routeLocale,
}: GalleryClientProps) {
  const t = useTranslations('admin.gallery');
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters (client-side)
  const [filterCategory, setFilterCategory] = useState('');
  const [filterVisible, setFilterVisible] = useState<'all' | 'visible' | 'hidden'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Form data
  const [formData, setFormData] = useState({
    category_id: '',
    title_zh: '',
    slug: '',
    description_zh: '',
    image_url: '',
    image_width: null as number | null,
    image_height: null as number | null,
    og_image_format: 'jpg' as 'jpg' | 'png',
    image_alt_zh: '',
    material_zh: '',
    tags_zh: '',
    is_visible: true,
  });

  // Filter items client-side
  const filteredItems = initialItems.filter((item) => {
    // Category filter
    if (filterCategory && item.category_id !== filterCategory) return false;

    // Visibility filter
    if (filterVisible === 'visible' && !item.is_visible) return false;
    if (filterVisible === 'hidden' && item.is_visible) return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const title = (item.title_zh || item.title_en).toLowerCase();
      if (!title.includes(q)) {
        return false;
      }
    }

    return true;
  });

  const handleTitleChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, title_zh: value };
      const shouldAutoSlug = !editingId && (!prev.slug || prev.slug === generateSlug(prev.title_zh));
      if (shouldAutoSlug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      category_id: initialCategories[0]?.id || '',
      title_zh: '',
      slug: '',
      description_zh: '',
      image_url: '',
      image_width: null,
      image_height: null,
      og_image_format: 'jpg',
      image_alt_zh: '',
      material_zh: '',
      tags_zh: '',
      is_visible: true,
    });
    setEditingId(null);
    setShowForm(false);
    setError(null);
  };

  const handleEdit = (item: GalleryItemWithCategory) => {
    setFormData({
      category_id: item.category_id,
      title_zh: item.title_zh || item.title_en,
      slug: item.slug,
      description_zh: item.description_zh || item.description_en || '',
      image_url: item.image_url,
      image_width: item.image_width ?? null,
      image_height: item.image_height ?? null,
      og_image_format: item.og_image_format,
      image_alt_zh: item.image_alt_zh || item.image_alt_en || '',
      material_zh: item.material_zh || item.material_en || '',
      tags_zh: (item.tags_zh.length ? item.tags_zh : item.tags_en).join(', '),
      is_visible: item.is_visible,
    });
    setEditingId(item.id);
    setShowForm(true);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (!formData.category_id) {
      setError(t('pleaseSelectCategory'));
      setSaving(false);
      return;
    }

    if (!formData.image_url) {
      setError(t('pleaseUploadImage'));
      setSaving(false);
      return;
    }

    const titleZh = formData.title_zh.trim();
    if (!titleZh) {
      setError(t('pleaseEnterTitle'));
      setSaving(false);
      return;
    }

    const tags = formData.tags_zh
      .replace(/，/g, ',')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean);

    const descriptionZh = formData.description_zh.trim();
    const imageAltZh = formData.image_alt_zh.trim();
    const materialZh = formData.material_zh.trim();

    const payload = {
      category_id: formData.category_id,
      // Single-language site: mirror zh to legacy en columns
      title_en: titleZh,
      title_zh: titleZh,
      slug: formData.slug.trim(),
      description_en: descriptionZh || undefined,
      description_zh: descriptionZh || undefined,
      image_url: formData.image_url,
      image_width: formData.image_width,
      image_height: formData.image_height,
      og_image_format: formData.og_image_format,
      image_alt_en: imageAltZh || null,
      image_alt_zh: imageAltZh || null,
      material_en: materialZh || null,
      material_zh: materialZh || null,
      tags_en: tags,
      tags_zh: tags,
      is_visible: formData.is_visible,
    };

    const result = await saveGalleryItemAction(editingId, payload, routeLocale);

    setSaving(false);

    if (!result.success) {
      setError(getErrorLabel(result.errorCode, routeLocale));
      return;
    }

    resetForm();
    router.refresh();
  };

  const handleDelete = async (item: GalleryItemWithCategory) => {
    if (
      !confirm(
        t('confirmDelete', { title: item.title_zh || item.title_en })
      )
    )
      return;

    const result = await deleteGalleryItemAction(item.id, routeLocale);

    if (!result.success) {
      setError(getErrorLabel(result.errorCode, routeLocale));
      return;
    }

    router.refresh();
  };

  const handleImageUpload = (url: string) => {
    setFormData((prev) => ({
      ...prev,
      image_url: url,
      image_width: null,
      image_height: null,
    }));
  };

  const handleImageUploadComplete = (result: { url: string; width: number; height: number }) => {
    setFormData((prev) => ({
      ...prev,
      image_url: result.url,
      image_width: result.width,
      image_height: result.height,
    }));
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
            setFormData((prev) => ({ ...prev, category_id: initialCategories[0]?.id || '' }));
            setShowForm(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('newItem')}
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">{t('allCategories')}</option>
            {initialCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_zh || cat.name_en}
              </option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterVisible}
            onChange={(e) => setFilterVisible(e.target.value as 'all' | 'visible' | 'hidden')}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">{t('allVisibility')}</option>
            <option value="visible">{t('visibleOnly')}</option>
            <option value="hidden">{t('hiddenOnly')}</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchByTitle')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 mt-1">
            {t('dismiss')}
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? t('editItem') : t('addItem')}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category & Visibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('category')} *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{t('selectCategory')}</option>
                  {initialCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_zh || cat.name_en}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('ogImageFormat')}
                </label>
                <select
                  value={formData.og_image_format}
                  onChange={(e) =>
                    setFormData({ ...formData, og_image_format: e.target.value as 'jpg' | 'png' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="jpg">{t('jpegDefault')}</option>
                  <option value="png">{t('pngTransparency')}</option>
                </select>
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

            {/* Titles */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('titleZh')} *
              </label>
              <input
                type="text"
                required
                value={formData.title_zh}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('titlePlaceholder')}
              />
            </div>

            {/* Slug */}
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
                placeholder={t('slugPlaceholder')}
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('image')} *
              </label>
              <ImageUploader
                value={formData.image_url}
                onChange={handleImageUpload}
                onUploadComplete={handleImageUploadComplete}
              />
            </div>

            {/* Image Alts */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('imageAltZh')}
              </label>
              <input
                type="text"
                value={formData.image_alt_zh}
                onChange={(e) => setFormData({ ...formData, image_alt_zh: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('imageAltPlaceholder')}
              />
            </div>

            {/* Descriptions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('descriptionZh')}
              </label>
              <textarea
                rows={3}
                value={formData.description_zh}
                onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {/* Materials */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('materialZh')}
              </label>
              <input
                type="text"
                value={formData.material_zh}
                onChange={(e) => setFormData({ ...formData, material_zh: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('materialPlaceholder')}
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('tagsZh')} <span className="text-gray-400 text-xs">{t('commaSeparated')}</span>
              </label>
              <input
                type="text"
                value={formData.tags_zh}
                onChange={(e) => setFormData({ ...formData, tags_zh: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder={t('tagsPlaceholder')}
              />
            </div>

            {/* Actions */}
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
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? t('saving') : editingId ? `${t('update')}${t('item')}` : `${t('add')}${t('item')}`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {filteredItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('image')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('titleZh')}
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('category')}
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('likes')}
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('visible')}
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      {item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.title_zh || item.title_en}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg"
                          unoptimized
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {item.title_zh || item.title_en}
                        </p>
                        <p className="text-xs text-gray-400 font-mono">{item.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                      {item.category?.name_zh || item.category?.name_en || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400">
                        ♥ {item.like_count}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.is_visible ? (
                        <span className="text-green-600 dark:text-green-400">✓</span>
                      ) : (
                        <span className="text-gray-400">✗</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => router.push(`/${routeLocale}/admin/gallery/${item.id}`)}
                          className="p-2 text-gray-500 hover:text-indigo-600 transition-colors"
                          title={t('hotspots')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 21s-6-4.35-6-10a6 6 0 0 1 12 0c0 5.65-6 10-6 10z"
                            />
                            <circle cx="12" cy="11" r="2.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title={t('edit')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          title={t('delete')}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          </div>
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{t('noItemsYet')}</h3>
            <p className="text-gray-500 dark:text-gray-400">{t('createFirst')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
