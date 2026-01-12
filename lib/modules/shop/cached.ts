/**
 * Cached shop data access functions for public reads
 *
 * Wraps `lib/modules/shop/io.ts` (IO) with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 *
 * 遵循 ARCHITECTURE.md 架構規範：
 * - Public SSR 讀取走 cached reads
 * - 使用 anon client（無 cookies 影響）
 * - cache tags 對應 revalidateTag 失效
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type {
  ProductListParams,
  ProductListResult,
  ProductDetail,
  ProductCategory,
  ShopSettingsRow,
} from '@/lib/types/shop';
import {
  getVisibleProducts,
  getVisibleProductByCategoryAndSlug,
  getVisibleProductCategories,
  getVisibleProductsForSitemap,
  getShopSettings,
} from './io';

const CACHE_REVALIDATE_SECONDS = 60;



/**
 * Cached visible products list
 * Used by /[locale]/shop page
 */
export const getVisibleProductsCached = cachedQuery(
  async (params: ProductListParams): Promise<ProductListResult> =>
    getVisibleProducts(params),
  ['visible-products'],
  ['shop'],
  CACHE_REVALIDATE_SECONDS
);


/**
 * Cached product detail by category and slug
 * Used by /[locale]/shop/[category]/[slug] page
 */
export const getVisibleProductByCategoryAndSlugCached = cachedQuery(
  async (category: string, slug: string): Promise<ProductDetail | null> =>
    getVisibleProductByCategoryAndSlug(category, slug),
  ['visible-product-by-category-slug'],
  ['shop'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Cached visible product categories
 * Used by /[locale]/shop and category listing pages
 */
export const getVisibleProductCategoriesCached = cachedQuery(
  async (): Promise<ProductCategory[]> => getVisibleProductCategories(),
  ['visible-product-categories'],
  ['shop'],
  CACHE_REVALIDATE_SECONDS
);

export const getVisibleProductsForSitemapCached = cachedQuery(
  async (): Promise<Array<{ slug: string; category: string | null; updatedAt: string }>> =>
    getVisibleProductsForSitemap(),
  ['visible-products-sitemap'],
  ['shop'],
  CACHE_REVALIDATE_SECONDS
);

/**
 * Cached shop settings for checkout page
 * Used by /[locale]/shop/checkout page
 */
export const getShopSettingsCached = cachedQuery(
  async (): Promise<ShopSettingsRow | null> => getShopSettings(),
  ['shop-settings'],
  ['shop'],
  CACHE_REVALIDATE_SECONDS
);
