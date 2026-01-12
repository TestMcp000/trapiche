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
    <NextIntlClientProvider messages={props.messages}>
      <GalleryClientContent {...props} />
    </NextIntlClientProvider>
  );
}

function GalleryClientContent({
  initialItems,
  initialCategories,
  routeLocale,
}: GalleryClientProps) {
  const router = useRouter();
  const t = useTranslations('admin.gallery');
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
    title_en: '',
    title_zh: '',
    slug: '',
    description_en: '',
    description_zh: '',
    image_url: '',
    image_width: null as number | null,
    image_height: null as number | null,
    og_image_format: 'jpg' as 'jpg' | 'png',
    image_alt_en: '',
    image_alt_zh: '',
    material_en: '',
    material_zh: '',
    tags_en: '',
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
      if (
        !item.title_en.toLowerCase().includes(q) &&
        !item.title_zh.toLowerCase().includes(q)
      ) {
        return false;
      }
    }

    return true;
  });

  const handleTitleEnChange = (value: string) => {
    setFormData((prev) => {
      const next = { ...prev, title_en: value };
      const shouldAutoSlug = !editingId && (!prev.slug || prev.slug === generateSlug(prev.title_en));
      if (shouldAutoSlug) {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const resetForm = () => {
    setFormData({
      category_id: initialCategories[0]?.id || '',
      title_en: '',
      title_zh: '',
      slug: '',
      description_en: '',
      description_zh: '',
      image_url: '',
      image_width: null,
      image_height: null,
      og_image_format: 'jpg',
      image_alt_en: '',
      image_alt_zh: '',
      material_en: '',
      material_zh: '',
      tags_en: '',
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
      title_en: item.title_en,
      title_zh: item.title_zh,
      slug: item.slug,
      description_en: item.description_en || '',
      description_zh: item.description_zh || '',
      image_url: item.image_url,
      image_width: item.image_width ?? null,
      image_height: item.image_height ?? null,
      og_image_format: item.og_image_format,
      image_alt_en: item.image_alt_en || '',
      image_alt_zh: item.image_alt_zh || '',
      material_en: item.material_en || '',
      material_zh: item.material_zh || '',
      tags_en: item.tags_en.join(', '),
      tags_zh: item.tags_zh.join(', '),
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
      setError('Please select a category');
      setSaving(false);
      return;
    }

    if (!formData.image_url) {
      setError('Please upload an image');
      setSaving(false);
      return;
    }

    const payload = {
      category_id: formData.category_id,
      title_en: formData.title_en.trim(),
      title_zh: formData.title_zh.trim(),
      slug: formData.slug.trim(),
      description_en: formData.description_en.trim() || undefined,
      description_zh: formData.description_zh.trim() || undefined,
      image_url: formData.image_url,
      image_width: formData.image_width,
      image_height: formData.image_height,
      og_image_format: formData.og_image_format,
      image_alt_en: formData.image_alt_en.trim() || null,
      image_alt_zh: formData.image_alt_zh.trim() || null,
      material_en: formData.material_en.trim() || null,
      material_zh: formData.material_zh.trim() || null,
      tags_en: formData.tags_en.split(',').map((t) => t.trim()).filter(Boolean),
      tags_zh: formData.tags_zh.split(',').map((t) => t.trim()).filter(Boolean),
      is_visible: formData.is_visible,
    };

    const result = await saveGalleryItemAction(editingId, payload, routeLocale);

    setSaving(false);

    if (!result.success) {
      setError(result.error || 'Failed to save');
      return;
    }

    resetForm();
    router.refresh();
  };

  const handleDelete = async (item: GalleryItemWithCategory) => {
    if (
      !confirm(
        `Are you sure you want to delete "${item.title_en}"? This will also remove associated likes and comments.`
      )
    )
      return;

    const result = await deleteGalleryItemAction(item.id, routeLocale);

    if (!result.success) {
      setError(result.error || 'Failed to delete');
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Gallery Items</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage gallery artworks</p>
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
          New Item
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
            <option value="">All Categories</option>
            {initialCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name_en}
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
            <option value="all">All Visibility</option>
            <option value="visible">Visible Only</option>
            <option value="hidden">Hidden Only</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 mt-1">
            Dismiss
          </button>
        </div>
      )}

      {showForm && (
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingId ? 'Edit Item' : 'Add Item'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Category & Visibility */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.category_id}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select Category</option>
                  {initialCategories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_en} / {cat.name_zh}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OG Image Format
                </label>
                <select
                  value={formData.og_image_format}
                  onChange={(e) =>
                    setFormData({ ...formData, og_image_format: e.target.value as 'jpg' | 'png' })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="jpg">JPEG (default)</option>
                  <option value="png">PNG (for transparency)</option>
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
                  <span className="text-sm text-gray-700 dark:text-gray-300">Visible</span>
                </label>
              </div>
            </div>

            {/* Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title (English) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title_en}
                  onChange={(e) => handleTitleEnChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="My Artwork"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Title (Chinese) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title_zh}
                  onChange={(e) => setFormData({ ...formData, title_zh: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="我的作品"
                />
              </div>
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Slug *
              </label>
              <input
                type="text"
                required
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                placeholder="my-artwork"
              />
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Image *
              </label>
              <ImageUploader
                value={formData.image_url}
                onChange={handleImageUpload}
                onUploadComplete={handleImageUploadComplete}
                locale="en"
              />
            </div>

            {/* Image Alts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image Alt (English)
                </label>
                <input
                  type="text"
                  value={formData.image_alt_en}
                  onChange={(e) => setFormData({ ...formData, image_alt_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Description for accessibility"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Image Alt (Chinese)
                </label>
                <input
                  type="text"
                  value={formData.image_alt_zh}
                  onChange={(e) => setFormData({ ...formData, image_alt_zh: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="無障礙描述"
                />
              </div>
            </div>

            {/* Descriptions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (English)
                </label>
                <textarea
                  rows={3}
                  value={formData.description_en}
                  onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Describe the artwork..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Chinese)
                </label>
                <textarea
                  rows={3}
                  value={formData.description_zh}
                  onChange={(e) => setFormData({ ...formData, description_zh: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="描述作品..."
                />
              </div>
            </div>

            {/* Materials */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material (English)
                </label>
                <input
                  type="text"
                  value={formData.material_en}
                  onChange={(e) => setFormData({ ...formData, material_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Oil on canvas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material (Chinese)
                </label>
                <input
                  type="text"
                  value={formData.material_zh}
                  onChange={(e) => setFormData({ ...formData, material_zh: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="油畫布"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (English) <span className="text-gray-400 text-xs">comma-separated</span>
                </label>
                <input
                  type="text"
                  value={formData.tags_en}
                  onChange={(e) => setFormData({ ...formData, tags_en: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="abstract, modern, colorful"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tags (Chinese) <span className="text-gray-400 text-xs">comma-separated</span>
                </label>
                <input
                  type="text"
                  value={formData.tags_zh}
                  onChange={(e) => setFormData({ ...formData, tags_zh: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="抽象, 現代, 彩色"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? '...' : editingId ? 'Update' : 'Add'} Item
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
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Image</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Title</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Likes</th>
                  <th className="text-center px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Visible</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-500 dark:text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      {item.image_url && (
                        <Image
                          src={item.image_url}
                          alt={item.title_en}
                          width={64}
                          height={64}
                          className="w-16 h-16 object-cover rounded-lg"
                          unoptimized
                        />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.title_en}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.title_zh}</p>
                        <p className="text-xs text-gray-400 font-mono">{item.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{item.category?.name_en || '-'}</td>
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
                          onClick={() => handleEdit(item)}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title="Edit"
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
                          title="Delete"
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
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No items yet</h3>
            <p className="text-gray-500 dark:text-gray-400">Create your first gallery item.</p>
          </div>
        )}
      </div>
    </div>
  );
}
