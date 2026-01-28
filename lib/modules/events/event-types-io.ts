/**
 * Event Types IO (Public Reads)
 *
 * Database operations for event types (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/events/event-types-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
    EventType,
    EventTypeWithCount,
} from '@/lib/types/events';

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
