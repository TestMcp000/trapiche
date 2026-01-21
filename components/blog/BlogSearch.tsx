'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface BlogSearchProps {
  placeholder?: string;
  locale: string;
}

export default function BlogSearch({ placeholder, locale }: BlogSearchProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // URL is the source of truth; read current values
  const urlSearch = searchParams.get('q') || '';
  const urlSort = searchParams.get('sort') || 'newest';
  
  const [search, setSearch] = useState(urlSearch);
  const [sort, setSort] = useState(urlSort);

  // Sync local state from URL on back/forward navigation
  useEffect(() => {
    setSearch(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    setSort(urlSort);
  }, [urlSort]);

  const updateParams = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== 'newest') {
        params.set(key, value);
      } else if (key === 'sort' && value === 'newest') {
        params.delete(key);
      } else if (!value) {
        params.delete(key);
      }
    });
    
    const queryString = params.toString();
    router.push(`/${locale}/blog${queryString ? `?${queryString}` : ''}`);
  }, [searchParams, router, locale]);

  // Debounce search: only push if local state differs from current URL
  useEffect(() => {
    // Skip if local state matches URL (prevents loop on back/forward)
    if (search === urlSearch) return;
    
    const timer = setTimeout(() => {
      updateParams({ q: search });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search, urlSearch, updateParams]);

  const handleSortChange = (value: string) => {
    setSort(value);
    // Only push if different from URL (prevents duplicate pushes)
    if (value !== urlSort) {
      updateParams({ sort: value });
    }
  };

  const labels = {
    newest: '最新',
    oldest: '最舊',
    titleAZ: '標題 A-Z',
    titleZA: '標題 Z-A',
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto mb-8">
      {/* Search */}
      <div className="relative flex-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder || '搜尋...'}
          className="w-full px-4 py-3 pl-12 border border-border rounded-full bg-surface-raised text-foreground placeholder:text-secondary/60 focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <svg 
          className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary/60"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary/60 hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Sort */}
      <select
        value={sort}
        onChange={(e) => handleSortChange(e.target.value)}
        className="px-4 py-3 border border-border rounded-full bg-surface-raised text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
      >
        <option value="newest">{labels.newest}</option>
        <option value="oldest">{labels.oldest}</option>
        <option value="title-asc">{labels.titleAZ}</option>
        <option value="title-desc">{labels.titleZA}</option>
      </select>
    </div>
  );
}
