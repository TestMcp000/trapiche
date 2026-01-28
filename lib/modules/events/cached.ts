/**
 * Cached Events Data Access
 *
 * Wraps `lib/modules/events/io.ts` (IO) with global cache versioning so public routes can
 * reuse server-side results and keep TTFB/LCP stable.
 *
 * @see lib/modules/events/io.ts - Raw IO functions
 * @see lib/modules/events/admin-io.ts - Admin operations (not cached)
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C4)
 */

import { cachedQuery } from '@/lib/cache/wrapper';
import type {
    EventWithType,
    EventSummary,
    EventType,
    EventTypeWithCount,
    EventTag,
    EventTagWithCount,
    EventsQueryOptions,
    EventForSitemap,
} from '@/lib/types/events';
import {
    getVisibleEventTypes,
    getEventTypeBySlug,
    getEventTypesWithCounts,
    getVisibleEventTags,
    getEventTagBySlug,
    getEventTagsWithCounts,
    getPublicEvents,
    getPublicEventBySlug,
    getPublicEventsForSitemap,
    getUpcomingEvents,
} from '@/lib/modules/events/io';

const CACHE_REVALIDATE_SECONDS = 60;

// =============================================================================
// Event Types - Cached
// =============================================================================

export const getVisibleEventTypesCached = cachedQuery(
    async (): Promise<EventType[]> => getVisibleEventTypes(),
    ['visible-event-types'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getEventTypeBySlugCached = cachedQuery(
    async (slug: string): Promise<EventType | null> => getEventTypeBySlug(slug),
    ['event-type-by-slug'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getEventTypesWithCountsCached = cachedQuery(
    async (): Promise<EventTypeWithCount[]> => getEventTypesWithCounts(),
    ['event-types-with-counts'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Event Tags - Cached
// =============================================================================

export const getVisibleEventTagsCached = cachedQuery(
    async (): Promise<EventTag[]> => getVisibleEventTags(),
    ['visible-event-tags'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getEventTagBySlugCached = cachedQuery(
    async (slug: string): Promise<EventTag | null> => getEventTagBySlug(slug),
    ['event-tag-by-slug'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getEventTagsWithCountsCached = cachedQuery(
    async (): Promise<EventTagWithCount[]> => getEventTagsWithCounts(),
    ['event-tags-with-counts'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

// =============================================================================
// Events - Cached
// =============================================================================

export const getPublicEventsCached = cachedQuery(
    async (options?: EventsQueryOptions): Promise<EventSummary[]> => getPublicEvents(options),
    ['public-events'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getPublicEventBySlugCached = cachedQuery(
    async (slug: string): Promise<EventWithType | null> => getPublicEventBySlug(slug),
    ['public-event-by-slug'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getPublicEventsForSitemapCached = cachedQuery(
    async (): Promise<EventForSitemap[]> => getPublicEventsForSitemap(),
    ['public-events-sitemap'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);

export const getUpcomingEventsCached = cachedQuery(
    async (limit: number = 3): Promise<EventSummary[]> => getUpcomingEvents(limit),
    ['upcoming-events'],
    ['events'],
    CACHE_REVALIDATE_SECONDS
);
