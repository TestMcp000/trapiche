/**
 * Products JSON Formatter (Pure)
 *
 * Formats products with variants to JSON export envelope.
 * Following PRD §2.5 format specification.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §2.5
 */

import type { ProductRow, ProductVariantRow } from '@/lib/types/shop';
import type {
  ProductsExport,
  ProductExportData,
  ProductVariantExportData,
} from '@/lib/types/import-export';

// =============================================================================
// Types
// =============================================================================

/** Product with variants for export */
export interface ProductWithVariants extends ProductRow {
  variants: ProductVariantRow[];
}

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a ProductVariantRow to export data format.
 *
 * @param variant - The variant to transform
 * @returns Export data object
 */
export function transformVariantToExportData(
  variant: ProductVariantRow
): ProductVariantExportData {
  return {
    variant_key: variant.variant_key,
    option_values: variant.option_values_json ?? {},
    sku: variant.sku,
    price_cents: variant.price_cents,
    compare_at_price_cents: variant.compare_at_price_cents,
    stock: variant.stock,
    is_enabled: variant.is_enabled,
  };
}

/**
 * Transform a Product with variants to export data format.
 *
 * @param product - The product to transform
 * @returns Export data object
 */
export function transformProductToExportData(
  product: ProductWithVariants
): ProductExportData {
  return {
    slug: product.slug,
    category: product.category,
    name_en: product.name_en,
    name_zh: product.name_zh,
    description_short_en: product.description_short_en,
    description_short_zh: product.description_short_zh,
    description_full_en: product.description_full_en,
    description_full_zh: product.description_full_zh,
    cover_image_url: product.cover_image_url,
    media_urls: product.media_urls ?? [],
    tags_en: product.tags_en ?? [],
    tags_zh: product.tags_zh ?? [],
    is_visible: product.is_visible,
    sort_order: product.sort_order,
    variants: product.variants.map(transformVariantToExportData),
  };
}

/**
 * Format an array of products to JSON export envelope.
 *
 * @param products - Array of products with variants to export
 * @param exportedAt - Optional ISO 8601 timestamp (defaults to now)
 * @returns Export envelope with type and data
 */
export function formatProductsToJson(
  products: ProductWithVariants[],
  exportedAt?: string
): ProductsExport {
  return {
    exportedAt: exportedAt ?? new Date().toISOString(),
    type: 'products',
    data: products.map(transformProductToExportData),
  };
}

/**
 * Serialize products export to JSON string.
 *
 * @param products - Array of products with variants to export
 * @param exportedAt - Optional ISO 8601 timestamp
 * @param pretty - Whether to format with indentation (default: true)
 * @returns JSON string
 */
export function formatProductsToJsonString(
  products: ProductWithVariants[],
  exportedAt?: string,
  pretty = true
): string {
  const envelope = formatProductsToJson(products, exportedAt);
  return pretty ? JSON.stringify(envelope, null, 2) : JSON.stringify(envelope);
}
