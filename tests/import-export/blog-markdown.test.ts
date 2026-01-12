/**
 * Blog Markdown Formatter/Parser Tests
 *
 * Tests for blog post Markdown export/import pure functions.
 * Uses Node.js built-in test runner.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatBlogPostToMarkdown,
  formatBlogPostsFolderStructure,
  extractFrontmatter,
  serializeFrontmatter,
  escapeYamlString,
  LANG_MARKER_EN,
  LANG_MARKER_ZH,
} from '../../lib/modules/import-export/formatters/blog-post-markdown';

import {
  parseBlogPostMarkdown,
  parseBilingualContent,
  validateFrontmatterFields,
  isValidVisibility,
} from '../../lib/modules/import-export/parsers/blog-post-markdown';

import type { Post } from '../../lib/types/blog';

// =============================================================================
// Test Fixtures
// =============================================================================

const MOCK_CATEGORY = {
  id: 'cat-123',
  name_en: 'Technology',
  name_zh: '科技',
  slug: 'tech',
  created_at: '2025-01-01T00:00:00Z',
};

const MOCK_POST: Post = {
  id: 'post-123',
  title_en: 'My First Post',
  title_zh: '我的第一篇文章',
  slug: 'my-first-post',
  content_en: '# Welcome\n\nThis is English content.',
  content_zh: '# 歡迎\n\n這是中文內容。',
  excerpt_en: 'A short summary...',
  excerpt_zh: '簡短摘要...',
  cover_image_url: null,
  cover_image_url_en: 'https://example.com/img-en.jpg',
  cover_image_url_zh: 'https://example.com/img-zh.jpg',
  cover_image_alt_en: 'English image description',
  cover_image_alt_zh: '中文圖片說明',
  category_id: 'cat-123',
  category: MOCK_CATEGORY,
  visibility: 'public',
  author_id: 'author-123',
  published_at: '2025-01-01T00:00:00Z',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  reading_time_minutes: 5,
};

const MOCK_POST_MINIMAL: Post = {
  id: 'post-456',
  title_en: 'Minimal Post',
  title_zh: null,
  slug: 'minimal-post',
  content_en: 'Just English content.',
  content_zh: null,
  excerpt_en: null,
  excerpt_zh: null,
  cover_image_url: null,
  cover_image_url_en: null,
  cover_image_url_zh: null,
  cover_image_alt_en: null,
  cover_image_alt_zh: null,
  category_id: null,
  category: undefined,
  visibility: 'draft',
  author_id: 'author-123',
  published_at: null,
  created_at: '2025-01-02T00:00:00Z',
  updated_at: '2025-01-02T00:00:00Z',
  reading_time_minutes: null,
};

// =============================================================================
// Formatter Tests
// =============================================================================

describe('Blog Post Markdown Formatter', () => {
  describe('escapeYamlString', () => {
    it('returns plain string as-is', () => {
      assert.equal(escapeYamlString('hello world'), 'hello world');
    });

    it('quotes strings with colons', () => {
      assert.equal(escapeYamlString('hello: world'), '"hello: world"');
    });

    it('quotes strings with hashes', () => {
      assert.equal(escapeYamlString('hello #world'), '"hello #world"');
    });

    it('escapes internal quotes', () => {
      assert.equal(escapeYamlString('say "hello"'), '"say \\"hello\\""');
    });

    it('quotes strings with leading/trailing spaces', () => {
      assert.equal(escapeYamlString(' hello '), '" hello "');
    });
  });

  describe('extractFrontmatter', () => {
    it('extracts all fields from full post', () => {
      const fm = extractFrontmatter(MOCK_POST);
      assert.equal(fm.slug, 'my-first-post');
      assert.equal(fm.category, 'tech');
      assert.equal(fm.visibility, 'public');
      assert.equal(fm.title_en, 'My First Post');
      assert.equal(fm.title_zh, '我的第一篇文章');
      assert.equal(fm.excerpt_en, 'A short summary...');
    });

    it('handles missing optional fields', () => {
      const fm = extractFrontmatter(MOCK_POST_MINIMAL);
      assert.equal(fm.slug, 'minimal-post');
      assert.equal(fm.category, '');
      assert.equal(fm.visibility, 'draft');
      assert.equal(fm.title_zh, undefined);
      assert.equal(fm.excerpt_en, undefined);
    });
  });

  describe('serializeFrontmatter', () => {
    it('serializes required fields', () => {
      const fm = extractFrontmatter(MOCK_POST_MINIMAL);
      const yaml = serializeFrontmatter(fm);
      assert.ok(yaml.includes('slug: minimal-post'));
      assert.ok(yaml.includes('visibility: draft'));
      assert.ok(yaml.includes('title_en: Minimal Post'));
    });

    it('includes optional fields when present', () => {
      const fm = extractFrontmatter(MOCK_POST);
      const yaml = serializeFrontmatter(fm);
      assert.ok(yaml.includes('title_zh: 我的第一篇文章'));
      assert.ok(yaml.includes('excerpt_en: A short summary...'));
    });
  });

  describe('formatBlogPostToMarkdown', () => {
    it('creates valid Markdown with frontmatter', () => {
      const md = formatBlogPostToMarkdown(MOCK_POST);
      assert.ok(md.startsWith('---\n'));
      assert.ok(md.includes('slug: my-first-post'));
      assert.ok(md.includes('---\n\n'));
    });

    it('includes language markers for bilingual content', () => {
      const md = formatBlogPostToMarkdown(MOCK_POST);
      assert.ok(md.includes(LANG_MARKER_EN));
      assert.ok(md.includes(LANG_MARKER_ZH));
      assert.ok(md.includes('# Welcome'));
      assert.ok(md.includes('# 歡迎'));
    });

    it('omits ZH marker for English-only content', () => {
      const md = formatBlogPostToMarkdown(MOCK_POST_MINIMAL);
      assert.ok(md.includes(LANG_MARKER_EN));
      assert.ok(!md.includes(LANG_MARKER_ZH));
    });
  });

  describe('formatBlogPostsFolderStructure', () => {
    it('organizes posts by category', () => {
      const result = formatBlogPostsFolderStructure([MOCK_POST, MOCK_POST_MINIMAL]);
      assert.equal(result.size, 2);
      assert.ok(result.has('tech/my-first-post.md'));
      assert.ok(result.has('uncategorized/minimal-post.md'));
    });
  });
});

// =============================================================================
// Parser Tests
// =============================================================================

describe('Blog Post Markdown Parser', () => {
  describe('isValidVisibility', () => {
    it('accepts valid visibilities', () => {
      assert.equal(isValidVisibility('draft'), true);
      assert.equal(isValidVisibility('private'), true);
      assert.equal(isValidVisibility('public'), true);
    });

    it('rejects invalid visibilities', () => {
      assert.equal(isValidVisibility('published'), false);
      assert.equal(isValidVisibility(''), false);
      assert.equal(isValidVisibility(null), false);
    });
  });

  describe('validateFrontmatterFields', () => {
    it('returns empty array for valid data', () => {
      const data = {
        slug: 'test',
        category: 'tech',
        visibility: 'public',
        title_en: 'Test',
      };
      assert.deepEqual(validateFrontmatterFields(data), []);
    });

    it('returns missing fields', () => {
      const data = { slug: 'test' };
      const missing = validateFrontmatterFields(data);
      assert.ok(missing.includes('category'));
      assert.ok(missing.includes('visibility'));
      assert.ok(missing.includes('title_en'));
    });
  });

  describe('parseBilingualContent', () => {
    it('parses content with both markers', () => {
      const content = `${LANG_MARKER_EN}\n\nEnglish here\n\n${LANG_MARKER_ZH}\n\n中文在這`;
      const result = parseBilingualContent(content);
      assert.equal(result.content_en, 'English here');
      assert.equal(result.content_zh, '中文在這');
    });

    it('handles EN marker only', () => {
      const content = `${LANG_MARKER_EN}\n\nEnglish only`;
      const result = parseBilingualContent(content);
      assert.equal(result.content_en, 'English only');
      assert.equal(result.content_zh, undefined);
    });

    it('treats content without markers as English', () => {
      const content = 'Plain content without markers';
      const result = parseBilingualContent(content);
      assert.equal(result.content_en, 'Plain content without markers');
      assert.equal(result.content_zh, undefined);
    });
  });

  describe('parseBlogPostMarkdown', () => {
    it('parses valid Markdown with frontmatter', () => {
      const md = formatBlogPostToMarkdown(MOCK_POST);
      const result = parseBlogPostMarkdown(md);

      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.frontmatter.slug, 'my-first-post');
      assert.equal(result.data.frontmatter.category, 'tech');
      assert.equal(result.data.frontmatter.visibility, 'public');
    });

    it('fails on missing required frontmatter', () => {
      const md = '---\nslug: test\n---\nContent';
      const result = parseBlogPostMarkdown(md);

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('Missing required frontmatter'));
    });

    it('fails on invalid visibility', () => {
      const md = `---
slug: test
category: tech
visibility: published
title_en: Test
---
Content`;
      const result = parseBlogPostMarkdown(md);

      assert.equal(result.success, false);
      assert.ok(result.error?.includes('Invalid visibility'));
    });

    it('round-trips formatted content', () => {
      const md = formatBlogPostToMarkdown(MOCK_POST);
      const result = parseBlogPostMarkdown(md);

      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data.frontmatter.slug, MOCK_POST.slug);
      assert.equal(result.data.frontmatter.title_en, MOCK_POST.title_en);
      assert.ok(result.data.content_en.includes('Welcome'));
      assert.ok(result.data.content_zh?.includes('歡迎'));
    });
  });
});
