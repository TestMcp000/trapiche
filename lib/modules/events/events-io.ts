/**
 * Events IO (Public Reads)
 *
 * Database operations for events (public reads).
 * Uses anonymous Supabase client for caching-safe public reads.
 *
 * @module lib/modules/events/events-io
 * @see ARCHITECTURE.md §3.4 - IO module splitting
 */

import 'server-only';

import { createAnonClient } from '@/lib/infrastructure/supabase/anon';
import type { EventWithType, EventSummary, EventsQueryOptions, EventForSitemap } from '@/lib/types/events';
import { getEventTypeBySlug } from './event-types-io';
import { getEventTagBySlug, getEventTags } from './event-tags-io';

const EVENT_SUMMARY_SELECT = `id, slug, title_zh, excerpt_zh, cover_image_url, cover_image_alt_zh, start_at, end_at, timezone, location_name, online_url, visibility, published_at, event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)`;

type SortOption = EventsQueryOptions['sort'];

/** Apply sort to query */
function applySort<T extends { order: (col: string, opts: { ascending: boolean }) => T }>(query: T, sort?: SortOption): T {
    const ascending = sort === 'oldest' || sort === 'upcoming' || sort === 'start-asc';
    return query.order('start_at', { ascending });
}

/** Load tags for events */
async function withTags(events: EventSummary[]): Promise<EventSummary[]> {
    return Promise.all(events.map(async (e) => ({ ...e, event_tags: await getEventTags(e.id) })));
}

/** Get public events with optional filtering */
export async function getPublicEvents(options?: EventsQueryOptions): Promise<EventSummary[]> {
    if (options?.tagSlug) {
        const tag = await getEventTagBySlug(options.tagSlug);
        if (!tag) return [];
        const { data: rels } = await createAnonClient().from('event_event_tags').select('event_id').eq('tag_id', tag.id);
        if (!rels?.length) return [];
        return getPublicEventsCore(options, rels.map((r) => r.event_id));
    }
    return getPublicEventsCore(options);
}

async function getPublicEventsCore(options?: EventsQueryOptions, eventIds?: string[]): Promise<EventSummary[]> {
    let query = createAnonClient().from('events').select(EVENT_SUMMARY_SELECT).eq('visibility', 'public');
    if (eventIds) query = query.in('id', eventIds);
    if (options?.typeSlug) {
        const et = await getEventTypeBySlug(options.typeSlug);
        if (!et) return [];
        query = query.eq('type_id', et.id);
    }
    if (!options?.includeExpired) {
        const now = new Date().toISOString();
        query = query.or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`);
    }
    if (options?.search) query = query.ilike('title_zh', `%${options.search}%`);
    query = applySort(query, options?.sort);
    if (options?.limit) query = query.limit(options.limit);
    if (options?.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    const { data, error } = await query;
    if (error) { console.error('[getPublicEvents] Error:', error); return []; }
    return withTags((data ?? []) as unknown as EventSummary[]);
}

/** Get a single public event by slug (with tags) */
export async function getPublicEventBySlug(slug: string): Promise<EventWithType | null> {
    const { data, error } = await createAnonClient()
        .from('events')
        .select(`*, event_type:event_types(id, slug, name_zh, sort_order, is_visible, created_at, updated_at)`)
        .eq('slug', slug)
        .eq('visibility', 'public')
        .single();
    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('[getPublicEventBySlug] Error:', error);
        return null;
    }
    const event = data as unknown as EventWithType;
    event.event_tags = await getEventTags(event.id);
    return event;
}

/** Get public events for sitemap generation */
export async function getPublicEventsForSitemap(): Promise<EventForSitemap[]> {
    const { data, error } = await createAnonClient()
        .from('events')
        .select('slug, updated_at')
        .eq('visibility', 'public')
        .order('updated_at', { ascending: false });
    if (error) { console.error('[getPublicEventsForSitemap] Error:', error); return []; }
    return (data ?? []).map((e) => ({ slug: e.slug, updated_at: e.updated_at }));
}

/** Get upcoming public events (for homepage/widgets) */
export async function getUpcomingEvents(limit: number = 3): Promise<EventSummary[]> {
    const now = new Date().toISOString();
    const { data, error } = await createAnonClient()
        .from('events')
        .select(EVENT_SUMMARY_SELECT)
        .eq('visibility', 'public')
        .or(`end_at.gte.${now},and(end_at.is.null,start_at.gte.${now})`)
        .order('start_at', { ascending: true })
        .limit(limit);
    if (error) { console.error('[getUpcomingEvents] Error:', error); return []; }
    return withTags((data ?? []) as unknown as EventSummary[]);
}
