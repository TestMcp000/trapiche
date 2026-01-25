'use client';

/**
 * Gallery Item Detail Client Component
 *
 * Admin UI for viewing and editing a single gallery item.
 * Includes:
 * - Item info display
 * - Hotspots editor (pins on image + list)
 * - Hero selection toggle
 *
 * @see app/[locale]/admin/gallery/[id]/page.tsx - Server component
 */

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { GalleryItem, GalleryCategory, GalleryHotspot, GalleryHotspotInput } from '@/lib/types/gallery';
import {
  toNormalizedCoords,
  isDragMovement,
  DRAG_THRESHOLD_PX,
} from '@/lib/modules/gallery/hotspot-coordinates';
import {
  createHotspotAction,
  updateHotspotAction,
  deleteHotspotAction,
  reorderHotspotsAction,
  toggleHotspotVisibilityAction,
  setHeroAction,
  clearHeroAction,
} from '../actions';

// =============================================================================
// Types
// =============================================================================

interface GalleryItemWithCategory extends GalleryItem {
  category?: GalleryCategory;
}

interface Props {
  item: GalleryItemWithCategory;
  hotspots: GalleryHotspot[];
  maxHotspots: number;
  isCurrentHero: boolean;
  locale: string;
  messages: AbstractIntlMessages;
}

// =============================================================================
// Component
// =============================================================================

export default function GalleryItemDetailClient(props: Props) {
  return (
    <NextIntlClientProvider locale={props.locale} messages={props.messages}>
      <GalleryItemDetailContent {...props} />
    </NextIntlClientProvider>
  );
}

