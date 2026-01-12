/**
 * Products CSV Formatter Unit Tests
 *
 * Tests for product CSV formatting functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatProductsToCsv,
  transformProductToCsvRows,
} from '../../lib/modules/import-export/formatters/csv/products-csv';
import type { ProductWithVariants } from '../../lib/modules/import-export/formatters/products-json';

// =============================================================================
// Test Fixtures
// =============================================================================

/**
 * Minimal ProductWithVariants fixtures for testing.
 * Properly typed to match ProductRow + variants[].
 */
const PRODUCT_NO_VARIANTS: ProductWithVariants = {
  id: 'p1',
  slug: 'test-product',
  name_en: 'Test Product',
  name_zh: '測試產品',
  category: 'electronics',
  is_visible: true,
  variants: [],
  // Required ProductRow fields
  description_short_en: null,
  description_short_zh: null,
  description_full_en: null,
  description_full_zh: null,
  tags_en: null,
  tags_zh: null,
  cover_image_url: null,
  media_urls: [],
  seo_title_en: null,
  seo_title_zh: null,
  seo_description_en: null,
  seo_description_zh: null,
  sort_order: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const PRODUCT_WITH_VARIANTS: ProductWithVariants = {
  ...PRODUCT_NO_VARIANTS,
  id: 'p2',
  slug: 'multi-variant',
  name_en: 'Multi Variant Product',
  name_zh: null,
  category: 'clothing',
  variants: [
    {
      id: 'v1',
      product_id: 'p2',
      variant_key: 'size-s',
      sku: 'SKU-S',
      price_cents: 1999,
      compare_at_price_cents: 2499,
      stock: 10,
      is_enabled: true,
      option_values_json: {},
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'v2',
      product_id: 'p2',
      variant_key: 'size-m',
      sku: 'SKU-M',
      price_cents: 1999,
      compare_at_price_cents: null,
      stock: 5,
      is_enabled: false,
      option_values_json: {},
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    },
  ],
};

// =============================================================================
// Tests
// =============================================================================

describe('Products CSV Formatter', () => {
  describe('transformProductToCsvRows', () => {
    it('creates single row for product without variants', () => {
      const rows = transformProductToCsvRows(PRODUCT_NO_VARIANTS);
      assert.equal(rows.length, 1);
      assert.equal(rows[0].product_slug, 'test-product');
      assert.equal(rows[0].name_en, 'Test Product');
      assert.equal(rows[0].variant_key, '');
    });

    it('creates one row per variant', () => {
      const rows = transformProductToCsvRows(PRODUCT_WITH_VARIANTS);
      assert.equal(rows.length, 2);
      assert.equal(rows[0].variant_key, 'size-s');
      assert.equal(rows[0].price_cents, '1999');
      assert.equal(rows[0].is_enabled, 'true');
      assert.equal(rows[1].variant_key, 'size-m');
      assert.equal(rows[1].is_enabled, 'false');
    });
  });

  describe('formatProductsToCsv', () => {
    it('generates valid CSV with headers', () => {
      const csv = formatProductsToCsv([PRODUCT_WITH_VARIANTS]);
      const lines = csv.split('\r\n');
      
      // Check header
      assert.ok(lines[0].includes('product_slug'));
      assert.ok(lines[0].includes('variant_key'));
      assert.ok(lines[0].includes('price_cents'));
      
      // Check data row
      assert.ok(lines[1].includes('multi-variant'));
      assert.ok(lines[1].includes('size-s'));
      assert.ok(lines[1].includes('1999'));
    });

    it('flattens multiple products with variants', () => {
      const products: ProductWithVariants[] = [
        PRODUCT_NO_VARIANTS,
        PRODUCT_WITH_VARIANTS,
      ];
      const csv = formatProductsToCsv(products);
      const lines = csv.split('\r\n');
      
      // 1 header + 1 (no variants) + 2 (with variants) = 4 lines
      assert.equal(lines.length, 4);
    });

    it('handles products with special characters in names', () => {
      const specialProduct: ProductWithVariants = {
        ...PRODUCT_NO_VARIANTS,
        name_en: 'Product, with "special" chars',
      };
      const csv = formatProductsToCsv([specialProduct]);
      // Special characters should be escaped
      assert.ok(csv.includes('"Product, with ""special"" chars"'));
    });
  });
});

