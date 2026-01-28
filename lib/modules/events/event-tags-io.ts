/**
 * Event Tags IO (Public Reads)
 *
 * Database operations for event tags (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/events/event-tags-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type {
    EventTag,
    EventTagWithCount,
} from '@/lib/types/events';

/**
 * Get all visible event tags
 */
export async function getVisibleEventTags(): Promise<EventTag[]> {
    const { data, error } = await createAnonClient()
        .from('event_tags')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('[getVisibleEventTags] Error:', error);
        return [];
    }

    return data ?? [];
}

/**
 * Get event tag by slug
 */
export async function getEventTagBySlug(slug: string): Promise<EventTag | null> {
    const { data, error } = await createAnonClient()
        .from('event_tags')
        .select('*')
        .eq('slug', slug)
        .eq('is_visible', true)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        console.error('[getEventTagBySlug] Error:', error);
        return null;
    }

    return data;
}

/**
 * Get event tags with event counts
 */
export async function getEventTagsWithCounts(): Promise<EventTagWithCount[]> {
    const { data: tags, error: tagsError } = await createAnonClient()
        .from('event_tags')
        .select('*')
        .eq('is_visible', true)
        .order('sort_order', { ascending: true });

    if (tagsError || !tags) {
        console.error('[getEventTagsWithCounts] Error fetching tags:', tagsError);
        return [];
    }

    // Get counts for each tag (only count public events)
    const tagsWithCounts: EventTagWithCount[] = await Promise.all(
        tags.map(async (tag) => {
            const { count } = await createAnonClient()
                .from('event_event_tags')
                .select(`
                    event_id,
                    events!inner(visibility)
                `, { count: 'exact', head: true })
                .eq('tag_id', tag.id)
                .eq('events.visibility', 'public');

            return {
                ...tag,
                event_count: count ?? 0,
            };
        })
    );

    return tagsWithCounts;
}

/**
 * Get tags for a specific event
 */
export async function getEventTags(eventId: string): Promise<EventTag[]> {
    const { data, error } = await createAnonClient()
        .from('event_event_tags')
        .select(`
            tag:event_tags(*)
        `)
        .eq('event_id', eventId);

    if (error) {
        console.error('[getEventTags] Error:', error);
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data ?? []).map((item: any) => item.tag).filter(Boolean);
}
