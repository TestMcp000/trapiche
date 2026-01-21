/**
 * Comment Permalink v2 Canonical Tests
 *
 * PR-9: Validates that permalink output matches v2 canonical URL patterns.
 * Since buildPermalink() is server-only with DB access, we test the URL pattern
 * validation indirectly via url-builders integration.
 *
 * @see STEP_PLAN.md PR-9 (Comments/Akismet permalink v2 canonical)
 * @see seo-canonical-links.test.ts (URL builders unit tests)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildBlogPostUrl, buildGalleryItemUrl } from '@/lib/seo/url-builders';
import { DEFAULT_LOCALE } from '@/lib/i18n/locales';

describe('Comment Permalink v2 Canonical Patterns', () => {
    describe('Post Permalink Pattern', () => {
        it('generates v2 canonical path with locale prefix', () => {
            const slug = 'my-test-post';
            const path = buildBlogPostUrl(DEFAULT_LOCALE, slug);

            assert.ok(path.includes('/zh/blog/posts/'), 'Post path should include /zh/blog/posts/');
            assert.strictEqual(path, '/zh/blog/posts/my-test-post');
        });

        it('uses zh locale as default for Akismet', () => {
            // DEFAULT_LOCALE should be 'zh' as per locales.ts
            assert.strictEqual(DEFAULT_LOCALE, 'zh', 'DEFAULT_LOCALE should be zh');
        });

        it('handles slugs with special characters', () => {
            const slug = 'my-post-2024';
            const path = buildBlogPostUrl(DEFAULT_LOCALE, slug);

            assert.ok(!path.includes('/blog/${'), 'Path should be interpolated, not template literal');
            assert.strictEqual(path, '/zh/blog/posts/my-post-2024');
        });
    });

    describe('Gallery Item Permalink Pattern', () => {
        it('generates v2 canonical path with locale and category', () => {
            const categorySlug = 'portraits';
            const itemSlug = 'summer-photo';
            const path = buildGalleryItemUrl(DEFAULT_LOCALE, categorySlug, itemSlug);

            assert.ok(path.includes('/zh/gallery/items/'), 'Gallery path should include /zh/gallery/items/');
            assert.strictEqual(path, '/zh/gallery/items/portraits/summer-photo');
        });

        it('includes category slug in gallery permalink', () => {
            const path = buildGalleryItemUrl('zh', 'landscapes', 'mountain-view');

            assert.ok(path.includes('/landscapes/'), 'Gallery path should include category slug');
            assert.ok(path.includes('/mountain-view'), 'Gallery path should include item slug');
        });

        it('handles uncategorized fallback', () => {
            const path = buildGalleryItemUrl(DEFAULT_LOCALE, 'uncategorized', 'orphan-item');

            assert.strictEqual(path, '/zh/gallery/items/uncategorized/orphan-item');
        });
    });

    describe('Permalink URL Construction', () => {
        it('path can be prepended with SITE_URL for absolute URL', () => {
            const testSiteUrl = 'https://example.com';
            const path = buildBlogPostUrl(DEFAULT_LOCALE, 'test-post');
            const absoluteUrl = `${testSiteUrl}${path}`;

            assert.ok(absoluteUrl.startsWith('https://'), 'Absolute URL should start with protocol');
            assert.strictEqual(absoluteUrl, 'https://example.com/zh/blog/posts/test-post');
        });

        it('does not produce v1 URL patterns (no /blog/<slug> without posts)', () => {
            const path = buildBlogPostUrl(DEFAULT_LOCALE, 'any-slug');

            // v1 pattern was: /blog/<slug> (no locale, no /posts/ segment)
            assert.ok(path.includes('/posts/'), 'Must use v2 /posts/ segment');
            assert.ok(path.startsWith('/zh/'), 'Must include locale prefix');
        });

        it('does not produce v1 gallery patterns (no /gallery/<category>/<slug>)', () => {
            const path = buildGalleryItemUrl(DEFAULT_LOCALE, 'cat', 'item');

            // v1 pattern was: /gallery/<category>/<slug> (no locale, no /items/ segment)
            assert.ok(path.includes('/items/'), 'Must use v2 /items/ segment');
            assert.ok(path.startsWith('/zh/'), 'Must include locale prefix');
        });
    });
});
