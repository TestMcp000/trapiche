/**
 * Gallery JSON Formatter/Parser Tests
 *
 * Tests for gallery items and categories import/export pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  transformGalleryItemToExportData,
  buildCategorySlugMap,
  formatGalleryItemsToJson,
} from '../../lib/modules/import-export/formatters/gallery-items-json';

import {
  transformGalleryCategoryToExportData,
  formatGalleryCategoriesToJson,
} from '../../lib/modules/import-export/formatters/gallery-categories-json';

import {
  parseGalleryItemsJson,
  validateGalleryItemFields,
} from '../../lib/modules/import-export/parsers/gallery-items-json';

import {
  parseGalleryCategoriesJson,
  validateGalleryCategoryFields,
} from '../../lib/modules/import-export/parsers/gallery-categories-json';

import {
  validateGalleryItem,
  validateGalleryCategory,
} from '../../lib/modules/import-export/validators/gallery';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_CATEGORY = {
  id: 'cat-123',
  slug: 'sculptures',
  name_en: 'Sculptures',
  name_zh: '雕塑',
  sort_order: 1,
  is_visible: true,
  show_in_nav: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

const MOCK_ITEM = {
  id: 'item-123',
  slug: 'bronze-figure',
  category_id: 'cat-123',
  title_en: 'Bronze Figure',
  title_zh: '青銅人像',
  description_en: 'A beautiful bronze sculpture',
  description_zh: '一座精美的青銅雕塑',
  image_url: 'https://example.com/img.jpg',
  image_alt_en: 'Bronze figure sculpture',
  image_alt_zh: '青銅人像雕塑',
  material_en: 'Bronze',
  material_zh: '青銅',
  tags_en: ['bronze', 'sculpture'],
  tags_zh: ['青銅', '雕塑'],
  is_visible: true,
  like_count: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  image_width: null,
  image_height: null,
  og_image_format: 'jpg' as const,
};

// =============================================================================
// Formatter Tests
// =============================================================================

describe('Gallery Items JSON Formatter', () => {
  describe('buildCategorySlugMap', () => {
    it('creates map from categories', () => {
      const map = buildCategorySlugMap([MOCK_CATEGORY]);
      assert.equal(map.get('cat-123'), 'sculptures');
    });

    it('handles empty array', () => {
      const map = buildCategorySlugMap([]);
      assert.equal(map.size, 0);
    });
  });

  describe('transformGalleryItemToExportData', () => {
    it('transforms item with category slug', () => {
      const categoryMap = buildCategorySlugMap([MOCK_CATEGORY]);
      const exported = transformGalleryItemToExportData(MOCK_ITEM, categoryMap);

      assert.equal(exported.slug, 'bronze-figure');
      assert.equal(exported.category, 'sculptures');
      assert.equal(exported.title_en, 'Bronze Figure');
      assert.equal(exported.title_zh, '青銅人像');
      assert.deepEqual(exported.tags_en, ['bronze', 'sculpture']);
    });

    it('handles missing category', () => {
      const categoryMap = new Map<string, string>();
      const exported = transformGalleryItemToExportData(MOCK_ITEM, categoryMap);

      assert.equal(exported.category, '');
    });
  });

  describe('formatGalleryItemsToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatGalleryItemsToJson([MOCK_ITEM], [MOCK_CATEGORY], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'gallery_items');
      assert.equal(envelope.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(envelope.data.length, 1);
    });
  });
});

describe('Gallery Categories JSON Formatter', () => {
  describe('transformGalleryCategoryToExportData', () => {
    it('transforms category to export format', () => {
      const exported = transformGalleryCategoryToExportData(MOCK_CATEGORY);

      assert.equal(exported.slug, 'sculptures');
      assert.equal(exported.name_en, 'Sculptures');
      assert.equal(exported.name_zh, '雕塑');
      assert.equal(exported.sort_order, 1);
      assert.equal(exported.is_visible, true);
    });
  });

  describe('formatGalleryCategoriesToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatGalleryCategoriesToJson([MOCK_CATEGORY], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'gallery_categories');
      assert.equal(envelope.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(envelope.data.length, 1);
    });
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

describe('Gallery Items JSON Parser', () => {
  describe('validateGalleryItemFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        slug: 'test',
        category: 'sculptures',
        title_en: 'Test Item',
        title_zh: '測試項目',
        image_url: 'https://example.com/img.jpg',
      };
      assert.deepEqual(validateGalleryItemFields(data), []);
    });

    it('returns missing fields', () => {
      const data = { slug: 'test' };
      const missing = validateGalleryItemFields(data);
      assert.ok(missing.includes('category'));
      assert.ok(missing.includes('title'));
    });
  });

  describe('parseGalleryItemsJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'gallery_items',
        data: [{
          slug: 'test',
          category: 'sculptures',
          title_en: 'Test',
          title_zh: '測試',
          description_en: '',
          description_zh: '',
          image_url: 'https://example.com/img.jpg',
          is_visible: true,
        }],
      });

      const result = parseGalleryItemsJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
      assert.equal(result.data?.[0].slug, 'test');
    });

    it('fails on wrong type', () => {
      const json = JSON.stringify({
        type: 'wrong_type',
        data: [],
      });

      const result = parseGalleryItemsJson(json);
      assert.equal(result.success, false);
      assert.ok(result.error?.includes('type 無效'));
    });
  });
});

describe('Gallery Categories JSON Parser', () => {
  describe('validateGalleryCategoryFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        slug: 'test',
        name_en: 'Test',
        name_zh: '測試',
      };
      assert.deepEqual(validateGalleryCategoryFields(data), []);
    });
  });

  describe('parseGalleryCategoriesJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'gallery_categories',
        data: [{
          slug: 'sculptures',
          name_en: 'Sculptures',
          name_zh: '雕塑',
          sort_order: 1,
          is_visible: true,
        }],
      });

      const result = parseGalleryCategoriesJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
    });
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe('Gallery Validators', () => {
  describe('validateGalleryItem', () => {
    it('validates correct item', () => {
      const item = {
        slug: 'bronze-figure',
        category_slug: 'sculptures',
        title_en: 'Bronze Figure',
        title_zh: '青銅人像',
        description_en: '',
        description_zh: '',
        image_url: 'https://example.com/img.jpg',
        image_alt_en: null,
        image_alt_zh: null,
        material_en: null,
        material_zh: null,
        tags_en: [],
        tags_zh: [],
        is_visible: true,
      };
      const existingCategories = new Set(['sculptures']);

      const result = validateGalleryItem(item, existingCategories);
      assert.equal(result.valid, true);
    });

    it('fails on missing category', () => {
      const item = {
        slug: 'bronze-figure',
        category_slug: 'nonexistent',
        title_en: 'Bronze Figure',
        title_zh: '青銅人像',
        description_en: '',
        description_zh: '',
        image_url: 'https://example.com/img.jpg',
        image_alt_en: null,
        image_alt_zh: null,
        material_en: null,
        material_zh: null,
        tags_en: [],
        tags_zh: [],
        is_visible: true,
      };
      const existingCategories = new Set(['sculptures']);

      const result = validateGalleryItem(item, existingCategories);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.field === 'category'));
    });

    it('fails on invalid slug', () => {
      const item = {
        slug: 'INVALID SLUG',
        category_slug: 'sculptures',
        title_en: 'Test',
        title_zh: '測試',
        description_en: '',
        description_zh: '',
        image_url: 'https://example.com/img.jpg',
        image_alt_en: null,
        image_alt_zh: null,
        material_en: null,
        material_zh: null,
        tags_en: [],
        tags_zh: [],
        is_visible: true,
      };
      const existingCategories = new Set(['sculptures']);

      const result = validateGalleryItem(item, existingCategories);
      assert.equal(result.valid, false);
      assert.ok(result.errors.some(e => e.field === 'slug'));
    });
  });

  describe('validateGalleryCategory', () => {
    it('validates correct category', () => {
      const category = {
        slug: 'sculptures',
        name_en: 'Sculptures',
        name_zh: '雕塑',
        sort_order: 1,
        is_visible: true,
      };

      const result = validateGalleryCategory(category);
      assert.equal(result.valid, true);
    });

    it('fails on invalid slug', () => {
      const category = {
        slug: 'INVALID',
        name_en: 'Sculptures',
        name_zh: '雕塑',
        sort_order: 1,
        is_visible: true,
      };

      const result = validateGalleryCategory(category);
      assert.equal(result.valid, false);
    });
  });
});
