/**
 * SEO Canonical Links Tests
 * 
 * PR-6C: Regression tests to verify canonical URL patterns are correct.
 * These tests prevent reintroduction of non-canonical internal links.
 * 
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    buildBlogPostUrl,
    buildBlogCategoryUrl,
    buildBlogListUrl,
    buildGalleryItemUrl,
    buildGalleryCategoryUrl,
    buildGalleryListUrl,
} from '@/lib/seo/url-builders';

describe('SEO Canonical URL Builders', () => {
    describe('Blog URL Builders', () => {
        describe('buildBlogPostUrl', () => {
            it('generates v2 canonical post URL', () => {
                const url = buildBlogPostUrl('zh', 'my-post');
                assert.strictEqual(url, '/zh/blog/posts/my-post');
            });

            it('handles different locales', () => {
                const url = buildBlogPostUrl('en', 'test-article');
                assert.strictEqual(url, '/en/blog/posts/test-article');
            });
        });

        describe('buildBlogCategoryUrl', () => {
            it('generates v2 canonical category URL', () => {
                const url = buildBlogCategoryUrl('zh', 'tech');
                assert.strictEqual(url, '/zh/blog/categories/tech');
            });

            it('preserves query params', () => {
                const url = buildBlogCategoryUrl('zh', 'tech', { q: 'search', sort: 'newest' });
                assert.strictEqual(url, '/zh/blog/categories/tech?q=search&sort=newest');
            });

            it('only adds non-empty query params', () => {
                const url = buildBlogCategoryUrl('zh', 'tech', { q: '', sort: 'newest' });
                assert.strictEqual(url, '/zh/blog/categories/tech?sort=newest');
            });

            it('handles no query params', () => {
                const url = buildBlogCategoryUrl('zh', 'tech', {});
                assert.strictEqual(url, '/zh/blog/categories/tech');
            });
        });

        describe('buildBlogListUrl', () => {
            it('generates blog list URL without query', () => {
                const url = buildBlogListUrl('zh');
                assert.strictEqual(url, '/zh/blog');
            });

            it('generates blog list URL with query params', () => {
                const url = buildBlogListUrl('zh', { q: 'react', sort: 'oldest' });
                assert.strictEqual(url, '/zh/blog?q=react&sort=oldest');
            });
        });
    });

    describe('Gallery URL Builders', () => {
        describe('buildGalleryItemUrl', () => {
            it('generates v2 canonical item URL', () => {
                const url = buildGalleryItemUrl('zh', 'portraits', 'summer-photo');
                assert.strictEqual(url, '/zh/gallery/items/portraits/summer-photo');
            });

            it('handles different locales', () => {
                const url = buildGalleryItemUrl('en', 'landscapes', 'mountain-view');
                assert.strictEqual(url, '/en/gallery/items/landscapes/mountain-view');
            });
        });

        describe('buildGalleryCategoryUrl', () => {
            it('generates v2 canonical category URL', () => {
                const url = buildGalleryCategoryUrl('zh', 'portraits');
                assert.strictEqual(url, '/zh/gallery/categories/portraits');
            });

            it('preserves query params', () => {
                const url = buildGalleryCategoryUrl('zh', 'portraits', { q: 'summer', tag: 'nature', sort: 'newest' });
                assert.strictEqual(url, '/zh/gallery/categories/portraits?q=summer&tag=nature&sort=newest');
            });

            it('only adds non-empty query params', () => {
                const url = buildGalleryCategoryUrl('zh', 'portraits', { q: '', tag: 'nature', sort: '' });
                assert.strictEqual(url, '/zh/gallery/categories/portraits?tag=nature');
            });
        });

        describe('buildGalleryListUrl', () => {
            it('generates gallery list URL without query', () => {
                const url = buildGalleryListUrl('zh');
                assert.strictEqual(url, '/zh/gallery');
            });

            it('generates gallery list URL with query params', () => {
                const url = buildGalleryListUrl('zh', { q: 'sunset', tag: 'landscape', sort: 'popular' });
                assert.strictEqual(url, '/zh/gallery?q=sunset&tag=landscape&sort=popular');
            });
        });
    });

    describe('Canonical URL Pattern Validation', () => {
        it('blog post URLs use /posts/ segment (not category-based)', () => {
            const url = buildBlogPostUrl('zh', 'any-slug');
            assert.ok(url.includes('/blog/posts/'), 'Blog post URL should use /blog/posts/ segment');
            assert.ok(!url.includes('/blog/zh/'), 'Blog post URL should not have category in path');
        });

        it('gallery item URLs use /items/ segment', () => {
            const url = buildGalleryItemUrl('zh', 'cat', 'item');
            assert.ok(url.includes('/gallery/items/'), 'Gallery item URL should use /gallery/items/ segment');
        });

        it('blog category URLs use /categories/ segment (not query param)', () => {
            const url = buildBlogCategoryUrl('zh', 'tech');
            assert.ok(url.includes('/blog/categories/'), 'Blog category URL should use /blog/categories/ segment');
            assert.ok(!url.includes('?category='), 'Blog category URL should not use ?category= query');
        });

        it('gallery category URLs use /categories/ segment (not query param)', () => {
            const url = buildGalleryCategoryUrl('zh', 'portraits');
            assert.ok(url.includes('/gallery/categories/'), 'Gallery category URL should use /gallery/categories/ segment');
            assert.ok(!url.includes('?category='), 'Gallery category URL should not use ?category= query');
        });
    });
});
