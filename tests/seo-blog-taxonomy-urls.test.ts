/**
 * SEO Blog Taxonomy URL Tests
 *
 * PR-34: Tests for blog taxonomy v2 URL builders and nav resolver.
 *
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-B4–B5)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    buildBlogGroupUrl,
    buildBlogTopicUrl,
    buildBlogTagUrl,
} from '@/lib/seo/url-builders';
import { resolveNavTarget } from '@/lib/site/nav-resolver';
import type { NavTarget } from '@/lib/types/hamburger-nav';

describe('Blog Taxonomy v2 URL Builders', () => {
    describe('buildBlogGroupUrl', () => {
        it('generates v2 canonical group URL', () => {
            const url = buildBlogGroupUrl('zh', 'mental-health');
            assert.strictEqual(url, '/zh/blog/groups/mental-health');
        });

        it('preserves query params', () => {
            const url = buildBlogGroupUrl('zh', 'mental-health', { q: 'anxiety', sort: 'newest' });
            assert.strictEqual(url, '/zh/blog/groups/mental-health?q=anxiety&sort=newest');
        });

        it('only adds non-empty query params', () => {
            const url = buildBlogGroupUrl('zh', 'books', { q: '', sort: 'oldest' });
            assert.strictEqual(url, '/zh/blog/groups/books?sort=oldest');
        });

        it('handles no query params', () => {
            const url = buildBlogGroupUrl('zh', 'books', {});
            assert.strictEqual(url, '/zh/blog/groups/books');
        });

        it('handles different locales', () => {
            const url = buildBlogGroupUrl('en', 'wellness');
            assert.strictEqual(url, '/en/blog/groups/wellness');
        });
    });

    describe('buildBlogTopicUrl', () => {
        it('generates URL using /categories/ for backward compatibility', () => {
            const url = buildBlogTopicUrl('zh', 'emotional-care');
            assert.strictEqual(url, '/zh/blog/categories/emotional-care');
        });

        it('preserves query params', () => {
            const url = buildBlogTopicUrl('zh', 'sleep-issues', { q: 'insomnia', sort: 'newest' });
            assert.strictEqual(url, '/zh/blog/categories/sleep-issues?q=insomnia&sort=newest');
        });

        it('only adds non-empty query params', () => {
            const url = buildBlogTopicUrl('zh', 'anxiety', { q: '', sort: 'oldest' });
            assert.strictEqual(url, '/zh/blog/categories/anxiety?sort=oldest');
        });
    });

    describe('buildBlogTagUrl', () => {
        it('generates v2 canonical tag URL', () => {
            const url = buildBlogTagUrl('zh', 'self-care');
            assert.strictEqual(url, '/zh/blog/tags/self-care');
        });

        it('preserves sort query param', () => {
            const url = buildBlogTagUrl('zh', 'mindfulness', { sort: 'newest' });
            assert.strictEqual(url, '/zh/blog/tags/mindfulness?sort=newest');
        });

        it('handles no query params', () => {
            const url = buildBlogTagUrl('zh', 'therapy', {});
            assert.strictEqual(url, '/zh/blog/tags/therapy');
        });

        it('handles different locales', () => {
            const url = buildBlogTagUrl('en', 'wellness');
            assert.strictEqual(url, '/en/blog/tags/wellness');
        });
    });
});

describe('Blog Taxonomy v2 Nav Resolver', () => {
    describe('blog_group target', () => {
        it('resolves to /blog/groups/[slug]', () => {
            const target: NavTarget = {
                type: 'blog_group',
                groupSlug: 'mental-health',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/blog/groups/mental-health');
        });

        it('includes query params when provided', () => {
            const target: NavTarget = {
                type: 'blog_group',
                groupSlug: 'books',
                q: 'fiction',
                sort: 'newest',
                page: '2',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.ok(href.startsWith('/zh/blog/groups/books?'));
            assert.ok(href.includes('page=2'));
            assert.ok(href.includes('q=fiction'));
            assert.ok(href.includes('sort=newest'));
        });
    });

    describe('blog_topic target', () => {
        it('resolves to /blog/categories/[slug] for backward compatibility', () => {
            const target: NavTarget = {
                type: 'blog_topic',
                topicSlug: 'emotional-care',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/blog/categories/emotional-care');
        });

        it('includes query params when provided', () => {
            const target: NavTarget = {
                type: 'blog_topic',
                topicSlug: 'sleep-issues',
                q: 'tips',
                sort: 'oldest',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.ok(href.startsWith('/zh/blog/categories/sleep-issues?'));
            assert.ok(href.includes('q=tips'));
            assert.ok(href.includes('sort=oldest'));
        });
    });

    describe('blog_tag target', () => {
        it('resolves to /blog/tags/[slug]', () => {
            const target: NavTarget = {
                type: 'blog_tag',
                tagSlug: 'self-care',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/blog/tags/self-care');
        });

        it('includes sort and page params when provided', () => {
            const target: NavTarget = {
                type: 'blog_tag',
                tagSlug: 'mindfulness',
                sort: 'newest',
                page: '3',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.ok(href.startsWith('/zh/blog/tags/mindfulness?'));
            assert.ok(href.includes('page=3'));
            assert.ok(href.includes('sort=newest'));
        });

        it('does not include q param (tags do not support search)', () => {
            const target: NavTarget = {
                type: 'blog_tag',
                tagSlug: 'therapy',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.ok(!href.includes('q='));
        });
    });
});

describe('Blog Taxonomy URL Pattern Validation', () => {
    it('group URLs use /groups/ segment', () => {
        const url = buildBlogGroupUrl('zh', 'any-group');
        assert.ok(url.includes('/blog/groups/'), 'Group URL should use /blog/groups/ segment');
    });

    it('topic URLs use /categories/ segment for backward compatibility', () => {
        const url = buildBlogTopicUrl('zh', 'any-topic');
        assert.ok(url.includes('/blog/categories/'), 'Topic URL should use /blog/categories/ segment');
    });

    it('tag URLs use /tags/ segment', () => {
        const url = buildBlogTagUrl('zh', 'any-tag');
        assert.ok(url.includes('/blog/tags/'), 'Tag URL should use /blog/tags/ segment');
    });

    it('all taxonomy URLs start with locale prefix', () => {
        const groupUrl = buildBlogGroupUrl('zh', 'group');
        const topicUrl = buildBlogTopicUrl('zh', 'topic');
        const tagUrl = buildBlogTagUrl('zh', 'tag');

        assert.ok(groupUrl.startsWith('/zh/'), 'Group URL should start with locale');
        assert.ok(topicUrl.startsWith('/zh/'), 'Topic URL should start with locale');
        assert.ok(tagUrl.startsWith('/zh/'), 'Tag URL should start with locale');
    });

    it('nav resolver outputs match URL builders', () => {
        const groupTarget: NavTarget = { type: 'blog_group', groupSlug: 'test' };
        const topicTarget: NavTarget = { type: 'blog_topic', topicSlug: 'test' };
        const tagTarget: NavTarget = { type: 'blog_tag', tagSlug: 'test' };

        const groupNavUrl = resolveNavTarget(groupTarget, 'zh');
        const topicNavUrl = resolveNavTarget(topicTarget, 'zh');
        const tagNavUrl = resolveNavTarget(tagTarget, 'zh');

        const groupBuilderUrl = buildBlogGroupUrl('zh', 'test');
        const topicBuilderUrl = buildBlogTopicUrl('zh', 'test');
        const tagBuilderUrl = buildBlogTagUrl('zh', 'test');

        assert.strictEqual(groupNavUrl, groupBuilderUrl, 'Group nav URL should match builder');
        assert.strictEqual(topicNavUrl, topicBuilderUrl, 'Topic nav URL should match builder');
        assert.strictEqual(tagNavUrl, tagBuilderUrl, 'Tag nav URL should match builder');
    });
});
