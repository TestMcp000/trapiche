/**
 * Events IO Aggregator
 *
 * Re-exports from split IO modules per ARCHITECTURE.md §3.4.
 * This is a thin facade to maintain backward compatibility.
 *
 * @module lib/modules/events/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// =============================================================================
// Event Types (from event-types-io.ts)
// =============================================================================
export {
    getVisibleEventTypes,
    getEventTypeBySlug,
    getEventTypesWithCounts,
} from './event-types-io';

// =============================================================================
// Event Tags (from event-tags-io.ts)
// =============================================================================
export {
    getVisibleEventTags,
    getEventTagBySlug,
    getEventTagsWithCounts,
    getEventTags,
} from './event-tags-io';

// =============================================================================
// Events (from events-io.ts)
// =============================================================================
export {
    getPublicEvents,
    getPublicEventBySlug,
    getPublicEventsForSitemap,
    getUpcomingEvents,
} from './events-io';

