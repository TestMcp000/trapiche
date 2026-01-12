/**
 * Shop Products Transform Helpers (Pure Module)
 *
 * Transform functions for converting between product database rows
 * and typed models. These are pure functions with no I/O dependencies.
 *
 * @module lib/modules/shop/products-transform
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import type {
  ProductRow,
  ProductVariantRow,
  ProductSummary,
  ProductDetail,
} from '@/lib/types/shop';

/**
 * Transform DB product row + variants to ProductSummary
 */
export function transformProductToSummary(
  product: ProductRow,
  variants: ProductVariantRow[]
): ProductSummary {
  const enabledVariants = variants.filter((v) => v.is_enabled);
  const prices = enabledVariants.map((v) => v.price_cents);
  const stocks = enabledVariants.map((v) => v.stock);

  return {
    id: product.id,
    slug: product.slug,
    nameEn: product.name_en,
    nameZh: product.name_zh,
    descriptionShortEn: product.description_short_en,
    descriptionShortZh: product.description_short_zh,
    coverImageUrl: product.cover_image_url,
    category: product.category,
    isVisible: product.is_visible,
    minPriceCents: prices.length > 0 ? Math.min(...prices) : 0,
    maxPriceCents: prices.length > 0 ? Math.max(...prices) : 0,
    totalStock: stocks.reduce((sum, s) => sum + s, 0),
  };
}

/**
 * Transform DB product row + variants to ProductDetail
 */
export function transformProductToDetail(
  product: ProductRow,
  variants: ProductVariantRow[]
): ProductDetail {
  const summary = transformProductToSummary(product, variants);

  return {
    ...summary,
    descriptionFullEn: product.description_full_en,
    descriptionFullZh: product.description_full_zh,
    tagsEn: product.tags_en || [],
    tagsZh: product.tags_zh || [],
    mediaUrls: product.media_urls || [],
    seoTitleEn: product.seo_title_en,
    seoTitleZh: product.seo_title_zh,
    seoDescriptionEn: product.seo_description_en,
    seoDescriptionZh: product.seo_description_zh,
    variants,
    createdAt: product.created_at,
    updatedAt: product.updated_at,
  };
}

/** DB payload for product creation/update */
export interface ProductDbPayload {
  slug: string;
  name_en: string | null;
  name_zh: string | null;
  description_short_en: string | null;
  description_short_zh: string | null;
  description_full_en: string | null;
  description_full_zh: string | null;
  category: string;
  tags_en: string[];
  tags_zh: string[];
  cover_image_url: string | null;
  media_urls: string[];
  seo_title_en: string | null;
  seo_title_zh: string | null;
  seo_description_en: string | null;
  seo_description_zh: string | null;
  is_visible: boolean;
  sort_order: number;
}

/** DB payload for variant creation/update */
export interface VariantDbPayload {
  variant_key: string;
  option_values_json: Record<string, string>;
  sku: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock: number;
  is_enabled: boolean;
}
