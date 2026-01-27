/**
 * SEO Events JSON-LD Tests
 *
 * PR-36: Tests for events URL builders, nav resolver, and JSON-LD generation.
 *
 * @see ARCHITECTURE.md §3.11 (v2 canonical path builders)
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C3)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
    buildEventsListUrl,
    buildEventDetailUrl,
} from '@/lib/seo/url-builders';
import { resolveNavTarget } from '@/lib/site/nav-resolver';
import { generateEventJsonLd } from '@/lib/seo/jsonld';
import type { NavTarget } from '@/lib/types/hamburger-nav';

describe('Events URL Builders', () => {
    describe('buildEventsListUrl', () => {
        it('generates events list URL', () => {
            const url = buildEventsListUrl('zh');
            assert.strictEqual(url, '/zh/events');
        });

        it('includes type filter', () => {
            const url = buildEventsListUrl('zh', { type: 'workshop' });
            assert.strictEqual(url, '/zh/events?type=workshop');
        });

        it('includes search query', () => {
            const url = buildEventsListUrl('zh', { q: 'therapy' });
            assert.strictEqual(url, '/zh/events?q=therapy');
        });

        it('includes sort param', () => {
            const url = buildEventsListUrl('zh', { sort: 'upcoming' });
            assert.strictEqual(url, '/zh/events?sort=upcoming');
        });

        it('combines multiple query params', () => {
            const url = buildEventsListUrl('zh', { type: 'lecture', q: 'emotion', sort: 'newest' });
            assert.strictEqual(url, '/zh/events?type=lecture&q=emotion&sort=newest');
        });

        it('handles empty query params', () => {
            const url = buildEventsListUrl('zh', {});
            assert.strictEqual(url, '/zh/events');
        });

        it('handles different locales', () => {
            const url = buildEventsListUrl('en');
            assert.strictEqual(url, '/en/events');
        });
    });

    describe('buildEventDetailUrl', () => {
        it('generates event detail URL', () => {
            const url = buildEventDetailUrl('zh', 'art-therapy-workshop-2026');
            assert.strictEqual(url, '/zh/events/art-therapy-workshop-2026');
        });

        it('handles different locales', () => {
            const url = buildEventDetailUrl('en', 'mindfulness-session');
            assert.strictEqual(url, '/en/events/mindfulness-session');
        });

        it('handles slugs with hyphens', () => {
            const url = buildEventDetailUrl('zh', 'emotion-color-art-workshop-2026-02');
            assert.strictEqual(url, '/zh/events/emotion-color-art-workshop-2026-02');
        });
    });
});

describe('Events Nav Resolver', () => {
    describe('events_index target', () => {
        it('resolves to /events', () => {
            const target: NavTarget = {
                type: 'events_index',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/events');
        });

        it('includes event type filter', () => {
            const target: NavTarget = {
                type: 'events_index',
                eventType: 'workshop',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/events?type=workshop');
        });

        it('includes query params', () => {
            const target: NavTarget = {
                type: 'events_index',
                q: 'therapy',
                sort: 'upcoming',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/events?q=therapy&sort=upcoming');
        });

        it('handles different locales', () => {
            const target: NavTarget = {
                type: 'events_index',
            };
            const href = resolveNavTarget(target, 'en');
            assert.strictEqual(href, '/en/events');
        });
    });

    describe('event_detail target', () => {
        it('resolves to /events/[slug]', () => {
            const target: NavTarget = {
                type: 'event_detail',
                eventSlug: 'art-therapy-2026',
            };
            const href = resolveNavTarget(target, 'zh');
            assert.strictEqual(href, '/zh/events/art-therapy-2026');
        });

        it('handles different locales', () => {
            const target: NavTarget = {
                type: 'event_detail',
                eventSlug: 'mindfulness-workshop',
            };
            const href = resolveNavTarget(target, 'en');
            assert.strictEqual(href, '/en/events/mindfulness-workshop');
        });
    });
});

describe('Event JSON-LD Generation', () => {
    describe('generateEventJsonLd', () => {
        it('generates basic event JSON-LD', () => {
            const jsonLd = generateEventJsonLd({
                name: '情緒的顏色—藝術療癒工作坊',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/art-therapy-2026',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd['@context'], 'https://schema.org');
            assert.strictEqual(jsonLd['@type'], 'Event');
            assert.strictEqual(jsonLd.name, '情緒的顏色—藝術療癒工作坊');
            assert.strictEqual(jsonLd.startDate, '2026-02-15T14:00:00+08:00');
            assert.strictEqual(jsonLd.url, 'https://example.com/zh/events/art-therapy-2026');
            assert.strictEqual(jsonLd.inLanguage, 'zh-Hant');
        });

        it('includes description when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Test Event',
                description: '這是一個測試活動',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/test',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.description, '這是一個測試活動');
        });

        it('includes end date when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Multi-day Event',
                startDate: '2026-02-15T14:00:00+08:00',
                endDate: '2026-02-17T17:00:00+08:00',
                url: 'https://example.com/zh/events/multi-day',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.endDate, '2026-02-17T17:00:00+08:00');
        });

        it('includes image when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Event with Image',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/test',
                image: 'https://example.com/images/event.jpg',
            }) as Record<string, unknown>;

            const image = jsonLd.image as Record<string, unknown>;
            assert.strictEqual(image['@type'], 'ImageObject');
            assert.strictEqual(image.url, 'https://example.com/images/event.jpg');
        });

        it('sets offline attendance mode for physical events', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Physical Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/physical',
                location: {
                    name: '台北文創大樓',
                    address: '台北市信義區光復南路133號',
                },
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode');
            const location = jsonLd.location as Record<string, unknown>;
            assert.strictEqual(location['@type'], 'Place');
            assert.strictEqual(location.name, '台北文創大樓');
        });

        it('sets online attendance mode for virtual events', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Online Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/online',
                isOnline: true,
                onlineUrl: 'https://meet.google.com/abc-defg-hij',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.eventAttendanceMode, 'https://schema.org/OnlineEventAttendanceMode');
            const location = jsonLd.location as Record<string, unknown>;
            assert.strictEqual(location['@type'], 'VirtualLocation');
            assert.strictEqual(location.url, 'https://meet.google.com/abc-defg-hij');
        });

        it('sets mixed attendance mode for hybrid events', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Hybrid Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/hybrid',
                location: {
                    name: '台北文創大樓',
                },
                isOnline: true,
                onlineUrl: 'https://meet.google.com/abc-defg-hij',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.eventAttendanceMode, 'https://schema.org/MixedEventAttendanceMode');
            const locations = jsonLd.location as Record<string, unknown>[];
            assert.ok(Array.isArray(locations));
            assert.strictEqual(locations.length, 2);
        });

        it('includes organizer when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Organized Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/organized',
                organizer: {
                    name: '心理衛生中心',
                    url: 'https://example.com',
                },
            }) as Record<string, unknown>;

            const organizer = jsonLd.organizer as Record<string, unknown>;
            assert.strictEqual(organizer['@type'], 'Organization');
            assert.strictEqual(organizer.name, '心理衛生中心');
            assert.strictEqual(organizer.url, 'https://example.com');
        });

        it('sets event status to scheduled by default', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Default Status Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/default',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.eventStatus, 'https://schema.org/EventScheduled');
        });

        it('sets custom event status when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Cancelled Event',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/cancelled',
                eventStatus: 'cancelled',
            }) as Record<string, unknown>;

            assert.strictEqual(jsonLd.eventStatus, 'https://schema.org/EventCancelled');
        });

        it('includes registration offer when provided', () => {
            const jsonLd = generateEventJsonLd({
                name: 'Event with Registration',
                startDate: '2026-02-15T14:00:00+08:00',
                url: 'https://example.com/zh/events/registration',
                registrationUrl: 'https://forms.google.com/xxx',
            }) as Record<string, unknown>;

            const offers = jsonLd.offers as Record<string, unknown>;
            assert.strictEqual(offers['@type'], 'Offer');
            assert.strictEqual(offers.url, 'https://forms.google.com/xxx');
            assert.strictEqual(offers.availability, 'https://schema.org/InStock');
        });
    });
});
