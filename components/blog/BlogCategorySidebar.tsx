'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { CategoryWithCount } from '@/lib/types/blog';

interface BlogCategorySidebarProps {
  categories: CategoryWithCount[];
  uncategorizedCount: number;
  locale: string;
  currentCategorySlug?: string;
  searchQuery?: string;
}

export default function BlogCategorySidebar({
  categories,
  uncategorizedCount,
  locale,
  currentCategorySlug,
  searchQuery,
}: BlogCategorySidebarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(categories.map((c) => c.id))
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const buildUrl = (categorySlug?: string) => {
    const params = new URLSearchParams();
    if (categorySlug) params.set('category', categorySlug);
    if (searchQuery) params.set('search', searchQuery);
    const query = params.toString();
    return `/${locale}/blog${query ? `?${query}` : ''}`;
  };

  const totalPosts = categories.reduce((sum, cat) => sum + cat.post_count, 0) + uncategorizedCount;

  const isZh = locale === 'zh';

  return (
    <aside className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-surface-raised rounded-theme-lg shadow-sm border border-border-light overflow-hidden">
        {/* Header - using theme primary color */}
        <div className="bg-primary px-4 py-3">
          <h2 className="text-white font-semibold text-sm">
            {isZh ? '文章分類' : 'Categories'}
          </h2>
        </div>

        {/* Category List */}
        <div className="p-3">
          {/* All Posts */}
          <Link
            href={buildUrl()}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              !currentCategorySlug
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-secondary hover:bg-surface-raised-hover hover:text-foreground'
            }`}
          >
            <span>{isZh ? '全部文章' : 'All Posts'}</span>
            <span className="ml-auto text-secondary/80">({totalPosts})</span>
          </Link>

          {/* Categories */}
          <div className="mt-2 space-y-0.5">
            {categories.map((category) => (
              <div key={category.id}>
                <div className="flex items-center">
                  {/* Toggle Button */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className="w-5 h-5 flex items-center justify-center text-secondary/70 hover:text-foreground flex-shrink-0"
                    aria-label={expandedCategories.has(category.id) ? 'Collapse' : 'Expand'}
                  >
                    <span className="text-xs font-mono">
                      {expandedCategories.has(category.id) ? '−' : '+'}
                    </span>
                  </button>

                  {/* Category Link */}
                  <Link
                    href={buildUrl(category.slug)}
                    className={`flex-1 flex items-center gap-1 px-3 py-2 rounded-lg text-sm transition-colors ${
                      currentCategorySlug === category.slug
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                    }`}
                  >
                    <span className="truncate">
                      {isZh ? category.name_zh : category.name_en}
                    </span>
                    <span className="ml-auto text-secondary/80 flex-shrink-0">
                      ({category.post_count})
                    </span>
                  </Link>
                </div>
              </div>
            ))}

            {/* Uncategorized */}
            {uncategorizedCount > 0 && (
              <Link
                href={buildUrl('uncategorized')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ml-5 ${
                  currentCategorySlug === 'uncategorized'
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-secondary hover:bg-surface-raised-hover hover:text-foreground'
                }`}
              >
                <span>{isZh ? '未分類文章' : 'Uncategorized'}</span>
                <span className="ml-auto">({uncategorizedCount})</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

