/**
 * Hamburger Nav Validator Target Types Tests
 *
 * Tests to verify that the hamburger nav validator accepts all target types
 * defined in the type system and validates their required fields correctly.
 *
 * @see lib/validators/hamburger-nav.ts
 * @see lib/types/hamburger-nav.ts
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (PR-42)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseHamburgerNav, ALLOWED_TARGET_TYPES } from '../lib/validators/hamburger-nav';

describe('hamburger-nav-validator target types', () => {
    describe('ALLOWED_TARGET_TYPES', () => {
        it('includes all blog target types', () => {
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_index'), 'Should include blog_index');
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_category'), 'Should include blog_category');
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_post'), 'Should include blog_post');
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_group'), 'Should include blog_group');
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_topic'), 'Should include blog_topic');
            assert.ok(ALLOWED_TARGET_TYPES.includes('blog_tag'), 'Should include blog_tag');
        });

        it('includes all gallery target types', () => {
            assert.ok(ALLOWED_TARGET_TYPES.includes('gallery_index'), 'Should include gallery_index');
            assert.ok(ALLOWED_TARGET_TYPES.includes('gallery_category'), 'Should include gallery_category');
            assert.ok(ALLOWED_TARGET_TYPES.includes('gallery_item'), 'Should include gallery_item');
        });

        it('includes all events target types', () => {
            assert.ok(ALLOWED_TARGET_TYPES.includes('events_index'), 'Should include events_index');
            assert.ok(ALLOWED_TARGET_TYPES.includes('event_detail'), 'Should include event_detail');
        });

        it('includes faq_index target type', () => {
            assert.ok(ALLOWED_TARGET_TYPES.includes('faq_index'), 'Should include faq_index');
        });

        it('includes page/anchor/external target types', () => {
            assert.ok(ALLOWED_TARGET_TYPES.includes('page'), 'Should include page');
            assert.ok(ALLOWED_TARGET_TYPES.includes('anchor'), 'Should include anchor');
            assert.ok(ALLOWED_TARGET_TYPES.includes('external'), 'Should include external');
        });
    });

    describe('parseHamburgerNav validation', () => {
        describe('blog_group target', () => {
            it('accepts valid blog_group target', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Group',
                            target: { type: 'blog_group', groupSlug: 'mental-health' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('rejects blog_group without groupSlug', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Group',
                            target: { type: 'blog_group' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.errors.length > 0, 'Should have validation errors');
            });
        });

        describe('blog_topic target', () => {
            it('accepts valid blog_topic target', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Topic',
                            target: { type: 'blog_topic', topicSlug: 'anxiety' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('rejects blog_topic without topicSlug', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Topic',
                            target: { type: 'blog_topic' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.errors.length > 0, 'Should have validation errors');
            });
        });

        describe('blog_tag target', () => {
            it('accepts valid blog_tag target', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Tag',
                            target: { type: 'blog_tag', tagSlug: 'self-care' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('rejects blog_tag without tagSlug', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Blog Tag',
                            target: { type: 'blog_tag' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.errors.length > 0, 'Should have validation errors');
            });
        });

        describe('events_index target', () => {
            it('accepts events_index without eventType (shows all)', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'All Events',
                            target: { type: 'events_index' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('accepts events_index with eventType filter', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Talks',
                            target: { type: 'events_index', eventType: 'talks' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('accepts events_index with tag filter', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Online Events',
                            target: { type: 'events_index', tag: 'online' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });
        });

        describe('event_detail target', () => {
            it('accepts valid event_detail target', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Specific Event',
                            target: { type: 'event_detail', eventSlug: 'workshop-2024' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });

            it('rejects event_detail without eventSlug', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'Event',
                            target: { type: 'event_detail' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.errors.length > 0, 'Should have validation errors');
            });
        });

        describe('faq_index target', () => {
            it('accepts faq_index target (no additional params required)', () => {
                const nav = {
                    version: 2,
                    groups: [{
                        id: 'test-group',
                        label: 'Test',
                        items: [{
                            id: 'item-1',
                            label: 'FAQ',
                            target: { type: 'faq_index' }
                        }]
                    }]
                };
                const result = parseHamburgerNav(nav);
                assert.ok(result.nav, 'Should parse successfully');
                assert.equal(result.errors.length, 0, 'Should have no errors');
            });
        });
    });

    describe('Unknown property rejection', () => {
        it('rejects unknown properties on target', () => {
            const nav = {
                version: 2,
                groups: [{
                    id: 'test-group',
                    label: 'Test',
                    items: [{
                        id: 'item-1',
                        label: 'Test',
                        target: { type: 'blog_index', unknownProp: 'value' }
                    }]
                }]
            };
            const result = parseHamburgerNav(nav);
            assert.ok(result.errors.length > 0, 'Should reject unknown properties');
            assert.ok(
                result.errors.some(e => e.message.includes('Unknown property')),
                'Error should mention unknown property'
            );
        });
    });
});
