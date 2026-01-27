'use client';

/**
 * Nav Target Picker Component
 *
 * Modal for selecting navigation target types and their parameters.
 * Supports blog, gallery, events, page, anchor, and external targets.
 *
 * @module components/admin/settings/hamburger-nav-editor/NavTargetPicker
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { NavTarget, NavTargetType } from '@/lib/types/hamburger-nav';
import type { Category } from '@/lib/types/blog';
import type { GalleryCategory } from '@/lib/types/gallery';
import type { EventType } from '@/lib/types/events';

interface NavTargetPickerProps {
  currentTarget: NavTarget;
  onSelect: (target: NavTarget) => void;
  onClose: () => void;
  blogCategories: Category[];
  galleryCategories: GalleryCategory[];
  eventTypes: EventType[];
  staticPages: Array<{ path: string; label: string }>;
}

const TARGET_TYPES: NavTargetType[] = [
  'page',
  'blog_index',
  'blog_category',
  'gallery_index',
  'gallery_category',
  'events_index',
  'anchor',
  'external',
];

export default function NavTargetPicker({
  currentTarget,
  onSelect,
  onClose,
  blogCategories,
  galleryCategories,
  eventTypes,
  staticPages,
}: NavTargetPickerProps) {
  const t = useTranslations('admin.navigation');
  const [targetType, setTargetType] = useState<NavTargetType>(currentTarget.type);

  // Initialize target-specific state from current target
  const getInitialPagePath = () => (currentTarget.type === 'page' ? currentTarget.path : '');
  const getInitialPageHash = () => (currentTarget.type === 'page' ? currentTarget.hash || '' : '');
  const getInitialBlogCategory = () =>
    currentTarget.type === 'blog_category' ? currentTarget.categorySlug : '';
  const getInitialBlogQuery = () => {
    if (currentTarget.type === 'blog_index') return currentTarget.q || '';
    if (currentTarget.type === 'blog_category') return currentTarget.q || '';
    return '';
  };
  const getInitialGalleryCategory = () =>
    currentTarget.type === 'gallery_category' ? currentTarget.categorySlug : '';
  const getInitialGalleryQuery = () => {
    if (currentTarget.type === 'gallery_index') return currentTarget.q || '';
    if (currentTarget.type === 'gallery_category') return currentTarget.q || '';
    return '';
  };
  const getInitialEventTypeSlug = () =>
    currentTarget.type === 'events_index' ? currentTarget.eventType || '' : '';
  const getInitialAnchorHash = () => (currentTarget.type === 'anchor' ? currentTarget.hash : '');
  const getInitialExternalUrl = () => (currentTarget.type === 'external' ? currentTarget.url : '');

  const [pagePath, setPagePath] = useState(getInitialPagePath);
  const [pageHash, setPageHash] = useState(getInitialPageHash);
  const [blogCategory, setBlogCategory] = useState(getInitialBlogCategory);
  const [blogQuery, setBlogQuery] = useState(getInitialBlogQuery);
  const [galleryCategory, setGalleryCategory] = useState(getInitialGalleryCategory);
  const [galleryQuery, setGalleryQuery] = useState(getInitialGalleryQuery);
  const [eventTypeSlug, setEventTypeSlug] = useState(getInitialEventTypeSlug);
  const [anchorHash, setAnchorHash] = useState(getInitialAnchorHash);
  const [externalUrl, setExternalUrl] = useState(getInitialExternalUrl);

  const handleSave = () => {
    let target: NavTarget;

    switch (targetType) {
      case 'page':
        target = {
          type: 'page',
          path: pagePath || '/about',
          ...(pageHash ? { hash: pageHash } : {}),
        };
        break;
      case 'blog_index':
        target = {
          type: 'blog_index',
          ...(blogQuery ? { q: blogQuery } : {}),
        };
        break;
      case 'blog_category':
        target = {
          type: 'blog_category',
          categorySlug: blogCategory || blogCategories[0]?.slug || 'uncategorized',
          ...(blogQuery ? { q: blogQuery } : {}),
        };
        break;
      case 'gallery_index':
        target = {
          type: 'gallery_index',
          ...(galleryQuery ? { q: galleryQuery } : {}),
        };
        break;
      case 'gallery_category':
        target = {
          type: 'gallery_category',
          categorySlug: galleryCategory || galleryCategories[0]?.slug || 'default',
          ...(galleryQuery ? { q: galleryQuery } : {}),
        };
        break;
      case 'events_index':
        target = {
          type: 'events_index',
          ...(eventTypeSlug ? { eventTypeSlug } : {}),
        };
        break;
      case 'anchor':
        target = {
          type: 'anchor',
          hash: anchorHash || 'top',
        };
        break;
      case 'external':
        target = {
          type: 'external',
          url: externalUrl || 'https://example.com',
        };
        break;
      default:
        target = { type: 'page', path: '/about' };
    }

    onSelect(target);
  };

  const getTargetTypeLabel = (type: NavTargetType): string => {
    switch (type) {
      case 'page':
        return t('targetTypes.page');
      case 'blog_index':
        return t('targetTypes.blogIndex');
      case 'blog_category':
        return t('targetTypes.blogCategory');
      case 'gallery_index':
        return t('targetTypes.galleryIndex');
      case 'gallery_category':
        return t('targetTypes.galleryCategory');
      case 'anchor':
        return t('targetTypes.anchor');
      case 'external':
        return t('targetTypes.external');
      default:
        return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('selectTarget')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Target Type Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('targetType')}
            </label>
            <select
              value={targetType}
              onChange={(e) => setTargetType(e.target.value as NavTargetType)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            >
              {TARGET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {getTargetTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Target-specific fields */}
          {targetType === 'page' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('pagePath')}
                </label>
                <select
                  value={pagePath}
                  onChange={(e) => setPagePath(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {staticPages.map((page) => (
                    <option key={page.path} value={page.path}>
                      {page.label} ({page.path})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('pageHash')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={pageHash}
                  onChange={(e) => setPageHash(e.target.value)}
                  placeholder="faq"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {targetType === 'blog_index' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('searchQuery')} ({t('optional')})
              </label>
              <input
                type="text"
                value={blogQuery}
                onChange={(e) => setBlogQuery(e.target.value)}
                placeholder={t('searchQueryPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {targetType === 'blog_category' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('blogCategoryLabel')}
                </label>
                <select
                  value={blogCategory}
                  onChange={(e) => setBlogCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {blogCategories.length === 0 ? (
                    <option value="">{t('noBlogCategories')}</option>
                  ) : (
                    blogCategories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name_zh || cat.name_en || cat.slug}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('searchQuery')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={blogQuery}
                  onChange={(e) => setBlogQuery(e.target.value)}
                  placeholder={t('searchQueryPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {targetType === 'gallery_index' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('searchQuery')} ({t('optional')})
              </label>
              <input
                type="text"
                value={galleryQuery}
                onChange={(e) => setGalleryQuery(e.target.value)}
                placeholder={t('searchQueryPlaceholder')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {targetType === 'gallery_category' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('galleryCategoryLabel')}
                </label>
                <select
                  value={galleryCategory}
                  onChange={(e) => setGalleryCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  {galleryCategories.length === 0 ? (
                    <option value="">{t('noGalleryCategories')}</option>
                  ) : (
                    galleryCategories.map((cat) => (
                      <option key={cat.slug} value={cat.slug}>
                        {cat.name_zh || cat.name_en || cat.slug}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('searchQuery')} ({t('optional')})
                </label>
                <input
                  type="text"
                  value={galleryQuery}
                  onChange={(e) => setGalleryQuery(e.target.value)}
                  placeholder={t('searchQueryPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}

          {targetType === 'anchor' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('anchorId')}
              </label>
              <input
                type="text"
                value={anchorHash}
                onChange={(e) => setAnchorHash(e.target.value)}
                placeholder="section-id"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {targetType === 'external' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('externalUrl')}
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {t('externalUrlHint')}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            {t('confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
