/**
 * Events IO
 *
 * Database operations for events (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/events/io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 * @see doc/specs/proposed/CMS_NAV_BLOG_TAXONOMY_EVENTS.md (FR-C1–C3)
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
    Event,
    EventWithType,
    EventSummary,
    EventType,
    EventTypeWithCount,
    EventsQueryOptions,
    EventForSitemap,
} from '@/lib/types/events';

// =============================================================================
// Event Types
// =============================================================================

/**
 * Get all visible event types
 */
export async function getVisibleEventTypes(): Promise<EventType[]> {
    const { data, error } = await createAnonClient()
        .from('event_types')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[getVisibleEventTypes] Error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get event type by slug
 */
export async function getEventTypeBySlug(slug: string): Promise<EventType | null> {
    const { data, error } = await createAnonClient()
        .from('event_types')
        .select('*')
        .eq('slug', slug)
        .eq('is_visible', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Not found
            return null;
        }
        console.error('[getEventTypeBySlug] Error:', error);
        return null;
    }

    return data;
}

/**
 * Get event types with event counts
 */
export async function getEventTypesWithCounts(): Promise<EventTypeWithCount[]> {
    // Get all visible event types
    const { data: types, error: typesError } = await createAnonClient()
        .from('event_types')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (typesError || !types) {
        console.error('[getEventTypesWithCounts] Error fetching types:', typesError);
        return [];
    }

    // Get counts for each type
    const typesWithCounts: EventTypeWithCount[] = await Promise.all(
        types.map(async (type) => {
            const { count } = await createAnonClient()
                .from('events')
                .select('*', { count: 'exact', head: true })
                .eq('type_id', type.id)
                .eq('visibility', 'public');

            return {
                ...type,
                event_count: count ?? 0,
            };
        })
    );

    return typesWithCounts;
}

// =============================================================================
// Events
// =============================================================================

/**
 * Get public events with optional filtering
 */
export async function getPublicEvents(
    options?: EventsQueryOptions
): Promise<EventSummary[]> {
    let query = createAnonClient()
        .from('events')
        .select(`
      id,
      slug,
      title_zh,
      excerpt_zh,
      cover_image_url,
      cover_image_alt_zh,
      start_at,
      end_at,
      timezone,
      location_name,
      online_url,
      visibility,
      published_at,
      event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)
    `)
        .eq('visibility', 'public');

    // Filter by event type
    if (options?.typeSlug) {
        const eventType = await getEventTypeBySlug(options.typeSlug);
        if (eventType) {
            query = query.eq('type_id', eventType.id);
        } else {
            // Type not found, return empty array
            return [];
        }
    }

    // Filter out expired events (unless includeExpired is true)
    if (!options?.includeExpired) {
        const now = new Date().toISOString();
        // Show events that haven't ended yet, or have no end date and start in the future
        query = query.or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`);
    }

    // Search by title
    if (options?.search) {
        const searchTerm = `%${options.search}%`;
        query = query.ilike('title_zh', searchTerm);
    }

    // Sort
    switch (options?.sort) {
        case 'oldest':
            query = query.order('start_at', { ascending: true });
            break;
        case 'upcoming':
            // Sort by start date ascending, closest first
            query = query.order('start_at', { ascending: true });
            break;
        case 'start-asc':
            query = query.order('start_at', { ascending: true });
            break;
        case 'start-desc':
            query = query.order('start_at', { ascending: false });
            break;
        case 'newest':
        default:
            query = query.order('start_at', { ascending: false });
            break;
    }

    if (options?.limit) {
        query = query.limit(options.limit);
    }

    if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) {
        console.error('[getPublicEvents] Error:', error);
        return [];
    }

    return (data ?? []) as unknown as EventSummary[];
}

/**
 * Get a single public event by slug
 */
export async function getPublicEventBySlug(slug: string): Promise<EventWithType | null> {
    const { data, error } = await createAnonClient()
        .from('events')
        .select(`
      *,
      event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)
    `)
        .eq('slug', slug)
        .eq('visibility', 'public')
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            // Not found
            return null;
        }
        console.error('[getPublicEventBySlug] Error:', error);
        return null;
    }

    return data as unknown as EventWithType;
}

/**
 * Get public events for sitemap generation
 */
export async function getPublicEventsForSitemap(): Promise<EventForSitemap[]> {
    const { data, error } = await createAnonClient()
        .from('events')
        .select('slug, updated_at')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false });

    if (error) {
        console.error('[getPublicEventsForSitemap] Error:', error);
        return [];
    }

    return (data ?? []).map((event) => ({
        slug: event.slug,
        updated_at: event.updated_at,
    }));
}

/**
 * Get upcoming public events (for homepage or widgets)
 */
export async function getUpcomingEvents(limit: number = 3): Promise<EventSummary[]> {
    const now = new Date().toISOString();

    const { data, error } = await createAnonClient()
        .from('events')
        .select(`
      id,
      slug,
      title_zh,
      excerpt_zh,
      cover_image_url,
      cover_image_alt_zh,
      start_at,
      end_at,
      timezone,
      location_name,
      online_url,
      visibility,
      published_at,
      event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)
    `)
        .eq('visibility', 'public')
        .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
        .order('start_at', { ascending: true })
        .limit(limit);

    if (error) {
        console.error('[getUpcomingEvents] Error:', error);
        return [];
    }

    return (data ?? []) as unknown as EventSummary[];
}
