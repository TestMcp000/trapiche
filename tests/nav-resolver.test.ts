/**
 * Nav Resolver Tests
 *
 * Tests for the hamburger nav resolver.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveHamburgerNav,
    resolveNavTarget,
    isExternalTarget,
} from '@/lib/site/nav-resolver';
import type { HamburgerNavV2, NavTarget } from '@/lib/types/hamburger-nav';

describe('resolveNavTarget', () => {
    const locale = 'zh';

    describe('blog targets', () => {
        it('resolves blog_index to /locale/blog', () => {
            const target: NavTarget = { type: 'blog_index' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/blog');
        });

        it('resolves blog_index with query params', () => {
            const target: NavTarget = { type: 'blog_index', q: 'test', sort: 'newest' };
            const href = resolveNavTarget(target, locale);
            assert.ok(href.startsWith('/zh/blog?'));
            assert.ok(href.includes('q=test'));
            assert.ok(href.includes('sort=newest'));
        });

        it('resolves blog_category to correct path', () => {
            const target: NavTarget = { type: 'blog_category', categorySlug: 'tech' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/blog/categories/tech');
        });

        it('resolves blog_category with query params', () => {
            const target: NavTarget = { type: 'blog_category', categorySlug: 'tech', q: 'search' };
            const href = resolveNavTarget(target, locale);
            assert.ok(href.startsWith('/zh/blog/categories/tech?'));
            assert.ok(href.includes('q=search'));
        });

        it('resolves blog_post to correct path', () => {
            const target: NavTarget = { type: 'blog_post', postSlug: 'my-article' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/blog/posts/my-article');
        });
    });

    describe('gallery targets', () => {
        it('resolves gallery_index to /locale/gallery', () => {
            const target: NavTarget = { type: 'gallery_index' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/gallery');
        });

        it('resolves gallery_index with tag filter', () => {
            const target: NavTarget = { type: 'gallery_index', tag: 'art' };
            const href = resolveNavTarget(target, locale);
            assert.ok(href.includes('tag=art'));
        });

        it('resolves gallery_category to correct path', () => {
            const target: NavTarget = { type: 'gallery_category', categorySlug: 'paintings' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/gallery/categories/paintings');
        });

        it('resolves gallery_item to correct path', () => {
            const target: NavTarget = {
                type: 'gallery_item',
                categorySlug: 'paintings',
                itemSlug: 'my-artwork',
            };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/gallery/items/paintings/my-artwork');
        });
    });

    describe('events targets', () => {
        it('resolves events_index to /locale/events', () => {
            const target: NavTarget = { type: 'events_index' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/events');
        });

        it('resolves events_index with type and tag filters', () => {
            const target: NavTarget = { type: 'events_index', eventType: 'talks', tag: 'workshop' };
            const href = resolveNavTarget(target, locale);
            assert.ok(href.startsWith('/zh/events?'));
            assert.ok(href.includes('type=talks'));
            assert.ok(href.includes('tag=workshop'));
        });

        it('resolves event_detail to correct path', () => {
            const target: NavTarget = { type: 'event_detail', eventSlug: 'my-event' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/events/my-event');
        });
    });

    describe('page targets', () => {
        it('resolves page to locale-prefixed path', () => {
            const target: NavTarget = { type: 'page', path: '/about' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/about');
        });

        it('resolves page home path without trailing slash', () => {
            const target: NavTarget = { type: 'page', path: '/' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh');
        });

        it('resolves page home path with hash', () => {
            const target: NavTarget = { type: 'page', path: '/', hash: 'about' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh#about');
        });

        it('resolves page with hash', () => {
            const target: NavTarget = { type: 'page', path: '/services', hash: 'faq' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/services#faq');
        });

        it('normalizes hash with leading #', () => {
            const target: NavTarget = { type: 'page', path: '/services', hash: '#faq' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '/zh/services#faq');
        });
    });

    describe('anchor targets', () => {
        it('resolves anchor to hash-only', () => {
            const target: NavTarget = { type: 'anchor', hash: 'contact' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '#contact');
        });

        it('normalizes anchor with leading #', () => {
            const target: NavTarget = { type: 'anchor', hash: '#contact' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, '#contact');
        });
    });

    describe('external targets', () => {
        it('resolves external URL as-is', () => {
            const target: NavTarget = { type: 'external', url: 'https://example.com/page' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, 'https://example.com/page');
        });

        it('resolves mailto URL', () => {
            const target: NavTarget = { type: 'external', url: 'mailto:test@example.com' };
            const href = resolveNavTarget(target, locale);
            assert.equal(href, 'mailto:test@example.com');
        });
    });

    describe('locale handling', () => {
        it('uses en locale correctly', () => {
            const target: NavTarget = { type: 'blog_index' };
            const href = resolveNavTarget(target, 'en');
            assert.equal(href, '/en/blog');
        });
    });
});

describe('resolveHamburgerNav', () => {
    it('resolves complete nav structure', () => {
        const nav: HamburgerNavV2 = {
            version: 2,
            groups: [
                {
                    id: 'group-1',
                    label: 'Blog',
                    items: [
                        { id: 'item-1', label: 'All Posts', target: { type: 'blog_index' } },
                        { id: 'item-2', label: 'Tech', target: { type: 'blog_category', categorySlug: 'tech' } },
                    ],
                },
                {
                    id: 'group-2',
                    label: 'External',
                    items: [
                        { id: 'item-3', label: 'GitHub', target: { type: 'external', url: 'https://github.com' } },
                    ],
                },
            ],
        };

        const resolved = resolveHamburgerNav(nav, 'zh');

        assert.equal(resolved.version, 2);
        assert.equal(resolved.groups.length, 2);

        // Check first group
        assert.equal(resolved.groups[0].id, 'group-1');
        assert.equal(resolved.groups[0].items[0].href, '/zh/blog');
        assert.equal(resolved.groups[0].items[0].isExternal, false);
        assert.equal(resolved.groups[0].items[1].href, '/zh/blog/categories/tech');

        // Check external group
        assert.equal(resolved.groups[1].items[0].href, 'https://github.com');
        assert.equal(resolved.groups[1].items[0].isExternal, true);
        assert.deepEqual(resolved.groups[1].items[0].externalAttrs, {
            target: '_blank',
            rel: 'noopener noreferrer',
        });
    });

    it('preserves group and item ids', () => {
        const nav: HamburgerNavV2 = {
            version: 2,
            groups: [
                {
                    id: 'my-group',
                    label: 'My Group',
                    items: [{ id: 'my-item', label: 'My Item', target: { type: 'anchor', hash: 'section' } }],
                },
            ],
        };

        const resolved = resolveHamburgerNav(nav, 'en');

        assert.equal(resolved.groups[0].id, 'my-group');
        assert.equal(resolved.groups[0].items[0].id, 'my-item');
    });
});

describe('isExternalTarget', () => {
    it('returns true for external target', () => {
        const target: NavTarget = { type: 'external', url: 'https://example.com' };
        assert.equal(isExternalTarget(target), true);
    });

    it('returns false for internal targets', () => {
        assert.equal(isExternalTarget({ type: 'blog_index' }), false);
        assert.equal(isExternalTarget({ type: 'page', path: '/about' }), false);
        assert.equal(isExternalTarget({ type: 'anchor', hash: 'section' }), false);
    });
});
