/**
 * Blog Categories JSON Formatter/Parser Tests
 *
 * Tests for blog categories JSON export/import pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatBlogCategoriesToJson,
  formatBlogCategoriesToJsonString,
  transformCategoryToExportData,
} from '../../lib/modules/import-export/formatters/blog-categories-json';

import {
  parseBlogCategoriesJsonString,
  parseBlogCategoriesArray,
  validateEnvelopeStructure,
  validateCategoryObject,
} from '../../lib/modules/import-export/parsers/blog-categories-json';

import {
  validateBlogCategoryData,
  validateBlogCategoriesArray,
  findDuplicateCategorySlugs,
} from '../../lib/modules/import-export/validators/blog';

import type { Category } from '../../lib/types/blog';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_CATEGORIES: Category[] = [
  {
    id: 'cat-1',
    name_en: 'Technology',
    name_zh: '科技',
    slug: 'tech',
    created_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name_en: 'Lifestyle',
    name_zh: '生活',
    slug: 'lifestyle',
    created_at: '2025-01-02T00:00:00Z',
  },
];

const VALID_EXPORT_JSON = `{
  "exportedAt": "2025-01-01T00:00:00Z",
  "type": "blog_categories",
  "data": [
    { "slug": "tech", "name_en": "Technology", "name_zh": "科技" },
    { "slug": "lifestyle", "name_en": "Lifestyle", "name_zh": "生活" }
  ]
}`;

// =============================================================================
// Formatter Tests
// =============================================================================

describe('Blog Categories JSON Formatter', () => {
  describe('transformCategoryToExportData', () => {
    it('extracts only export fields', () => {
      const result = transformCategoryToExportData(MOCK_CATEGORIES[0]);
      assert.equal(result.slug, 'tech');
      assert.equal(result.name_en, 'Technology');
      assert.equal(result.name_zh, '科技');
      // Should not include id or created_at
      assert.equal('id' in result, false);
      assert.equal('created_at' in result, false);
    });
  });

  describe('formatBlogCategoriesToJson', () => {
    it('creates export envelope with correct structure', () => {
      const result = formatBlogCategoriesToJson(
        MOCK_CATEGORIES,
        '2025-01-01T00:00:00Z'
      );
      assert.equal(result.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(result.type, 'blog_categories');
      assert.equal(result.data.length, 2);
    });

    it('uses current timestamp if not provided', () => {
      const before = new Date().toISOString();
      const result = formatBlogCategoriesToJson(MOCK_CATEGORIES);
      const after = new Date().toISOString();

      assert.ok(result.exportedAt >= before);
      assert.ok(result.exportedAt <= after);
    });
  });

  describe('formatBlogCategoriesToJsonString', () => {
    it('outputs valid JSON string', () => {
      const jsonStr = formatBlogCategoriesToJsonString(
        MOCK_CATEGORIES,
        '2025-01-01T00:00:00Z'
      );
      const parsed = JSON.parse(jsonStr);
      assert.equal(parsed.type, 'blog_categories');
      assert.equal(parsed.data.length, 2);
    });

    it('supports non-pretty output', () => {
      const jsonStr = formatBlogCategoriesToJsonString(
        MOCK_CATEGORIES,
        '2025-01-01T00:00:00Z',
        false
      );
      assert.ok(!jsonStr.includes('\n'));
    });
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

describe('Blog Categories JSON Parser', () => {
  describe('validateEnvelopeStructure', () => {
    it('accepts valid envelope', () => {
      const envelope = JSON.parse(VALID_EXPORT_JSON);
      assert.equal(validateEnvelopeStructure(envelope), undefined);
    });

    it('rejects non-object', () => {
      assert.ok(validateEnvelopeStructure(null)?.includes('object'));
      assert.ok(validateEnvelopeStructure('string')?.includes('object'));
    });

    it('rejects wrong type', () => {
      const envelope = { exportedAt: '2025-01-01', type: 'wrong', data: [] };
      assert.ok(validateEnvelopeStructure(envelope)?.includes('Invalid type'));
    });

    it('rejects missing data array', () => {
      const envelope = { exportedAt: '2025-01-01', type: 'blog_categories' };
      assert.ok(validateEnvelopeStructure(envelope)?.includes('data'));
    });
  });

  describe('validateCategoryObject', () => {
    it('accepts valid category', () => {
      const cat = { slug: 'tech', name_en: 'Tech', name_zh: '科技' };
      assert.equal(validateCategoryObject(cat, 0), undefined);
    });

    it('rejects missing slug', () => {
      const cat = { name_en: 'Tech', name_zh: '科技' };
      assert.ok(validateCategoryObject(cat, 0)?.includes('slug'));
    });

    it('rejects empty name_en', () => {
      const cat = { slug: 'tech', name_en: '', name_zh: '科技' };
      assert.ok(validateCategoryObject(cat, 0)?.includes('name_en'));
    });
  });

  describe('parseBlogCategoriesJsonString', () => {
    it('parses valid JSON string', () => {
      const result = parseBlogCategoriesJsonString(VALID_EXPORT_JSON);
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.data.length, 2);
    });

    it('fails on invalid JSON', () => {
      const result = parseBlogCategoriesJsonString('not json');
      assert.equal(result.success, false);
      assert.ok(result.error?.includes('parse JSON'));
    });
  });

  describe('parseBlogCategoriesArray', () => {
    it('extracts data array from envelope', () => {
      const result = parseBlogCategoriesArray(VALID_EXPORT_JSON);
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.length, 2);
      assert.equal(result.data[0].slug, 'tech');
    });
  });

  describe('round-trip', () => {
    it('formatter output can be parsed back', () => {
      const jsonStr = formatBlogCategoriesToJsonString(MOCK_CATEGORIES);
      const result = parseBlogCategoriesJsonString(jsonStr);

      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.data.length, 2);
      assert.equal(result.data.data[0].slug, 'tech');
      assert.equal(result.data.data[1].slug, 'lifestyle');
    });
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe('Blog Category Validators', () => {
  describe('validateBlogCategoryData', () => {
    it('validates correct category', () => {
      const result = validateBlogCategoryData({
        slug: 'tech',
        name_en: 'Technology',
        name_zh: '科技',
      });
      assert.equal(result.valid, true);
      assert.ok(result.data);
    });

    it('rejects invalid slug', () => {
      const result = validateBlogCategoryData({
        slug: 'invalid slug!',
        name_en: 'Tech',
        name_zh: '科技',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors?.slug);
    });

    it('rejects empty names', () => {
      const result = validateBlogCategoryData({
        slug: 'tech',
        name_en: '',
        name_zh: '科技',
      });
      assert.equal(result.valid, false);
      assert.ok(result.errors?.name_en);
    });
  });

  describe('validateBlogCategoriesArray', () => {
    it('validates array with all valid items', () => {
      const result = validateBlogCategoriesArray([
        { slug: 'tech', name_en: 'Tech', name_zh: '科技' },
        { slug: 'life', name_en: 'Life', name_zh: '生活' },
      ]);
      assert.equal(result.valid.length, 2);
      assert.equal(result.errors.length, 0);
    });

    it('separates valid and invalid items', () => {
      const result = validateBlogCategoriesArray([
        { slug: 'tech', name_en: 'Tech', name_zh: '科技' },
        { slug: 'bad slug!', name_en: 'Bad', name_zh: '錯誤' },
      ]);
      assert.equal(result.valid.length, 1);
      assert.equal(result.errors.length, 1);
      assert.equal(result.errors[0].index, 1);
    });
  });

  describe('findDuplicateCategorySlugs', () => {
    it('returns empty for unique slugs', () => {
      const result = findDuplicateCategorySlugs([
        { slug: 'a', name_en: 'A', name_zh: 'A' },
        { slug: 'b', name_en: 'B', name_zh: 'B' },
      ]);
      assert.deepEqual(result, []);
    });

    it('finds duplicate slugs', () => {
      const result = findDuplicateCategorySlugs([
        { slug: 'tech', name_en: 'Tech 1', name_zh: '科技1' },
        { slug: 'life', name_en: 'Life', name_zh: '生活' },
        { slug: 'tech', name_en: 'Tech 2', name_zh: '科技2' },
      ]);
      assert.deepEqual(result, ['tech']);
    });
  });
});
