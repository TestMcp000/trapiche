'use client';

/**
 * Gallery Featured Pins Client Component
 * 
 * Handles the interactive UI for managing featured pins.
 * Uses server actions for all mutations.
 */

import { useState, useEffect, type DragEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useDebounce } from '@/hooks/useDebounce';
import { getErrorLabel } from '@/lib/types/action-result';
import {
  loadFeaturedPins,
  addFeaturedPin,
  removeFeaturedPin,
  saveFeaturedPinOrder,
  searchGalleryItems,
  type PinWithItem,
  type GalleryItemWithCategory,
} from './actions';
import type { GalleryPinSurface } from '@/lib/types/gallery';

interface GalleryFeaturedClientProps {
  initialPins: {
    home: PinWithItem[];
    gallery: PinWithItem[];
  };
  limits: {
    home: number;
    gallery: number;
  };
  locale: string;
}

export default function GalleryFeaturedClient({
  initialPins,
  limits,
  locale,
}: GalleryFeaturedClientProps) {
  const t = useTranslations('admin.gallery.featured');
  const [activeTab, setActiveTab] = useState<GalleryPinSurface>('home');
  const [pinsByTab, setPinsByTab] = useState<Record<GalleryPinSurface, PinWithItem[]>>({
    home: initialPins.home,
    gallery: initialPins.gallery,
    hero: [], // Hero is managed per-item, not shown here
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GalleryItemWithCategory[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  // Current pins for active tab
  const pins = pinsByTab[activeTab];
  const currentLimit = activeTab === 'home' ? limits.home : limits.gallery;
  const surfaceLabel = activeTab === 'home' ? t('surfaces.home') : t('surfaces.gallery');

  // Refetch pins for active tab
  const refetchPins = async () => {
    setLoading(true);
    try {
      const data = await loadFeaturedPins(activeTab);
      setPinsByTab(prev => ({ ...prev, [activeTab]: data }));
    } catch (err) {
      console.error('Error fetching pins:', err);
    }
    setLoading(false);
  };

  // Search items when debounced query changes
  useEffect(() => {
    const doSearch = async () => {
      if (!debouncedSearchQuery.trim()) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const pinnedIds = pins.map(p => p.item_id);
        const results = await searchGalleryItems(debouncedSearchQuery, pinnedIds);
        setSearchResults(results);
      } catch (err) {
        console.error('Error searching items:', err);
      }
      setSearching(false);
    };

    doSearch();
  }, [debouncedSearchQuery, pins]);

  const reorderPins = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    setPinsByTab(prev => {
      const currentPins = prev[activeTab];
      if (from >= currentPins.length || to >= currentPins.length) return prev;
      const next = [...currentPins];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return { ...prev, [activeTab]: next };
    });
  };

  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDragFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (Number.isNaN(from)) return;
    reorderPins(from, index);
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
  };

  const handleAddPin = async (item: GalleryItemWithCategory) => {
    if (pins.length >= currentLimit) {
      setError(t('errors.limitReached', { surface: surfaceLabel, limit: currentLimit }));
      return;
    }

    const result = await addFeaturedPin(activeTab, item.id, locale);
    
    if (!result.success) {
      setError(getErrorLabel(result.errorCode, locale));
      return;
    }

    setSearchQuery('');
    setSearchResults([]);
    await refetchPins();
    setSuccess(t('toast.added'));
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleRemovePin = async (pinId: string) => {
    const result = await removeFeaturedPin(pinId, locale);
    
    if (!result.success) {
      setError(getErrorLabel(result.errorCode, locale));
      return;
    }

    await refetchPins();
    setSuccess(t('toast.removed'));
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    reorderPins(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === pins.length - 1) return;
    reorderPins(index, index + 1);
  };

  const handleSaveOrder = async () => {
    if (pins.length > currentLimit) {
      setError(t('errors.cannotSaveOverLimit', { count: pins.length, limit: currentLimit }));
      return;
    }

    setSaving(true);
    setError(null);

    const orderedPinIds = pins.map(pin => pin.id);
    const result = await saveFeaturedPinOrder(activeTab, orderedPinIds, locale);

    if (!result.success) {
      setError(getErrorLabel(result.errorCode, locale));
      setSaving(false);
      return;
    }

    setSaving(false);
    setSuccess(t('toast.savedOrder'));
    setTimeout(() => setSuccess(null), 2000);
    await refetchPins();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          {t('description')}
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('home')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'home'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('tabs.home', { count: pinsByTab.home.length, limit: limits.home })}
        </button>
        <button
          onClick={() => setActiveTab('gallery')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'gallery'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          {t('tabs.gallery', { count: pinsByTab.gallery.length, limit: limits.gallery })}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 mt-1">
            {t('close')}
          </button>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search and Add */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('search.title')}
          </h2>

          <div className="mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search.placeholder')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {searching ? (
              <p className="text-gray-500 text-center py-4">{t('search.searching')}</p>
            ) : searchResults.length > 0 ? (
              searchResults.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {item.image_url && (
                    <Image
                      src={item.image_url}
                      alt={item.title_zh || item.title_en}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded"
                      unoptimized
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {item.title_zh || item.title_en}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.category?.name_zh || item.category?.name_en || '-'}
                    </p>
                  </div>
                  <button
                    onClick={() => handleAddPin(item)}
                    disabled={pins.length >= currentLimit}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('search.add')}
                  </button>
                </div>
              ))
            ) : debouncedSearchQuery.trim() ? (
              <p className="text-gray-500 text-center py-4">{t('search.noResults')}</p>
            ) : (
              <p className="text-gray-500 text-center py-4">{t('search.hint')}</p>
            )}
          </div>
        </div>

        {/* Right: Current Pins */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('current.title', { count: pins.length, limit: currentLimit })}
            </h2>
            <button
              onClick={handleSaveOrder}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving ? t('current.saving') : t('current.saveOrder')}
            </button>
          </div>

          {loading ? (
            <p className="text-gray-500 text-center py-8">{t('loading')}</p>
          ) : pins.length > 0 ? (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {pins.map((pin, index) => (
                <div
                  key={pin.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  className={`flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg ${
                    dragOverIndex === index && dragFromIndex !== null && dragFromIndex !== index
                      ? 'ring-2 ring-blue-400'
                      : ''
                  } ${dragFromIndex === index ? 'opacity-60' : ''}`}
                >
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragEnd={handleDragEnd}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    title={t('current.dragReorder')}
                    aria-label={t('current.dragReorder')}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={t('current.moveUp')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === pins.length - 1}
                      className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                      title={t('current.moveDown')}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  <span className="text-sm text-gray-400 w-6">{index + 1}</span>

                  {pin.item.image_url && (
                    <Image
                      src={pin.item.image_url}
                      alt={pin.item.title_zh || pin.item.title_en}
                      width={48}
                      height={48}
                      className="w-12 h-12 object-cover rounded"
                      unoptimized
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {pin.item.title_zh || pin.item.title_en}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {pin.item.category?.name_zh || pin.item.category?.name_en || '-'}
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemovePin(pin.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title={t('current.remove')}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p className="text-gray-500 dark:text-gray-400">{t('empty.title')}</p>
              <p className="text-sm text-gray-400">{t('empty.hint')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
