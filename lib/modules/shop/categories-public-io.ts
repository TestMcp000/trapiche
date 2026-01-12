/**
 * Shop Categories Public IO
 *
 * Public read operations for shop categories.
 *
 * @module lib/modules/shop/categories-public-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { ProductCategory } from '@/lib/types/shop';

/**
 * Get all visible product categories (aggregated from products.category)
 * Returns unique category slugs with product counts
 * Note: Shop visibility is checked at page level via lib/features/cached.ts
 */
export async function getVisibleProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await createAnonClient()
    .from('products')
    .select('category')
    .eq('is_visible', true)
    .not('category', 'is', null);

  if (error) {
    console.error('Error fetching product categories:', error);
    return [];
  }

  // Aggregate categories with counts
  const categoryMap = new Map<string, number>();
  for (const row of data || []) {
    if (row.category) {
      categoryMap.set(
        row.category,
        (categoryMap.get(row.category) || 0) + 1
      );
    }
  }

  return Array.from(categoryMap.entries()).map(([slug, productCount]) => ({
    slug,
    productCount,
  }));
}

/**
 * Get all visible products for sitemap generation
 * Includes category for URL building
 * Note: Shop visibility is checked at caller level (sitemap.ts) via lib/features/cached.ts
 */
export async function getVisibleProductsForSitemap(): Promise<
  Array<{ slug: string; category: string | null; updatedAt: string }>
> {
  const { data, error } = await createAnonClient()
    .from('products')
    .select('slug, category, updated_at')
    .eq('is_visible', true);

  if (error) {
    console.error('Error fetching products for sitemap:', error);
    return [];
  }

  return (data || []).map(product => ({
    slug: product.slug,
    category: product.category,
    updatedAt: product.updated_at,
  }));
}