function GalleryItemDetailContent({
  item,
  hotspots: initialHotspots,
  maxHotspots,
  isCurrentHero: initialIsHero,
  locale,
}: Props) {
  const router = useRouter();
  const imageRef = useRef<HTMLDivElement>(null);

  // State
  const [hotspots, setHotspots] = useState<GalleryHotspot[]>(initialHotspots);
  const [isCurrentHero, setIsCurrentHero] = useState(initialIsHero);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state for add/edit hotspot
  const [showModal, setShowModal] = useState(false);
  const [editingHotspot, setEditingHotspot] = useState<GalleryHotspot | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ x: number; y: number } | null>(null);

  // Form state for hotspot
  const [formData, setFormData] = useState<GalleryHotspotInput>({
    x: 0,
    y: 0,
    media: '',
    description_md: '',
    preview: null,
    symbolism: null,
    read_more_url: null,
    is_visible: true,
  });

  // Drag state for reordering list
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Pin drag-to-move state
  const [draggingHotspotId, setDraggingHotspotId] = useState<string | null>(null);
  const [dragStartPos, setDragStartPos] = useState<{ clientX: number; clientY: number } | null>(null);
  const [dragPreviewCoords, setDragPreviewCoords] = useState<{ x: number; y: number } | null>(null);
  const [originalCoordsBeforeDrag, setOriginalCoordsBeforeDrag] = useState<{ x: number; y: number } | null>(null);

  // =============================================================================
  // Handlers
  // =============================================================================

  // Click on image to add a new hotspot
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageRef.current || hotspots.length >= maxHotspots) return;

    const rect = imageRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;

    // Clamp to valid range
    const clampedX = Math.max(0, Math.min(1, x));
    const clampedY = Math.max(0, Math.min(1, y));

    setPendingCoords({ x: clampedX, y: clampedY });
    setFormData({
      x: clampedX,
      y: clampedY,
      media: '',
      description_md: '',
      preview: null,
      symbolism: null,
      read_more_url: null,
      is_visible: true,
    });
    setEditingHotspot(null);
    setShowModal(true);
  }, [hotspots.length, maxHotspots]);

  // Open edit modal for a hotspot
  const openEditModal = useCallback((hotspot: GalleryHotspot) => {
    setEditingHotspot(hotspot);
    setFormData({
      x: hotspot.x,
      y: hotspot.y,
      media: hotspot.media,
      description_md: hotspot.description_md,
      preview: hotspot.preview,
      symbolism: hotspot.symbolism,
      read_more_url: hotspot.read_more_url,
      is_visible: hotspot.is_visible,
    });
    setPendingCoords(null);
    setShowModal(true);
  }, []);

  // Legacy click handler (used by list edit button)
  const handlePinClick = useCallback((hotspot: GalleryHotspot, e: React.MouseEvent) => {
    e.stopPropagation();
    openEditModal(hotspot);
  }, [openEditModal]);

  // =============================================================================
  // Pin Drag-to-Move Handlers (Pointer Events)
  // =============================================================================

  const handlePinPointerDown = useCallback((e: React.PointerEvent, hotspot: GalleryHotspot) => {
    e.stopPropagation();
    e.preventDefault();

    // Capture pointer for reliable drag tracking
    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    setDraggingHotspotId(hotspot.id);
    setDragStartPos({ clientX: e.clientX, clientY: e.clientY });
    setOriginalCoordsBeforeDrag({ x: hotspot.x, y: hotspot.y });
    setDragPreviewCoords(null);
  }, []);

  const handlePinPointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingHotspotId || !dragStartPos || !imageRef.current) return;

    // Check if movement exceeds threshold
    const hasMoved = isDragMovement(dragStartPos, { clientX: e.clientX, clientY: e.clientY }, DRAG_THRESHOLD_PX);

    if (!hasMoved) return;

    // Calculate new normalized coordinates
    const rect = imageRef.current.getBoundingClientRect();
    const newCoords = toNormalizedCoords({
      clientX: e.clientX,
      clientY: e.clientY,
      rect,
    });

    setDragPreviewCoords(newCoords);
  }, [draggingHotspotId, dragStartPos]);

  const handlePinPointerUp = useCallback(async (e: React.PointerEvent, hotspot: GalleryHotspot) => {
    if (!draggingHotspotId || !dragStartPos) {
      // No drag was initiated
      return;
    }

    // Release pointer capture
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);

    const wasDragging = isDragMovement(dragStartPos, { clientX: e.clientX, clientY: e.clientY }, DRAG_THRESHOLD_PX);

    // Reset drag state
    const originalCoords = originalCoordsBeforeDrag;
    const finalCoords = dragPreviewCoords;

    setDraggingHotspotId(null);
    setDragStartPos(null);
    setDragPreviewCoords(null);
    setOriginalCoordsBeforeDrag(null);

    if (!wasDragging) {
      // Movement was below threshold - treat as click (open edit modal)
      openEditModal(hotspot);
      return;
    }

    // It was a drag - update the position
    if (!finalCoords || !originalCoords) return;

    // Optimistically update UI
    setHotspots(prev =>
      prev.map(h =>
        h.id === hotspot.id ? { ...h, x: finalCoords.x, y: finalCoords.y } : h
      )
    );

    // Persist to server (only x/y, no sort_order change)
    setSaving(true);
    setError(null);

    try {
      const result = await updateHotspotAction(hotspot.id, { x: finalCoords.x, y: finalCoords.y }, locale);

      if ('error' in result) {
        // Rollback on error
        setError(result.error);
        setHotspots(prev =>
          prev.map(h =>
            h.id === hotspot.id ? { ...h, x: originalCoords.x, y: originalCoords.y } : h
          )
        );
      }
    } catch {
      // Rollback on error
      setError('更新標記位置失敗');
      setHotspots(prev =>
        prev.map(h =>
          h.id === hotspot.id ? { ...h, x: originalCoords.x, y: originalCoords.y } : h
        )
      );
    } finally {
      setSaving(false);
    }
  }, [draggingHotspotId, dragStartPos, dragPreviewCoords, originalCoordsBeforeDrag, openEditModal, locale]);

  const handlePinPointerCancel = useCallback((e: React.PointerEvent) => {
    // Release pointer and reset state without making changes
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDraggingHotspotId(null);
    setDragStartPos(null);
    setDragPreviewCoords(null);
    setOriginalCoordsBeforeDrag(null);
  }, []);

  // Save hotspot (create or update)
  const handleSaveHotspot = async () => {
    setSaving(true);
    setError(null);

    try {
      if (editingHotspot) {
        // Update existing
        const result = await updateHotspotAction(editingHotspot.id, formData, locale);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        // Update local state
        setHotspots(prev => prev.map(h => h.id === editingHotspot.id ? result.data : h));
      } else {
        // Create new
        const result = await createHotspotAction(item.id, formData, locale);
        if ('error' in result) {
          setError(result.error);
          return;
        }
        // Add to local state
        setHotspots(prev => [...prev, result.data]);
      }
      setShowModal(false);
      setEditingHotspot(null);
      setPendingCoords(null);
    } finally {
      setSaving(false);
    }
  };

  // Delete hotspot
  const handleDeleteHotspot = async (hotspotId: string) => {
    if (!confirm('確定要刪除此標記嗎？')) return;

    setSaving(true);
    setError(null);

    try {
      const result = await deleteHotspotAction(hotspotId, locale);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      // Remove from local state
      setHotspots(prev => prev.filter(h => h.id !== hotspotId));
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  // Toggle hotspot visibility
  const handleToggleVisibility = async (hotspot: GalleryHotspot) => {
    const result = await toggleHotspotVisibilityAction(hotspot.id, !hotspot.is_visible, locale);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    // Update local state
    setHotspots(prev => prev.map(h => h.id === hotspot.id ? { ...h, is_visible: !h.is_visible } : h));
  };

  // Reorder hotspots
  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const newHotspots = [...hotspots];
    const [dragged] = newHotspots.splice(dragIndex, 1);
    newHotspots.splice(index, 0, dragged);
    setHotspots(newHotspots);
    setDragIndex(index);
  };

  const handleDragEnd = async () => {
    if (dragIndex === null) return;
    setDragIndex(null);

    // Save new order
    const orderedIds = hotspots.map(h => h.id);
    const result = await reorderHotspotsAction(item.id, orderedIds, locale);
    if ('error' in result) {
      setError(result.error);
      router.refresh(); // Revert to server state on error
    }
  };

  // Hero selection
  const handleSetHero = async () => {
    if (!confirm('確定要將此作品設為首頁主視覺嗎？將會取代目前的主視覺。')) return;

    setSaving(true);
    setError(null);

    try {
      const result = await setHeroAction(item.id, locale);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setIsCurrentHero(true);
    } finally {
      setSaving(false);
    }
  };

  const handleClearHero = async () => {
    if (!confirm('確定要取消此作品的主視覺設定嗎？')) return;

    setSaving(true);
    setError(null);

    try {
      const result = await clearHeroAction(locale);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setIsCurrentHero(false);
    } finally {
      setSaving(false);
    }
  };

  // =============================================================================
  // Render
  // =============================================================================

  const title = item.title_zh || item.title_en;
  const canAddMore = hotspots.length < maxHotspots;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/${locale}/admin/gallery`}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            <p className="text-sm text-gray-500 font-mono">{item.slug}</p>
          </div>
        </div>

        {/* Hero Toggle */}
        <div className="flex items-center gap-2">
          {isCurrentHero ? (
            <>
              <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 rounded-full text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                目前主視覺
              </span>
              <button
                onClick={handleClearHero}
                disabled={saving}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                取消主視覺
              </button>
            </>
          ) : (
            <button
              onClick={handleSetHero}
              disabled={saving || !item.is_visible}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 text-sm"
              title={!item.is_visible ? '作品必須為顯示狀態才能設為主視覺' : undefined}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              設為首頁主視覺
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-xs text-red-500 hover:text-red-700 mt-1">
            關閉
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Image with Hotspots */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                圖上標記 ({hotspots.length}/{maxHotspots})
              </h2>
              {!canAddMore && (
                <span className="text-xs text-amber-600 dark:text-amber-400">已達上限</span>
              )}
            </div>

            {/* Image Container */}
            <div
              ref={imageRef}
              className={`relative rounded-lg overflow-hidden ${canAddMore ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
              onClick={handleImageClick}
            >
              <Image
                src={item.image_url}
                alt={title}
                width={item.image_width || 800}
                height={item.image_height || 600}
                className="w-full h-auto"
                unoptimized
              />

              {/* Pins Overlay */}
              {hotspots.map((hotspot, index) => {
                const isDragging = draggingHotspotId === hotspot.id;
                const displayX = isDragging && dragPreviewCoords ? dragPreviewCoords.x : hotspot.x;
                const displayY = isDragging && dragPreviewCoords ? dragPreviewCoords.y : hotspot.y;

                return (
                  <button
                    key={hotspot.id}
                    onPointerDown={(e) => handlePinPointerDown(e, hotspot)}
                    onPointerMove={handlePinPointerMove}
                    onPointerUp={(e) => handlePinPointerUp(e, hotspot)}
                    onPointerCancel={handlePinPointerCancel}
                    aria-label={`標記 ${index + 1}: ${hotspot.media}，拖曳調整位置或點擊編輯`}
                    className={`absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg transition-all touch-none select-none ${
                      isDragging
                        ? 'scale-125 opacity-80 shadow-2xl z-50 cursor-grabbing'
                        : 'hover:scale-110 cursor-grab'
                    } ${
                      hotspot.is_visible
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'bg-gray-400 hover:bg-gray-500'
                    }`}
                    style={{
                      left: `${displayX * 100}%`,
                      top: `${displayY * 100}%`,
                    }}
                    title="拖曳調整位置，點擊編輯"
                  >
                    {index + 1}
                  </button>
                );
              })}

              {/* Pending Pin */}
              {pendingCoords && (
                <div
                  className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-bold shadow-lg animate-pulse"
                  style={{
                    left: `${pendingCoords.x * 100}%`,
                    top: `${pendingCoords.y * 100}%`,
                  }}
                >
                  +
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-500 text-center">
              {canAddMore ? '點擊圖片新增標記，拖曳標記調整位置' : '已達標記數量上限，拖曳標記可調整位置'}
            </p>
          </div>
        </div>

        {/* Hotspots List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">標記清單</h2>

            {hotspots.length === 0 ? (
              <div className="text-center py-8">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-sm text-gray-500">尚未新增標記</p>
                <p className="text-xs text-gray-400 mt-1">點擊圖片新增標記</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {hotspots.map((hotspot, index) => (
                  <li
                    key={hotspot.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${
                      dragIndex === index
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-gray-50 dark:bg-gray-700/50 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                    } ${!hotspot.is_visible ? 'opacity-50' : ''}`}
                  >
                    {/* Drag Handle */}
                    <div className="cursor-grab text-gray-400">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                      </svg>
                    </div>

                    {/* Number */}
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                      hotspot.is_visible ? 'bg-blue-600' : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </span>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {hotspot.media}
                      </p>
                      {hotspot.preview && (
                        <p className="text-xs text-gray-500 truncate">{hotspot.preview}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleToggleVisibility(hotspot)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title={hotspot.is_visible ? '隱藏' : '顯示'}
                      >
                        {hotspot.is_visible ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={(e) => handlePinClick(hotspot, e)}
                        className="p-1 text-gray-400 hover:text-blue-600"
                        title="編輯"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteHotspot(hotspot.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="刪除"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <p className="mt-3 text-xs text-gray-400 text-center">拖曳排序清單</p>
          </div>
        </div>
      </div>

      {/* Add/Edit Hotspot Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {editingHotspot ? '編輯標記' : '新增標記'}
            </h3>

            <div className="space-y-4">
              {/* Media */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  媒材名稱 *
                </label>
                <input
                  type="text"
                  value={formData.media}
                  onChange={(e) => setFormData({ ...formData, media: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="油畫、壓克力、複合媒材..."
                />
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  一句話預覽
                </label>
                <input
                  type="text"
                  value={formData.preview || ''}
                  onChange={(e) => setFormData({ ...formData, preview: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="簡短預覽文字"
                />
              </div>

              {/* Symbolism */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  象徵意涵
                </label>
                <input
                  type="text"
                  value={formData.symbolism || ''}
                  onChange={(e) => setFormData({ ...formData, symbolism: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="作品的象徵意涵"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  詳細描述 (Markdown) *
                </label>
                <textarea
                  rows={4}
                  value={formData.description_md}
                  onChange={(e) => setFormData({ ...formData, description_md: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="詳細描述，支援 Markdown 語法..."
                />
              </div>

              {/* Read More URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  延伸閱讀連結
                </label>
                <input
                  type="url"
                  value={formData.read_more_url || ''}
                  onChange={(e) => setFormData({ ...formData, read_more_url: e.target.value || null })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://..."
                />
                <p className="text-xs text-gray-400 mt-1">僅支援 https:// 或 mailto: 協議</p>
              </div>

              {/* Is Visible */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_visible"
                  checked={formData.is_visible}
                  onChange={(e) => setFormData({ ...formData, is_visible: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_visible" className="text-sm text-gray-700 dark:text-gray-300">
                  顯示此標記
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between mt-6">
              <div>
                {editingHotspot && (
                  <button
                    onClick={() => handleDeleteHotspot(editingHotspot.id)}
                    disabled={saving}
                    className="px-4 py-2 text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    刪除
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowModal(false);
                    setEditingHotspot(null);
                    setPendingCoords(null);
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveHotspot}
                  disabled={saving || !formData.media.trim() || !formData.description_md.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
