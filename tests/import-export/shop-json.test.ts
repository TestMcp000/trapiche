/**
 * Shop JSON Formatter/Parser Tests
 *
 * Tests for products and coupons import/export pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  transformProductToExportData,
  transformVariantToExportData,
  formatProductsToJson,
  type ProductWithVariants,
} from '../../lib/modules/import-export/formatters/products-json';

import {
  transformCouponToExportData,
  formatCouponsToJson,
} from '../../lib/modules/import-export/formatters/coupons-json';

import {
  parseProductsJson,
  validateProductFields,
} from '../../lib/modules/import-export/parsers/products-json';

import {
  parseCouponsJson,
  validateCouponFields,
} from '../../lib/modules/import-export/parsers/coupons-json';

import {
  validateProduct,
  validateCoupon,
  validateProductVariant,
} from '../../lib/modules/import-export/validators/shop';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_VARIANT = {
  id: 'var-123',
  product_id: 'prod-123',
  variant_key: 'default',
  option_values_json: { size: 'M', color: 'Blue' },
  sku: 'SKU-001',
  price_cents: 9900,
  compare_at_price_cents: 12900,
  stock: 10,
  is_enabled: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const MOCK_PRODUCT = {
  id: 'prod-123',
  slug: 'test-product',
  category: 'clothing',
  name_en: 'Test Product',
  name_zh: '測試產品',
  description_short_en: 'Short desc',
  description_short_zh: '簡短描述',
  description_full_en: 'Full description',
  description_full_zh: '完整描述',
  cover_image_url: 'https://example.com/img.jpg',
  media_urls: ['https://example.com/img2.jpg'],
  tags_en: ['test'],
  tags_zh: ['測試'],
  is_visible: true,
  sort_order: 1,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  variants: [MOCK_VARIANT],
};

const MOCK_COUPON = {
  id: 'coup-123',
  code: 'SAVE20',
  type: 'percentage' as const,
  value: 20,
  min_subtotal_cents: 5000,
  max_usage_count: 100,
  max_discount_cents: null,
  current_usage_count: 5,
  starts_at: '2025-01-01T00:00:00Z',
  expires_at: '2025-12-31T23:59:59Z',
  is_active: true,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Products Formatter Tests
// =============================================================================

describe('Products JSON Formatter', () => {
  describe('transformVariantToExportData', () => {
    it('transforms variant to export format', () => {
      const exported = transformVariantToExportData(MOCK_VARIANT);

      assert.equal(exported.variant_key, 'default');
      assert.equal(exported.sku, 'SKU-001');
      assert.equal(exported.price_cents, 9900);
      assert.equal(exported.compare_at_price_cents, 12900);
      assert.equal(exported.stock, 10);
    });
  });

  describe('transformProductToExportData', () => {
    it('transforms product with variants', () => {
      // Cast to the expected type with variants
      const productWithVariants = { ...MOCK_PRODUCT };
      const exported = transformProductToExportData(productWithVariants as unknown as ProductWithVariants);

      assert.equal(exported.slug, 'test-product');
      assert.equal(exported.name_en, 'Test Product');
      assert.equal(exported.variants.length, 1);
      assert.equal(exported.variants[0].variant_key, 'default');
    });
  });

  describe('formatProductsToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatProductsToJson([MOCK_PRODUCT] as unknown as ProductWithVariants[], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'products');
      assert.equal(envelope.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(envelope.data.length, 1);
    });
  });
});

// =============================================================================
// Coupons Formatter Tests
// =============================================================================

describe('Coupons JSON Formatter', () => {
  describe('transformCouponToExportData', () => {
    it('transforms coupon to export format', () => {
      const exported = transformCouponToExportData(MOCK_COUPON);

      assert.equal(exported.code, 'SAVE20');
      assert.equal(exported.discount_type, 'percentage');
      assert.equal(exported.discount_value, 20);
      assert.equal(exported.min_order_cents, 5000);
      assert.equal(exported.is_active, true);
    });
  });

  describe('formatCouponsToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatCouponsToJson([MOCK_COUPON], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'coupons');
      assert.equal(envelope.data.length, 1);
    });
  });
});

// =============================================================================
// Products Parser Tests
// =============================================================================

describe('Products JSON Parser', () => {
  describe('validateProductFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        slug: 'test',
        variants: [{ variant_key: 'default', price_cents: 100, stock: 10 }],
      };
      assert.deepEqual(validateProductFields(data), []);
    });

    it('returns missing fields', () => {
      const data = { name: 'test' };
      const missing = validateProductFields(data);
      assert.ok(missing.includes('slug'));
      assert.ok(missing.includes('variants'));
    });
  });

  describe('parseProductsJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'products',
        data: [{
          slug: 'test-product',
          name_en: 'Test',
          variants: [{
            variant_key: 'default',
            option_values: {},
            price_cents: 9900,
            stock: 10,
          }],
        }],
      });

      const result = parseProductsJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
      assert.equal(result.data?.[0].slug, 'test-product');
    });

    it('fails on wrong type', () => {
      const json = JSON.stringify({
        type: 'wrong_type',
        data: [],
      });

      const result = parseProductsJson(json);
      assert.equal(result.success, false);
    });
  });
});

// =============================================================================
// Coupons Parser Tests
// =============================================================================

describe('Coupons JSON Parser', () => {
  describe('validateCouponFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        code: 'SAVE20',
        discount_type: 'percentage',
        discount_value: 20,
      };
      assert.deepEqual(validateCouponFields(data), []);
    });

    it('returns errors for invalid type', () => {
      const data = {
        code: 'SAVE20',
        discount_type: 'invalid',
        discount_value: 20,
      };
      const errors = validateCouponFields(data);
      assert.ok(errors.length > 0);
    });
  });

  describe('parseCouponsJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'coupons',
        data: [{
          code: 'SAVE20',
          discount_type: 'percentage',
          discount_value: 20,
          is_active: true,
        }],
      });

      const result = parseCouponsJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
    });
  });
});

// =============================================================================
// Shop Validator Tests
// =============================================================================

describe('Shop Validators', () => {
  describe('validateProductVariant', () => {
    it('validates correct variant', () => {
      const variant = {
        variant_key: 'default',
        option_values: {},
        sku: null,
        price_cents: 9900,
        compare_at_price_cents: null,
        stock: 10,
        is_enabled: true,
      };

      const result = validateProductVariant(variant, 0);
      assert.equal(result.valid, true);
    });

    it('fails on negative price', () => {
      const variant = {
        variant_key: 'default',
        option_values: {},
        sku: null,
        price_cents: -100,
        compare_at_price_cents: null,
        stock: 10,
        is_enabled: true,
      };

      const result = validateProductVariant(variant, 0);
      assert.equal(result.valid, false);
    });
  });

  describe('validateProduct', () => {
    it('validates correct product', () => {
      const product = {
        slug: 'test-product',
        category: null,
        name_en: 'Test',
        name_zh: null,
        description_short_en: null,
        description_short_zh: null,
        description_full_en: null,
        description_full_zh: null,
        cover_image_url: null,
        media_urls: [],
        tags_en: [],
        tags_zh: [],
        is_visible: true,
        sort_order: 0,
        variants: [{
          variant_key: 'default',
          option_values: {},
          sku: null,
          price_cents: 9900,
          compare_at_price_cents: null,
          stock: 10,
          is_enabled: true,
        }],
      };

      const result = validateProduct(product);
      assert.equal(result.valid, true);
    });

    it('fails without variants', () => {
      const product = {
        slug: 'test-product',
        category: null,
        name_en: 'Test',
        name_zh: null,
        description_short_en: null,
        description_short_zh: null,
        description_full_en: null,
        description_full_zh: null,
        cover_image_url: null,
        media_urls: [],
        tags_en: [],
        tags_zh: [],
        is_visible: true,
        sort_order: 0,
        variants: [],
      };

      const result = validateProduct(product);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.field === 'variants'));
    });
  });

  describe('validateCoupon', () => {
    it('validates correct coupon', () => {
      const coupon = {
        code: 'SAVE20',
        discount_type: 'percentage' as const,
        discount_value: 20,
        min_order_cents: null,
        max_uses: null,
        starts_at: null,
        expires_at: null,
        is_active: true,
      };

      const result = validateCoupon(coupon);
      assert.equal(result.valid, true);
    });

    it('fails on percentage over 100', () => {
      const coupon = {
        code: 'SAVE150',
        discount_type: 'percentage' as const,
        discount_value: 150,
        min_order_cents: null,
        max_uses: null,
        starts_at: null,
        expires_at: null,
        is_active: true,
      };

      const result = validateCoupon(coupon);
      assert.equal(result.valid, false);
    });
  });
});
