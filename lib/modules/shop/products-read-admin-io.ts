/**
 * Shop Products Admin Read IO
 *
 * Admin-only product read operations.
 * Uses authenticated Supabase client with cookie context for RLS.
 *
 * @module lib/modules/shop/products-read-admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createClient } from '@/lib/infrastructure/supabase/server';
import { isSiteAdmin } from '@/lib/modules/auth';
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
 * Get all products for admin (including hidden)
 * Requires authenticated admin session via RLS
 */
export async function getAllProducts(
  params: ProductListParams = {}
): Promise<ProductListResult> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return { items: [], total: 0, hasMore: false };
  }

  const {
    category,
    search,
    sort = 'newest',
    limit = DEFAULT_PAGE_SIZE,
    offset = 0,
  } = params;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' });

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
    console.error('Error fetching all products:', error);
    return { items: [], total: 0, hasMore: false };
  }

  if (!products || products.length === 0) {
    return { items: [], total: count || 0, hasMore: false };
  }

  // Fetch variants
  const productIds = products.map((p) => p.id);
  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .in('product_id', productIds);

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
 * Get a product by ID for admin editing
 * Requires authenticated admin session via RLS
 */
export async function getProductById(id: string): Promise<ProductDetail | null> {
  const supabase = await createClient();

  // Admin guard
  const isAdmin = await isSiteAdmin(supabase);
  if (!isAdmin) {
    return null;
  }

  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !product) {
    if (error) {
      console.error('Error fetching product by id:', error);
    }
    return null;
  }

  const { data: variants } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', product.id)
    .order('variant_key', { ascending: true });

  return transformProductToDetail(
    product as ProductRow,
    (variants || []) as ProductVariantRow[]
  );
}

/**
 * Check if a product slug already exists
 */
export async function checkProductSlugExists(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  const supabase = await createClient();

  let query = supabase.from('products').select('id').eq('slug', slug);
  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data } = await query.maybeSingle();
  return !!data;
}
