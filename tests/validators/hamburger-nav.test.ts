/**
 * Hamburger Nav Validator Tests
 *
 * Tests for the hamburger nav v2 pure validator.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
    validateHamburgerNav,
    isHamburgerNavV2,
    parseHamburgerNav,
    ALLOWED_TARGET_TYPES,
    ALLOWED_QUERY_KEYS,
} from '@/lib/validators/hamburger-nav';

describe('validateHamburgerNav', () => {
    describe('valid structures', () => {
        it('accepts minimal valid nav', () => {
            const nav = {
                version: 2,
                groups: [],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
            assert.equal(result.errors.length, 0);
        });

        it('accepts nav with blog_index target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Blog',
                                target: { type: 'blog_index' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with blog_index and query params', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Search',
                                target: { type: 'blog_index', q: 'test', sort: 'newest', page: '2' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with blog_category target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Category',
                                target: { type: 'blog_category', categorySlug: 'tech' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with blog_post target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Post',
                                target: { type: 'blog_post', postSlug: 'my-post' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with gallery_index target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Gallery',
                                target: { type: 'gallery_index', tag: 'art' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with gallery_item target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Item',
                                target: { type: 'gallery_item', categorySlug: 'art', itemSlug: 'piece-1' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with page target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'About',
                                target: { type: 'page', path: '/about' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with page target and hash', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'FAQ',
                                target: { type: 'page', path: '/services', hash: '#faq' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with anchor target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Contact',
                                target: { type: 'anchor', hash: 'contact' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with external https target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'External',
                                target: { type: 'external', url: 'https://example.com' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });

        it('accepts nav with external mailto target', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Email',
                                target: { type: 'external', url: 'mailto:test@example.com' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, true);
        });
    });

    describe('invalid structures', () => {
        it('rejects null', () => {
            const result = validateHamburgerNav(null);
            assert.equal(result.valid, false);
        });

        it('rejects non-object', () => {
            const result = validateHamburgerNav('string');
            assert.equal(result.valid, false);
        });

        it('rejects wrong version', () => {
            const nav = { version: 1, groups: [] };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(e => e.path === 'version'));
        });

        it('rejects missing groups', () => {
            const nav = { version: 2 };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });

        it('rejects invalid target type', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Item',
                                target: { type: 'invalid_type' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(e => e.path.includes('target.type')));
        });

        it('rejects missing slug for blog_category', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Category',
                                target: { type: 'blog_category' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });

        it('rejects invalid slug format', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Post',
                                target: { type: 'blog_post', postSlug: 'Invalid Slug With Spaces' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });

        it('rejects http protocol', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Insecure',
                                target: { type: 'external', url: 'http://example.com' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(e => e.message.includes('https:')));
        });

        it('rejects javascript protocol', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'XSS',
                                target: { type: 'external', url: 'javascript:alert(1)' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });

        it('rejects data protocol', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Data',
                                target: { type: 'external', url: 'data:text/html,<script>alert(1)</script>' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });

        it('rejects duplicate group ids', () => {
            const nav = {
                version: 2,
                groups: [
                    { id: 'same-id', label: 'Group 1', items: [] },
                    { id: 'same-id', label: 'Group 2', items: [] },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
            assert.ok(result.errors.some(e => e.message.includes('重複')));
        });

        it('rejects page path without leading slash', () => {
            const nav = {
                version: 2,
                groups: [
                    {
                        id: 'group-1',
                        label: 'Group 1',
                        items: [
                            {
                                id: 'item-1',
                                label: 'Page',
                                target: { type: 'page', path: 'about' },
                            },
                        ],
                    },
                ],
            };
            const result = validateHamburgerNav(nav);
            assert.equal(result.valid, false);
        });
    });
});

describe('isHamburgerNavV2', () => {
    it('returns true for valid nav', () => {
        const nav = { version: 2, groups: [] };
        assert.equal(isHamburgerNavV2(nav), true);
    });

    it('returns false for invalid nav', () => {
        const nav = { version: 1, groups: [] };
        assert.equal(isHamburgerNavV2(nav), false);
    });
});

describe('parseHamburgerNav', () => {
    it('parses valid JSON string', () => {
        const json = '{"version":2,"groups":[]}';
        const result = parseHamburgerNav(json);
        assert.notEqual(result.nav, null);
        assert.equal(result.errors.length, 0);
    });

    it('parses valid object', () => {
        const obj = { version: 2, groups: [] };
        const result = parseHamburgerNav(obj);
        assert.notEqual(result.nav, null);
        assert.equal(result.errors.length, 0);
    });

    it('returns error for invalid JSON', () => {
        const json = 'not valid json';
        const result = parseHamburgerNav(json);
        assert.equal(result.nav, null);
        assert.ok(result.errors.length > 0);
    });

    it('returns errors for invalid structure', () => {
        const json = '{"version":1}';
        const result = parseHamburgerNav(json);
        assert.equal(result.nav, null);
        assert.ok(result.errors.length > 0);
    });
});

describe('constants', () => {
    it('exports allowed target types', () => {
        assert.ok(ALLOWED_TARGET_TYPES.includes('blog_index'));
        assert.ok(ALLOWED_TARGET_TYPES.includes('external'));
    });

    it('exports allowed query keys', () => {
        assert.ok(ALLOWED_QUERY_KEYS.has('q'));
        assert.ok(ALLOWED_QUERY_KEYS.has('tag'));
    });
});
