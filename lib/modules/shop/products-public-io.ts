/**
 * Shop Products Public Read IO
 *
 * Public read operations for shop products.
 *
 * @module lib/modules/shop/products-public-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import {
  transformProductToSummary,
  transformProductToDetail,
} from '@/lib/modules/shop/products-transform';
import type {
  ProductRow,
  ProductVariantRow,
  ProductDetail,
  ProductListParams,
  ProductListResult,
} from '@/lib/types/shop';

const DEFAULT_PAGE_SIZE = 24;

/**
 * Get visible products with pagination and filtering
 * Only returns products where is_visible=true
 * Note: Shop visibility is checked at page level via lib/features/cached.ts
 */
export async function getVisibleProducts(
  params: ProductListParams = {}
): Promise<ProductListResult> {
  const {
    category,
    search,
    sort = 'newest',
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = params;

  let query = createAnonClient()
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_visible', true);

  if (category) {
    query = query.eq('category', category);
  }

  if (search) {
    query = query.or(
      `name_en.ilike.%${search}%,name_zh.ilike.%${search}%,slug.ilike.%${search}%`
    );
  }

  switch (sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'popular':
      query = query.order('sort_order', { ascending: true });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data: products, count, error } = await query;

  if (error) {
    console.error('Error fetching visible products:', error);
    return { items: [], total: 0, hasMore: false };
  }

  if (!products || products.length === 0) {
    return { items: [], total: count || 0, hasMore: false };
  }

  // Fetch variants
  const productIds = products.map((p) => p.id);
  const { data: variants } = await createAnonClient()
    .from('product_variants')
    .select('*')
    .in('product_id', productIds)
    .eq('is_enabled', true);

  const variantsByProduct = new Map<string, ProductVariantRow[]>();
  for (const variant of variants || []) {
    const existing = variantsByProduct.get(variant.product_id) || [];
    existing.push(variant as ProductVariantRow);
    variantsByProduct.set(variant.product_id, existing);
  }

  const items = products.map((product) =>
    transformProductToSummary(
      product as ProductRow,
      variantsByProduct.get(product.id) || []
    )
  );

  const total = count || 0;
  const hasMore = offset + items.length < total;

  return { items, total, hasMore };
}

/**
 * Get a visible product by category and slug (for product detail page)
 * Used by /[locale]/shop/[category]/[slug] route
 * Note: Shop visibility is checked at page level via lib/features/cached.ts
 */
export async function getVisibleProductByCategoryAndSlug(
  category: string,
  slug: string
): Promise<ProductDetail | null> {
  const { data: product, error } = await createAnonClient()
    .from('products')
    .select('*')
    .eq('category', category)
    .eq('slug', slug)
    .eq('is_visible', true)
    .maybeSingle();

  if (error || !product) {
    return null;
  }

  const { data: variants } = await createAnonClient()
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .eq('is_enabled', true)
    .order('variant_key', { ascending: true });

  return transformProductToDetail(
    product as ProductRow,
    (variants || []) as ProductVariantRow[]
  );
}
