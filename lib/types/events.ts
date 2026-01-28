/**
 * Events Types
 *
 * Type definitions for the Events domain.
 * Includes event types (categories), event tags, and individual events.
 *
 * @module lib/types/events
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C4)
 */

// =============================================================================
// Visibility
// =============================================================================

export type EventVisibility = 'draft' | 'private' | 'public';

// =============================================================================
// Event Type (Category)
// =============================================================================

/**
 * Event type/category (e.g., 講座, 工作坊, 企業內訓)
 */
export interface EventType {
    id: string;
    slug: string;
    name_zh: string;
    sort_order: number;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Event type with event count for listing
 */
export interface EventTypeWithCount extends EventType {
    event_count: number;
}

// =============================================================================
// Event Tag
// =============================================================================

/**
 * Event tag (e.g., 親子, 團體, 線上)
 */
export interface EventTag {
    id: string;
    slug: string;
    name_zh: string;
    sort_order: number;
    is_visible: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Input for creating/updating an event tag
 */
export interface EventTagInput {
    slug: string;
    name_zh: string;
    sort_order?: number;
    is_visible?: boolean;
}

/**
 * Event tag with event count for listing
 */
export interface EventTagWithCount extends EventTag {
    event_count: number;
}

// =============================================================================
// Event
// =============================================================================

/**
 * Full event data from database
 */
export interface Event {
    id: string;
    type_id: string | null;
    slug: string;
    title_zh: string;
    excerpt_zh: string | null;
    content_md_zh: string | null;
    cover_image_url: string | null;
    cover_image_alt_zh: string | null;
    start_at: string;
    end_at: string | null;
    timezone: string;
    location_name: string | null;
    location_address: string | null;
    online_url: string | null;
    registration_url: string | null;
    visibility: EventVisibility;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Event with related type and tags information
 */
export interface EventWithType extends Event {
    event_type?: EventType | null;
    event_tags?: EventTag[];
}

/**
 * Event summary for listing pages (lighter payload)
 */
export interface EventSummary {
    id: string;
    slug: string;
    title_zh: string;
    excerpt_zh: string | null;
    cover_image_url: string | null;
    cover_image_alt_zh: string | null;
    start_at: string;
    end_at: string | null;
    timezone: string;
    location_name: string | null;
    online_url: string | null;
    visibility: EventVisibility;
    published_at: string | null;
    event_type?: EventType | null;
    event_tags?: EventTag[];
}

// =============================================================================
// Event Input (for admin create/update)
// =============================================================================

export interface EventInput {
    type_id?: string | null;
    slug: string;
    title_zh: string;
    excerpt_zh?: string | null;
    content_md_zh?: string | null;
    cover_image_url?: string | null;
    cover_image_alt_zh?: string | null;
    start_at: string;
    end_at?: string | null;
    timezone?: string;
    location_name?: string | null;
    location_address?: string | null;
    online_url?: string | null;
    registration_url?: string | null;
    visibility: EventVisibility;
    /** Tag IDs for many-to-many relation */
    tag_ids?: string[];
}

export interface EventTypeInput {
    slug: string;
    name_zh: string;
    sort_order?: number;
    is_visible?: boolean;
}

// =============================================================================
// Query Options
// =============================================================================

export interface EventsQueryOptions {
    typeSlug?: string;
    /** Filter by event tag slug */
    tagSlug?: string;
    search?: string;
    sort?: 'newest' | 'oldest' | 'upcoming' | 'start-asc' | 'start-desc';
    limit?: number;
    offset?: number;
    includeExpired?: boolean;
}

// =============================================================================
// Event for Sitemap
// =============================================================================

export interface EventForSitemap {
    slug: string;
    updated_at: string;
}
