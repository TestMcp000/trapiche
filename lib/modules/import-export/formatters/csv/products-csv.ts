/**
 * Products CSV Formatter (Pure)
 *
 * Formats products with variants to CSV.
 * Flattens to one row per variant as per PRD §3.6.
 *
 * @see doc/specs/completed/IMPORT_EXPORT.md §3.6 (CSV format)
 * @see uiux_refactor.md §4 item 2
 */

import type { ProductWithVariants } from '../products-json';
import {
  escapeCsvCell,
  nullToEmpty,
  boolToCsv,
  toCsv,
} from './csv-utils';

// =============================================================================
// Types
// =============================================================================

/** CSV row data for a product variant */
interface ProductCsvRow {
  product_slug: string;
  variant_key: string;
  name_en: string;
  name_zh: string;
  category: string;
  sku: string;
  price_cents: string;
  compare_at_price_cents: string;
  stock: string;
  is_visible: string;
  is_enabled: string;
}

// =============================================================================
// Constants
// =============================================================================

/** CSV column headers */
const PRODUCT_CSV_HEADERS = [
  'product_slug',
  'variant_key',
  'name_en',
  'name_zh',
  'category',
  'sku',
  'price_cents',
  'compare_at_price_cents',
  'stock',
  'is_visible',
  'is_enabled',
] as const;

// =============================================================================
// Formatter Functions
// =============================================================================

/**
 * Transform a product with variants to flattened CSV rows.
 * Each variant becomes a separate row.
 *
 * @param product - Product with variants
 * @returns Array of CSV row objects
 */
export function transformProductToCsvRows(
  product: ProductWithVariants
): ProductCsvRow[] {
  // If product has no variants, create a single row with empty variant fields
  if (!product.variants || product.variants.length === 0) {
    return [
      {
        product_slug: product.slug,
        variant_key: '',
        name_en: nullToEmpty(product.name_en),
        name_zh: nullToEmpty(product.name_zh),
        category: nullToEmpty(product.category),
        sku: '',
        price_cents: '',
        compare_at_price_cents: '',
        stock: '',
        is_visible: boolToCsv(product.is_visible),
        is_enabled: '',
      },
    ];
  }

  return product.variants.map((variant) => ({
    product_slug: product.slug,
    variant_key: variant.variant_key,
    name_en: nullToEmpty(product.name_en),
    name_zh: nullToEmpty(product.name_zh),
    category: nullToEmpty(product.category),
    sku: nullToEmpty(variant.sku),
    price_cents: String(variant.price_cents),
    compare_at_price_cents: nullToEmpty(variant.compare_at_price_cents),
    stock: String(variant.stock),
    is_visible: boolToCsv(product.is_visible),
    is_enabled: boolToCsv(variant.is_enabled),
  }));
}

/**
 * Convert a CSV row object to an array of escaped cell values.
 *
 * @param row - CSV row object
 * @returns Array of escaped cell strings
 */
function rowToArray(row: ProductCsvRow): string[] {
  return PRODUCT_CSV_HEADERS.map((header) => escapeCsvCell(row[header]));
}

/**
 * Format products to CSV string.
 *
 * @param products - Array of products with variants
 * @returns CSV string
 */
export function formatProductsToCsv(products: ProductWithVariants[]): string {
  // Flatten all products to rows
  const allRows = products.flatMap(transformProductToCsvRows);

  // Convert to array format
  const rowArrays = allRows.map(rowToArray);

  return toCsv([...PRODUCT_CSV_HEADERS], rowArrays);
}
