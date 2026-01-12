/**
 * Content JSON Formatter/Parser Tests
 *
 * Tests for site content and landing sections import/export pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  transformSiteContentToExportData,
  formatSiteContentToJson,
} from '../../lib/modules/import-export/formatters/site-content-json';

import {
  transformLandingSectionToExportData,
  formatLandingSectionsToJson,
} from '../../lib/modules/import-export/formatters/landing-sections-json';

import {
  parseSiteContentJson,
  validateSiteContentFields,
} from '../../lib/modules/import-export/parsers/site-content-json';

import {
  parseLandingSectionsJson,
  validateLandingSectionFields,
} from '../../lib/modules/import-export/parsers/landing-sections-json';

import {
  validateSiteContent,
  validateLandingSection,
} from '../../lib/modules/import-export/validators/content';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_SITE_CONTENT = {
  id: 'sc-123',
  section_key: 'about',
  is_published: true,
  content_en: { title: 'About Us', body: 'We are a company.' },
  content_zh: { title: '關於我們', body: '我們是一家公司。' },
  updated_at: '2025-01-01T00:00:00Z',
  updated_by: null,
};

const MOCK_LANDING_SECTION = {
  id: 'ls-123',
  section_key: 'hero',
  section_type: 'text_image' as const,
  sort_order: 0,
  is_visible: true,
  title_en: 'Welcome',
  title_zh: '歡迎',
  subtitle_en: 'Subtitle',
  subtitle_zh: '副標題',
  content_en: null,
  content_zh: null,
  gallery_category_id: null,
  gallery_surface: null,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

// =============================================================================
// Site Content Formatter Tests
// =============================================================================

describe('Site Content JSON Formatter', () => {
  describe('transformSiteContentToExportData', () => {
    it('transforms site content to export format', () => {
      const exported = transformSiteContentToExportData(MOCK_SITE_CONTENT);

      assert.equal(exported.section_key, 'about');
      assert.equal(exported.is_published, true);
      assert.deepEqual(exported.content_en, { title: 'About Us', body: 'We are a company.' });
    });
  });

  describe('formatSiteContentToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatSiteContentToJson([MOCK_SITE_CONTENT], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'site_content');
      assert.equal(envelope.exportedAt, '2025-01-01T00:00:00Z');
      assert.equal(envelope.data.length, 1);
    });
  });
});

// =============================================================================
// Landing Sections Formatter Tests
// =============================================================================

describe('Landing Sections JSON Formatter', () => {
  describe('transformLandingSectionToExportData', () => {
    it('transforms landing section to export format', () => {
      const exported = transformLandingSectionToExportData(MOCK_LANDING_SECTION);

      assert.equal(exported.section_key, 'hero');
      assert.equal(exported.section_type, 'text_image');
      assert.equal(exported.sort_order, 0);
      assert.equal(exported.title_en, 'Welcome');
    });
  });

  describe('formatLandingSectionsToJson', () => {
    it('creates valid export envelope', () => {
      const envelope = formatLandingSectionsToJson([MOCK_LANDING_SECTION], '2025-01-01T00:00:00Z');

      assert.equal(envelope.type, 'landing_sections');
      assert.equal(envelope.data.length, 1);
    });
  });
});

// =============================================================================
// Site Content Parser Tests
// =============================================================================

describe('Site Content JSON Parser', () => {
  describe('validateSiteContentFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        section_key: 'about',
        content_en: { title: 'About' },
        content_zh: { title: '關於' },
      };
      assert.deepEqual(validateSiteContentFields(data), []);
    });

    it('returns missing fields', () => {
      const data = { section_key: 'about' };
      const missing = validateSiteContentFields(data);
      assert.ok(missing.includes('content_en'));
      assert.ok(missing.includes('content_zh'));
    });
  });

  describe('parseSiteContentJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'site_content',
        data: [{
          section_key: 'about',
          is_published: true,
          content_en: { title: 'About' },
          content_zh: { title: '關於' },
        }],
      });

      const result = parseSiteContentJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
    });

    it('fails on wrong type', () => {
      const json = JSON.stringify({
        type: 'wrong_type',
        data: [],
      });

      const result = parseSiteContentJson(json);
      assert.equal(result.success, false);
    });
  });
});

// =============================================================================
// Landing Sections Parser Tests
// =============================================================================

describe('Landing Sections JSON Parser', () => {
  describe('validateLandingSectionFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        section_key: 'hero',
        section_type: 'text_image',
      };
      assert.deepEqual(validateLandingSectionFields(data), []);
    });

    it('returns errors for invalid type', () => {
      const data = {
        section_key: 'hero',
        section_type: 'invalid_type',
      };
      const errors = validateLandingSectionFields(data);
      assert.ok(errors.length > 0);
    });
  });

  describe('parseLandingSectionsJson', () => {
    it('parses valid JSON', () => {
      const json = JSON.stringify({
        exportedAt: '2025-01-01T00:00:00Z',
        type: 'landing_sections',
        data: [{
          section_key: 'hero',
          section_type: 'text_image',
          sort_order: 0,
          is_visible: true,
        }],
      });

      const result = parseLandingSectionsJson(json);
      assert.equal(result.success, true);
      assert.equal(result.data?.length, 1);
    });
  });
});

// =============================================================================
// Content Validator Tests
// =============================================================================

describe('Content Validators', () => {
  describe('validateSiteContent', () => {
    it('validates correct content', () => {
      const content = {
        section_key: 'about',
        is_published: true,
        content_en: { title: 'About' },
        content_zh: { title: '關於' },
      };

      const result = validateSiteContent(content);
      assert.equal(result.valid, true);
    });

    it('fails on empty section key', () => {
      const content = {
        section_key: '',
        is_published: true,
        content_en: { title: 'About' },
        content_zh: { title: '關於' },
      };

      const result = validateSiteContent(content);
      assert.equal(result.valid, false);
    });
  });

  describe('validateLandingSection', () => {
    it('validates correct section', () => {
      const section = {
        section_key: 'hero',
        section_type: 'text_image',
        sort_order: 0,
        is_visible: true,
        title_en: null,
        title_zh: null,
        subtitle_en: null,
        subtitle_zh: null,
        content_en: null,
        content_zh: null,
      };

      const result = validateLandingSection(section);
      assert.equal(result.valid, true);
    });

    it('fails on invalid section type', () => {
      const section = {
        section_key: 'hero',
        section_type: 'invalid_type',
        sort_order: 0,
        is_visible: true,
        title_en: null,
        title_zh: null,
        subtitle_en: null,
        subtitle_zh: null,
        content_en: null,
        content_zh: null,
      };

      const result = validateLandingSection(section);
      assert.equal(result.valid, false);
    });
  });
});
