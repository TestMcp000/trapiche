/**
 * Events Admin IO Aggregator
 *
 * Re-exports from split admin IO modules per ARCHITECTURE.md §3.4.
 * This is a thin facade to maintain backward compatibility.
 *
 * @module lib/modules/events/admin-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

// =============================================================================
// Event Types Admin (from event-types-admin-io.ts)
// =============================================================================
export {
    getAllEventTypesAdmin,
    getEventTypeByIdAdmin,
    createEventType,
    updateEventType,
    deleteEventType,
    reorderEventTypes,
    eventTypeSlugExists,
} from './event-types-admin-io';

// =============================================================================
// Event Tags Admin (from event-tags-admin-io.ts)
// =============================================================================
export {
    getAllEventTagsAdmin,
    getEventTagByIdAdmin,
    createEventTag,
    updateEventTag,
    deleteEventTag,
    reorderEventTags,
    eventTagSlugExists,
    getOrCreateEventTag,
    getEventTagIdsAdmin,
    updateEventTags,
    getEventTagsForAdmin,
} from './event-tags-admin-io';

// =============================================================================
// Events Admin (from events-admin-io.ts)
// =============================================================================
export {
    getAllEventsAdmin,
    getEventByIdAdmin,
    createEvent,
    updateEvent,
    deleteEvent,
    eventSlugExists,
} from './events-admin-io';

// Re-export type
export type { AdminEventsQueryOptions } from './events-admin-io';
