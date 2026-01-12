'use client';

/**
 * Admin Posts Filter Component
 *
 * Client component for searching and filtering blog posts.
 * Uses admin i18n via useTranslations (parent provides NextIntlClientProvider).
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { NextIntlClientProvider, useTranslations } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import type { Category } from '@/lib/types/blog';

interface AdminPostsFilterProps {
  routeLocale: string;
  categories: Category[];
  messages: AbstractIntlMessages;
}

/** Wrapper that provides NextIntlClientProvider for admin translations */
export default function AdminPostsFilter(props: AdminPostsFilterProps) {
  return (
    <NextIntlClientProvider messages={props.messages}>
      <AdminPostsFilterContent {...props} />
    </NextIntlClientProvider>
  );
}

function AdminPostsFilterContent({ routeLocale, categories }: AdminPostsFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('admin.blog.filter');
  
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  
  const updateFilters = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });
    
    router.push(`/${routeLocale}/admin/posts?${params.toString()}`);
  }, [searchParams, router, routeLocale]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== (searchParams.get('search') || '')) {
        updateFilters({ search });
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search, searchParams, updateFilters]);

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    updateFilters({ category: value });
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateFilters({ sort: value });
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6">
      {/* Search */}
      <div className="relative flex-1">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search')}
          className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <svg 
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      {/* Category Filter */}
      <select
        value={category}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="">{t('allCategories')}</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name_en}
          </option>
        ))}
      </select>
      
      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => handleSortChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      >
        <option value="newest">{t('newest')}</option>
        <option value="oldest">{t('oldest')}</option>
        <option value="title-asc">{t('titleAZ')}</option>
        <option value="title-desc">{t('titleZA')}</option>
      </select>
    </div>
  );
}

