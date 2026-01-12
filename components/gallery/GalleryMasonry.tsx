'use client';

/**
 * GalleryMasonry Component
 * 
 * Pinterest-style masonry grid with infinite scroll, filtering, and sorting.
 * Uses CSS columns for the masonry layout and IntersectionObserver for infinite scroll.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import GalleryCard from './GalleryCard';
import type { GalleryItem, GalleryCategory, GalleryPin, GalleryListSort } from '@/lib/types/gallery';

interface GalleryMasonryProps {
  initialItems: (GalleryItem & { category?: GalleryCategory; likedByMe?: boolean })[];
  initialTotal: number;
  initialQuery: {
    category?: string;
    q?: string;
    tag?: string;
    sort?: GalleryListSort;
  };
  categories: GalleryCategory[];
  pins: GalleryPin[];
  locale: string;
}

export default function GalleryMasonry({
  initialItems,
  initialTotal,
  initialQuery,
  categories,
  pins,
  locale,
}: GalleryMasonryProps) {
  // State
  const [items, setItems] = useState(initialItems);
  const [_total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialItems.length < initialTotal);
  const [offset, setOffset] = useState(initialItems.length);
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState(initialQuery.q || '');
  const [selectedCategory, setSelectedCategory] = useState(initialQuery.category || '');
  const [selectedTag, setSelectedTag] = useState(initialQuery.tag || '');
  const [selectedSort, setSelectedSort] = useState<GalleryListSort>(initialQuery.sort || 'newest');
  
  // Ref for infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null);
  
  // Fetch more items
  const fetchItems = useCallback(async (
    newOffset: number, 
    reset: boolean = false,
    overrideFilters?: Partial<{
      category: string;
      q: string;
      tag: string;
      sort: GalleryListSort;
    }>
  ) => {
    if (isLoading) return;
    
    setIsLoading(true);
    
    try {
      const category = overrideFilters?.category ?? selectedCategory;
      const q = overrideFilters?.q ?? searchQuery;
      const tag = overrideFilters?.tag ?? selectedTag;
      const sort = overrideFilters?.sort ?? selectedSort;

      const queryParams = new URLSearchParams();
      queryParams.set('limit', '24');
      queryParams.set('offset', String(reset ? 0 : newOffset));
      if (category) queryParams.set('category', category);
      if (q.trim()) queryParams.set('q', q.trim());
      if (tag.trim()) queryParams.set('tag', tag.trim());
      queryParams.set('sort', sort);
      
      const res = await fetch(`/api/gallery/items?${queryParams.toString()}`);
      
      if (!res.ok) {
        throw new Error('Failed to fetch items');
      }
      
      const data = await res.json();
      
      if (reset) {
        setItems(data.items);
        setOffset(data.items.length);
      } else {
        setItems(prev => [...prev, ...data.items]);
        setOffset(prev => prev + data.items.length);
      }
      
      setTotal(data.total);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error('Error fetching gallery items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, selectedCategory, searchQuery, selectedTag, selectedSort]);
  
  // Handle filter changes
  const applyFilters = useCallback((override?: Partial<{
    category: string;
    q: string;
    tag: string;
    sort: GalleryListSort;
  }>) => {
    // Reset and fetch with new filters
    setItems([]);
    setOffset(0);
    setHasMore(true);
    fetchItems(0, true, override);
  }, [fetchItems]);
  
  // Handle search form submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    applyFilters();
  };
  
  // Handle sort change
  const handleSortChange = (newSort: GalleryListSort) => {
    setSelectedSort(newSort);
    applyFilters({ sort: newSort });
  };
  
  // Handle category change
  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    applyFilters({ category: slug });
  };
  
  // Infinite scroll with IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchItems(offset);
        }
      },
      { rootMargin: '200px' }
    );
    
    observer.observe(sentinel);
    
    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, offset, fetchItems]);

  const pinnedItems = (selectedSort !== 'featured')
    ? pins
      .map((p) => p.item)
      .filter((item): item is (GalleryItem & { category?: GalleryCategory; likedByMe?: boolean }) => Boolean(item))
      .filter((item) => {
        if (selectedCategory && item.category?.slug !== selectedCategory) return false;

        const q = searchQuery.trim().toLowerCase();
        if (q) {
          const haystack = [
            item.title_en,
            item.title_zh,
            item.description_en,
            item.description_zh,
            item.material_en || '',
            item.material_zh || '',
            ...item.tags_en,
            ...item.tags_zh,
          ].join(' ').toLowerCase();

          if (!haystack.includes(q)) return false;
        }

        const tag = selectedTag.trim();
        if (tag) {
          const hasTag = item.tags_en.includes(tag) || item.tags_zh.includes(tag);
          if (!hasTag) return false;
        }

        return true;
      })
    : [];

  // Get IDs of pinned items to exclude from main list
  const pinnedItemIds = new Set(pinnedItems.map(item => item.id));

  // Filter out pinned items from main list to avoid duplication
  const filteredItems = items.filter(item => !pinnedItemIds.has(item.id));

  // Calculate display count (unique items: pinned + filtered main list)
  const displayCount = filteredItems.length + pinnedItems.length;

  return (
    <div className="gallery-masonry flex flex-col lg:flex-row gap-8">
      {/* Category Sidebar */}
      {categories.length > 0 && (
        <aside className="w-full lg:w-64 flex-shrink-0">
          <div className="bg-surface-raised rounded-xl border border-border-light overflow-hidden">
            <div className="bg-primary px-4 py-3">
              <h2 className="text-white font-semibold text-sm">
                {locale === 'zh' ? '分類' : 'Categories'}
              </h2>
            </div>
            <div className="p-3 space-y-1">
              <button
                onClick={() => handleCategoryChange('')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === ''
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-secondary hover:bg-surface'
                }`}
              >
                {locale === 'zh' ? '全部' : 'All'}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryChange(cat.slug)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat.slug
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-secondary hover:bg-surface'
                  }`}
                >
                  {locale === 'zh' ? cat.name_zh : cat.name_en}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      <div className="flex-1 min-w-0">
        {/* Filter Bar */}
        <div className="mb-8 space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex-1">
              <div className="flex">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={locale === 'zh' ? '搜尋作品...' : 'Search artworks...'}
                  className="flex-1 px-4 py-2 border border-border-light rounded-l-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white rounded-r-lg hover:bg-primary-dark transition-colors"
                >
                  {locale === 'zh' ? '搜尋' : 'Search'}
                </button>
              </div>
            </form>

            {/* Sort Dropdown */}
            <select
              value={selectedSort}
              onChange={(e) => handleSortChange(e.target.value as GalleryListSort)}
              className="px-4 py-2 border border-border-light rounded-lg bg-surface text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="newest">{locale === 'zh' ? '最新' : 'Newest'}</option>
              <option value="popular">{locale === 'zh' ? '最受歡迎' : 'Most Popular'}</option>
              <option value="featured">{locale === 'zh' ? '精選' : 'Featured'}</option>
            </select>
          </div>

          {/* Tag Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              placeholder={locale === 'zh' ? '標籤篩選...' : 'Filter by tag...'}
              className="flex-1 max-w-xs px-4 py-2 border border-border-light rounded-lg bg-surface text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  applyFilters();
                }
              }}
            />
            {selectedTag && (
              <button
                onClick={() => {
                  setSelectedTag('');
                  setTimeout(() => applyFilters({ tag: '' }), 0);
                }}
                className="text-secondary hover:text-foreground"
                aria-label="Clear tag filter"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Pinned / Featured block */}
        {pinnedItems.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {locale === 'zh' ? '精選' : 'Featured'}
            </h2>
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
              {pinnedItems.map((item) => (
                <GalleryCard
                  key={`pin-${item.id}`}
                  item={item}
                  locale={locale}
                />
              ))}
            </div>
          </section>
        )}

        {/* Results Count */}
        <p className="text-sm text-secondary mb-4">
          {locale === 'zh'
            ? `共 ${displayCount} 件作品`
            : `${displayCount} artwork${displayCount !== 1 ? 's' : ''}`}
        </p>

        {/* Masonry Grid */}
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4">
          {filteredItems.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              locale={locale}
            />
          ))}
        </div>

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {/* No Results */}
        {!isLoading && displayCount === 0 && (
          <div className="text-center py-16">
            <p className="text-secondary text-lg">
              {locale === 'zh' ? '找不到作品' : 'No artworks found'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('');
                setSelectedTag('');
                setSelectedSort('newest');
                setTimeout(() => applyFilters({ category: '', tag: '', sort: 'newest', q: '' }), 0);
              }}
              className="mt-4 text-primary hover:underline"
            >
              {locale === 'zh' ? '清除篩選條件' : 'Clear filters'}
            </button>
          </div>
        )}

        {/* Infinite Scroll Sentinel */}
        {hasMore && <div ref={sentinelRef} className="h-4" />}

        {/* End of Content */}
        {!hasMore && displayCount > 0 && (
          <p className="text-center text-secondary py-8">
            {locale === 'zh' ? '已顯示全部作品' : 'All artworks loaded'}
          </p>
        )}
      </div>
    </div>
  );
}
